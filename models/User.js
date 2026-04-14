const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,  // Never returned in queries by default
    },
    phone: { type: String, trim: true },
    addresses: [
      {
        label: { type: String, default: 'Home' },
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
  },
  { timestamps: true }
);

// ── Pre-save: hash password ───────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Method: compare password ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Method: generate JWT ──────────────────────────────────────────
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ── Method: check if password changed after token was issued ──────
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (this.passwordChangedAt) {
    return this.passwordChangedAt.getTime() / 1000 > jwtIat;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);

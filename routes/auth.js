const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

function sendToken(user, statusCode, res) {
  const token = user.generateToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
  });
}

// ── POST /api/auth/signup ─────────────────────────────────────────
router.post('/signup', signupRules, validate, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password });
    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PATCH /api/auth/me ────────────────────────────────────────────
router.patch('/me', protect, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'addresses'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/change-password ───────────────────────────────
router.post('/change-password', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (newPassword.length < 8) {
      return res.status(422).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

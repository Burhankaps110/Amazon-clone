const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:    { type: String, required: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    price:       { type: Number, required: true, min: 0 },
    originalPrice:{ type: Number, required: true, min: 0 },
    discount:    { type: Number, default: 0, min: 0, max: 100 },
    category:    { type: String, required: true, trim: true },
    brand:       { type: String, trim: true },
    images:      [{ url: String, alt: String }],
    stock:       { type: Number, required: true, default: 0, min: 0 },
    sold:        { type: Number, default: 0 },
    badge:       { type: String, enum: ['Best Seller', 'Hot Deal', 'Limited', null], default: null },
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    numReviews:  { type: Number, default: 0 },
    reviews:     [reviewSchema],
    tags:        [String],
    isActive:    { type: Boolean, default: true },
    isFeatured:  { type: Boolean, default: false },
    weight:      Number,
    dimensions:  { length: Number, width: Number, height: Number },
  },
  { timestamps: true }
);

// ── Indexes for fast querying ─────────────────────────────────────
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sold: -1 });

// ── Virtual: inStock ─────────────────────────────────────────────
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ── Method: recalculate rating from reviews ───────────────────────
productSchema.methods.recalcRating = function () {
  if (!this.reviews.length) { this.rating = 0; this.numReviews = 0; return; }
  this.numReviews = this.reviews.length;
  this.rating = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.numReviews;
};

module.exports = mongoose.model('Product', productSchema);

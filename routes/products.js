const express = require('express');
const Product = require('../models/Product');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/products — list with search, filter, sort, pagination ─
router.get('/', async (req, res, next) => {
  try {
    const {
      q, category, minPrice, maxPrice, minRating,
      badge, sort = '-createdAt', page = 1, limit = 12,
    } = req.query;

    const filter = { isActive: true };

    // Full-text search
    if (q) filter.$text = { $search: q };

    // Filters
    if (category) filter.category = new RegExp(category, 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (badge) filter.badge = badge;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .select('-reviews'),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products/:id/reviews — authenticated users ──────────
router.post('/:id/reviews', protect, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(422).json({ success: false, message: 'Rating and comment are required.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const alreadyReviewed = product.reviews.find(r => r.user.equals(req.user._id));
    if (alreadyReviewed) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product.' });
    }

    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
    product.recalcRating();
    await product.save();

    res.status(201).json({ success: true, message: 'Review submitted.' });
  } catch (err) {
    next(err);
  }
});

// ── Admin: POST /api/products ─────────────────────────────────────
router.post('/', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

// ── Admin: PATCH /api/products/:id ───────────────────────────────
router.patch('/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

// ── Admin: DELETE /api/products/:id (soft delete) ────────────────
router.delete('/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deactivated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

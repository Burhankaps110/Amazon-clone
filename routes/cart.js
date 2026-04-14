const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);  // All cart routes require auth

async function getPopulatedCart(userId) {
  return Cart.findOne({ user: userId })
    .populate('items.product', 'title price originalPrice discount images stock badge rating');
}

// ── GET /api/cart ─────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    if (!cart) return res.json({ success: true, cart: { items: [], total: 0, itemCount: 0 } });
    res.json({ success: true, cart });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cart/add ────────────────────────────────────────────
router.post('/add', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(422).json({ success: false, message: 'productId is required.' });

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (product.stock < quantity) {
      return res.status(409).json({ success: false, message: `Only ${product.stock} in stock.` });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    cart.addItem(productId, product.price, Number(quantity));
    await cart.save();

    const populated = await getPopulatedCart(req.user._id);
    res.json({ success: true, cart: populated });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/cart/item/:productId ──────────────────────────────
router.patch('/item/:productId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(422).json({ success: false, message: 'quantity is required.' });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

    cart.setQuantity(req.params.productId, Number(quantity));
    await cart.save();

    const populated = await getPopulatedCart(req.user._id);
    res.json({ success: true, cart: populated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cart/item/:productId ─────────────────────────────
router.delete('/item/:productId', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

    cart.removeItem(req.params.productId);
    await cart.save();

    const populated = await getPopulatedCart(req.user._id);
    res.json({ success: true, cart: populated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cart/clear ────────────────────────────────────────
router.delete('/clear', async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

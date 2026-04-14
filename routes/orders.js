const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── POST /api/orders — create order from cart ─────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(422).json({ success: false, message: 'shippingAddress and paymentMethod are required.' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // Stock validation & deduction
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(409).json({ success: false, message: `Product "${product?.title || item.product}" is no longer available.` });
      }
      if (product.stock < item.quantity) {
        return res.status(409).json({ success: false, message: `Insufficient stock for "${product.title}". Only ${product.stock} left.` });
      }
    }

    // Build order items (snapshot prices)
    const orderItems = cart.items.map(i => ({
      product:       i.product._id,
      title:         i.product.title,
      image:         i.product.images?.[0]?.url || '',
      price:         i.product.price,
      originalPrice: i.product.originalPrice,
      quantity:      i.quantity,
    }));

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery = subtotal >= 499 ? 0 : 49;
    const discount = orderItems.reduce((s, i) => s + ((i.originalPrice - i.price) * i.quantity), 0);

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      pricing: { subtotal, discount, delivery, total: subtotal + delivery },
      payment: { method: paymentMethod, status: paymentMethod === 'cod' ? 'pending' : 'pending' },
    });

    // Deduct stock atomically
    await Promise.all(cart.items.map(item =>
      Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, sold: item.quantity },
      })
    ));

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders — user's order history ────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .select('-statusHistory'),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({ success: true, total, page: Number(page), orders });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders/:id/cancel ───────────────────────────────────
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const cancellable = ['placed', 'confirmed', 'processing'];
    if (!cancellable.includes(order.orderStatus)) {
      return res.status(409).json({ success: false, message: `Cannot cancel an order that is "${order.orderStatus}".` });
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || 'Cancelled by user';
    order.statusHistory.push({ status: 'cancelled', message: order.cancelReason });

    // Restore stock
    await Promise.all(order.items.map(item =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, sold: -item.quantity } })
    ));

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── Admin: GET /api/orders/admin/all ─────────────────────────────
router.get('/admin/all', restrictTo('admin'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { orderStatus: status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)).populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, total, orders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

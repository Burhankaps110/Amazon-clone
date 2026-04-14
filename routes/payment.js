const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Lazily initialize Razorpay (fails gracefully if keys missing)
let razorpay;
try {
  razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch {
  console.warn('⚠️  Razorpay not initialized — check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env');
}

// ── POST /api/payment/create-order ───────────────────────────────
// Creates a Razorpay order so the frontend SDK can open the payment modal
router.post('/create-order', async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(422).json({ success: false, message: 'orderId is required.' });

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.payment.status === 'paid') {
      return res.status(409).json({ success: false, message: 'Order already paid.' });
    }

    if (!razorpay) {
      return res.status(503).json({ success: false, message: 'Payment gateway not configured.' });
    }

    const rzpOrder = await razorpay.orders.create({
      amount:   Math.round(order.pricing.total * 100),  // Amount in paise
      currency: 'INR',
      receipt:  order.orderId,
      notes: {
        orderId:   order._id.toString(),
        userId:    req.user._id.toString(),
        userEmail: req.user.email,
      },
    });

    // Save Razorpay order ID on our order
    order.payment.razorpayOrderId = rzpOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payment/verify ──────────────────────────────────────
// Verify Razorpay webhook signature and confirm the order
router.post('/verify', async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // HMAC signature verification — critical security step
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Update order payment status
    const order = await Order.findOneAndUpdate(
      { _id: orderId, user: req.user._id },
      {
        'payment.status':              'paid',
        'payment.razorpayOrderId':     razorpayOrderId,
        'payment.razorpayPaymentId':   razorpayPaymentId,
        'payment.razorpaySignature':   razorpaySignature,
        'payment.paidAt':              new Date(),
        orderStatus:                   'confirmed',
        $push: { statusHistory: { status: 'confirmed', message: 'Payment received and order confirmed' } },
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payment/webhook ─────────────────────────────────────
// Razorpay webhook (no auth middleware — Razorpay calls this directly)
// Register at: https://dashboard.razorpay.com/app/webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const digest = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');
      if (digest !== signature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body);

    if (event.event === 'payment.failed') {
      const { order_id } = event.payload.payment.entity;
      await Order.findOneAndUpdate(
        { 'payment.razorpayOrderId': order_id },
        {
          'payment.status': 'failed',
          $push: { statusHistory: { status: 'payment_failed', message: 'Payment failed via webhook' } },
        }
      );
    }

    res.json({ received: true });
  } catch {
    res.status(200).json({ received: true });  // Always 200 to prevent Razorpay retries
  }
});

module.exports = router;

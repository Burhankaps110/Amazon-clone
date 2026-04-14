const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title:        String,
  image:        String,
  price:        { type: Number, required: true },
  originalPrice:{ type: Number },
  quantity:     { type: Number, required: true, min: 1 },
}, { _id: true });

const orderSchema = new mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId:         { type: String, unique: true },   // Human-readable: ORD-XXXXX
    items:           [orderItemSchema],

    shippingAddress: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      line1:   { type: String, required: true },
      line2:   String,
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },

    pricing: {
      subtotal:  { type: Number, required: true },
      discount:  { type: Number, default: 0 },
      delivery:  { type: Number, default: 0 },
      total:     { type: Number, required: true },
    },

    payment: {
      method:          { type: String, enum: ['upi', 'card', 'cod'], required: true },
      status:          { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      razorpayOrderId: String,
      razorpayPaymentId:String,
      razorpaySignature:String,
      paidAt:          Date,
    },

    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
      default: 'placed',
    },

    statusHistory: [
      {
        status:    String,
        message:   String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    estimatedDelivery: Date,
    deliveredAt:       Date,
    cancelledAt:       Date,
    cancelReason:      String,
  },
  { timestamps: true }
);

// ── Auto-generate human-readable order ID ────────────────────────
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    this.orderId = `ORD-${ts}-${rnd}`;
    this.statusHistory.push({ status: 'placed', message: 'Order placed successfully' });
    // Estimate delivery: 2 days from now
    this.estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });

module.exports = mongoose.model('Order', orderSchema);

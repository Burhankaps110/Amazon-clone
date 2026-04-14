const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price:    { type: Number, required: true },   // Snapshot price at time of adding
}, { _id: true });

const cartSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: total ────────────────────────────────────────────────
cartSchema.virtual('total').get(function () {
  return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

// ── Method: add or increment item ─────────────────────────────────
cartSchema.methods.addItem = function (productId, price, quantity = 1) {
  const existing = this.items.find(i => i.product.equals(productId));
  if (existing) {
    existing.quantity += quantity;
  } else {
    this.items.push({ product: productId, price, quantity });
  }
};

// ── Method: remove item ───────────────────────────────────────────
cartSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter(i => !i.product.equals(productId));
};

// ── Method: update quantity ───────────────────────────────────────
cartSchema.methods.setQuantity = function (productId, quantity) {
  const item = this.items.find(i => i.product.equals(productId));
  if (!item) throw new Error('Item not in cart');
  if (quantity < 1) return this.removeItem(productId);
  item.quantity = quantity;
};

module.exports = mongoose.model('Cart', cartSchema);

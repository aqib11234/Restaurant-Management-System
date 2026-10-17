const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  table: {
    type: Number,
    required: true,
    min: 0,
    max: 1000 // reasonable upper limit, 0 for parcel
  },
  items: [{
    foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 100 }
  }],
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Waiter fields — optional; populated when a waiter is assigned to the order
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Waiter', default: null },
  waiterName: { type: String, trim: true, default: '' },
  // Cash taken at payment, kept so a bill can be reprinted later
  amountReceived: { type: Number, min: 0, default: null },
  paidAt: { type: Date, default: null },
  // Business day the sale is counted in (UTC midnight carrying the restaurant's local date)
  salesDay: { type: Date, default: null },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance - multi-tenant aware
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, table: 1, status: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
// One open bill per dine-in table (takeaway is table 0 and may have many)
orderSchema.index(
  { restaurantId: 1, table: 1 },
  { unique: true, name: 'one_open_order_per_table', partialFilterExpression: { status: 'pending', table: { $gt: 0 } } }
);

module.exports = mongoose.model('Order', orderSchema);
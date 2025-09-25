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
    enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ table: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
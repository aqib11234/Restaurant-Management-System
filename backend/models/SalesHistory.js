const mongoose = require('mongoose');

const salesHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  period: { type: String, enum: ['daily', 'monthly'], required: true },
  orders: { type: Number, required: true },
  revenue: { type: Number, required: true },
  orderDetails: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    table: { type: Number, required: true },
    total: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    status: { type: String, required: true },
    items: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }]
  }],
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique entries for date, period, and restaurant
salesHistorySchema.index({ restaurantId: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('SalesHistory', salesHistorySchema);
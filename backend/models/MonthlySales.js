const mongoose = require('mongoose');

const monthlySalesSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique entries for year, month, and restaurant
monthlySalesSchema.index({ restaurantId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlySales', monthlySalesSchema);
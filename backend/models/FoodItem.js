const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  price: { type: Number, required: true, min: 0, max: 10000 },
  category: { type: String, required: true, trim: true, minlength: 1 },
  image: { type: String, default: '/api/placeholder/200/150' },
  description: { type: String, default: '', maxlength: 500 },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
foodItemSchema.index({ category: 1, available: 1 });
foodItemSchema.index({ name: 1 });
foodItemSchema.index({ available: 1, createdAt: -1 });

module.exports = mongoose.model('FoodItem', foodItemSchema);
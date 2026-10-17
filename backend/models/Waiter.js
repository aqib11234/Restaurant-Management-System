const mongoose = require('mongoose');

/**
 * Waiter Model - Multi-tenant support
 *
 * Each waiter belongs to exactly one restaurant (restaurantId).
 * Tenant isolation is enforced at the API layer – always filter by restaurantId.
 */
const waiterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },

  phone: {
    type: String,
    trim: true,
    default: ''
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // On shift today; absent waiters are hidden when choosing who serves a table
  isPresent: {
    type: Boolean,
    default: true
  },

  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast tenant-scoped queries
waiterSchema.index({ restaurantId: 1, isActive: 1 });
waiterSchema.index({ restaurantId: 1, name: 1 });

module.exports = mongoose.model('Waiter', waiterSchema);

const mongoose = require('mongoose');

/**
 * User Model - Multi-tenant support
 * 
 * Each user belongs to exactly one restaurant (restaurantId)
 * Roles:
 * - owner: Restaurant owner (created during signup)
 * - staff: Restaurant staff member
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['owner', 'staff'],
    required: true,
    default: 'owner'
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
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ restaurantId: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

/**
 * Restaurant Model - Multi-tenant support with hybrid licensing
 * 
 * License Types:
 * - lifetime: One-time payment, permanent access
 * - subscription: Monthly/yearly recurring payment
 * 
 * Plans:
 * - trial: 14-day free trial (default for new signups)
 * - monthly: Monthly subscription
 * - yearly: Yearly subscription
 * - null: For lifetime licenses (no recurring plan)
 */
const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },

    // Licensing fields
    licenseType: {
        type: String,
        enum: ['lifetime', 'subscription'],
        required: true,
        default: 'subscription'
    },

    plan: {
        type: String,
        enum: ['trial', 'monthly', 'yearly', null],
        default: 'trial',
        // null is used for lifetime licenses
    },

    subscriptionEndsAt: {
        type: Date,
        default: null,
        // For subscriptions: date when subscription expires
        // For lifetime: null
    },

    isActive: {
        type: Boolean,
        default: true,
        // Can be manually set to false to deactivate a restaurant
    },

    // Additional metadata
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
restaurantSchema.index({ isActive: 1 });
restaurantSchema.index({ licenseType: 1, subscriptionEndsAt: 1 });

// Method to check if restaurant has valid license
restaurantSchema.methods.hasValidLicense = function () {
    // Check if restaurant is active
    if (!this.isActive) {
        return false;
    }

    // Lifetime licenses are always valid (if active)
    if (this.licenseType === 'lifetime') {
        return true;
    }

    // For subscriptions, check expiration date
    if (this.licenseType === 'subscription') {
        if (!this.subscriptionEndsAt) {
            return false;
        }
        return new Date() <= this.subscriptionEndsAt;
    }

    return false;
};

// Method to get days remaining in subscription
restaurantSchema.methods.getDaysRemaining = function () {
    if (this.licenseType === 'lifetime') {
        return Infinity;
    }

    if (!this.subscriptionEndsAt) {
        return 0;
    }

    const now = new Date();
    const diffTime = this.subscriptionEndsAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

// Update timestamp on save
restaurantSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);

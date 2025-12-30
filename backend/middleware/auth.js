const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

/**
 * Authentication Middleware
 * Verifies JWT token and extracts user information
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'restaurant_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * License Enforcement Middleware (CRITICAL)
 * 
 * This middleware MUST be used on all protected routes to enforce licensing.
 * It performs the following checks:
 * 
 * 1. Extracts restaurantId from JWT payload
 * 2. Loads restaurant record from database
 * 3. Validates license based on type:
 *    - Lifetime: Always allowed (if restaurant is active)
 *    - Subscription: Checks if subscriptionEndsAt >= today
 * 4. Blocks access if license is invalid or expired
 * 
 * Usage: app.use('/api/protected-route', authenticateToken, enforceLicense, routeHandler);
 */
const enforceLicense = async (req, res, next) => {
  try {
    // Extract restaurantId from JWT payload
    const { restaurantId } = req.user;

    if (!restaurantId) {
      return res.status(403).json({
        error: 'No restaurant associated with this account',
        code: 'NO_RESTAURANT'
      });
    }

    // Load restaurant record
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(403).json({
        error: 'Restaurant not found',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Check if restaurant is active
    if (!restaurant.isActive) {
      return res.status(403).json({
        error: 'Restaurant account is deactivated. Please contact support.',
        code: 'RESTAURANT_DEACTIVATED'
      });
    }

    // Lifetime license - always allow access
    if (restaurant.licenseType === 'lifetime') {
      req.restaurant = restaurant;
      return next();
    }

    // Subscription license - check expiration
    if (restaurant.licenseType === 'subscription') {
      if (!restaurant.subscriptionEndsAt) {
        return res.status(403).json({
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }

      const now = new Date();
      const expiresAt = new Date(restaurant.subscriptionEndsAt);

      if (now > expiresAt) {
        // Subscription expired
        return res.status(403).json({
          error: 'Subscription expired. Please renew to continue.',
          code: 'SUBSCRIPTION_EXPIRED',
          expiredAt: restaurant.subscriptionEndsAt
        });
      }

      // Subscription is valid
      req.restaurant = restaurant;
      return next();
    }

    // Unknown license type
    return res.status(403).json({
      error: 'Invalid license configuration',
      code: 'INVALID_LICENSE'
    });

  } catch (error) {
    console.error('License enforcement error:', error);
    return res.status(500).json({
      error: 'Error validating license',
      code: 'LICENSE_CHECK_FAILED'
    });
  }
};

/**
 * Combined middleware: Authenticate + Enforce License
 * Use this for convenience on protected routes
 */
const authenticateAndEnforceLicense = [authenticateToken, enforceLicense];

module.exports = {
  authenticateToken,
  enforceLicense,
  authenticateAndEnforceLicense
};
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

/**
 * SIGNUP ENDPOINT
 * 
 * Creates a new restaurant with trial subscription and owner user
 * 
 * Flow:
 * 1. Create restaurant with:
 *    - licenseType: "subscription"
 *    - plan: "trial"
 *    - subscriptionEndsAt: today + 14 days
 *    - isActive: true
 * 2. Create owner user linked to restaurant
 * 3. Return JWT with restaurantId, userId, and role
 */
router.post('/signup', async (req, res) => {
  try {
    const { restaurantName, email, password } = req.body;

    // Validate input
    if (!restaurantName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name, email, and password are required'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create restaurant with trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

    const restaurant = new Restaurant({
      name: restaurantName,
      licenseType: 'subscription',
      plan: 'trial',
      subscriptionEndsAt: trialEndDate,
      isActive: true
    });

    await restaurant.save();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create owner user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'owner',
      restaurantId: restaurant._id
    });

    await user.save();

    // Create JWT token with restaurantId
    const tokenPayload = {
      userId: user._id,
      restaurantId: restaurant._id,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'restaurant_secret_key';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        licenseType: restaurant.licenseType,
        plan: restaurant.plan,
        subscriptionEndsAt: restaurant.subscriptionEndsAt,
        trialDaysRemaining: 14
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account'
    });
  }
});

/**
 * LOGIN ENDPOINT
 * 
 * Authenticates user and returns JWT with restaurantId
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).populate('restaurantId');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if restaurant exists
    if (!user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'No restaurant associated with this account'
      });
    }

    const restaurant = user.restaurantId;

    // Create JWT token with restaurantId
    const tokenPayload = {
      userId: user._id,
      restaurantId: restaurant._id,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'restaurant_secret_key';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '24h' });

    // Calculate days remaining
    let daysRemaining = 0;
    if (restaurant.licenseType === 'subscription' && restaurant.subscriptionEndsAt) {
      const now = new Date();
      const diffTime = restaurant.subscriptionEndsAt - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, daysRemaining);
    } else if (restaurant.licenseType === 'lifetime') {
      daysRemaining = Infinity;
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        licenseType: restaurant.licenseType,
        plan: restaurant.plan,
        subscriptionEndsAt: restaurant.subscriptionEndsAt,
        isActive: restaurant.isActive,
        daysRemaining: daysRemaining
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;
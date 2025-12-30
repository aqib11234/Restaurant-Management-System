const router = require('express').Router();
const Restaurant = require('../models/Restaurant');

/**
 * ADMIN / LICENSE MANAGEMENT ROUTES
 * 
 * These endpoints are for LOCAL TESTING ONLY
 * They allow manual manipulation of restaurant licenses
 * 
 * In production, these would be protected by admin authentication
 * For local testing, they are open for convenience
 */

/**
 * GET /api/admin/restaurants
 * List all restaurants with their license status
 */
router.get('/restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({})
            .select('name licenseType plan subscriptionEndsAt isActive createdAt')
            .sort({ createdAt: -1 });

        const restaurantsWithStatus = restaurants.map(r => {
            const hasValidLicense = r.hasValidLicense();
            const daysRemaining = r.getDaysRemaining();

            return {
                id: r._id,
                name: r.name,
                licenseType: r.licenseType,
                plan: r.plan,
                subscriptionEndsAt: r.subscriptionEndsAt,
                isActive: r.isActive,
                hasValidLicense,
                daysRemaining: daysRemaining === Infinity ? 'Lifetime' : daysRemaining,
                createdAt: r.createdAt
            };
        });

        res.json({
            success: true,
            count: restaurantsWithStatus.length,
            restaurants: restaurantsWithStatus
        });
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurants'
        });
    }
});

/**
 * POST /api/admin/convert-to-lifetime
 * Convert a restaurant from subscription to lifetime license
 * 
 * Body: { restaurantId: "..." }
 */
router.post('/convert-to-lifetime', async (req, res) => {
    try {
        const { restaurantId } = req.body;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'restaurantId is required'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Convert to lifetime
        restaurant.licenseType = 'lifetime';
        restaurant.plan = null;
        restaurant.subscriptionEndsAt = null;
        restaurant.isActive = true;

        await restaurant.save();

        res.json({
            success: true,
            message: `Restaurant "${restaurant.name}" converted to lifetime license`,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                licenseType: restaurant.licenseType,
                plan: restaurant.plan,
                subscriptionEndsAt: restaurant.subscriptionEndsAt,
                isActive: restaurant.isActive
            }
        });
    } catch (error) {
        console.error('Error converting to lifetime:', error);
        res.status(500).json({
            success: false,
            message: 'Error converting to lifetime license'
        });
    }
});

/**
 * POST /api/admin/extend-subscription
 * Extend subscription by X days
 * 
 * Body: { restaurantId: "...", days: 30 }
 */
router.post('/extend-subscription', async (req, res) => {
    try {
        const { restaurantId, days } = req.body;

        if (!restaurantId || !days) {
            return res.status(400).json({
                success: false,
                message: 'restaurantId and days are required'
            });
        }

        if (days <= 0 || days > 3650) { // Max 10 years
            return res.status(400).json({
                success: false,
                message: 'Days must be between 1 and 3650'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        if (restaurant.licenseType !== 'subscription') {
            return res.status(400).json({
                success: false,
                message: 'Restaurant must have subscription license type'
            });
        }

        // Extend subscription
        const currentEnd = restaurant.subscriptionEndsAt || new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + parseInt(days));

        restaurant.subscriptionEndsAt = newEnd;
        restaurant.isActive = true;

        await restaurant.save();

        res.json({
            success: true,
            message: `Subscription extended by ${days} days`,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                licenseType: restaurant.licenseType,
                plan: restaurant.plan,
                subscriptionEndsAt: restaurant.subscriptionEndsAt,
                isActive: restaurant.isActive,
                daysRemaining: restaurant.getDaysRemaining()
            }
        });
    } catch (error) {
        console.error('Error extending subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error extending subscription'
        });
    }
});

/**
 * POST /api/admin/deactivate-restaurant
 * Deactivate a restaurant (blocks all access)
 * 
 * Body: { restaurantId: "..." }
 */
router.post('/deactivate-restaurant', async (req, res) => {
    try {
        const { restaurantId } = req.body;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'restaurantId is required'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        restaurant.isActive = false;
        await restaurant.save();

        res.json({
            success: true,
            message: `Restaurant "${restaurant.name}" deactivated`,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                isActive: restaurant.isActive
            }
        });
    } catch (error) {
        console.error('Error deactivating restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating restaurant'
        });
    }
});

/**
 * POST /api/admin/activate-restaurant
 * Activate a restaurant
 * 
 * Body: { restaurantId: "..." }
 */
router.post('/activate-restaurant', async (req, res) => {
    try {
        const { restaurantId } = req.body;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'restaurantId is required'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        restaurant.isActive = true;
        await restaurant.save();

        res.json({
            success: true,
            message: `Restaurant "${restaurant.name}" activated`,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                isActive: restaurant.isActive
            }
        });
    } catch (error) {
        console.error('Error activating restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Error activating restaurant'
        });
    }
});

/**
 * POST /api/admin/change-plan
 * Change subscription plan
 * 
 * Body: { restaurantId: "...", plan: "monthly" | "yearly" }
 */
router.post('/change-plan', async (req, res) => {
    try {
        const { restaurantId, plan } = req.body;

        if (!restaurantId || !plan) {
            return res.status(400).json({
                success: false,
                message: 'restaurantId and plan are required'
            });
        }

        if (!['trial', 'monthly', 'yearly'].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Plan must be trial, monthly, or yearly'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        if (restaurant.licenseType !== 'subscription') {
            return res.status(400).json({
                success: false,
                message: 'Can only change plan for subscription licenses'
            });
        }

        restaurant.plan = plan;
        await restaurant.save();

        res.json({
            success: true,
            message: `Plan changed to ${plan}`,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                licenseType: restaurant.licenseType,
                plan: restaurant.plan
            }
        });
    } catch (error) {
        console.error('Error changing plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing plan'
        });
    }
});

module.exports = router;

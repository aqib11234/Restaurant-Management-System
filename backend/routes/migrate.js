const router = require('express').Router();
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const Restaurant = require('../models/Restaurant');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

/**
 * Migration endpoint to fix missing restaurantId in sales data
 * This is a one-time migration endpoint
 * 
 * SECURITY: Requires authentication
 * 
 * Usage: GET /api/migrate/fix-restaurant-id
 */
router.get('/fix-restaurant-id', authenticateAndEnforceLicense, async (req, res) => {
    try {
        console.log('🔧 Starting migration to fix missing restaurantId...');

        // Get the restaurant from the authenticated user
        const restaurantId = req.user.restaurantId;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'No restaurantId found in user token'
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        console.log(`🏪 Using restaurant: ${restaurant.name} (ID: ${restaurantId})`);

        // Fix MonthlySales records
        console.log('📅 Fixing MonthlySales records...');
        const monthlySalesResult = await MonthlySales.updateMany(
            {
                $or: [
                    { restaurantId: { $exists: false } },
                    { restaurantId: null }
                ]
            },
            { $set: { restaurantId: restaurantId } }
        );

        console.log(`   Updated ${monthlySalesResult.modifiedCount} MonthlySales records`);

        // Fix SalesHistory records
        console.log('📊 Fixing SalesHistory records...');
        const salesHistoryResult = await SalesHistory.updateMany(
            {
                $or: [
                    { restaurantId: { $exists: false } },
                    { restaurantId: null }
                ]
            },
            { $set: { restaurantId: restaurantId } }
        );

        console.log(`   Updated ${salesHistoryResult.modifiedCount} SalesHistory records`);

        // Verify the fix
        const monthlySalesCount = await MonthlySales.countDocuments({ restaurantId });
        const salesHistoryCount = await SalesHistory.countDocuments({ restaurantId });

        // Get sample data
        const recentSales = await SalesHistory.find({ restaurantId, period: 'daily' })
            .sort({ date: -1 })
            .limit(5)
            .select('date orders revenue');

        const sampleData = recentSales.map(sale => ({
            date: sale.date.toISOString().split('T')[0],
            orders: sale.orders,
            revenue: Math.round(sale.revenue)
        }));

        console.log('✅ Migration completed successfully!');

        res.json({
            success: true,
            message: 'Migration completed successfully',
            results: {
                restaurant: {
                    id: restaurantId,
                    name: restaurant.name
                },
                monthlySales: {
                    updated: monthlySalesResult.modifiedCount,
                    total: monthlySalesCount
                },
                salesHistory: {
                    updated: salesHistoryResult.modifiedCount,
                    total: salesHistoryCount
                },
                sampleData: sampleData
            }
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
});

/**
 * Check migration status
 * Returns info about records with/without restaurantId
 */
router.get('/status', authenticateAndEnforceLicense, async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;

        const monthlySalesWithRestaurant = await MonthlySales.countDocuments({ restaurantId });
        const monthlySalesWithoutRestaurant = await MonthlySales.countDocuments({
            $or: [
                { restaurantId: { $exists: false } },
                { restaurantId: null }
            ]
        });

        const salesHistoryWithRestaurant = await SalesHistory.countDocuments({ restaurantId });
        const salesHistoryWithoutRestaurant = await SalesHistory.countDocuments({
            $or: [
                { restaurantId: { $exists: false } },
                { restaurantId: null }
            ]
        });

        const needsMigration = monthlySalesWithoutRestaurant > 0 || salesHistoryWithoutRestaurant > 0;

        res.json({
            success: true,
            needsMigration,
            monthlySales: {
                withRestaurantId: monthlySalesWithRestaurant,
                withoutRestaurantId: monthlySalesWithoutRestaurant
            },
            salesHistory: {
                withRestaurantId: salesHistoryWithRestaurant,
                withoutRestaurantId: salesHistoryWithoutRestaurant
            }
        });

    } catch (error) {
        console.error('Error checking migration status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking status',
            error: error.message
        });
    }
});

module.exports = router;

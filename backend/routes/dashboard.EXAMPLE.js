/**
 * EXAMPLE: Updated Dashboard Route with License Enforcement
 * 
 * This file shows how to update existing routes to:
 * 1. Use license enforcement middleware
 * 2. Filter all queries by restaurantId
 * 
 * Copy this pattern to update other routes in your application
 */

const router = require('express').Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

/**
 * GET /api/dashboard/stats
 * 
 * CHANGES FROM ORIGINAL:
 * 1. Uses authenticateAndEnforceLicense instead of authenticateToken
 * 2. All queries filter by req.user.restaurantId
 * 3. License is automatically validated before this code runs
 */
router.get('/stats', authenticateAndEnforceLicense, async (req, res) => {
    try {
        // Extract restaurantId from JWT (guaranteed to exist by middleware)
        const restaurantId = req.user.restaurantId;

        // ✅ Filter by restaurantId
        const totalFoodItems = await FoodItem.countDocuments({
            restaurantId,
            available: true
        });

        const totalTables = 20; // Fixed number, could be dynamic per restaurant

        // Get daily sales from SalesHistory (persistent, not affected by deletions)
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        // ✅ Filter by restaurantId
        const dailySalesDoc = await SalesHistory.findOne({
            restaurantId,
            date: today,
            period: 'daily'
        });
        const dailySales = dailySalesDoc ? dailySalesDoc.revenue : 0;

        // Check if we need to finalize previous months
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth() + 1; // getUTCMonth() returns 0-11

        // ✅ Filter by restaurantId - Get all monthly sales that are not the current month
        const previousMonths = await MonthlySales.find({
            restaurantId,
            $or: [
                { year: { $lt: currentYear } },
                { year: currentYear, month: { $lt: currentMonth } }
            ]
        });

        // Save previous months to SalesHistory
        for (const month of previousMonths) {
            const monthDate = new Date(month.year, month.month - 1, 1);

            // ✅ Include restaurantId in update
            await SalesHistory.findOneAndUpdate(
                { restaurantId, date: monthDate, period: 'monthly' },
                {
                    restaurantId,
                    orders: month.totalOrders,
                    revenue: month.totalSales,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            // Remove from MonthlySales after saving
            await MonthlySales.findByIdAndDelete(month._id);
        }

        // ✅ Filter by restaurantId - Get current monthly sales
        const monthlySalesDoc = await MonthlySales.findOne({
            restaurantId,
            year: currentYear,
            month: currentMonth
        });
        const monthlySales = monthlySalesDoc ? monthlySalesDoc.totalSales : 0;

        // ✅ Filter by restaurantId - Order status counts
        const allMonthlySales = await MonthlySales.find({ restaurantId });
        const completedOrders = allMonthlySales.reduce((sum, month) => sum + month.totalOrders, 0);

        // ✅ Filter by restaurantId - For pending orders
        const pendingOrders = await Order.countDocuments({
            restaurantId,
            status: { $ne: 'completed' }
        });

        // ✅ Filter by restaurantId - Top selling dishes
        const topDishes = await Order.aggregate([
            { $match: { restaurantId, status: 'completed' } },
            { $unwind: '$items' },
            { $group: { _id: '$items.name', sales: { $sum: '$items.quantity' } } },
            { $sort: { sales: -1 } },
            { $limit: 4 },
            { $project: { name: '$_id', sales: 1, _id: 0 } }
        ]);

        res.json({
            totalTables,
            totalFoodItems,
            dailySales: Math.round(dailySales),
            monthlySales: Math.round(monthlySales),
            pendingOrders,
            completedOrders,
            topSellingDishes: topDishes
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

module.exports = router;

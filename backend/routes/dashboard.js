const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const SalesHistory = require('../models/SalesHistory');
const { authenticateAndEnforceLicense } = require('../middleware/auth');
const { clockOf, dayKey, monthKey, monthRange, paidBetween } = require('../utils/time');

router.get('/stats', authenticateAndEnforceLicense, async (req, res) => {
  try {
    // Extract restaurantId from JWT (guaranteed to exist by middleware)
    const restaurantId = req.user.restaurantId;
    // aggregate() does not cast strings to ObjectId, so convert explicitly
    const restaurantOid = new mongoose.Types.ObjectId(restaurantId);

    const totalFoodItems = await FoodItem.countDocuments({ restaurantId, available: true });
    const totalTables = req.restaurant.tableCount || 20;

    const { startDate, endDate } = req.query;

    let dailySales = 0;
    let monthlySales = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let topDishes = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Invalid date' });
      }
      // A date-only value means "through the end of that day"; full timestamps are used as sent
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) end.setUTCHours(23, 59, 59, 999);
      const endExclusive = new Date(end.getTime() + 1);

      // Fetch aggregated data for the selected period directly from Orders
      const orderStats = await Order.aggregate([
        { 
          $match: { 
            restaurantId: restaurantOid, 
            status: 'completed',
            ...paidBetween(start, endExclusive)
          } 
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            totalOrders: { $sum: 1 }
          }
        }
      ]);

      if (orderStats.length > 0) {
        dailySales = orderStats[0].totalSales;
        monthlySales = orderStats[0].totalSales; // For custom ranges, they mean the same
        completedOrders = orderStats[0].totalOrders;
      }

      pendingOrders = await Order.countDocuments({ 
        restaurantId, 
        status: 'pending',
        createdAt: { $gte: start, $lte: end }
      });

      topDishes = await Order.aggregate([
        { 
          $match: { 
            restaurantId: restaurantOid, 
            status: 'completed',
            ...paidBetween(start, endExclusive)
          } 
        },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', sales: { $sum: '$items.quantity' } } },
        { $sort: { sales: -1 } },
        { $limit: 4 },
        { $project: { name: '$_id', sales: 1, _id: 0 } }
      ]);
    } else {
      // Today and this month follow the restaurant's clock, so both reset at
      // local midnight and on the 1st. Figures come from SalesHistory, which
      // keeps sales even if orders are later deleted.
      const clock = clockOf(req.restaurant);
      const now = new Date();
      const [dailyDoc, monthlyDoc] = await Promise.all([
        SalesHistory.findOne({ restaurantId, date: dayKey(now, clock), period: 'daily' }),
        SalesHistory.findOne({ restaurantId, date: monthKey(now, clock), period: 'monthly' })
      ]);
      dailySales = dailyDoc ? dailyDoc.revenue : 0;
      monthlySales = monthlyDoc ? monthlyDoc.revenue : 0;
      completedOrders = monthlyDoc ? monthlyDoc.orders : 0;

      pendingOrders = await Order.countDocuments({ restaurantId, status: 'pending' });

      const [monthStart, monthEnd] = monthRange(now, clock);
      topDishes = await Order.aggregate([
        { $match: { restaurantId: restaurantOid, status: 'completed', ...paidBetween(monthStart, monthEnd) } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', sales: { $sum: '$items.quantity' } } },
        { $sort: { sales: -1 } },
        { $limit: 4 },
        { $project: { name: '$_id', sales: 1, _id: 0 } }
      ]);
    }

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
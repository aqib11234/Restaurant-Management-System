const router = require('express').Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

router.get('/stats', authenticateAndEnforceLicense, async (req, res) => {
  try {
    // Extract restaurantId from JWT (guaranteed to exist by middleware)
    const restaurantId = req.user.restaurantId;

    const totalFoodItems = await FoodItem.countDocuments({ restaurantId, available: true });
    const totalTables = 20; // Fixed number, could be dynamic

    const { startDate, endDate } = req.query;

    let dailySales = 0;
    let monthlySales = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let topDishes = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Include the entire end date
      end.setHours(23, 59, 59, 999);

      // Fetch aggregated data for the selected period directly from Orders
      const orderStats = await Order.aggregate([
        { 
          $match: { 
            restaurantId, 
            status: 'completed',
            createdAt: { $gte: start, $lte: end }
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
        status: { $ne: 'completed' },
        createdAt: { $gte: start, $lte: end }
      });

      topDishes = await Order.aggregate([
        { 
          $match: { 
            restaurantId, 
            status: 'completed',
            createdAt: { $gte: start, $lte: end }
          } 
        },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', sales: { $sum: '$items.quantity' } } },
        { $sort: { sales: -1 } },
        { $limit: 4 },
        { $project: { name: '$_id', sales: 1, _id: 0 } }
      ]);
    } else {
      // Get daily sales from SalesHistory (persistent, not affected by deletions)
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const dailySalesDoc = await SalesHistory.findOne({
        restaurantId,
        date: today,
        period: 'daily'
      });
      dailySales = dailySalesDoc ? dailySalesDoc.revenue : 0;

      // Check if we need to finalize previous months
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;

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
        await MonthlySales.findOneAndDelete({ _id: month._id, restaurantId });
      }

      // Get current monthly sales from MonthlySales collection
      const monthlySalesDoc = await MonthlySales.findOne({ restaurantId, year: currentYear, month: currentMonth });
      monthlySales = monthlySalesDoc ? monthlySalesDoc.totalSales : 0;

      const allMonthlySales = await MonthlySales.find({ restaurantId });
      completedOrders = allMonthlySales.reduce((sum, month) => sum + month.totalOrders, 0);
      
      pendingOrders = await Order.countDocuments({ restaurantId, status: { $ne: 'completed' } });

      topDishes = await Order.aggregate([
        { $match: { restaurantId, status: 'completed' } },
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
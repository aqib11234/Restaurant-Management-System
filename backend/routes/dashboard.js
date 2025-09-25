const router = require('express').Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const { authenticateToken } = require('../middleware/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalFoodItems = await FoodItem.countDocuments({ available: true });
    const totalTables = 20; // Fixed number, could be dynamic

    // Get daily sales from SalesHistory (persistent, not affected by deletions)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const dailySalesDoc = await SalesHistory.findOne({
      date: today,
      period: 'daily'
    });
    const dailySales = dailySalesDoc ? dailySalesDoc.revenue : 0;

    // Check if we need to finalize previous months
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1; // getUTCMonth() returns 0-11

    // Get all monthly sales that are not the current month
    const previousMonths = await MonthlySales.find({
      $or: [
        { year: { $lt: currentYear } },
        { year: currentYear, month: { $lt: currentMonth } }
      ]
    });

    // Save previous months to SalesHistory
    for (const month of previousMonths) {
      const monthDate = new Date(month.year, month.month - 1, 1);
      await SalesHistory.findOneAndUpdate(
        { date: monthDate, period: 'monthly' },
        {
          orders: month.totalOrders,
          revenue: month.totalSales,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      // Remove from MonthlySales after saving
      await MonthlySales.findByIdAndDelete(month._id);
    }

    // Get current monthly sales from MonthlySales collection
    const monthlySalesDoc = await MonthlySales.findOne({ year: currentYear, month: currentMonth });
    const monthlySales = monthlySalesDoc ? monthlySalesDoc.totalSales : 0;

    // Order status counts - use historical counts (not affected by deletions)
    // For completed orders, use MonthlySales totalOrders (persistent)
    const allMonthlySales = await MonthlySales.find({});
    const completedOrders = allMonthlySales.reduce((sum, month) => sum + month.totalOrders, 0);

    // For pending orders, count current pending orders (but this will decrease on deletion)
    // To make it persistent, we'd need a separate counter - for now, count current
    const pendingOrders = await Order.countDocuments({ status: { $ne: 'completed' } });

    // Top selling dishes
    const topDishes = await Order.aggregate([
      { $match: { status: 'completed' } },
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
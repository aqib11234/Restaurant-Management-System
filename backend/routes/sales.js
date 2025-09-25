const router = require('express').Router();
const Order = require('../models/Order');
const SalesHistory = require('../models/SalesHistory');
const { authenticateToken } = require('../middleware/auth');

// Original sales endpoint for backward compatibility
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;

    let salesData;

    if (period === 'daily') {
      // For daily, return from SalesHistory (data is stored incrementally)
      let query = { period: 'daily' };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        query.date = { $gte: last7Days };
      }

      salesData = await SalesHistory.find(query).sort({ date: -1 });
    } else if (period === 'weekly') {
      // For weekly, aggregate from daily SalesHistory
      const last4Weeks = new Date();
      last4Weeks.setDate(last4Weeks.getDate() - 28);

      salesData = await SalesHistory.aggregate([
        { $match: { period: 'daily', date: { $gte: last4Weeks } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              week: { $week: '$date' }
            },
            orders: { $sum: '$orders' },
            revenue: { $sum: '$revenue' }
          }
        },
        { $sort: { '_id.year': -1, '_id.week': -1 } },
        {
          $project: {
            date: {
              $dateFromParts: {
                isoWeekYear: '$_id.year',
                isoWeek: '$_id.week'
              }
            },
            orders: 1,
            revenue: { $round: ['$revenue', 2] }
          }
        }
      ]);
    } else if (period === 'monthly') {
      // For monthly, return from SalesHistory
      let query = { period: 'monthly' };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else {
        const last6Months = new Date();
        last6Months.setMonth(last6Months.getMonth() - 6);
        query.date = { $gte: last6Months };
      }

      salesData = await SalesHistory.find(query).sort({ date: -1 });
    }

    res.json(salesData);
  } catch (error) {
    console.error('Get sales data error:', error);
    res.status(500).json({ message: 'Error fetching sales data' });
  }
});

// New detailed sales history endpoint - uses stored historical data
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { groupBy = 'daily', startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    // No default date filter - show all records if no dates provided

    let salesData;

    if (groupBy === 'daily') {
      // Get daily sales history with stored order details
      salesData = await SalesHistory.find({
        period: 'daily',
        ...dateFilter
      })
      .sort({ date: -1 })
      .lean();

      // Transform to match expected format
      salesData = salesData.map(day => ({
        period: 'daily',
        date: day.date.toISOString(),
        displayName: day.date.toISOString().split('T')[0],
        totalOrders: day.orders,
        totalRevenue: day.revenue,
        orders: day.orderDetails || []
      }));
    } else if (groupBy === 'weekly') {
      // Aggregate daily data into weekly
      const dailyData = await SalesHistory.find({
        period: 'daily',
        ...dateFilter
      }).sort({ date: 1 }).lean();

      const weeklyMap = new Map();

      dailyData.forEach(day => {
        const year = day.date.getFullYear();
        const week = Math.ceil((day.date.getDate() - day.date.getDay() + 1) / 7);
        const weekKey = `${year}-W${week}`;

        if (!weeklyMap.has(weekKey)) {
          const weekStart = new Date(day.date);
          weekStart.setDate(day.date.getDate() - day.date.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          weeklyMap.set(weekKey, {
            period: 'weekly',
            weekStart,
            weekEnd,
            displayName: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            totalOrders: 0,
            totalRevenue: 0,
            orders: []
          });
        }

        const weekData = weeklyMap.get(weekKey);
        weekData.totalOrders += day.orders;
        weekData.totalRevenue += day.revenue;
        // Orders will be fetched on demand
      });

      salesData = Array.from(weeklyMap.values()).sort((a, b) => b.weekStart - a.weekStart);
    } else if (groupBy === 'monthly') {
      // Get monthly sales history with stored order details
      salesData = await SalesHistory.find({
        period: 'monthly',
        ...dateFilter
      })
      .sort({ date: -1 })
      .lean();

      // Transform to match expected format
      salesData = salesData.map(month => ({
        period: 'monthly',
        date: month.date.toISOString(),
        displayName: month.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalOrders: month.orders,
        totalRevenue: month.revenue,
        orders: [] // Will be loaded on demand
      }));
    }

    res.json(salesData);
  } catch (error) {
    console.error('Get sales history error:', error);
    res.status(500).json({ message: 'Error fetching sales history' });
  }
});

// Get orders for a specific period
router.get('/orders/:period/:date', authenticateToken, async (req, res) => {
  try {
    const { period, date } = req.params;
    const { page = 1, limit = 50 } = req.query;

    let startDate, endDate;

    const dateObj = new Date(date);

    if (period === 'daily') {
      startDate = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate()
      ));
      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 1);
    } else if (period === 'monthly') {
      startDate = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        1
      ));
      endDate = new Date(startDate);
      endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    } else if (period === 'weekly') {
      // For weekly, we need to calculate the week start and end
      const weekStart = new Date(dateObj);
      weekStart.setUTCDate(dateObj.getUTCDate() - dateObj.getUTCDay());
      startDate = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate()));
      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 7);
    } else {
      return res.status(400).json({ message: 'Invalid period' });
    }

    const orders = await Order.find({
      status: 'completed',
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('_id table total createdAt items');

    const total = await Order.countDocuments({
      status: 'completed',
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    });

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get period orders error:', error);
    res.status(500).json({ message: 'Error fetching period orders' });
  }
});


module.exports = router;
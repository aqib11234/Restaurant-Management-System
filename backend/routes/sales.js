const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const SalesHistory = require('../models/SalesHistory');
const { authenticateAndEnforceLicense } = require('../middleware/auth');
const { clockOf, rangeForKey, paidBetween } = require('../utils/time');

// Original sales endpoint for backward compatibility
router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { period = 'daily', startDate, endDate } = req.query;

    if ((startDate && isNaN(new Date(startDate))) || (endDate && isNaN(new Date(endDate)))) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    let salesData;

    if (period === 'daily') {
      // For daily, return from SalesHistory (data is stored incrementally)
      let query = { restaurantId, period: 'daily' };

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
        { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), period: 'daily', date: { $gte: last4Weeks } } },
        {
          $group: {
            _id: {
              year: { $isoWeekYear: '$date' },
              week: { $isoWeek: '$date' }
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
      let query = { restaurantId, period: 'monthly' };

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
router.get('/history', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { groupBy = 'daily', startDate, endDate } = req.query;

    if ((startDate && isNaN(new Date(startDate))) || (endDate && isNaN(new Date(endDate)))) {
      return res.status(400).json({ message: 'Invalid date' });
    }

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
        restaurantId,
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
        restaurantId,
        period: 'daily',
        ...dateFilter
      }).sort({ date: 1 }).lean();

      const weeklyMap = new Map();

      dailyData.forEach(day => {
        // Weeks start on Sunday (matches /orders/weekly/:date); dates are stored as UTC midnight
        const weekStart = new Date(day.date);
        weekStart.setUTCDate(day.date.getUTCDate() - day.date.getUTCDay());
        const weekKey = weekStart.toISOString();

        if (!weeklyMap.has(weekKey)) {
          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

          weeklyMap.set(weekKey, {
            period: 'weekly',
            date: weekStart.toISOString(),
            weekStart,
            weekEnd,
            displayName: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`,
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
        restaurantId,
        period: 'monthly',
        ...dateFilter
      })
        .sort({ date: -1 })
        .lean();

      // Transform to match expected format
      salesData = salesData.map(month => ({
        period: 'monthly',
        date: month.date.toISOString(),
        displayName: month.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' }),
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
router.get('/orders/:period/:date', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { period, date } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const dateObj = new Date(date);
    if (isNaN(dateObj)) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period' });
    }

    // date is a stored day/month/week-start key; turn it into the local business-day range
    const [startDate, endDate] = rangeForKey(dateObj, period, clockOf(req.restaurant));
    const paidFilter = { restaurantId, status: 'completed', ...paidBetween(startDate, endDate) };

    const orders = await Order.find(paidFilter)
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('_id table total createdAt paidAt items waiterName amountReceived');

    const total = await Order.countDocuments(paidFilter);

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


// Breakdown behind the PDF report: best-selling dishes, sales per waiter and,
// for a single period, every paid order. Either period+date (one stored
// period) or start+end (ISO instants) choose the range; neither means all time.
router.get('/breakdown', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantOid = new mongoose.Types.ObjectId(req.user.restaurantId);
    const { period, date, start, end, includeOrders } = req.query;

    let range = null;
    if (period && date) {
      const key = new Date(date);
      if (isNaN(key) || !['daily', 'weekly', 'monthly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period' });
      }
      range = rangeForKey(key, period, clockOf(req.restaurant));
    } else if (start && end) {
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return res.status(400).json({ message: 'Invalid date' });
      range = [s, new Date(e.getTime() + 1)];
    }

    const match = { restaurantId: restaurantOid, status: 'completed', ...(range && paidBetween(range[0], range[1])) };

    const [dishes, waiters, orders] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } }
      ]),
      Order.aggregate([
        { $match: match },
        { $group: { _id: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$waiterName', ''] } }, 0] }, '$waiterName', 'No waiter'] }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
        { $project: { _id: 0, name: '$_id', orders: 1, revenue: 1 } }
      ]),
      includeOrders
        ? Order.find(match).sort({ paidAt: 1, createdAt: 1 }).limit(1000)
          .select('table total createdAt paidAt items waiterName').lean()
        : Promise.resolve(undefined)
    ]);

    res.json({ dishes, waiters, ...(orders && { orders }) });
  } catch (error) {
    console.error('Sales breakdown error:', error);
    res.status(500).json({ message: 'Error building sales report' });
  }
});

module.exports = router;
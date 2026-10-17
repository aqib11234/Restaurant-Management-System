const mongoose = require('mongoose');
const router = require('express').Router();
const Waiter = require('../models/Waiter');
const Order = require('../models/Order');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

const { clockOf, dayRange, monthRange, paidBetween } = require('../utils/time');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─────────────────────────────────────────────
// GET /api/waiters  — list all waiters for this restaurant
// ─────────────────────────────────────────────
router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId; // always from JWT, never from client
    const { includeInactive } = req.query;

    const query = { restaurantId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const waiters = await Waiter.find(query).sort({ name: 1 });
    res.json({ waiters });
  } catch (error) {
    console.error('Get waiters error:', error);
    res.status(500).json({ message: 'Error fetching waiters' });
  }
});

// ─────────────────────────────────────────────
// GET /api/waiters/stats  — waiter order-count stats for dashboard
// ─────────────────────────────────────────────
router.get('/stats', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const mongoose = require('mongoose');

    // ⚠️  CRITICAL: aggregate() does NOT auto-cast strings to ObjectId.
    //    req.user.restaurantId comes from the JWT payload as a plain string.
    //    We must convert it here or every $match will return 0 results.
    const restaurantOid = new mongoose.Types.ObjectId(req.user.restaurantId);

    // Today and this month on the restaurant's clock: "today" resets at 12am
    // local time and "this month" on the 1st. Orders count when they are paid.
    const clock = clockOf(req.restaurant);
    const now = new Date();
    const [todayStart, todayEnd] = dayRange(now, clock);
    const [monthStart, monthEnd] = monthRange(now, clock);

    const [totalStats, todayStats, monthStats, waiters] = await Promise.all([
      // ── Total completed orders per waiter (all time) ──────────────────────
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurantOid,
            waiterId: { $ne: null },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$waiterId',
            waiterName: { $first: '$waiterName' },
            totalOrders: { $sum: 1 },
            totalSales: { $sum: '$total' }
          }
        }
      ]),

      // ── Today's completed orders per waiter ───────────────────────────────
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurantOid,
            waiterId: { $ne: null },
            status: 'completed',
            ...paidBetween(todayStart, todayEnd)
          }
        },
        {
          $group: {
            _id: '$waiterId',
            todayOrders: { $sum: 1 },
            todaySales: { $sum: '$total' }
          }
        }
      ]),

      // ── This month's completed orders per waiter ──────────────────────────
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurantOid,
            waiterId: { $ne: null },
            status: 'completed',
            ...paidBetween(monthStart, monthEnd)
          }
        },
        {
          $group: {
            _id: '$waiterId',
            monthOrders: { $sum: 1 },
            monthSales: { $sum: '$total' }
          }
        }
      ]),

      // ── All waiters for this restaurant (including inactive) ──────────────
      Waiter.find({ restaurantId: restaurantOid }).sort({ name: 1 }).lean()
    ]);

    // Build lookup maps  (key = waiterId ObjectId as string)
    const totalMap = {};
    totalStats.forEach(s => { totalMap[s._id.toString()] = s; });

    const todayMap = {};
    todayStats.forEach(s => { todayMap[s._id.toString()] = s; });

    const monthMap = {};
    monthStats.forEach(s => { monthMap[s._id.toString()] = s; });

    // Merge into per-waiter result rows
    const result = waiters.map(w => {
      const id = w._id.toString();
      const total = totalMap[id] || {};
      const today = todayMap[id] || {};
      const month = monthMap[id] || {};
      return {
        _id: w._id,
        name: w.name,
        phone: w.phone,
        isActive: w.isActive,
        totalOrders: total.totalOrders || 0,
        totalSales: Math.round(total.totalSales || 0),
        todayOrders: today.todayOrders || 0,
        todaySales: Math.round(today.todaySales || 0),
        monthOrders: month.monthOrders || 0,
        monthSales: Math.round(month.monthSales || 0)
      };
    });

    res.json({ waiterStats: result });
  } catch (error) {
    console.error('Waiter stats error:', error);
    res.status(500).json({ message: 'Error fetching waiter stats' });
  }
});


// ─────────────────────────────────────────────
// POST /api/waiters  — create a new waiter
// ─────────────────────────────────────────────
router.post('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { name, phone } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Waiter name must be at least 2 characters' });
    }

    // Prevent duplicate names within the same restaurant
    const existing = await Waiter.findOne({
      restaurantId,
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
      isActive: true
    });
    if (existing) {
      return res.status(409).json({ message: 'A waiter with this name already exists' });
    }

    const waiter = new Waiter({
      restaurantId,
      name: name.trim(),
      phone: (phone || '').trim()
    });

    await waiter.save();
    res.status(201).json({ message: 'Waiter created successfully', waiter });
  } catch (error) {
    console.error('Create waiter error:', error);
    res.status(500).json({ message: 'Error creating waiter' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/waiters/:id  — update a waiter
// ─────────────────────────────────────────────
router.put('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const { name, phone, isActive, isPresent } = req.body;

    // Find waiter ensuring it belongs to this restaurant (prevents cross-tenant access)
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Waiter not found' });
    }
    const waiter = await Waiter.findOne({ _id: id, restaurantId });
    if (!waiter) {
      return res.status(404).json({ message: 'Waiter not found' });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Waiter name must be at least 2 characters' });
      }
      // Check duplicate name (excluding current waiter)
      const duplicate = await Waiter.findOne({
        restaurantId,
        name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
        _id: { $ne: id },
        isActive: true
      });
      if (duplicate) {
        return res.status(409).json({ message: 'A waiter with this name already exists' });
      }
      waiter.name = name.trim();
    }

    if (phone !== undefined) waiter.phone = String(phone).trim();
    if (isActive !== undefined) waiter.isActive = Boolean(isActive);
    if (isPresent !== undefined) waiter.isPresent = Boolean(isPresent);
    waiter.updatedAt = new Date();

    await waiter.save();
    res.json({ message: 'Waiter updated successfully', waiter });
  } catch (error) {
    console.error('Update waiter error:', error);
    res.status(500).json({ message: 'Error updating waiter' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/waiters/:id  — hard delete (use PUT isActive=false to deactivate)
// ─────────────────────────────────────────────
router.delete('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;

    const waiter = await Waiter.findOneAndDelete({ _id: id, restaurantId });
    if (!waiter) {
      return res.status(404).json({ message: 'Waiter not found' });
    }

    res.json({ message: 'Waiter deleted successfully' });
  } catch (error) {
    console.error('Delete waiter error:', error);
    res.status(500).json({ message: 'Error deleting waiter' });
  }
});

module.exports = router;

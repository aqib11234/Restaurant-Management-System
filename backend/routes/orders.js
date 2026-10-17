const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const Waiter = require('../models/Waiter');
const { authenticateAndEnforceLicense } = require('../middleware/auth');
const { dayKey, clockOf } = require('../utils/time');

// Simple in-memory rate limiter (for production, use express-rate-limit)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 1000; // per window (a restaurant's staff share one IP)

// Serialises order creation per table within this server process, so two devices
// opening the same table at the same moment end up on one bill. The partial unique
// index on Order backs this up at the database level where it can be built.
const tableLocks = new Map();
const withTableLock = async (key, fn) => {
  const previous = tableLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const chained = previous.then(() => current);
  tableLocks.set(key, chained);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (tableLocks.get(key) === chained) tableLocks.delete(key);
  }
};

const checkRateLimit = (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, []);
  }

  const requests = requestCounts.get(clientId);
  // Remove old requests
  const validRequests = requests.filter(time => time > windowStart);
  requestCounts.set(clientId, validRequests);

  if (validRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ message: 'Too many requests, please try again later' });
  }

  validRequests.push(now);
  next();
};

router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { status, table, page = 1, limit = 100 } = req.query;
    const query = { restaurantId };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (table) {
      query.table = parseInt(table);
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.post('/', authenticateAndEnforceLicense, checkRateLimit, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { table, items, waiterId } = req.body;

    // Validation
    if (table == null || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid order data' });
    }

    const tableNum = parseInt(table);
    if (isNaN(tableNum) || tableNum < 0 || tableNum > 1000) {
      return res.status(400).json({ message: 'Invalid table number' });
    }

    // Validate items
    for (const item of items) {
      if (!item || !item.foodItem || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ message: 'Invalid item data' });
      }
    }

    // Prices and names always come from the database, never from the client
    const FoodItem = require('../models/FoodItem');
    const foodItemIds = [...new Set(items.map(item => String(item.foodItem)))];
    if (foodItemIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid item data' });
    }
    const existingItems = await FoodItem.find({ _id: { $in: foodItemIds }, restaurantId, available: true });
    if (existingItems.length !== foodItemIds.length) {
      return res.status(400).json({ message: 'Some food items are not available' });
    }
    const menu = new Map(existingItems.map(f => [String(f._id), f]));
    const pricedItems = items.map(item => {
      const f = menu.get(String(item.foodItem));
      return { foodItem: f._id, name: f.name, price: f.price, quantity: item.quantity };
    });
    const totalAmount = pricedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Optional waiter validation — waiterId MUST belong to this restaurant
    let resolvedWaiterId = null;
    let resolvedWaiterName = '';
    if (waiterId) {
      const waiter = await Waiter.findOne({ _id: waiterId, restaurantId, isActive: true });
      if (!waiter) {
        return res.status(400).json({ message: 'Selected waiter not found or does not belong to this restaurant' });
      }
      resolvedWaiterId = waiter._id;
      resolvedWaiterName = waiter.name;
    }

    // A dine-in table has at most one open bill: if one exists (e.g. another
    // device just opened it), add these items to it instead of starting a second bill
    const mergeIntoOpenOrder = () => Order.findOneAndUpdate(
      { restaurantId, table: tableNum, status: 'pending' },
      { $push: { items: { $each: pricedItems } }, $inc: { total: totalAmount }, $set: { updatedAt: new Date() } },
      { new: true, sort: { createdAt: 1 } }
    );

    const placeOrder = async () => {
      if (tableNum > 0) {
        const merged = await mergeIntoOpenOrder();
        if (merged) {
          return res.json({ message: 'Items added to the open order for this table', order: merged, merged: true });
        }
      }

      const order = new Order({
        restaurantId,
        table: tableNum,
        items: pricedItems,
        total: totalAmount,
        waiterId: resolvedWaiterId,
        waiterName: resolvedWaiterName
      });

      try {
        await order.save();
      } catch (err) {
        // Lost a race with another device opening the same table
        if (err.code === 11000 && tableNum > 0) {
          const merged = await mergeIntoOpenOrder();
          if (merged) {
            return res.json({ message: 'Items added to the open order for this table', order: merged, merged: true });
          }
        }
        throw err;
      }
      res.status(201).json({ message: 'Order placed successfully', order });
    };

    if (tableNum > 0) {
      await withTableLock(`${restaurantId}:${tableNum}`, placeOrder);
    } else {
      await placeOrder();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Adds (sign = 1) or removes (sign = -1) a completed order from all sales records
async function applySales(order, sign, salesDay) {
  // salesDay is the business day the sale was counted in. Orders completed
  // before business days existed were bucketed by their UTC creation date.
  const created = new Date(order.createdAt);
  const dayDate = salesDay || new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
  const year = dayDate.getUTCFullYear();
  const month = dayDate.getUTCMonth() + 1;
  const monthDate = new Date(Date.UTC(year, month - 1, 1));
  const inc = { orders: sign, revenue: sign * order.total };

  await MonthlySales.findOneAndUpdate(
    { restaurantId: order.restaurantId, year, month },
    { $inc: { totalSales: sign * order.total, totalOrders: sign }, $set: { updatedAt: new Date() } },
    { upsert: sign > 0 }
  );

  const orderDetails = {
    orderId: order._id,
    table: order.table,
    total: order.total,
    createdAt: order.createdAt,
    status: 'completed',
    items: order.items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price }))
  };

  for (const [date, period] of [[dayDate, 'daily'], [monthDate, 'monthly']]) {
    await SalesHistory.findOneAndUpdate(
      { restaurantId: order.restaurantId, date, period },
      sign > 0
        ? { $inc: inc, $push: { orderDetails }, $set: { updatedAt: new Date() } }
        : { $inc: inc, $pull: { orderDetails: { orderId: order._id } }, $set: { updatedAt: new Date() } },
      { upsert: sign > 0 }
    );
  }
}

router.put('/:id/status', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const restaurantId = req.user.restaurantId;
    const order = await Order.findOne({ _id: id, restaurantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // The cashier collected money against the total they saw; if items were added
    // since then, stop and show the new total instead of recording a different amount
    const { expectedTotal } = req.body;
    if (status === 'completed' && expectedTotal != null && Math.abs(Number(expectedTotal) - order.total) > 0.005) {
      return res.status(409).json({
        message: `This bill changed to PKR ${Math.round(order.total)}. Check the amount before taking payment.`,
        code: 'TOTAL_CHANGED',
        order
      });
    }

    const previousStatus = order.status;
    if (previousStatus === status) {
      return res.json({ message: 'Order status unchanged', order });
    }

    const previousSalesDay = order.salesDay;

    if (status === 'completed') {
      const { amountReceived } = req.body;
      if (amountReceived != null) {
        const received = Number(amountReceived);
        if (!Number.isFinite(received) || received < order.total) {
          return res.status(400).json({ message: 'Amount received is less than the bill' });
        }
        order.amountReceived = received;
      }
      order.paidAt = new Date();
      order.salesDay = dayKey(order.paidAt, clockOf(req.restaurant));
    } else if (previousStatus === 'completed') {
      order.amountReceived = null;
      order.paidAt = null;
      order.salesDay = null;
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // Keep sales records in step with the order: only completed orders count as revenue
    if (status === 'completed') {
      await applySales(order, 1, order.salesDay);
    } else if (previousStatus === 'completed') {
      await applySales(order, -1, previousSalesDay);
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

router.put('/:id/add-items', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const { items: newItems } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (!Array.isArray(newItems) || newItems.length === 0 ||
      newItems.some(i => !i || !mongoose.isValidObjectId(i.foodItem) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 100)) {
      return res.status(400).json({ message: 'Invalid item data' });
    }

    const order = await Order.findOne({ _id: id, restaurantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only add items to pending orders' });
    }

    // Prices always come from the database
    const FoodItem = require('../models/FoodItem');
    const ids = [...new Set(newItems.map(i => String(i.foodItem)))];
    const found = await FoodItem.find({ _id: { $in: ids }, restaurantId, available: true });
    if (found.length !== ids.length) {
      return res.status(400).json({ message: 'Some food items are not available' });
    }
    const menu = new Map(found.map(f => [String(f._id), f]));

    for (const i of newItems) {
      const f = menu.get(String(i.foodItem));
      const existing = order.items.find(o => String(o.foodItem) === String(f._id) && o.price === f.price);
      if (existing) {
        existing.quantity += i.quantity;
      } else {
        order.items.push({ foodItem: f._id, name: f.name, price: f.price, quantity: i.quantity });
      }
    }
    order.total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    order.updatedAt = new Date();

    await order.save();

    res.json({ message: 'Items added to order successfully', order });
  } catch (error) {
    console.error('Add items to order error:', error);
    res.status(500).json({ message: 'Error adding items to order' });
  }
});

router.put('/:id/remove-item-quantity', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIndex } = req.body; // single index to decrease quantity

    const restaurantId = req.user.restaurantId;
    const order = await Order.findOne({ _id: id, restaurantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only modify items in pending orders' });
    }

    if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= order.items.length) {
      return res.status(400).json({ message: 'Invalid item index' });
    }

    const item = order.items[itemIndex];
    if (item.quantity > 1) {
      // Decrease quantity by 1
      item.quantity -= 1;
      order.total -= item.price;
    } else {
      // Remove the item if quantity is 1
      order.total -= item.price * item.quantity;
      order.items.splice(itemIndex, 1);
    }

    order.updatedAt = new Date();

    // If no items left, cancel the order
    if (order.items.length === 0) {
      order.status = 'cancelled';
    }

    await order.save();

    res.json({ message: 'Item quantity decreased successfully', order });
  } catch (error) {
    console.error('Remove item quantity error:', error);
    res.status(500).json({ message: 'Error modifying item quantity' });
  }
});

// Set the quantity of one line on an open bill (0 removes the line)
router.put('/:id/items/:index', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const index = Number(req.params.index);
    const { quantity } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100) {
      return res.status(400).json({ message: 'Quantity must be a whole number from 0 to 100' });
    }

    const order = await Order.findOne({ _id: id, restaurantId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only open orders can be changed' });
    }
    if (!Number.isInteger(index) || index < 0 || index >= order.items.length) {
      return res.status(400).json({ message: 'Invalid item' });
    }

    if (quantity === 0) {
      order.items.splice(index, 1);
    } else {
      order.items[index].quantity = quantity;
    }
    order.total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    order.updatedAt = new Date();
    // An empty bill is closed rather than left open on the table
    if (order.items.length === 0) {
      order.status = 'cancelled';
    }
    await order.save();

    res.json({ message: 'Order updated', order });
  } catch (error) {
    console.error('Set item quantity error:', error);
    res.status(500).json({ message: 'Error updating order' });
  }
});

// Change (or clear) the waiter on an order
router.put('/:id/waiter', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const { waiterId } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOne({ _id: id, restaurantId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (waiterId) {
      if (!mongoose.isValidObjectId(waiterId)) {
        return res.status(400).json({ message: 'Selected waiter not found' });
      }
      const waiter = await Waiter.findOne({ _id: waiterId, restaurantId, isActive: true });
      if (!waiter) {
        return res.status(400).json({ message: 'Selected waiter not found' });
      }
      order.waiterId = waiter._id;
      order.waiterName = waiter.name;
    } else {
      order.waiterId = null;
      order.waiterName = '';
    }
    order.updatedAt = new Date();
    await order.save();

    res.json({ message: 'Waiter updated', order });
  } catch (error) {
    console.error('Change waiter error:', error);
    res.status(500).json({ message: 'Error changing waiter' });
  }
});

router.delete('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const { id } = req.params;

    const restaurantId = req.user.restaurantId;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOneAndDelete({ _id: id, restaurantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Error deleting order' });
  }
});

module.exports = router;
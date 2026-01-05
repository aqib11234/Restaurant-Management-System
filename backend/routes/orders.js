const router = require('express').Router();
const Order = require('../models/Order');
const MonthlySales = require('../models/MonthlySales');
const SalesHistory = require('../models/SalesHistory');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

// Simple in-memory rate limiter (for production, use express-rate-limit)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

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
    const { table, items, total } = req.body;

    // Validation
    if (table == null || !items || !Array.isArray(items) || items.length === 0 || total == null) {
      return res.status(400).json({ message: 'Invalid order data' });
    }

    const tableNum = parseInt(table);
    if (isNaN(tableNum) || tableNum < 0 || tableNum > 1000) {
      return res.status(400).json({ message: 'Invalid table number' });
    }

    // Validate items
    for (const item of items) {
      if (!item.foodItem || !item.name || typeof item.price !== 'number' || item.price < 0 ||
        typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ message: 'Invalid item data' });
      }
    }

    const totalAmount = parseFloat(total);
    if (isNaN(totalAmount) || totalAmount < 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    // Verify food items exist and belong to this restaurant
    const foodItemIds = items.map(item => item.foodItem);
    const existingItems = await require('../models/FoodItem').find({ _id: { $in: foodItemIds }, restaurantId, available: true });
    if (existingItems.length !== foodItemIds.length) {
      return res.status(400).json({ message: 'Some food items are not available' });
    }

    const order = new Order({
      restaurantId,
      table: tableNum,
      items,
      total: totalAmount
    });

    await order.save();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

router.put('/:id/status', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // Handle sales history updates based on status changes
    if (status === 'completed' && previousStatus !== 'completed') {
      // Order is being completed - add to sales history
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getUTCFullYear();
      const month = orderDate.getUTCMonth() + 1;
      const dayDate = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), orderDate.getUTCDate()));


      // Update monthly sales
      await MonthlySales.findOneAndUpdate(
        { restaurantId: order.restaurantId, year, month },
        {
          $inc: { totalSales: order.total, totalOrders: 1 },
          $set: { restaurantId: order.restaurantId, updatedAt: new Date() }
        },
        { upsert: true, new: true }
      );

      // Prepare order details for storage
      const orderDetails = {
        orderId: order._id,
        table: order.table,
        total: order.total,
        createdAt: order.createdAt,
        status: order.status,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // Update daily sales history
      await SalesHistory.findOneAndUpdate(
        { restaurantId: order.restaurantId, date: dayDate, period: 'daily' },
        {
          $inc: { orders: 1, revenue: order.total },
          $push: { orderDetails: orderDetails },
          $set: { restaurantId: order.restaurantId, updatedAt: new Date() }
        },
        { upsert: true, new: true }
      );

      // Update monthly sales history
      const monthDate = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), 1));
      await SalesHistory.findOneAndUpdate(
        { restaurantId: order.restaurantId, date: monthDate, period: 'monthly' },
        {
          $inc: { orders: 1, revenue: order.total },
          $push: { orderDetails: orderDetails },
          $set: { restaurantId: order.restaurantId, updatedAt: new Date() }
        },
        { upsert: true, new: true }
      );
    } else if (status === 'cancelled' && previousStatus === 'completed') {
      // Order is being canceled after being completed - remove from sales history
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getUTCFullYear();
      const month = orderDate.getUTCMonth() + 1;
      const dayDate = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), orderDate.getUTCDate()));

      // Remove from monthly sales
      await MonthlySales.findOneAndUpdate(
        { restaurantId: order.restaurantId, year, month },
        {
          $inc: { totalSales: -order.total, totalOrders: -1 },
          $set: { updatedAt: new Date() }
        }
      );

      // Remove from daily sales history
      await SalesHistory.findOneAndUpdate(
        { restaurantId: order.restaurantId, date: dayDate, period: 'daily' },
        {
          $inc: { orders: -1, revenue: -order.total },
          $pull: { orderDetails: { orderId: order._id } },
          $set: { updatedAt: new Date() }
        }
      );

      // Remove from monthly sales history
      const monthDate = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), 1));
      await SalesHistory.findOneAndUpdate(
        { restaurantId: order.restaurantId, date: monthDate, period: 'monthly' },
        {
          $inc: { orders: -1, revenue: -order.total },
          $pull: { orderDetails: { orderId: order._id } },
          $set: { updatedAt: new Date() }
        }
      );
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
    const { items: newItems, additionalTotal } = req.body;

    const order = await Order.findOne({ _id: id, restaurantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only add items to pending orders' });
    }

    // Add new items to existing items
    order.items.push(...newItems);
    order.total += parseFloat(additionalTotal);
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

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only modify items in pending orders' });
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
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

router.delete('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

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
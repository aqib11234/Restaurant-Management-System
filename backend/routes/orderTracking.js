const router = require('express').Router();
const Order = require('../models/Order');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

/**
 * ORDER TRACKING ROUTES
 * 
 * Simplified 3-state system: pending, completed, cancelled
 * Latest orders displayed first (sorted by createdAt DESC)
 */

/**
 * GET /api/order-tracking/:orderId
 * Track a specific order by ID
 */
router.get('/:orderId', authenticateAndEnforceLicense, async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, restaurantId })
            .populate('items.foodItem', 'name category image')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Calculate time elapsed
        const now = new Date();
        const orderTime = new Date(order.createdAt);
        const elapsedMinutes = Math.floor((now - orderTime) / 1000 / 60);

        // Status messages for 3-state system
        let statusMessage = '';
        let estimatedTime = '';

        switch (order.status) {
            case 'pending':
                estimatedTime = '15-20 minutes';
                statusMessage = 'Your order is being prepared';
                break;
            case 'completed':
                estimatedTime = 'Completed';
                statusMessage = 'Your order has been completed';
                break;
            case 'cancelled':
                estimatedTime = 'Cancelled';
                statusMessage = 'This order has been cancelled';
                break;
            default:
                estimatedTime = 'Unknown';
                statusMessage = 'Order status unknown';
        }

        res.json({
            order: {
                id: order._id,
                table: order.table,
                items: order.items,
                total: order.total,
                status: order.status,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            },
            tracking: {
                currentStatus: order.status,
                statusMessage,
                estimatedTime,
                elapsedMinutes,
                timeline: [
                    {
                        status: 'pending',
                        label: 'Order Placed',
                        completed: true,
                        timestamp: order.createdAt
                    },
                    {
                        status: 'completed',
                        label: order.status === 'cancelled' ? 'Cancelled' : 'Completed',
                        completed: order.status === 'completed' || order.status === 'cancelled',
                        timestamp: order.status === 'completed' || order.status === 'cancelled' ? order.updatedAt : null
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Order tracking error:', error);
        res.status(500).json({ message: 'Error tracking order' });
    }
});

/**
 * GET /api/order-tracking/table/:tableNumber
 * Track all orders for a specific table
 * Shows only PENDING orders (active orders for the table)
 * Latest orders first
 */
router.get('/table/:tableNumber', authenticateAndEnforceLicense, async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { tableNumber } = req.params;

        // Only show pending orders for the table
        const orders = await Order.find({
            restaurantId,
            table: parseInt(tableNumber),
            status: 'pending'
        })
            .sort({ createdAt: -1 }) // Latest first
            .limit(10)
            .lean();

        const ordersWithTracking = orders.map(order => {
            const now = new Date();
            const orderTime = new Date(order.createdAt);
            const elapsedMinutes = Math.floor((now - orderTime) / 1000 / 60);

            return {
                id: order._id,
                table: order.table,
                total: order.total,
                status: order.status,
                statusMessage: 'Being prepared',
                estimatedTime: '15-20 minutes',
                itemCount: order.items.length,
                elapsedMinutes,
                createdAt: order.createdAt,
                isUrgent: elapsedMinutes > 20 // Flag orders older than 20 minutes
            };
        });

        res.json({
            table: parseInt(tableNumber),
            activeOrders: ordersWithTracking.length,
            orders: ordersWithTracking,
            tableStatus: ordersWithTracking.length > 0 ? 'occupied' : 'free'
        });
    } catch (error) {
        console.error('Table tracking error:', error);
        res.status(500).json({ message: 'Error tracking table orders' });
    }
});

/**
 * GET /api/order-tracking/active/all
 * Get all active orders (for kitchen display)
 * Latest orders first
 */
router.get('/active/all', authenticateAndEnforceLicense, async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { limit = 50 } = req.query;

        // Only pending orders are "active"
        const orders = await Order.find({
            restaurantId,
            status: 'pending'
        })
            .sort({ createdAt: -1 }) // Latest first (newest orders on top)
            .limit(parseInt(limit))
            .lean();

        const ordersWithDetails = orders.map(order => {
            const now = new Date();
            const orderTime = new Date(order.createdAt);
            const elapsedMinutes = Math.floor((now - orderTime) / 1000 / 60);

            return {
                id: order._id,
                table: order.table,
                items: order.items,
                total: order.total,
                itemCount: order.items.length,
                elapsedMinutes,
                createdAt: order.createdAt,
                isUrgent: elapsedMinutes > 20 // Flag orders older than 20 minutes
            };
        });

        res.json({
            totalActive: ordersWithDetails.length,
            orders: ordersWithDetails,
            summary: {
                totalOrders: ordersWithDetails.length,
                urgentOrders: ordersWithDetails.filter(o => o.isUrgent).length
            }
        });
    } catch (error) {
        console.error('Active orders error:', error);
        res.status(500).json({ message: 'Error fetching active orders' });
    }
});

/**
 * GET /api/order-tracking/history/all
 * Get order history (completed and cancelled)
 * Latest orders first
 */
router.get('/history/all', authenticateAndEnforceLicense, async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { page = 1, limit = 20 } = req.query;

        const orders = await Order.find({
            restaurantId,
            status: { $in: ['completed', 'cancelled'] }
        })
            .sort({ updatedAt: -1 }) // Latest first
            .limit(parseInt(limit))
            .skip((page - 1) * limit)
            .lean();

        const total = await Order.countDocuments({
            restaurantId,
            status: { $in: ['completed', 'cancelled'] }
        });

        res.json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Order history error:', error);
        res.status(500).json({ message: 'Error fetching order history' });
    }
});

module.exports = router;

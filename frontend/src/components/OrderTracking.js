import React, { useState, useEffect, useContext } from 'react';
import { Check, X, Loader2, RotateCcw, Printer } from 'lucide-react';
import api from '../services/api';
import { OrderUpdateContext } from '../App';

function OrderTracking() {
  const { triggerOrderUpdate } = useContext(OrderUpdateContext);
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');

  useEffect(() => {
    fetchOrders();
    // Set up polling for real-time updates
    const interval = setInterval(fetchOrders, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await api.getOrders(params);
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    filterStatus === 'all' || order.status === filterStatus
  );

  const handleCompleteOrder = (order) => {
    setCurrentOrder(order);
    setAmountReceived('');
    setShowCalculator(true);
  };

  const calculateChange = async () => {
    const received = parseFloat(amountReceived);
    const total = currentOrder.total;

    if (isNaN(received) || received < total) {
      alert('Invalid amount received. Must be at least the total amount.');
      return;
    }

    const change = received - total;

    // Confirm with cashier
    if (!window.confirm(`Amount Received: PKR ${Math.round(received)}\nTotal: PKR ${Math.round(total)}\nChange to give: PKR ${Math.round(change)}\n\nConfirm payment?`)) {
      return;
    }

    try {
      await api.updateOrderStatus(currentOrder._id, 'completed');
      await fetchOrders(); // Refresh orders after update

      // Trigger refresh for dashboard and sales history
      triggerOrderUpdate();

      setShowCalculator(false);
      setCurrentOrder(null);
      setAmountReceived('');

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = `Order completed! Change: PKR ${Math.round(change)}`;
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 5000);
    } catch (err) {
      setError('Failed to complete order');
      console.error('Error completing order:', err);
    }
  };

  const printReceipt = (order) => {
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              body { font-family: 'Courier New', monospace; font-size: 14px; margin: 0; padding: 10px; color: #000; }
              .receipt { width: 300px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .cafe-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
              .address { font-size: 12px; margin-bottom: 10px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; font-weight: bold; }
              .total { font-weight: bold; font-size: 16px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="cafe-name">777 CAFE</div>
              <div class="address">123 Restaurant Street<br>City, Country<br>Phone: (555) 123-4567</div>
            </div>
            <div class="divider"></div>
            <div><strong>Order #:</strong> ${order._id.slice(-6)}</div>
            <div><strong>Table:</strong> ${order.table}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
            <div><strong>Time:</strong> ${new Date(order.createdAt).toLocaleTimeString()}</div>
            <div class="divider"></div>
            ${order.items.map(item => `
              <div class="item">
                <span>${item.name} * ${item.quantity}</span>
                <span>PKR ${Math.round(item.price * item.quantity)}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="item total">
              <span>TOTAL</span>
              <span>PKR ${Math.round(order.total)}</span>
            </div>
            <div class="divider"></div>
            <div class="footer">
              Thank you for dining with us!<br>
              Please come again.
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (newStatus === 'completed') {
      const order = orders.find(o => o._id === orderId);
      if (order) {
        handleCompleteOrder(order);
        return;
      }
    }

    try {
      await api.updateOrderStatus(orderId, newStatus);
      await fetchOrders(); // Refresh orders after update

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'Order status updated successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      setError('Failed to update order status');
      console.error('Error updating order status:', err);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order._id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedOrders.length} selected orders?`)) return;

    try {
      // Delete orders one by one
      for (const orderId of selectedOrders) {
        await api.deleteOrder(orderId);
      }

      setSelectedOrders([]);
      setSelectAll(false);
      await fetchOrders();

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = `${selectedOrders.length} orders deleted successfully!`;
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      setError('Failed to delete selected orders');
      console.error('Error deleting orders:', err);
    }
  };

  const handleEndOfDayReset = async () => {
    if (!window.confirm('Are you sure you want to reset all orders for the day? This will mark all pending orders as completed and prepare for the next day.')) return;

    try {
      setIsLoading(true);
      setError('');

      // Get all pending orders for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Mark all pending orders as completed
      const pendingOrders = orders.filter(order => order.status === 'pending');

      for (const order of pendingOrders) {
        await api.updateOrderStatus(order._id, 'completed');
      }

      await fetchOrders();

      // Trigger refresh for dashboard and sales history
      triggerOrderUpdate();

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = `End of day reset completed! ${pendingOrders.length} orders marked as completed.`;
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 5000);
    } catch (err) {
      setError('Failed to reset orders for end of day');
      console.error('Error resetting orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Order Tracking</h1>
          {isLoading && (
            <p className="text-gray-400 mt-2 flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Refreshing orders...
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-300">Auto-refresh:</label>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg text-white px-3 py-2 focus:border-green-500 focus:outline-none"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value="15">15s</option>
              <option value="30">30s</option>
              <option value="60">1min</option>
            </select>
          </div>
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg text-white px-4 py-2 focus:border-green-500 focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={handleEndOfDayReset}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            disabled={isLoading}
            title="Reset all orders for end of day"
          >
            <RotateCcw size={16} />
            End of Day Reset
          </button>
          {selectedOrders.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Delete Selected ({selectedOrders.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full min-w-full">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-600 text-green-500 focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Order ID</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Table</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Items</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Total</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Time</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order._id)}
                      onChange={() => handleSelectOrder(order._id)}
                      className="rounded border-gray-600 text-green-500 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-white font-medium">#{order._id.slice(-6)}</td>
                  <td className="px-6 py-4 text-white">Table {order.table}</td>
                  <td className="px-6 py-4 text-gray-300">
                    {order.items.map(item => `${item.name} * ${item.quantity}`).join(', ')}
                  </td>
                  <td className="px-6 py-4 text-green-500 font-semibold">PKR {order.total}</td>
                  <td className="px-6 py-4 text-gray-300">{formatTime(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending'
                        ? 'bg-orange-500 text-white'
                        : order.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {order.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => printReceipt(order)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                          title="Print receipt"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order._id, 'completed')}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
                          title="Mark as completed"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order._id, 'cancelled')}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          title="Cancel order"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculator Modal */}
      {showCalculator && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Payment Calculator
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-gray-300 text-sm">Order Total</p>
                  <p className="text-2xl font-bold text-green-500">PKR {Math.round(currentOrder.total)}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Amount Received from Customer
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount received"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-xl font-semibold focus:border-green-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {amountReceived && !isNaN(parseFloat(amountReceived)) && parseFloat(amountReceived) >= currentOrder.total && (
                <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-blue-300 text-sm">Change to Return</p>
                    <p className="text-2xl font-bold text-blue-400">
                      PKR {Math.round(parseFloat(amountReceived) - currentOrder.total)}
                    </p>
                  </div>
                </div>
              )}

              {amountReceived && !isNaN(parseFloat(amountReceived)) && parseFloat(amountReceived) < currentOrder.total && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-red-300 text-sm">Amount Short</p>
                    <p className="text-2xl font-bold text-red-400">
                      PKR {Math.round(currentOrder.total - parseFloat(amountReceived))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCalculator(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={calculateChange}
                disabled={!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < currentOrder.total}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-semibold"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;
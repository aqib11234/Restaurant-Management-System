import React, { useState, useEffect } from 'react';
import { Loader2, Settings, Plus, Trash2, Search } from 'lucide-react';
import api from '../services/api';

function Tables() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalTables, setTotalTables] = useState(() => {
    return parseInt(localStorage.getItem('totalTables')) || 20;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'all',
    '🍳 777 Nashta',
    '🫓 777 Paratha',
    '🍖 777 Mutton Karahi',
    '🍗 777 Chicken Karahi',
    '🔥 777 BBQ',
    '🌯 Chicken Rolls',
    '🥩 Beef Rolls',
    '🍗 Nuggets',
    '🍟 Fries',
    '🥤 Fresh Juice',
    '🍹 Margarita',
    '🍔 777 Burgers',
    '🌯 Shawarma Rolls',
    '🍨 Ice Creams',
    '🍛 Other Items'
  ];

  useEffect(() => {
    fetchOrders();
    // Refresh every 10 seconds for better responsiveness
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showAddItems) {
      fetchFoodItems();
    }
  }, [searchTerm, selectedCategory]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await api.getOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create table data for tables 1-totalTables
  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNumber = i + 1;
    const currentOrder = orders.find(order => order.table === tableNumber && order.status !== 'completed' && order.status !== 'cancelled');

    return {
      number: tableNumber,
      order: currentOrder || null
    };
  });

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewOrder = (table) => {
    if (table.order) {
      setSelectedOrder(table.order);
      setSelectedTable(table);
      setShowOrderDetails(true);
    }
  };

  const handleAddItems = async (table) => {
    setSelectedTable(table);
    setShowAddItems(true);
    setCart([]);
    setSearchTerm('');
    setSelectedCategory('all');

    // Fetch food items
    fetchFoodItems();
  };

  const fetchFoodItems = async () => {
    try {
      const params = {
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      };
      const response = await api.getFoodItems(params);
      setFoodItems(response.foodItems);
    } catch (err) {
      console.error('Error fetching food items:', err);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity === 0) {
      setCart(cart.filter(item => item._id !== itemId));
    } else {
      setCart(cart.map(item =>
        item._id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const handleAddToOrder = async () => {
    if (cart.length === 0) return;

    try {
      // Create additional order data for the existing table
      const additionalItems = cart.map(item => ({
        foodItem: item._id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      }));

      const additionalTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

      // Find the existing order for this table
      const existingOrder = orders.find(order =>
        order.table === selectedTable.number &&
        order.status !== 'completed' &&
        order.status !== 'cancelled'
      );

      if (!existingOrder) {
        // If no existing order, create a new one
        const orderData = {
          table: selectedTable.number,
          items: additionalItems,
          total: additionalTotal,
          status: 'pending'
        };
        await api.createOrder(orderData);
      } else {
        // Add items to existing order
        await api.addItemsToOrder(existingOrder._id, additionalItems, additionalTotal);
      }

      setShowAddItems(false);
      setCart([]);
      fetchOrders(); // Refresh orders

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'Additional items added to order!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);

    } catch (err) {
      console.error('Error adding items to order:', err);
    }
  };

  const handleRemoveItem = async (itemIndex) => {
    if (!selectedOrder) return;

    try {
      const response = await api.removeItemQuantityFromOrder(selectedOrder._id, itemIndex);
      fetchOrders(); // Refresh orders
      // Update the selectedOrder in state
      const updatedOrder = { ...response.order };
      setSelectedOrder(updatedOrder);

      // If no items left, close modal
      if (updatedOrder.items.length === 0) {
        setShowOrderDetails(false);
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Tables</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings size={20} />
            Settings
          </button>
          {isLoading && (
            <div className="flex items-center text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(table => (
          <div
            key={table.number}
            className={`bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-green-500 transition-all duration-300 cursor-pointer ${
              table.order ? 'border-orange-500' : 'border-gray-700'
            }`}
            onClick={() => handleViewOrder(table)}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Table {table.number}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                table.order
                  ? 'bg-orange-500 text-white'
                  : 'bg-green-500 text-white'
              }`}>
                {table.order ? 'Occupied' : 'Free'}
              </span>
            </div>

            {table.order ? (
              <div className="space-y-2">
                <div className="text-gray-300 text-sm">
                  <strong>Order:</strong> #{table.order._id.slice(-6)}
                </div>
                <div className="text-gray-300 text-sm">
                  <strong>Items:</strong> {table.order.items.map(item => item.name).join(', ')}
                </div>
                <div className="text-gray-300 text-sm">
                  <strong>Total:</strong> PKR {Math.round(table.order.total)}
                </div>
                <div className="text-gray-300 text-sm">
                  <strong>Time:</strong> {formatTime(table.order.createdAt)}
                </div>
                <div className="text-gray-300 text-sm">
                  <strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    table.order.status === 'pending'
                      ? 'bg-orange-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}>
                    {table.order.status.charAt(0).toUpperCase() + table.order.status.slice(1)}
                  </span>
                </div>
                {table.order.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItems(table);
                    }}
                    className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Items
                  </button>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                No active order
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Table Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Number of Tables
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalTables}
                  onChange={(e) => setTotalTables(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Current: {totalTables} tables
                </p>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => {
                  localStorage.setItem('totalTables', totalTables.toString());
                  setShowSettings(false);
                  // Show success message
                  const successMsg = document.createElement('div');
                  successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  successMsg.textContent = `Settings saved! Now managing ${totalTables} tables.`;
                  document.body.appendChild(successMsg);
                  setTimeout(() => successMsg.remove(), 3000);
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItems && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Fixed */}
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Add Items to Table {selectedTable.number}
                  </h2>
                  <p className="text-gray-400 text-sm">Select items to add to the order</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddItems(false);
                    setCart([]);
                  }}
                  className="text-gray-400 hover:text-white text-2xl p-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content - Fixed Height with Internal Scrolling */}
            <div className="flex" style={{height: 'calc(90vh - 80px)'}}>
              {/* Menu Section */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search and Filter */}
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-lg text-white px-4 py-2 focus:border-green-500 focus:outline-none"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {foodItems.map(item => (
                      <div key={item._id} className="group bg-gray-700 rounded-lg border border-gray-600 p-3 hover:border-green-500 transition-all duration-300 cursor-pointer" onClick={() => addToCart(item)}>
                        <div className="flex gap-3">
                          <img
                            src={item.image || '/placeholder-food.jpg'}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">{item.name}</h3>
                            <p className="text-gray-400 text-xs mb-2 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{item.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-green-500 font-bold text-sm">PKR {Math.round(item.price)}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Section */}
              <div className="w-80 border-l border-gray-700 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">Order Cart</h3>
                  <p className="text-gray-400 text-xs mt-1">Review your order</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {cart.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">No items added yet</p>
                      <p className="text-xs mt-2">Click on items to add them</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map(item => (
                        <div key={item._id} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-xs">{item.name}</h4>
                              <p className="text-gray-400 text-xs">PKR {item.price} each</p>
                            </div>
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity - 1)}
                              className="text-red-400 hover:text-red-300 text-sm font-bold ml-1 flex-shrink-0"
                              title="Remove one"
                            >
                              ×
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                className="bg-gray-600 hover:bg-gray-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="text-white font-semibold w-6 text-center text-xs">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                className="bg-gray-600 hover:bg-gray-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-green-500 font-bold text-xs">
                              PKR {Math.round(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer - Always Visible */}
                <div className="border-t border-gray-700 flex-shrink-0">
                  {cart.length > 0 && (
                    <div className="p-4">
                      <div className="flex justify-between items-center text-lg font-bold text-white mb-3">
                        <span>Total:</span>
                        <span className="text-green-500">
                          PKR {Math.round(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                        </span>
                      </div>
                      <button
                        onClick={handleAddToOrder}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors font-semibold text-sm mb-2"
                      >
                        Add to Order
                      </button>
                    </div>
                  )}
                  <div className="p-4 border-t border-gray-600">
                    <button
                      onClick={() => {
                        setShowAddItems(false);
                        setCart([]);
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">
                Order Details - Table {selectedTable.number}
              </h2>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-gray-300">
                <strong className="text-lg">Order ID:</strong> #{selectedOrder._id.slice(-6)}
              </div>
              <div className="text-gray-300">
                <strong className="text-lg">Time:</strong> {formatTime(selectedOrder.createdAt)}
              </div>
              <div className="text-gray-300">
                <strong className="text-lg">Status:</strong>
                <span className={`ml-2 px-3 py-1 rounded text-base ${
                  selectedOrder.status === 'pending'
                    ? 'bg-orange-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-white">{item.name}</h4>
                        <p className="text-gray-400">Quantity: {item.quantity} × PKR {item.price}</p>
                        <p className="text-green-400 font-semibold">Subtotal: PKR {Math.round(item.price * item.quantity)}</p>
                      </div>
                      {selectedOrder.status === 'pending' && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-600">
                <div className="text-2xl font-bold text-white">
                  Total: PKR {Math.round(selectedOrder.total)}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setShowOrderDetails(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tables;
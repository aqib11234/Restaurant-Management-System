import React, { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import api from '../services/api';

function OrderPlacement() {
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [foodItems, setFoodItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState(['all']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFoodItems();
    fetchCategories();
  }, [searchTerm, selectedCategory]);

  const fetchFoodItems = async () => {
    try {
      setIsLoading(true);
      const params = {
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      };
      const response = await api.getFoodItems(params);
      setFoodItems(response.foodItems);
    } catch (err) {
      setError('Failed to load food items');
      console.error('Error fetching food items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(['all', ...response]);
    } catch (err) {
      console.error('Error fetching categories:', err);
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

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity === 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item => 
        item._id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return Math.round(cart.reduce((total, item) => total + (item.price * item.quantity), 0));
  };

  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      setError('Please enter a table number');
      return;
    }

    const tableNum = parseInt(tableNumber);
    const totalTables = parseInt(localStorage.getItem('totalTables')) || 20;

    if (tableNum < 1 || tableNum > totalTables) {
      setError(`Table number not available. Available tables: 1-${totalTables}`);
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Check if table already has an active order
      const ordersResponse = await api.getOrders();
      const existingOrder = ordersResponse.orders.find(order =>
        order.table === tableNum &&
        order.status !== 'completed' &&
        order.status !== 'cancelled'
      );

      if (existingOrder) {
        setError(`Table ${tableNumber} already has an active order. Please use the Tables page to add items to existing orders.`);
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        table: tableNum,
        items: cart.map(item => ({
          foodItem: item._id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        total: parseFloat(getTotalPrice())
      };

      await api.createOrder(orderData);

      // Clear the form immediately on success
      setCart([]);
      setTableNumber('');
      setError('');

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'Order placed successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      setError(err.message || 'Failed to place order');
      console.error('Error placing order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Place Order</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-4">Menu Items</h2>
          {/* Search and Filter */}
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-white px-4 py-2 focus:border-green-500 focus:outline-none"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 flex justify-center items-center py-8">
                <Loader2 className="animate-spin text-green-500" size={40} />
              </div>
            ) : foodItems.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-400">
                No food items found
              </div>
            ) : foodItems.map(item => (
              <div key={item._id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-green-500 transition-all duration-300">
                <img 
                  src={item.image || '/placeholder-food.jpg'} 
                  alt={item.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-green-500 font-bold text-lg">PKR {item.price}</span>
                  <button 
                    onClick={() => addToCart(item)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sticky top-6">
            <h2 className="text-xl font-semibold text-white mb-4">Order Cart</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Table Number</label>
              <input
                type="number"
                placeholder="Enter table number"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item._id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{item.name}</h4>
                        <p className="text-gray-400 text-sm">PKR {Math.round(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-600 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold text-white">Total:</span>
                    <span className="text-xl font-bold text-green-500">PKR {getTotalPrice()}</span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isSubmitting ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPlacement;
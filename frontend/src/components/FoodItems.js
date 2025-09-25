import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import api from '../services/api';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin h-8 w-8 text-green-500" />
  </div>
);

// Food Item Modal Component
function FoodItemModal({ item, onClose, onSave, error, isLoading }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    price: item?.price || '',
    category: item?.category || 'Pizza',
    image: item?.image || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.name || !formData.price) {
      return;
    }
    await onSave({ ...formData, id: item?._id });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6">
          {item ? 'Edit Food Item' : 'Add New Food Item'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Item Name"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
            required
          />
          <select
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
           >
             <option value="🍳 777 Nashta">🍳 777 Nashta</option>
             <option value="🫓 777 Paratha">🫓 777 Paratha</option>
             <option value="🍖 777 Mutton Karahi">🍖 777 Mutton Karahi</option>
             <option value="🍗 777 Chicken Karahi">🍗 777 Chicken Karahi</option>
             <option value="🔥 777 BBQ">🔥 777 BBQ</option>
             <option value="🌯 Chicken Rolls">🌯 Chicken Rolls</option>
             <option value="🥩 Beef Rolls">🥩 Beef Rolls</option>
             <option value="🍗 Nuggets">🍗 Nuggets</option>
             <option value="🍟 Fries">🍟 Fries</option>
             <option value="🥤 Fresh Juice">🥤 Fresh Juice</option>
             <option value="🍹 Margarita">🍹 Margarita</option>
             <option value="🍔 777 Burgers">🍔 777 Burgers</option>
             <option value="🌯 Shawarma Rolls">🌯 Shawarma Rolls</option>
             <option value="🍨 Ice Creams">🍨 Ice Creams</option>
             <option value="🍛 Other Items">🍛 Other Items</option>
           </select>
          <input
            type="url"
            placeholder="Image URL"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            value={formData.image}
            onChange={(e) => setFormData({...formData, image: e.target.value})}
          />
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FoodItems() {
  const [foodItems, setFoodItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

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
    // Initial load
    fetchFoodItems(true);
  }, []);

  useEffect(() => {
    // Reset when filters change
    setFoodItems([]);
    setPage(1);
    setHasMore(true);
    fetchFoodItems(true);
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 100 &&
        hasMore &&
        !loadingMore &&
        !isLoading
      ) {
        loadMoreItems();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, isLoading]);

  const fetchFoodItems = async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
      }
      setError('');
      const params = {
        page: reset ? 1 : page,
        limit: 100,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      };
      const response = await api.getFoodItems(params);

      if (reset) {
        setFoodItems(response.foodItems);
      } else {
        setFoodItems(prev => [...prev, ...response.foodItems]);
      }

      setHasMore(response.foodItems.length === 100);
    } catch (err) {
      setError('Failed to load food items');
      console.error('Error fetching food items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreItems = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      const params = {
        page: nextPage,
        limit: 100,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      };
      const response = await api.getFoodItems(params);

      setFoodItems(prev => [...prev, ...response.foodItems]);
      setHasMore(response.foodItems.length === 100);
    } catch (err) {
      setError('Failed to load more food items');
      console.error('Error loading more items:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddItem = async (newItem) => {
    try {
      setIsLoading(true);
      setError('');

      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to add food items');
      }

      const response = await api.createFoodItem({
        ...newItem,
        price: parseFloat(newItem.price)
      });

      if (response.foodItem) {
        // Reset to first page and reload
        setFoodItems([]);
        setPage(1);
        setHasMore(true);
        fetchFoodItems(true);
        setShowAddModal(false);
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMsg.textContent = 'Food item added successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        throw new Error(response.message || 'Failed to add food item');
      }
    } catch (err) {
      if (err.message.includes('Invalid or expired token')) {
        // Handle token expiration
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError(err.message || 'Failed to add food item');
        console.error('Error adding food item:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async (updatedItem) => {
    try {
      setIsLoading(true);
      const { id, ...itemData } = updatedItem; // Extract id and get rest of data
      await api.updateFoodItem(updatedItem._id || id, itemData);
      fetchFoodItems();
      setEditingItem(null);
    } catch (err) {
      setError('Failed to update food item');
      console.error('Error updating food item:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      setIsLoading(true);
      await api.deleteFoodItem(id);
      fetchFoodItems();
    } catch (err) {
      setError('Failed to delete food item');
      console.error('Error deleting food item:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Food Items</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          disabled={isLoading}
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search food items..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg text-white px-4 py-2 focus:border-green-500 focus:outline-none"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Food Items Grid */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          {isLoading && foodItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-green-500" />
            </div>
          ) : foodItems.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              No food items found
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {foodItems.map(item => (
                <div key={item._id} className="bg-gray-700 rounded-xl border border-gray-600 overflow-hidden hover:border-green-500 transition-all duration-300">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-green-500 font-bold text-lg">PKR {item.price}</span>
                      <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-sm">{item.category}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* Loading indicator for lazy loading */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin h-8 w-8 text-green-500" />
                </div>
              )}

              {!hasMore && foodItems.length > 0 && (
                <div className="text-center text-gray-400 py-8">
                  No more items to load
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <FoodItemModal 
          item={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
            setError('');
          }}
          onSave={editingItem ? handleEditItem : handleAddItem}
          error={error}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default FoodItems;
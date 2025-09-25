import React, { useState, useEffect, useContext } from 'react';
import { UtensilsCrossed, DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';
import api from '../services/api';
import { OrderUpdateContext } from '../App';

function Dashboard() {
  const { orderUpdateTrigger } = useContext(OrderUpdateContext);
  const [stats, setStats] = useState({
    totalTables: 0,
    totalFoodItems: 0,
    dailySales: 0,
    monthlySales: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [topSellingDishes, setTopSellingDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [orderUpdateTrigger]);

  useEffect(() => {
    fetchDashboardData();

    // Refresh data every minute
    const minuteInterval = setInterval(fetchDashboardData, 60000);

    // Check for end of day reset every 5 minutes
    const dayCheckInterval = setInterval(() => {
      const now = new Date();
      const lastFetch = localStorage.getItem('lastDashboardFetch');
      const lastFetchDate = lastFetch ? new Date(lastFetch) : null;

      // If it's a new day, force refresh
      if (!lastFetchDate || now.toDateString() !== lastFetchDate.toDateString()) {
        console.log('New day detected, refreshing dashboard data');
        fetchDashboardData();
      }
    }, 300000); // Check every 5 minutes

    return () => {
      clearInterval(minuteInterval);
      clearInterval(dayCheckInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getDashboardStats(localStorage.getItem('token'));
      
      if (response.error) {
        throw new Error(response.error);
      }

      setStats({
        totalTables: parseInt(localStorage.getItem('totalTables')) || 20,
        totalFoodItems: response.totalFoodItems || 0,
        dailySales: response.dailySales || 0,
        monthlySales: response.monthlySales || 0,
        pendingOrders: response.pendingOrders || 0,
        completedOrders: response.completedOrders || 0
      });

      setTopSellingDishes(response.topSellingDishes || []);
      setError('');

      // Store last fetch time for day change detection
      localStorage.setItem('lastDashboardFetch', new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 relative min-h-screen">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        {isLoading && (
          <div className="flex items-center text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            <span>Loading...</span>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-8">
          {error}
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tables</p>
              <p className="text-3xl font-bold text-white">{stats.totalTables}</p>
            </div>
            <Users className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Food Items</p>
              <p className="text-3xl font-bold text-white">{stats.totalFoodItems}</p>
            </div>
            <UtensilsCrossed className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Daily Sales</p>
              <p className="text-3xl font-bold text-white">PKR {stats.dailySales}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Monthly Sales</p>
              <p className="text-3xl font-bold text-white">PKR {stats.monthlySales}</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Order Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Orders</span>
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {stats.pendingOrders + stats.completedOrders}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Completed Orders</span>
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {stats.completedOrders}
              </span>
            </div>
          </div>
        </div>

        {/* Top Selling Dishes */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Top Selling Dishes</h3>
          <div className="space-y-3">
            {topSellingDishes.map((dish, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-300">{dish.name}</span>
                <span className="text-green-500 font-bold text-lg">{dish.sales}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;
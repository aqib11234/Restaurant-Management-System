import React, { useState, useEffect, useContext } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2, Calendar, DollarSign, ShoppingCart } from 'lucide-react';
import { buildSalesReport, periodName } from '../utils/salesReport';
import api from '../services/api';
import { OrderUpdateContext } from '../App';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function SalesHistory() {
  const { orderUpdateTrigger } = useContext(OrderUpdateContext);
  const [salesData, setSalesData] = useState([]);
  const [groupBy, setGroupBy] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [loadingOrders, setLoadingOrders] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchSalesHistory();
  }, [groupBy, orderUpdateTrigger, startDate, endDate]);

  const fetchSalesHistory = async () => {
    try {
      setIsLoading(true);
      const params = { groupBy };
      if (startDate && endDate) {
        // Send the full local day range so the server's timezone doesn't matter
        const from = new Date(startDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        params.startDate = from.toISOString();
        params.endDate = to.toISOString();
      }
      const response = await api.getSalesHistory(params);
      setSalesData(response || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch sales history');
      console.error('Error fetching sales history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupOrders = async (group, page = 1) => {
    const groupId = `${group.period}-${group.displayName}`;
    setLoadingOrders(prev => new Set(prev).add(groupId));

    try {
      const response = await api.getPeriodOrders(group.period, group.date, { page, limit: 50 });
      // Update the salesData with the fetched orders
      setSalesData(prevData =>
        prevData.map(g =>
          g === group ? {
            ...g,
            orders: page === 1 ? response.orders : [...g.orders, ...response.orders],
            totalPages: response.totalPages,
            currentPage: page
          } : g
        )
      );
      return response.orders; // Return for export function
    } catch (err) {
      console.error('Error fetching group orders:', err);
      return [];
    } finally {
      setLoadingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Fetch orders for this group if not already loaded
      const group = salesData.find(g => `${g.period}-${g.displayName}` === groupId);
      if (group && (!group.orders || group.orders.length === 0)) {
        fetchGroupOrders(group);
      }
    }
    setExpandedGroups(newExpanded);
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToPDF = async (selectedGroup = null) => {
    try {
      setIsExporting(true);
      const restaurantName = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').restaurantName || 'Restaurant'; } catch { return 'Restaurant'; }
      })();
      const day = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      let report;
      if (selectedGroup) {
        const breakdown = await api.getSalesBreakdown({ period: selectedGroup.period, date: selectedGroup.date, includeOrders: 1 });
        const word = { daily: 'Day', weekly: 'Week', monthly: 'Month' }[selectedGroup.period] || 'Period';
        const name = periodName(selectedGroup.displayName);
        report = {
          title: `${word} report`,
          rangeLabel: name,
          groups: [selectedGroup],
          ...breakdown,
        };
      } else {
        const params = {};
        if (startDate && endDate) {
          const from = new Date(startDate); from.setHours(0, 0, 0, 0);
          const to = new Date(endDate); to.setHours(23, 59, 59, 999);
          params.start = from.toISOString();
          params.end = to.toISOString();
        }
        const breakdown = await api.getSalesBreakdown(params);
        report = {
          title: 'Sales report',
          rangeLabel: startDate && endDate ? `${day(startDate)} to ${day(endDate)}` : 'All time',
          groups: salesData,
          ...breakdown,
        };
      }

      const doc = buildSalesReport({ restaurantName, groupBy: selectedGroup ? selectedGroup.period : groupBy, ...report });
      const slug = (selectedGroup ? `${selectedGroup.period}-${selectedGroup.displayName}` : `${groupBy}-${startDate && endDate ? `${day(startDate)}-to-${day(endDate)}` : 'all-time'}`)
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      doc.save(`sales-report-${slug}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setError(error.message || 'Could not create the PDF. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalOrders = salesData.reduce((sum, group) => sum + (group.totalOrders || 0), 0);
  const totalRevenue = salesData.reduce((sum, group) => sum + (group.totalRevenue || 0), 0);

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Sales History</h1>
        <div className="flex flex-wrap items-center gap-4">
          
          <div className="flex flex-wrap items-center gap-4 bg-gray-800 p-2 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">From:</span>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Select date"
                className="custom-date-input"
                dateFormat="MMM d, yyyy"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">To:</span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="Select date"
                className="custom-date-input"
                dateFormat="MMM d, yyyy"
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>Loading...</span>
            </div>
          )}
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg text-white px-4 py-2 focus:border-green-500 focus:outline-none"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            disabled={isLoading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={() => exportToPDF()}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-semibold"
            disabled={isLoading || isExporting || salesData.length === 0}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {isExporting ? 'Creating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{{ daily: 'Days', weekly: 'Weeks', monthly: 'Months' }[groupBy]} with sales</p>
              <p className="text-3xl font-bold text-white">{salesData.length}</p>
            </div>
            <Calendar className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Paid orders</p>
              <p className="text-3xl font-bold text-white">{totalOrders}</p>
            </div>
            <ShoppingCart className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total sales</p>
              <p className="text-3xl font-bold text-green-500">PKR {Math.round(totalRevenue).toLocaleString()}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average per {{ daily: 'day', weekly: 'week', monthly: 'month' }[groupBy]}</p>
              <p className="text-3xl font-bold text-white">
                PKR {salesData.length > 0 ? Math.round(totalRevenue / salesData.length).toLocaleString() : '0'}
              </p>
            </div>
            <DollarSign className="text-yellow-500" size={32} />
          </div>
        </div>
      </div>

      {/* Grouped Sales Data */}
      <div className="space-y-4">
        {salesData.map((group, index) => {
          const groupId = `${group.period}-${group.displayName}`;
          const isExpanded = expandedGroups.has(groupId);

          return (
            <div key={groupId} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Group Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleGroup(groupId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="text-green-500" size={20} />
                    ) : (
                      <ChevronRight className="text-green-500" size={20} />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-white">{periodName(group.displayName)}</h3>
                      <p className="text-gray-400 text-sm capitalize">{group.period} Summary</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Orders</p>
                      <p className="text-2xl font-bold text-blue-500">{group.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Revenue</p>
                      <p className="text-2xl font-bold text-green-500">PKR {Math.round(group.totalRevenue).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Avg Order</p>
                      <p className="text-xl font-semibold text-white">
                        PKR {group.totalOrders ? Math.round(group.totalRevenue / group.totalOrders).toLocaleString() : 0}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToPDF(group);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Download this period as PDF"
                      aria-label={`Download ${periodName(group.displayName)} as PDF`}
                      disabled={isExporting}
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Order Details */}
              {isExpanded && (
                <div className="border-t border-gray-700">
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Order Details</h4>
                    {loadingOrders.has(groupId) ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="animate-spin text-green-500" size={40} />
                        <span className="ml-2 text-gray-400">Loading orders...</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Paid at</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Table</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Waiter</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Total Price</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Items</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.orders.map((order) => (
                              <tr key={order._id || order.orderId} className="border-t border-gray-700 hover:bg-gray-750">
                                <td className="px-4 py-3 text-white">
                                  {formatDate(order.paidAt || order.createdAt)} {formatTime(order.paidAt || order.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-white">{order.table === 0 ? 'Takeaway' : `Table ${order.table}`}</td>
                                <td className="px-4 py-3 text-gray-300">{order.waiterName || '—'}</td>
                                <td className="px-4 py-3 text-green-500 font-semibold">
                                  PKR {Math.round(order.total).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-gray-300">
                                  <div className="max-w-xs truncate" title={order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}>
                                    {order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {group.orders.length === 0 && (
                          <div className="text-center text-gray-400 py-4">
                            No orders found for this period
                          </div>
                        )}
                        {group.currentPage < group.totalPages && (
                          <div className="text-center mt-4">
                            <button
                              onClick={() => fetchGroupOrders(group, (group.currentPage || 1) + 1)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                              disabled={loadingOrders.has(groupId)}
                            >
                              {loadingOrders.has(groupId) ? 'Loading...' : 'Load More Orders'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {salesData.length === 0 && !isLoading && (
        <div className="text-center text-gray-400 mt-8">
          No sales data found for the selected period
        </div>
      )}
    </div>
  );
}

export default SalesHistory;
import React, { useState, useEffect, useContext } from 'react';
import { ChevronDown, ChevronRight, Download, FileText, Table, Loader2, Calendar, DollarSign, ShoppingCart } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { OrderUpdateContext } from '../App';

function SalesHistory() {
  const { orderUpdateTrigger } = useContext(OrderUpdateContext);
  const [salesData, setSalesData] = useState([]);
  const [groupBy, setGroupBy] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [loadingOrders, setLoadingOrders] = useState(new Set());

  useEffect(() => {
    fetchSalesHistory();
  }, [groupBy, orderUpdateTrigger]);

  const fetchSalesHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.getSalesHistory({ groupBy });
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
    } catch (err) {
      console.error('Error fetching group orders:', err);
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
      if (group && group.orders.length === 0) {
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

  const exportToPDF = (selectedGroup = null) => {
    const doc = new jsPDF();
    const dataToExport = selectedGroup ? [selectedGroup] : salesData;
    const fileName = selectedGroup
      ? `sales-${selectedGroup.displayName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
      : `sales-history-${groupBy}-${new Date().toISOString().split('T')[0]}.pdf`;

    doc.setFontSize(20);
    doc.text(selectedGroup ? `${selectedGroup.displayName} Sales Report` : 'Sales History Report', 20, 20);

    doc.setFontSize(12);
    doc.text(`Grouped by: ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    let yPosition = 60;
    doc.setFontSize(10);

    if (!selectedGroup) {
      // Summary for full report
      doc.setFontSize(14);
      doc.text('Summary:', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);

      const totalOrders = salesData.reduce((sum, group) => sum + group.totalOrders, 0);
      const totalRevenue = salesData.reduce((sum, group) => sum + group.totalRevenue, 0);

      doc.text(`Total Groups: ${salesData.length}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Total Orders: ${totalOrders}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Total Revenue: PKR ${Math.round(totalRevenue)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Average Revenue per Group: PKR ${Math.round(totalRevenue / salesData.length)}`, 20, yPosition);

      yPosition += 20;
    }

    // Group details
    dataToExport.forEach((group, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.text(`${group.displayName}`, 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.text(`Orders: ${group.totalOrders} | Revenue: PKR ${Math.round(group.totalRevenue)}`, 30, yPosition);
      yPosition += 10;

      // Order details
      group.orders.forEach(order => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`  ${formatDate(order.createdAt)} ${formatTime(order.createdAt)} - Table ${order.table} - PKR ${Math.round(order.total)}`, 40, yPosition);
        yPosition += 6;
      });

      yPosition += 10;
    });

    doc.save(fileName);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = salesData.map(group => ({
      Period: group.displayName,
      Orders: group.totalOrders,
      Revenue: Math.round(group.totalRevenue),
      'Avg Order': Math.round(group.totalRevenue / group.totalOrders)
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Detailed orders sheet
    const allOrders = [];
    salesData.forEach(group => {
      group.orders.forEach(order => {
        allOrders.push({
          Period: group.displayName,
          'Order Time': formatDate(order.createdAt) + ' ' + formatTime(order.createdAt),
          'Table No': order.table,
          'Order ID': order._id.toString().slice(-6),
          'Total Price': Math.round(order.total),
          Status: order.status
        });
      });
    });

    const ordersSheet = XLSX.utils.json_to_sheet(allOrders);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Order Details');

    XLSX.writeFile(workbook, `sales-history-${groupBy}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalOrders = salesData.reduce((sum, group) => sum + group.totalOrders, 0);
  const totalRevenue = salesData.reduce((sum, group) => sum + group.totalRevenue, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Sales History</h1>
        <div className="flex items-center gap-4">
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
            onClick={exportToPDF}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isLoading || salesData.length === 0}
          >
            <FileText size={16} />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isLoading || salesData.length === 0}
          >
            <Table size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Groups</p>
              <p className="text-3xl font-bold text-white">{salesData.length}</p>
            </div>
            <Calendar className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-white">{totalOrders}</p>
            </div>
            <ShoppingCart className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-green-500">PKR {totalRevenue.toFixed(0)}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Revenue/Group</p>
              <p className="text-3xl font-bold text-white">
                PKR {salesData.length > 0 ? (totalRevenue / salesData.length).toFixed(0) : '0'}
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
                      <h3 className="text-xl font-semibold text-white">{group.displayName}</h3>
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
                      <p className="text-2xl font-bold text-green-500">PKR {Math.round(group.totalRevenue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Avg Order</p>
                      <p className="text-xl font-semibold text-white">
                        PKR {Math.round(group.totalRevenue / group.totalOrders)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToPDF(group);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                      title="Export this period to PDF"
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
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Order Time</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Table No</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Order ID</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Total Price</th>
                              <th className="px-4 py-3 text-left text-gray-300 font-semibold">Items</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.orders.map((order) => (
                              <tr key={order._id} className="border-t border-gray-700 hover:bg-gray-750">
                                <td className="px-4 py-3 text-white">
                                  {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-white">Table {order.table}</td>
                                <td className="px-4 py-3 text-gray-300 font-mono">
                                  #{order.orderId.toString().slice(-6)}
                                </td>
                                <td className="px-4 py-3 text-green-500 font-semibold">
                                  PKR {Math.round(order.total)}
                                </td>
                                <td className="px-4 py-3 text-gray-300">
                                  <div className="max-w-xs truncate" title={order.items.map(item => `${item.name} * ${item.quantity}`).join(', ')}>
                                    {order.items.map(item => `${item.name} * ${item.quantity}`).join(', ')}
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
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Loader2, RotateCcw, Printer, X, Clock, User, Banknote, CheckCircle2, Trash2 } from 'lucide-react';
import api from '../services/api';
import { OrderUpdateContext } from '../App';
import { printBill } from '../utils/receipt';

const TABS = [
  { id: 'pending', label: 'Open' },
  { id: 'completed', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
];

const money = (n) => `PKR ${Math.round(n).toLocaleString()}`;
const minutesSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date)) / 60000));
const timeOf = (date) => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const tableName = (order) => (order.table === 0 ? 'Takeaway' : `Table ${order.table}`);

const showToast = (text, tone = 'green') => {
  const el = document.createElement('div');
  el.className = `fixed top-4 right-4 ${tone === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg z-50 font-medium`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// Notes a cashier is likely to be handed for a given bill
const cashSuggestions = (total) => {
  const up = (step) => Math.ceil(total / step) * step;
  const candidates = [up(100), up(500), up(500) + 500, up(1000), up(1000) + 1000, up(5000), up(5000) + 5000];
  const options = Array.from(new Set(candidates.filter(v => v > total))).sort((a, b) => a - b);
  return [total, ...options].slice(0, 4);
};

function BillCard({ order, selected, onSelect, children }) {
  return (
    <article className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white leading-tight">{tableName(order)}</h2>
          <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
            <User size={13} /> {order.waiterName || 'No waiter'}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {order.status === 'pending' ? (
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${minutesSince(order.createdAt) > 20 ? 'text-yellow-400' : 'text-gray-300'}`}>
              <Clock size={13} /> {minutesSince(order.createdAt)} min
            </span>
          ) : (
            <span className="text-sm text-gray-400">{timeOf(order.paidAt || order.updatedAt)}</span>
          )}
          <div className="text-xs text-gray-500 mt-1">#{order._id.slice(-6).toUpperCase()}</div>
          {onSelect && (
            <label className="flex items-center justify-end gap-1 mt-1 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={selected} onChange={onSelect} /> Select
            </label>
          )}
        </div>
      </header>

      <ul className="px-4 py-3 space-y-1 flex-1">
        {order.items.map((item, i) => (
          <li key={item._id || i} className="flex gap-3 text-gray-200">
            <span className="w-6 text-right font-semibold text-white">{item.quantity}</span>
            <span className="flex-1 min-w-0">{item.name}</span>
            <span className="text-gray-400 whitespace-nowrap">{Math.round(item.price * item.quantity).toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="mx-4 border-t border-dashed border-gray-600 py-3 flex justify-between items-baseline">
        <span className="text-gray-300">Total</span>
        <span className="text-2xl font-bold text-white">{money(order.total)}</span>
      </div>
      {order.status === 'completed' && order.amountReceived != null && (
        <div className="mx-4 -mt-2 pb-3 text-sm text-gray-400 flex justify-between">
          <span>Cash {money(order.amountReceived)}</span>
          <span>Change {money(order.amountReceived - order.total)}</span>
        </div>
      )}

      <footer className="px-4 pb-4 flex gap-2">{children}</footer>
    </article>
  );
}

function OrderTracking() {
  const { triggerOrderUpdate } = useContext(OrderUpdateContext);
  const [tab, setTab] = useState('pending');
  const [ordersByStatus, setOrdersByStatus] = useState({ pending: [], completed: [], cancelled: [] });
  const [counts, setCounts] = useState({ pending: 0, completed: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);

  // Payment flow
  const [payingOrder, setPayingOrder] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null); // shown after payment so the bill can be printed

  const fetchOrders = useCallback(async () => {
    try {
      const [open, paid, cancelled] = await Promise.all([
        api.getOrders({ status: 'pending', limit: 500 }),
        api.getOrders({ status: 'completed', limit: 100 }),
        api.getOrders({ status: 'cancelled', limit: 100 }),
      ]);
      const byPaidTime = (a, b) => new Date(b.paidAt || b.updatedAt) - new Date(a.paidAt || a.updatedAt);
      setOrdersByStatus({
        pending: [...(open.orders || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        completed: [...(paid.orders || [])].sort(byPaidTime),
        cancelled: [...(cancelled.orders || [])].sort(byPaidTime),
      });
      setCounts({ pending: open.total || 0, completed: paid.total || 0, cancelled: cancelled.total || 0 });
      setError('');
    } catch (err) {
      setError('Could not load orders. Check your connection.');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => setSelected([]), [tab]);

  const orders = ordersByStatus[tab];

  // ── Payment ──
  const startPayment = async (order) => {
    // Always take payment against the latest bill, not what was on screen
    let latest = order;
    try {
      const res = await api.getOrders({ status: 'pending', table: order.table });
      latest = (res.orders || []).find(o => o._id === order._id);
    } catch { /* fall back to the order on screen */ }
    if (!latest) {
      showToast('This order was already closed on another device', 'red');
      fetchOrders();
      return;
    }
    setPayingOrder(latest);
    setAmountReceived('');
    setPaymentError('');
  };

  const received = parseFloat(amountReceived);
  const hasAmount = amountReceived !== '' && !isNaN(received);
  const shortBy = payingOrder && hasAmount ? payingOrder.total - received : null;

  const completePayment = async (andPrint) => {
    if (!payingOrder || !hasAmount || received < payingOrder.total || isPaying) return;
    setIsPaying(true);
    setPaymentError('');
    try {
      const res = await api.updateOrderStatus(payingOrder._id, 'completed', {
        expectedTotal: payingOrder.total,
        amountReceived: received,
      });
      setPayingOrder(null);
      setPaidOrder(res.order);
      if (andPrint) printBill(res.order);
      triggerOrderUpdate();
      fetchOrders();
    } catch (err) {
      // Bill changed while the payment screen was open: reload it and ask again
      try {
        const res = await api.getOrders({ status: 'pending', table: payingOrder.table });
        const fresh = (res.orders || []).find(o => o._id === payingOrder._id);
        if (fresh && fresh.total !== payingOrder.total) {
          setPayingOrder(fresh);
          setPaymentError(`Items were added. The bill is now ${money(fresh.total)}. Check the cash again.`);
          return;
        }
      } catch { /* ignore */ }
      setPaymentError(err.message || 'Could not complete the payment. Try again.');
    } finally {
      setIsPaying(false);
    }
  };

  // ── Other actions ──
  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel ${tableName(order).toLowerCase()}'s order (${money(order.total)})? It will not count as a sale.`)) return;
    try {
      await api.updateOrderStatus(order._id, 'cancelled');
      showToast(`${tableName(order)} order cancelled`);
      triggerOrderUpdate();
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Could not cancel the order.');
    }
  };

  const toggleSelected = (id) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} order(s) from this list? Sales already recorded stay in Sales History.`)) return;
    try {
      for (const id of selected) await api.deleteOrder(id);
      showToast(`${selected.length} order(s) deleted`);
      setSelected([]);
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Could not delete the selected orders.');
    }
  };

  const closeTheDay = async () => {
    const open = ordersByStatus.pending;
    if (open.length === 0) {
      window.alert('There are no open orders to close.');
      return;
    }
    const openTotal = open.reduce((sum, o) => sum + o.total, 0);
    if (!window.confirm(`Close the day?\n\n${open.length} open order(s) worth ${money(openTotal)} will be marked as paid and counted in today's sales.\n\nCancel any unpaid orders first.`)) return;
    try {
      setIsLoading(true);
      for (const order of open) await api.updateOrderStatus(order._id, 'completed');
      triggerOrderUpdate();
      showToast(`Day closed. ${open.length} order(s) marked as paid.`);
    } catch (err) {
      setError('Could not close all open orders. Check the Open tab and try again.');
    } finally {
      fetchOrders();
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-3xl font-bold text-white">Order Tracking</h1>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <button onClick={deleteSelected} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
              <Trash2 size={16} /> Delete {selected.length}
            </button>
          )}
          <button
            onClick={closeTheDay}
            className="flex items-center gap-2 bg-gray-800 border border-gray-600 hover:border-gray-400 text-gray-200 px-4 py-2 rounded-lg"
          >
            <RotateCcw size={16} /> Close the day
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Order status" className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
              tab === t.id ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-green-500'
            }`}
          >
            {t.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.id ? 'bg-white text-green-700' : 'bg-gray-700 text-gray-300'}`}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={40} /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {tab === 'pending' ? 'No open orders. New orders from Place Order appear here.' : tab === 'completed' ? 'No paid orders yet.' : 'No cancelled orders.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <BillCard
              key={order._id}
              order={order}
              selected={selected.includes(order._id)}
              onSelect={tab !== 'pending' ? () => toggleSelected(order._id) : null}
            >
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={() => startPayment(order)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-semibold"
                  >
                    <Banknote size={18} /> Take payment
                  </button>
                  <button
                    onClick={() => printBill(order)}
                    aria-label={`Print bill for ${tableName(order)}`}
                    className="flex items-center gap-1 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100"
                  >
                    <Printer size={16} /> Print
                  </button>
                  <button
                    onClick={() => cancelOrder(order)}
                    aria-label={`Cancel ${tableName(order)} order`}
                    title="Cancel order"
                    className="px-3 rounded-lg bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
              {order.status === 'completed' && (
                <button
                  onClick={() => printBill(order)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold"
                >
                  <Printer size={18} /> Print bill
                </button>
              )}
            </BillCard>
          ))}
        </div>
      )}

      {/* Take payment */}
      {payingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="pay-title">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 id="pay-title" className="text-2xl font-bold text-white">Take payment</h2>
                <p className="text-gray-400">{tableName(payingOrder)}</p>
              </div>
              <button aria-label="Close" onClick={() => setPayingOrder(null)} className="text-gray-400 hover:text-white"><X size={22} /></button>
            </div>

            {paymentError && (
              <div role="alert" className="mb-4 p-3 bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium">{paymentError}</div>
            )}

            <div className="bg-gray-900 rounded-lg p-4 mb-4 flex justify-between items-baseline">
              <span className="text-gray-300">Bill</span>
              <span className="text-3xl font-bold text-white">{money(payingOrder.total)}</span>
            </div>

            <label htmlFor="cash" className="block text-gray-300 text-sm mb-2">Cash received</label>
            <input
              id="cash"
              type="number"
              inputMode="decimal"
              min="0"
              autoFocus
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && completePayment(true)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:border-green-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {cashSuggestions(Math.ceil(payingOrder.total)).map(v => (
                <button
                  key={v}
                  onClick={() => setAmountReceived(String(v))}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm font-medium"
                >
                  {v === Math.ceil(payingOrder.total) ? 'Exact' : v.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="mt-4 h-14">
              {hasAmount && shortBy <= 0 && (
                <div className="flex justify-between items-baseline bg-green-500 bg-opacity-20 border border-green-500 rounded-lg px-4 py-3">
                  <span className="text-green-300">Change to give</span>
                  <span className="text-2xl font-bold text-green-300">{money(-shortBy)}</span>
                </div>
              )}
              {hasAmount && shortBy > 0 && (
                <div className="flex justify-between items-baseline bg-red-500 bg-opacity-20 border border-red-500 rounded-lg px-4 py-3">
                  <span className="text-red-300">Still to pay</span>
                  <span className="text-2xl font-bold text-red-300">{money(shortBy)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => completePayment(false)}
                disabled={!hasAmount || shortBy > 0 || isPaying}
                className="py-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
              >
                Complete
              </button>
              <button
                onClick={() => completePayment(true)}
                disabled={!hasAmount || shortBy > 0 || isPaying}
                className="py-3 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Complete and print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* After payment: always offer the bill, so a missed print is one tap away */}
      {paidOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="paid-title">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700 text-center">
            <CheckCircle2 className="mx-auto text-green-400 mb-3" size={48} />
            <h2 id="paid-title" className="text-2xl font-bold text-white">{tableName(paidOrder)} paid</h2>
            <p className="text-gray-300 mt-1">{money(paidOrder.total)}</p>
            {paidOrder.amountReceived != null && (
              <p className="text-3xl font-bold text-green-400 mt-4">Change {money(paidOrder.amountReceived - paidOrder.total)}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => printBill(paidOrder)} className="py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold flex items-center justify-center gap-2">
                <Printer size={18} /> Print bill
              </button>
              <button onClick={() => setPaidOrder(null)} className="py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold">
                Done
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-4">You can reprint any time from the Paid tab.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;

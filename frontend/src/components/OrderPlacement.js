import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Loader2, Search, ShoppingBag, Minus, Plus, X, User, Clock, Printer, Settings, Check } from 'lucide-react';
import api from '../services/api';
import { printBill } from '../utils/receipt';

const TAKEAWAY = 0;
const WAITER_KEY = 'lastWaiterId';

const showToast = (text, tone = 'green') => {
  const el = document.createElement('div');
  el.className = `fixed top-4 right-4 ${tone === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg z-50 font-medium`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

const minutesSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date)) / 60000));
const money = (n) => `PKR ${Math.round(n).toLocaleString()}`;

const readWaiterId = () => {
  try { return localStorage.getItem(WAITER_KEY) || ''; } catch { return ''; }
};

function QtyStepper({ label, quantity, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label={`One less ${label}`}
        disabled={disabled}
        onClick={() => onChange(quantity - 1)}
        className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white w-9 h-9 rounded-full flex items-center justify-center"
      >
        <Minus size={16} />
      </button>
      <span className="text-white font-bold w-7 text-center">{quantity}</span>
      <button
        aria-label={`One more ${label}`}
        disabled={disabled}
        onClick={() => onChange(quantity + 1)}
        className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white w-9 h-9 rounded-full flex items-center justify-center"
      >
        <Plus size={16} />
      </button>
      <button
        aria-label={`Remove ${label}`}
        disabled={disabled}
        onClick={() => onChange(0)}
        className="text-gray-400 hover:text-red-400 disabled:opacity-50 w-8 h-9 flex items-center justify-center"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function OrderPlacement() {
  // Step 1: pick a table. Step 2: build or edit the order for it.
  const [activeTable, setActiveTable] = useState(null); // null = picking, 0 = takeaway, n = table n
  const [waiters, setWaiters] = useState([]);
  const [waiterId, setWaiterId] = useState(readWaiterId);
  const [openOrders, setOpenOrders] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tableCount, setTableCount] = useState(20);
  const [editingTables, setEditingTables] = useState(false);
  const [draftTableCount, setDraftTableCount] = useState(20);

  const [foodItems, setFoodItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingBill, setIsUpdatingBill] = useState(false);
  const [error, setError] = useState('');

  const fetchOpenOrders = useCallback(async () => {
    try {
      const res = await api.getOrders({ status: 'pending', limit: 500 });
      setOpenOrders(res.orders || []);
    } catch (err) {
      console.error('Error fetching open orders:', err);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenOrders();
    const interval = setInterval(fetchOpenOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOpenOrders]);

  useEffect(() => {
    api.getSettings()
      .then(s => setTableCount(s.tableCount || 20))
      .catch(err => console.error('Error fetching settings:', err));

    api.getWaiters()
      .then(res => {
        const list = res.waiters || [];
        setWaiters(list);
        // Forget a remembered waiter who no longer exists or is off today
        setWaiterId(id => (list.some(w => w._id === id && w.isPresent !== false) ? id : ''));
      })
      .catch(err => console.error('Error fetching waiters:', err));

    // Load the whole menu once; search and category filter locally so typing is instant
    api.getFoodItems({ limit: 1000 })
      .then(res => setFoodItems(res.foodItems || []))
      .catch(() => setError('Could not load the menu. Check your connection and refresh.'))
      .finally(() => setMenuLoading(false));
  }, []);

  const presentWaiters = waiters.filter(w => w.isPresent !== false);

  const chooseWaiter = (id) => {
    const next = id === waiterId ? '' : id;
    setWaiterId(next);
    try { localStorage.setItem(WAITER_KEY, next); } catch { /* storage unavailable */ }
  };

  const orderForTable = (n) => openOrders.find(o => o.table === n);
  const existingOrder = activeTable && activeTable !== TAKEAWAY ? orderForTable(activeTable) : null;
  const waiterName = waiters.find(w => w._id === waiterId)?.name;

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(foodItems.map(f => f.category))).sort()],
    [foodItems]
  );

  const visibleItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return foodItems.filter(f =>
      (category === 'all' || f.category === category) &&
      (!q || f.name.toLowerCase().includes(q))
    );
  }, [foodItems, category, searchTerm]);

  const openTable = (n) => {
    setActiveTable(n);
    setCart([]);
    setError('');
    setSearchTerm('');
    setCategory('all');
  };

  const backToTables = () => {
    if (cart.length > 0 && !window.confirm('Discard the new items you have not added yet?')) return;
    setActiveTable(null);
    setCart([]);
    setError('');
    fetchOpenOrders();
  };

  const saveTableCount = async () => {
    const n = parseInt(draftTableCount, 10);
    const highestBusy = Math.max(0, ...openOrders.map(o => o.table));
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      setError('Number of tables must be between 1 and 200.');
      return;
    }
    if (n < highestBusy) {
      setError(`Table ${highestBusy} has an open order. Close it before removing that table.`);
      return;
    }
    try {
      const s = await api.updateSettings({ tableCount: n });
      setTableCount(s.tableCount);
      setEditingTables(false);
      setError('');
      showToast(`Tables updated to ${s.tableCount}`);
    } catch (err) {
      setError(err.message || 'Could not save the number of tables.');
    }
  };

  // Replace one order in local state after the server changes it
  const applyOrderUpdate = (order) => {
    setOpenOrders(prev => {
      const others = prev.filter(o => o._id !== order._id);
      return order.status === 'pending' ? [...others, order] : others;
    });
  };

  const changeBillLine = async (index, quantity) => {
    if (!existingOrder || isUpdatingBill) return;
    const line = existingOrder.items[index];
    if (quantity === 0) {
      const last = existingOrder.items.length === 1;
      const msg = last
        ? `Remove ${line.name}? It is the last item, so table ${activeTable}'s order will be cancelled.`
        : `Remove ${line.name} from the bill?`;
      if (!window.confirm(msg)) return;
    }
    setIsUpdatingBill(true);
    setError('');
    try {
      const res = await api.setOrderItemQuantity(existingOrder._id, index, Math.min(quantity, 100));
      applyOrderUpdate(res.order);
      if (res.order.status === 'cancelled') {
        showToast(`Table ${activeTable}'s order was cancelled`);
        setActiveTable(null);
      }
    } catch (err) {
      setError(err.message || 'Could not update the bill.');
      fetchOpenOrders();
    } finally {
      setIsUpdatingBill(false);
    }
  };

  const changeBillWaiter = async (id) => {
    if (!existingOrder) return;
    setIsUpdatingBill(true);
    setError('');
    try {
      const res = await api.changeOrderWaiter(existingOrder._id, id);
      applyOrderUpdate(res.order);
      showToast(id ? `Now served by ${res.order.waiterName}` : 'Waiter removed');
    } catch (err) {
      setError(err.message || 'Could not change the waiter.');
    } finally {
      setIsUpdatingBill(false);
    }
  };

  const qtyInCart = (id) => cart.find(c => c._id === id)?.quantity || 0;

  const setQty = (item, quantity) => {
    setCart(prev => {
      if (quantity <= 0) return prev.filter(c => c._id !== item._id);
      if (prev.some(c => c._id === item._id)) {
        return prev.map(c => (c._id === item._id ? { ...c, quantity: Math.min(quantity, 100) } : c));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const submit = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const items = cart.map(c => ({ foodItem: c._id, name: c.name, price: c.price, quantity: c.quantity }));
    try {
      if (existingOrder) {
        await api.addItemsToOrder(existingOrder._id, items, cartTotal);
        showToast(`Added to table ${activeTable}'s bill`);
      } else {
        // The server adds to the table's open bill if another device opened it meanwhile
        const res = await api.createOrder({ table: activeTable, items, total: cartTotal, ...(waiterId && { waiterId }) });
        if (res.merged) showToast(`Added to table ${activeTable}'s open bill`);
        else showToast(activeTable === TAKEAWAY ? 'Takeaway order placed' : `Order placed for table ${activeTable}`);
      }
      setCart([]);
      setActiveTable(null);
      fetchOpenOrders();
    } catch (err) {
      setError(err.message || 'Could not place the order. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ───────────────────────── Step 1: table grid ─────────────────────────
  if (activeTable === null) {
    const busyCount = openOrders.filter(o => o.table > 0 && o.table <= tableCount).length;
    const takeawayCount = openOrders.filter(o => o.table === TAKEAWAY).length;

    return (
      <div className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Place Order</h1>
            <p className="text-gray-400 mt-1">Tap a table to start an order or open its bill.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-700 border border-gray-500" /> Free {tableCount - busyCount}</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> Busy {busyCount}</span>
            {editingTables ? (
              <span className="flex items-center gap-2">
                <label htmlFor="table-count" className="text-gray-300">Tables</label>
                <button aria-label="One less table" onClick={() => setDraftTableCount(n => Math.max(1, Number(n) - 1))} className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center"><Minus size={14} /></button>
                <input
                  id="table-count"
                  type="number"
                  min="1"
                  max="200"
                  value={draftTableCount}
                  onChange={(e) => setDraftTableCount(e.target.value)}
                  className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-center"
                />
                <button aria-label="One more table" onClick={() => setDraftTableCount(n => Math.min(200, Number(n) + 1))} className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center"><Plus size={14} /></button>
                <button onClick={saveTableCount} className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium"><Check size={14} /> Save</button>
                <button onClick={() => { setEditingTables(false); setError(''); }} className="text-gray-400 hover:text-white px-2 py-1.5">Cancel</button>
              </span>
            ) : (
              <button
                onClick={() => { setDraftTableCount(tableCount); setEditingTables(true); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-green-500 text-gray-200"
              >
                <Settings size={14} /> Edit tables
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">{error}</div>
        )}

        {presentWaiters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-gray-300 text-sm font-medium mb-2">Who's serving?</h2>
            <div className="flex flex-wrap gap-2">
              {presentWaiters.map(w => (
                <button
                  key={w._id}
                  onClick={() => chooseWaiter(w._id)}
                  aria-pressed={waiterId === w._id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    waiterId === w._id
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-green-500'
                  }`}
                >
                  <User size={14} /> {w.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tablesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={40} /></div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
            <button
              onClick={() => openTable(TAKEAWAY)}
              className="col-span-3 sm:col-span-2 flex items-center gap-4 p-4 h-28 rounded-xl border-2 border-dashed border-green-500 bg-gray-800 hover:bg-gray-700 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <ShoppingBag className="text-green-400 flex-shrink-0" size={32} />
              <div>
                <div className="text-white text-xl font-bold">Takeaway</div>
                <div className="text-gray-400 text-sm">
                  {takeawayCount > 0 ? `${takeawayCount} open` : 'Parcel order, no table'}
                </div>
              </div>
            </button>

            {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => {
              const order = orderForTable(n);
              return (
                <button
                  key={n}
                  onClick={() => openTable(n)}
                  aria-label={order ? `Table ${n}, busy, bill PKR ${Math.round(order.total)}` : `Table ${n}, free`}
                  className={`relative h-28 p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    order
                      ? 'bg-yellow-500 border-yellow-500 text-gray-900 hover:bg-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-white hover:border-green-500'
                  }`}
                >
                  <span className="text-3xl font-bold leading-none">{n}</span>
                  {order ? (
                    <span className="text-xs font-semibold leading-tight">
                      <span className="block text-sm">{money(order.total)}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {minutesSince(order.createdAt)} min{order.waiterName ? `, ${order.waiterName.split(' ')[0]}` : ''}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Free</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── Step 2: menu + bill ─────────────────────────
  const tableLabel = activeTable === TAKEAWAY ? 'Takeaway' : `Table ${activeTable}`;

  return (
    <div className="p-6 pb-72 lg:pb-6">
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <button
          onClick={backToTables}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <ArrowLeft size={18} /> Tables
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">{tableLabel}</h1>
          <p className="text-gray-400 text-sm">
            {existingOrder
              ? `Open for ${minutesSince(existingOrder.createdAt)} min`
              : waiterName ? `Served by ${waiterName}` : 'No waiter selected'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="search"
              placeholder="Search dishes"
              aria-label="Search dishes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4" role="tablist" aria-label="Menu categories">
            {categories.map(c => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  category === c ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-green-500'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>

          {menuLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-500" size={40} /></div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {foodItems.length === 0 ? 'Your menu is empty. Add dishes on the Food Items page.' : 'No dishes match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visibleItems.map(item => {
                const qty = qtyInCart(item._id);
                return (
                  <button
                    key={item._id}
                    onClick={() => setQty(item, qty + 1)}
                    aria-label={`Add ${item.name}, PKR ${item.price}${qty ? `, ${qty} in cart` : ''}`}
                    className={`relative flex flex-col justify-start text-left bg-gray-800 rounded-lg border-2 overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
                      qty ? 'border-green-500' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {item.image && !item.image.startsWith('/api/placeholder') ? (
                      <img src={item.image} alt="" loading="lazy" className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-gray-700" />
                    )}
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 bg-green-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center shadow">
                        {qty}
                      </span>
                    )}
                    <div className="p-3">
                      <div className="text-white font-semibold leading-snug">{item.name}</div>
                      <div className="text-green-400 font-bold mt-1">PKR {item.price.toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bill: sticky column on desktop, bottom sheet on small screens */}
        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-30 lg:static lg:z-auto">
          <div className="bg-gray-800 border-t lg:border border-gray-700 lg:rounded-lg p-4 lg:sticky lg:top-6 bill-panel overflow-y-auto">
            {error && (
              <div role="alert" className="mb-3 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}

            {existingOrder && (
              <section aria-label="Current bill" className="mb-4 pb-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">Current bill</h2>
                  <button
                    onClick={() => printBill(existingOrder)}
                    className="flex items-center gap-1 text-sm text-gray-300 hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-400"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>

                <label htmlFor="bill-waiter" className="block text-gray-400 text-sm mb-1">Waiter</label>
                <select
                  id="bill-waiter"
                  value={existingOrder.waiterId || ''}
                  disabled={isUpdatingBill}
                  onChange={(e) => changeBillWaiter(e.target.value)}
                  className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">No waiter</option>
                  {waiters
                    .filter(w => w.isPresent !== false || w._id === existingOrder.waiterId)
                    .map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>

                <ul className="space-y-2">
                  {existingOrder.items.map((line, index) => (
                    <li key={line._id || index} className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{line.name}</div>
                        <div className="text-gray-400 text-sm">{money(line.price * line.quantity)}</div>
                      </div>
                      <QtyStepper
                        label={line.name}
                        quantity={line.quantity}
                        disabled={isUpdatingBill}
                        onChange={(q) => changeBillLine(index, q)}
                      />
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between mt-3 text-gray-200">
                  <span>Bill so far</span>
                  <span className="font-bold">{money(existingOrder.total)}</span>
                </div>
              </section>
            )}

            <h2 className="text-lg font-semibold text-white mb-3">{existingOrder ? 'Add items' : 'Order'}</h2>

            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-2">Tap a dish to add it.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {cart.map(c => (
                  <li key={c._id} className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{c.name}</div>
                      <div className="text-gray-400 text-sm">{money(c.price * c.quantity)}</div>
                    </div>
                    <QtyStepper label={c.name} quantity={c.quantity} onChange={(q) => setQty(c, q)} />
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-300">{cartCount} new {cartCount === 1 ? 'item' : 'items'}</span>
              <span className="text-2xl font-bold text-white">{money(cartTotal)}</span>
            </div>
            <button
              onClick={submit}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              {isSubmitting ? 'Placing…' : existingOrder ? `Add to table ${activeTable}'s bill` : `Place order for ${tableLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPlacement;

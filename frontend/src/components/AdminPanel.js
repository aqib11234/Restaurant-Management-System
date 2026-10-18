import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Loader2, Search, RefreshCw, LogOut, Power, PowerOff, Infinity as InfinityIcon, CalendarPlus } from 'lucide-react';

// Same base URL as the rest of the app
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const KEY_STORE = 'adminKey';

const readKey = () => {
  try { return sessionStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// What the licence means for the owner, in plain words
function licenceLabel(r) {
  if (r.licenseType === 'lifetime') return { text: 'Lifetime', tone: 'green' };
  // hasValidLicense is also false for deactivated accounts, so judge expiry by the date
  if (!r.subscriptionEndsAt || new Date(r.subscriptionEndsAt) < new Date()) return { text: 'Expired', tone: 'red' };
  const days = Number(r.daysRemaining);
  const plan = r.plan === 'trial' ? 'Trial' : r.plan === 'yearly' ? 'Yearly' : r.plan === 'monthly' ? 'Monthly' : 'Subscription';
  return { text: `${plan}, ${days} ${days === 1 ? 'day' : 'days'} left`, tone: days <= 3 ? 'yellow' : 'gray' };
}

const expiringSoon = (r) => r.licenseType !== 'lifetime' && licenceLabel(r).tone !== 'gray';

const toneClass = {
  green: 'bg-green-500 bg-opacity-20 text-green-300 border-green-500',
  red: 'bg-red-500 bg-opacity-20 text-red-300 border-red-500',
  yellow: 'bg-yellow-500 bg-opacity-20 text-yellow-300 border-yellow-500',
  gray: 'bg-gray-700 text-gray-300 border-gray-600',
};

function AdminPanel() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [keyInput, setKeyInput] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const call = useCallback(async (path, options = {}, key = adminKey) => {
    const res = await fetch(`${API_BASE_URL}/admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key, ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.message || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  }, [adminKey]);

  const load = useCallback(async (key = adminKey) => {
    if (!key) return;
    setIsLoading(true);
    setError('');
    try {
      const body = await call('/restaurants', {}, key);
      setRestaurants(body.restaurants || []);
      return true;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
        setAdminKey('');
        setError(err.status === 403 ? 'Admin access is turned off on the server (ADMIN_KEY is not set).' : 'That admin key is not correct.');
      } else {
        setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. It may be starting up; try again in a minute.' : err.message);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, call]);

  useEffect(() => { if (adminKey) load(adminKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    if (await load(key)) {
      try { sessionStorage.setItem(KEY_STORE, key); } catch { /* ignore */ }
      setAdminKey(key);
      setKeyInput('');
    }
  };

  const signOut = () => {
    try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
    setAdminKey('');
    setRestaurants([]);
  };

  const act = async (r, path, body, confirmText, done) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(r.id);
    setError('');
    try {
      await call(path, { method: 'POST', body: JSON.stringify({ restaurantId: r.id, ...body }) });
      setNotice(done);
      setTimeout(() => setNotice(''), 3000);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => ({
    all: restaurants.length,
    active: restaurants.filter(r => r.isActive).length,
    inactive: restaurants.filter(r => !r.isActive).length,
    expiring: restaurants.filter(expiringSoon).length,
  }), [restaurants]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter(r => {
      if (filter === 'active' && !r.isActive) return false;
      if (filter === 'inactive' && r.isActive) return false;
      if (filter === 'expiring' && !expiringSoon(r)) return false;
      return !q || r.name.toLowerCase().includes(q) || r.emails.some(e => e.toLowerCase().includes(q));
    });
  }, [restaurants, query, filter]);

  // ── Key screen ──
  if (!adminKey) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={signIn} className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md">
          <Shield className="mx-auto mb-4 text-green-500" size={44} />
          <h1 className="text-2xl font-bold text-white text-center">Admin</h1>
          <p className="text-gray-400 text-center mt-1 mb-6">Manage every restaurant account.</p>
          {error && <div role="alert" className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">{error}</div>}
          <label htmlFor="admin-key" className="block text-gray-300 text-sm mb-2">Admin key</label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !keyInput.trim()}
            className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />} Open admin
          </button>
          <p className="text-gray-500 text-xs mt-4">This is the ADMIN_KEY set on the server. It is kept only until this tab is closed.</p>
        </form>
      </div>
    );
  }

  // ── Accounts ──
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-green-500" size={30} />
            <div>
              <h1 className="text-3xl font-bold text-white">Accounts</h1>
              <p className="text-gray-400">Every restaurant using the system.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => load()} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-green-500 text-gray-200">
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-red-500 text-gray-200">
              <LogOut size={16} /> Lock
            </button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">{error}</div>}
        {notice && <div role="status" className="mb-4 p-3 bg-green-900 bg-opacity-50 border border-green-700 rounded text-green-200 text-sm">{notice}</div>}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Deactivated'],
            ['expiring', 'Expiring or expired'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${filter === id ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-green-500'}`}
            >
              {label}
              <span className={`text-xs px-2 rounded-full ${filter === id ? 'bg-white text-green-700' : 'bg-gray-700'}`}>{counts[id]}</span>
            </button>
          ))}
          <div className="relative flex-1 min-w-0" style={{ minWidth: '14rem' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              aria-label="Search by restaurant or email"
              placeholder="Search by restaurant or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        {isLoading && restaurants.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={40} /></div>
        ) : visible.length === 0 ? (
          <p className="text-gray-400 text-center py-16">No accounts match.</p>
        ) : (
          <div className="space-y-3">
            {visible.map(r => {
              const licence = licenceLabel(r);
              const busy = busyId === r.id;
              return (
                <article key={r.id} className={`bg-gray-800 border rounded-xl p-4 md:p-5 ${r.isActive ? 'border-gray-700' : 'border-red-800'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-white">{r.name}</h2>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${r.isActive ? toneClass.green : toneClass.red}`}>
                          {r.isActive ? 'Active' : 'Deactivated'}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${toneClass[licence.tone]}`}>{licence.text}</span>
                      </div>
                      <p className="text-gray-300 mt-1 break-all">{r.emails.length ? r.emails.join(', ') : 'No login'}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Joined {formatDate(r.createdAt)}. {r.menuItems} menu items, {r.orders} orders{r.lastOrderAt ? `, last on ${formatDate(r.lastOrderAt)}` : ''}.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {r.isActive ? (
                        <button
                          disabled={busy}
                          onClick={() => act(r, '/deactivate-restaurant', {}, `Deactivate "${r.name}"? Its staff will be signed out and cannot log in until you activate it again.`, `${r.name} deactivated`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-red-500 text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold"
                        >
                          <PowerOff size={16} /> Deactivate
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => act(r, '/activate-restaurant', {}, null, `${r.name} activated`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 font-semibold"
                        >
                          <Power size={16} /> Activate
                        </button>
                      )}
                      {r.licenseType !== 'lifetime' && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => act(r, '/extend-subscription', { days: 30 }, null, `${r.name}: 30 days added`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 disabled:opacity-50"
                          >
                            <CalendarPlus size={16} /> +30 days
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => act(r, '/convert-to-lifetime', {}, `Give "${r.name}" a lifetime licence? It will never expire.`, `${r.name} now has a lifetime licence`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 disabled:opacity-50"
                          >
                            <InfinityIcon size={16} /> Make lifetime
                          </button>
                        </>
                      )}
                      {busy && <Loader2 size={20} className="animate-spin text-green-500 self-center" />}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

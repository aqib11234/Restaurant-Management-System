import React, { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, PowerOff, Power, Loader2, X, User2 } from 'lucide-react';
import api from '../services/api';

function WaiterManagement() {
  const [waiters, setWaiters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWaiters();
  }, [showInactive]);

  const fetchWaiters = async () => {
    try {
      setIsLoading(true);
      const params = showInactive ? { includeInactive: true } : {};
      const response = await api.getWaiters(params);
      setWaiters(response.waiters || []);
      setError('');
    } catch (err) {
      setError('Failed to load waiters');
      console.error('Error fetching waiters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingWaiter(null);
    setFormName('');
    setFormPhone('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (waiter) => {
    setEditingWaiter(waiter);
    setFormName(waiter.name);
    setFormPhone(waiter.phone || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('Name must be at least 2 characters');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingWaiter) {
        await api.updateWaiter(editingWaiter._id, { name: formName.trim(), phone: formPhone.trim() });
        showToast('Waiter updated successfully!', 'green');
      } else {
        await api.createWaiter({ name: formName.trim(), phone: formPhone.trim() });
        showToast('Waiter added successfully!', 'green');
      }
      setShowModal(false);
      fetchWaiters();
    } catch (err) {
      setFormError(err.message || 'Failed to save waiter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (waiter) => {
    const action = waiter.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${waiter.name}?`)) return;
    try {
      await api.updateWaiter(waiter._id, { isActive: !waiter.isActive });
      showToast(`Waiter ${action}d successfully!`, waiter.isActive ? 'orange' : 'green');
      fetchWaiters();
    } catch (err) {
      setError(err.message || `Failed to ${action} waiter`);
    }
  };

  const handleTogglePresent = async (waiter) => {
    const present = waiter.isPresent === false;
    // Update on screen straight away; roll back if the server refuses
    setWaiters(prev => prev.map(w => (w._id === waiter._id ? { ...w, isPresent: present } : w)));
    try {
      await api.updateWaiter(waiter._id, { isPresent: present });
    } catch (err) {
      setWaiters(prev => prev.map(w => (w._id === waiter._id ? { ...w, isPresent: !present } : w)));
      setError(err.message || 'Could not update attendance');
    }
  };

  const handleDelete = async (waiter) => {
    if (!window.confirm(`Permanently delete ${waiter.name}? This cannot be undone.`)) return;
    try {
      await api.deleteWaiter(waiter._id);
      showToast('Waiter deleted successfully!', 'red');
      fetchWaiters();
    } catch (err) {
      setError(err.message || 'Failed to delete waiter');
    }
  };

  const showToast = (msg, color) => {
    const colors = { green: 'bg-green-500', red: 'bg-red-500', orange: 'bg-yellow-500' };
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 ${colors[color] || colors.green} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <User2 className="text-green-500" size={32} />
            Waiter Management
          </h1>
          <p className="text-gray-400 mt-1">Tap Present or Absent to mark who's working. Absent waiters are hidden on Place Order.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-600 text-green-500 focus:ring-green-500"
            />
            Show inactive
          </label>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg"
          >
            <UserPlus size={18} />
            Add Waiter
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-green-500" size={36} />
          </div>
        ) : waiters.length === 0 ? (
          <div className="text-center py-16">
            <User2 className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 text-lg">No waiters found</p>
            <p className="text-gray-500 text-sm mt-1">Click "Add Waiter" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">#</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Phone</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Today</th>
                  <th className="px-6 py-4 text-right text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {waiters.map((waiter, idx) => (
                  <tr
                    key={waiter._id}
                    className={`border-t border-gray-700 transition-colors ${
                      !waiter.isActive ? 'opacity-50' : 'hover:bg-gray-750'
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-400 text-sm">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 font-bold text-sm">
                            {waiter.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium">{waiter.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {waiter.phone || <span className="text-gray-600 italic">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {waiter.isActive ? (
                        <button
                          onClick={() => handleTogglePresent(waiter)}
                          aria-pressed={waiter.isPresent !== false}
                          title={waiter.isPresent !== false ? 'Tap to mark absent' : 'Tap to mark present'}
                          className={`w-24 text-center py-2 rounded-full text-sm font-semibold border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${
                            waiter.isPresent !== false
                              ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                              : 'bg-transparent border-red-500 text-red-300 hover:bg-red-500 hover:bg-opacity-20'
                          }`}
                        >
                          {waiter.isPresent !== false ? 'Present' : 'Absent'}
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-400 border border-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(waiter)}
                          className="p-2 rounded-lg bg-blue-500 bg-opacity-20 hover:bg-blue-500 hover:bg-opacity-40 text-blue-400 transition-colors"
                          title="Edit waiter"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(waiter)}
                          className={`p-2 rounded-lg transition-colors ${
                            waiter.isActive
                              ? 'bg-yellow-500 bg-opacity-20 hover:bg-yellow-500 hover:bg-opacity-40 text-yellow-400'
                              : 'bg-green-500 bg-opacity-20 hover:bg-green-500 hover:bg-opacity-40 text-green-400'
                          }`}
                          title={waiter.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {waiter.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(waiter)}
                          className="p-2 rounded-lg bg-red-500 bg-opacity-20 hover:bg-red-500 hover:bg-opacity-40 text-red-400 transition-colors"
                          title="Delete waiter"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingWaiter ? 'Edit Waiter' : 'Add New Waiter'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-50 text-red-300 text-sm p-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Phone <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-semibold transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingWaiter ? 'Update' : 'Add Waiter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaiterManagement;

import { handleResponse, getAuthHeaders } from '../utils/auth';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Debug: Log the API URL being used (only in development)
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 API_BASE_URL:', API_BASE_URL);
    console.log('🔧 REACT_APP_API_BASE_URL env var:', process.env.REACT_APP_API_BASE_URL);
}

// Validate API URL format
if (!API_BASE_URL.includes('/api')) {
    console.error('⚠️ WARNING: API_BASE_URL does not include "/api" path. Current value:', API_BASE_URL);
    console.error('⚠️ Expected format: https://your-backend-url.onrender.com/api');
}

// Helper function to handle API responses
const handleApiResponse = async (response) => {
    if (response.status === 401 || response.status === 403) {
        // Licence problems (expired trial, deactivated account) come back as 403 with a code;
        // keep the reason so the login screen can explain why the user was signed out
        const body = await response.clone().json().catch(() => ({}));
        try {
            if (body.code) sessionStorage.setItem('authNotice', body.error || body.message || '');
        } catch { /* storage unavailable */ }
        // Clear stale session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
};

const api = {
    // Auth API
    signup: async (userData) => {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        return handleApiResponse(response);
    },

    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        return handleApiResponse(response);
    },

    // Dashboard API
    getDashboardStats: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/dashboard/stats${queryString ? `?${queryString}` : ''}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    // Food Items API
    getFoodItems: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/food-items?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    createFoodItem: async (foodItem) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/food-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(foodItem),
        });
        return handleApiResponse(response);
    },

    updateFoodItem: async (id, foodItem) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/food-items/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(foodItem),
        });
        return handleApiResponse(response);
    },

    deleteFoodItem: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/food-items/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    // Orders API
    getOrders: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/orders?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    createOrder: async (orderData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(orderData),
        });
        return handleApiResponse(response);
    },

    updateOrderStatus: async (orderId, status, extra = {}) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status, ...extra }),
        });
        return handleApiResponse(response);
    },

    setOrderItemQuantity: async (orderId, index, quantity) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items/${index}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ quantity }),
        });
        return handleApiResponse(response);
    },
    changeOrderWaiter: async (orderId, waiterId) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/waiter`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ waiterId: waiterId || null }),
        });
        return handleApiResponse(response);
    },
    getSettings: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleApiResponse(response);
    },
    updateSettings: async (settings) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(settings),
        });
        return handleApiResponse(response);
    },
    deleteOrder: async (orderId) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    addItemsToOrder: async (orderId, items, additionalTotal) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/add-items`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ items, additionalTotal }),
        });
        return handleApiResponse(response);
    },

    removeItemQuantityFromOrder: async (orderId, itemIndex) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/remove-item-quantity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ itemIndex }),
        });
        return handleApiResponse(response);
    },

    // Sales API
    getSalesData: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/sales?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    getSalesHistory: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/sales/history?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    getPeriodOrders: async (period, date, params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/sales/orders/${period}/${date}?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    // Categories API
    getSalesBreakdown: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/sales/breakdown?${queryString}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleApiResponse(response);
    },
    getCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/categories`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    // ── Waiter API ──────────────────────────────────────────────────────────

    getWaiters: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/waiters${queryString ? `?${queryString}` : ''}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleApiResponse(response);
    },

    getWaiterStats: async (params = {}) => {
        const token = localStorage.getItem('token');
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/waiters/stats${queryString ? `?${queryString}` : ''}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleApiResponse(response);
    },

    createWaiter: async (waiterData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/waiters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(waiterData),
        });
        return handleApiResponse(response);
    },

    updateWaiter: async (id, waiterData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/waiters/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(waiterData),
        });
        return handleApiResponse(response);
    },

    deleteWaiter: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/waiters/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleApiResponse(response);
    },
};

export default api;

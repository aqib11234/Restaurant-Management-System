import { handleResponse, getAuthHeaders } from '../utils/auth';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Helper function to handle API responses
const handleApiResponse = async (response) => {
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
    getDashboardStats: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleApiResponse(response);
    },

    // Food Items API
    getFoodItems: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/food-items?${queryString}`);
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

    updateOrderStatus: async (orderId, status) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
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
    getCategories: async () => {
        const response = await fetch(`${API_BASE_URL}/categories`);
        return handleApiResponse(response);
    },
};

export default api;
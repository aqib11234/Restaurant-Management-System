const handleResponse = async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Reload the page which will redirect to login due to missing token
            window.location.reload();
            throw new Error('Your session has expired. Please login again.');
        }
        throw new Error(data.message || 'An error occurred');
    }
    
    return data;
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
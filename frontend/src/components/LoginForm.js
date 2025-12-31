import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import api from '../services/api';

function LoginForm({ onLogin, onSignupClick }) {
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(credentials);
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        onLogin();
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (error) {
      setError('Server error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <UtensilsCrossed className="mx-auto mb-4 text-green-500" size={48} />
          <h1 className="text-3xl font-bold text-white">RMS Admin</h1>
          <p className="text-gray-400 mt-2">Restaurant Management System</p>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${isLoading ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'
              } text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={onSignupClick}
            className="text-green-500 hover:text-green-400 font-medium"
          >
            Sign up
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-sm text-center">
            Demo Credentials:<br />
            <span className="text-green-400 font-medium">Email: admin@777restaurant.com</span><br />
            <span className="text-green-400 font-medium">Password: admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
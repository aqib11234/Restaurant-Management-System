import React, { useState, Suspense, lazy, createContext, useContext } from 'react';
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  LogOut
} from 'lucide-react';

// Create a context for order updates
export const OrderUpdateContext = createContext();

// Lazy load components for performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const FoodItems = lazy(() => import('./components/FoodItems'));
const OrderPlacement = lazy(() => import('./components/OrderPlacement'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const SalesHistory = lazy(() => import('./components/SalesHistory'));
const Tables = lazy(() => import('./components/Tables'));
const LoginForm = lazy(() => import('./components/LoginForm'));
const SignupForm = lazy(() => import('./components/SignupForm'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        return false;
      }
      return true;
    } catch (err) {
      localStorage.removeItem('token');
      return false;
    }
  });

  // State for triggering updates
  const [orderUpdateTrigger, setOrderUpdateTrigger] = useState(0);

  const triggerOrderUpdate = () => {
    setOrderUpdateTrigger(prev => prev + 1);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tables', label: 'Tables', icon: UtensilsCrossed },
    { id: 'food-items', label: 'Food Items', icon: UtensilsCrossed },
    { id: 'order-placement', label: 'Place Order', icon: ShoppingCart },
    { id: 'order-tracking', label: 'Order Tracking', icon: ClipboardList },
    { id: 'sales-history', label: 'Sales History', icon: BarChart3 },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'tables':
        return <Tables />;
      case 'food-items':
        return <FoodItems />;
      case 'order-placement':
        return <OrderPlacement />;
      case 'order-tracking':
        return <OrderTracking />;
      case 'sales-history':
        return <SalesHistory />;
      default:
        return <Dashboard />;
    }
  };

  const [isSignup, setIsSignup] = useState(false);

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {isSignup ? (
          <SignupForm onSignup={() => setIsSignup(false)} />
        ) : (
          <LoginForm
            onLogin={() => setIsLoggedIn(true)}
            onSignupClick={() => setIsSignup(true)}
          />
        )}
      </Suspense>
    );
  }

  return (
    <OrderUpdateContext.Provider value={{ orderUpdateTrigger, triggerOrderUpdate }}>
      <div className="flex min-h-screen bg-gray-900">
        {/* Sidebar */}
        <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-10">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-8">777 Cafe</h1>
            <nav className="space-y-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-green-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsLoggedIn(false);
                setCurrentPage('dashboard');
                window.location.href = '/login';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 overflow-auto">
          <Suspense fallback={<LoadingSpinner />}>
            {renderPage()}
          </Suspense>
        </div>
      </div>
    </OrderUpdateContext.Provider>
  );
}

export default App;

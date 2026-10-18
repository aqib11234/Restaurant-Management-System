const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with Atlas optimization
// On a hosting platform there is no local database, so a missing MONGODB_URI
// is a setup mistake: say so plainly instead of trying localhost
if (!process.env.MONGODB_URI && (process.env.NODE_ENV === 'production' || process.env.RENDER)) {
  console.error('❌ MONGODB_URI is not set. Add it in your host\'s environment settings (e.g. Render > Environment) and redeploy.');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('💡 Check your MONGODB_URI in .env file');
    process.exit(1);
  });

const adminKey = require('./middleware/adminKey');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const foodItemRoutes = require('./routes/foodItems');
const orderRoutes = require('./routes/orders');
const salesRoutes = require('./routes/sales');
const seedRoutes = require('./routes/seed');
const adminRoutes = require('./routes/admin');
const orderTrackingRoutes = require('./routes/orderTracking');
const migrateRoutes = require('./routes/migrate');
const waiterRoutes = require('./routes/waiters');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/food-items', foodItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/seed', adminKey, seedRoutes);
app.use('/api/admin', adminKey, adminRoutes);
app.use('/api/order-tracking', orderTrackingRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/waiters', waiterRoutes);
app.use('/api/settings', require('./routes/settings'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Restaurant Management System API is running!',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Categories Route (scoped to the signed-in restaurant)
app.use('/api/categories', require('./routes/categories'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
  console.log(`💾 To seed database: POST http://localhost:${PORT}/api/seed`);
});
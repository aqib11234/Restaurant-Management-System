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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const foodItemRoutes = require('./routes/foodItems');
const orderRoutes = require('./routes/orders');
const salesRoutes = require('./routes/sales');
const seedRoutes = require('./routes/seed');
const adminRoutes = require('./routes/admin');
const orderTrackingRoutes = require('./routes/orderTracking');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/food-items', foodItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/order-tracking', orderTrackingRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Restaurant Management System API is running!',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Categories Route
app.get('/api/categories', async (req, res) => {
  try {
    const FoodItem = require('./models/FoodItem');
    const categories = await FoodItem.distinct('category', { available: true });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

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
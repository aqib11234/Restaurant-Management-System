const mongoose = require('mongoose');
require('dotenv').config();

const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const FoodItem = require('./models/FoodItem');
const Order = require('./models/Order');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management')
    .then(async () => {
        console.log('✅ MongoDB Connected\n');

        console.log('📊 DATABASE STATUS:\n');

        const restaurantCount = await Restaurant.countDocuments();
        const userCount = await User.countDocuments();
        const foodItemCount = await FoodItem.countDocuments();
        const orderCount = await Order.countDocuments();

        console.log(`   Restaurants: ${restaurantCount}`);
        console.log(`   Users: ${userCount}`);
        console.log(`   Food Items: ${foodItemCount}`);
        console.log(`   Orders: ${orderCount}\n`);

        if (restaurantCount > 0) {
            const restaurant = await Restaurant.findOne();
            console.log('🏢 RESTAURANT INFO:');
            console.log(`   Name: ${restaurant.name}`);
            console.log(`   ID: ${restaurant._id}`);
            console.log(`   License: ${restaurant.licenseType} (${restaurant.plan})`);
            console.log(`   Active: ${restaurant.isActive}`);
            console.log(`   Trial Ends: ${restaurant.subscriptionEndsAt?.toLocaleDateString()}\n`);
        }

        if (userCount > 0) {
            const user = await User.findOne();
            console.log('👤 USER INFO:');
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Restaurant ID: ${user.restaurantId}\n`);
        }

        if (foodItemCount > 0) {
            const categories = await FoodItem.distinct('category');
            console.log('🍔 FOOD CATEGORIES:');
            for (const category of categories) {
                const count = await FoodItem.countDocuments({ category });
                console.log(`   ${category}: ${count} items`);
            }
            console.log('');
        }

        if (orderCount > 0) {
            const completedOrders = await Order.countDocuments({ status: 'completed' });
            const totalRevenue = await Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            console.log('📦 ORDER STATS:');
            console.log(`   Total Orders: ${orderCount}`);
            console.log(`   Completed: ${completedOrders}`);
            console.log(`   Total Revenue: $${totalRevenue[0]?.total?.toFixed(2) || 0}\n`);
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 DATABASE READY FOR TESTING!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('🔑 LOGIN CREDENTIALS:');
        console.log('   Email: admin@fastfood.com');
        console.log('   Password: admin123\n');

        console.log('📚 NEXT STEPS:');
        console.log('   1. Check TESTING_GUIDE.md for complete testing instructions');
        console.log('   2. Login to get your JWT token');
        console.log('   3. Start testing all endpoints!\n');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

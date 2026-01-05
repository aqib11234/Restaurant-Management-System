/**
 * Migration Script: Fix Missing RestaurantId in Sales Data
 * 
 * This script fixes the bug where MonthlySales and SalesHistory records
 * were created without the restaurantId field, causing dashboard and
 * sales history queries to fail.
 * 
 * Run this script ONCE after deploying the fixed code.
 */

const mongoose = require('mongoose');
const MonthlySales = require('./models/MonthlySales');
const SalesHistory = require('./models/SalesHistory');
const Order = require('./models/Order');
const Restaurant = require('./models/Restaurant');

async function fixMissingRestaurantIds() {
    try {
        console.log('🔧 Starting migration to fix missing restaurantId...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Get all restaurants
        const restaurants = await Restaurant.find({});
        console.log(`📊 Found ${restaurants.length} restaurant(s)\n`);

        if (restaurants.length === 0) {
            console.log('⚠️  No restaurants found. Exiting...');
            process.exit(0);
        }

        // For single-tenant systems, use the first (and likely only) restaurant
        const restaurant = restaurants[0];
        console.log(`🏪 Using restaurant: ${restaurant.name} (ID: ${restaurant._id})\n`);

        // Fix MonthlySales records
        console.log('📅 Fixing MonthlySales records...');
        const monthlySalesWithoutRestaurant = await MonthlySales.find({
            $or: [
                { restaurantId: { $exists: false } },
                { restaurantId: null }
            ]
        });

        console.log(`   Found ${monthlySalesWithoutRestaurant.length} MonthlySales records without restaurantId`);

        for (const record of monthlySalesWithoutRestaurant) {
            await MonthlySales.updateOne(
                { _id: record._id },
                { $set: { restaurantId: restaurant._id } }
            );
        }

        console.log(`   ✅ Updated ${monthlySalesWithoutRestaurant.length} MonthlySales records\n`);

        // Fix SalesHistory records
        console.log('📊 Fixing SalesHistory records...');
        const salesHistoryWithoutRestaurant = await SalesHistory.find({
            $or: [
                { restaurantId: { $exists: false } },
                { restaurantId: null }
            ]
        });

        console.log(`   Found ${salesHistoryWithoutRestaurant.length} SalesHistory records without restaurantId`);

        for (const record of salesHistoryWithoutRestaurant) {
            await SalesHistory.updateOne(
                { _id: record._id },
                { $set: { restaurantId: restaurant._id } }
            );
        }

        console.log(`   ✅ Updated ${salesHistoryWithoutRestaurant.length} SalesHistory records\n`);

        // Verify the fix
        console.log('🔍 Verifying the fix...');
        const monthlySalesCount = await MonthlySales.countDocuments({ restaurantId: restaurant._id });
        const salesHistoryCount = await SalesHistory.countDocuments({ restaurantId: restaurant._id });
        const totalOrders = await Order.countDocuments({ restaurantId: restaurant._id, status: 'completed' });

        console.log(`   MonthlySales records with restaurantId: ${monthlySalesCount}`);
        console.log(`   SalesHistory records with restaurantId: ${salesHistoryCount}`);
        console.log(`   Total completed orders: ${totalOrders}\n`);

        // Show sample data
        console.log('📈 Sample Sales Data:');
        const recentSales = await SalesHistory.find({ restaurantId: restaurant._id, period: 'daily' })
            .sort({ date: -1 })
            .limit(5);

        recentSales.forEach(sale => {
            console.log(`   ${sale.date.toISOString().split('T')[0]}: ${sale.orders} orders, PKR ${Math.round(sale.revenue)}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Deploy the fixed code to Render');
        console.log('   2. The dashboard and sales history should now show all data');
        console.log('   3. New orders will automatically include restaurantId\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
fixMissingRestaurantIds();

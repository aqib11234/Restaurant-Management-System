/**
 * Fix Subscription Expiry
 * 
 * This script updates your restaurant to either:
 * 1. Lifetime license (no expiry) - RECOMMENDED
 * 2. Extended subscription (new expiry date)
 * 
 * Run this script to regain access to your system.
 */

const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');

async function fixSubscription() {
    try {
        console.log('🔧 Starting subscription fix...\n');

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

        // Show current status
        for (const restaurant of restaurants) {
            console.log(`🏪 Restaurant: ${restaurant.name}`);
            console.log(`   License Type: ${restaurant.licenseType}`);
            console.log(`   Plan: ${restaurant.plan || 'N/A'}`);
            console.log(`   Subscription Ends: ${restaurant.subscriptionEndsAt || 'N/A'}`);
            console.log(`   Is Active: ${restaurant.isActive}`);
            console.log(`   Valid License: ${restaurant.hasValidLicense()}`);
            console.log('');
        }

        // OPTION 1: Change to Lifetime License (RECOMMENDED)
        console.log('🔄 Updating to LIFETIME license...\n');

        for (const restaurant of restaurants) {
            restaurant.licenseType = 'lifetime';
            restaurant.plan = null; // Lifetime licenses don't have plans
            restaurant.subscriptionEndsAt = null; // No expiry
            restaurant.isActive = true;
            await restaurant.save();

            console.log(`✅ Updated ${restaurant.name} to LIFETIME license`);
        }

        // OPTION 2: Extend Subscription (Alternative)
        // Uncomment the code below if you prefer subscription with extended date
        /*
        console.log('🔄 Extending subscription to 1 year from now...\n');
        
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        for (const restaurant of restaurants) {
          restaurant.licenseType = 'subscription';
          restaurant.plan = 'yearly';
          restaurant.subscriptionEndsAt = oneYearFromNow;
          restaurant.isActive = true;
          await restaurant.save();
          
          console.log(`✅ Extended ${restaurant.name} subscription to ${oneYearFromNow.toISOString().split('T')[0]}`);
        }
        */

        console.log('\n✅ Subscription fix completed successfully!');
        console.log('\n📝 Summary:');

        const updatedRestaurants = await Restaurant.find({});
        for (const restaurant of updatedRestaurants) {
            console.log(`\n🏪 ${restaurant.name}:`);
            console.log(`   License Type: ${restaurant.licenseType}`);
            console.log(`   Plan: ${restaurant.plan || 'N/A'}`);
            console.log(`   Subscription Ends: ${restaurant.subscriptionEndsAt || 'Never (Lifetime)'}`);
            console.log(`   Valid License: ${restaurant.hasValidLicense() ? '✅ YES' : '❌ NO'}`);
        }

        console.log('\n🎉 You can now login to your restaurant system!');

    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the fix
fixSubscription();

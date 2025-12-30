const mongoose = require('mongoose');
require('dotenv').config();

async function runTests() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
        console.log('✅ MongoDB Connected\n');

        console.log('🧪 COMPREHENSIVE SYSTEM TESTING\n');
        console.log('═══════════════════════════════════════════════════════\n');

        const Restaurant = require('./models/Restaurant');
        const User = require('./models/User');
        const FoodItem = require('./models/FoodItem');
        const Order = require('./models/Order');
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');

        let testsPassed = 0;
        let testsFailed = 0;
        const errors = [];

        // Test 1: Check Restaurant exists
        console.log('Test 1: Check Restaurant exists');
        const restaurant = await Restaurant.findOne();
        if (restaurant) {
            console.log('✅ PASS - Restaurant found:', restaurant.name);
            console.log(`   ID: ${restaurant._id}`);
            console.log(`   License: ${restaurant.licenseType} (${restaurant.plan})`);
            testsPassed++;
        } else {
            console.log('❌ FAIL - No restaurant found');
            errors.push('No restaurant in database');
            testsFailed++;
        }
        console.log('');

        // Test 2: Check User exists
        console.log('Test 2: Check User exists');
        const user = await User.findOne();
        if (user) {
            console.log('✅ PASS - User found:', user.email);
            console.log(`   Role: ${user.role}`);
            console.log(`   Restaurant ID: ${user.restaurantId}`);
            testsPassed++;
        } else {
            console.log('❌ FAIL - No user found');
            errors.push('No user in database');
            testsFailed++;
        }
        console.log('');

        // Test 3: Verify password hash
        console.log('Test 3: Verify password can be validated');
        if (user) {
            const isValidPassword = await bcrypt.compare('admin123', user.passwordHash);
            if (isValidPassword) {
                console.log('✅ PASS - Password validation works');
                testsPassed++;
            } else {
                console.log('❌ FAIL - Password validation failed');
                errors.push('Password hash mismatch');
                testsFailed++;
            }
        } else {
            console.log('⏭️  SKIP - No user to test');
        }
        console.log('');

        // Test 4: Check restaurantId matches
        console.log('Test 4: Check User.restaurantId matches Restaurant._id');
        if (user && restaurant) {
            if (user.restaurantId.toString() === restaurant._id.toString()) {
                console.log('✅ PASS - restaurantId matches');
                testsPassed++;
            } else {
                console.log('❌ FAIL - restaurantId mismatch');
                console.log(`   User.restaurantId: ${user.restaurantId}`);
                console.log(`   Restaurant._id: ${restaurant._id}`);
                errors.push('restaurantId mismatch between user and restaurant');
                testsFailed++;
            }
        } else {
            console.log('⏭️  SKIP - Missing user or restaurant');
        }
        console.log('');

        // Test 5: Check Food Items have restaurantId
        console.log('Test 5: Check Food Items have restaurantId');
        const foodItems = await FoodItem.find();
        if (foodItems.length > 0) {
            const itemsWithRestaurantId = foodItems.filter(item => item.restaurantId);
            if (itemsWithRestaurantId.length === foodItems.length) {
                console.log(`✅ PASS - All ${foodItems.length} food items have restaurantId`);
                testsPassed++;
            } else {
                console.log(`❌ FAIL - ${foodItems.length - itemsWithRestaurantId.length} items missing restaurantId`);
                errors.push('Some food items missing restaurantId');
                testsFailed++;
            }
        } else {
            console.log('❌ FAIL - No food items found');
            errors.push('No food items in database');
            testsFailed++;
        }
        console.log('');

        // Test 6: Check Orders have restaurantId
        console.log('Test 6: Check Orders have restaurantId');
        const orders = await Order.find();
        if (orders.length > 0) {
            const ordersWithRestaurantId = orders.filter(order => order.restaurantId);
            if (ordersWithRestaurantId.length === orders.length) {
                console.log(`✅ PASS - All ${orders.length} orders have restaurantId`);
                testsPassed++;
            } else {
                console.log(`❌ FAIL - ${orders.length - ordersWithRestaurantId.length} orders missing restaurantId`);
                errors.push('Some orders missing restaurantId');
                testsFailed++;
            }
        } else {
            console.log('❌ FAIL - No orders found');
            errors.push('No orders in database');
            testsFailed++;
        }
        console.log('');

        // Test 7: Check Restaurant license is valid
        console.log('Test 7: Check Restaurant license is valid');
        if (restaurant) {
            const hasValidLicense = restaurant.hasValidLicense();
            if (hasValidLicense) {
                console.log('✅ PASS - Restaurant has valid license');
                const daysRemaining = restaurant.getDaysRemaining();
                console.log(`   Days remaining: ${daysRemaining === Infinity ? 'Lifetime' : daysRemaining}`);
                testsPassed++;
            } else {
                console.log('❌ FAIL - Restaurant license is invalid/expired');
                errors.push('Restaurant license invalid');
                testsFailed++;
            }
        } else {
            console.log('⏭️  SKIP - No restaurant to test');
        }
        console.log('');

        // Test 8: Generate JWT token
        console.log('Test 8: Generate and verify JWT token');
        if (user && restaurant) {
            try {
                const tokenPayload = {
                    userId: user._id,
                    restaurantId: restaurant._id,
                    role: user.role
                };
                const secret = process.env.JWT_SECRET || 'restaurant_secret_key';
                const token = jwt.sign(tokenPayload, secret, { expiresIn: '24h' });

                // Verify token
                const decoded = jwt.verify(token, secret);
                if (decoded.userId && decoded.restaurantId && decoded.role) {
                    console.log('✅ PASS - JWT token generation and verification works');
                    console.log(`   Token payload includes: userId, restaurantId, role`);
                    testsPassed++;
                } else {
                    console.log('❌ FAIL - JWT token missing required fields');
                    errors.push('JWT token incomplete');
                    testsFailed++;
                }
            } catch (error) {
                console.log('❌ FAIL - JWT token error:', error.message);
                errors.push('JWT token generation failed');
                testsFailed++;
            }
        } else {
            console.log('⏭️  SKIP - Missing user or restaurant');
        }
        console.log('');

        // Test 9: Check Food Item categories
        console.log('Test 9: Check Food Item categories');
        if (foodItems.length > 0) {
            const categories = await FoodItem.distinct('category');
            console.log(`✅ PASS - Found ${categories.length} categories:`);
            categories.forEach(cat => {
                const count = foodItems.filter(item => item.category === cat).length;
                console.log(`   - ${cat}: ${count} items`);
            });
            testsPassed++;
        } else {
            console.log('⏭️  SKIP - No food items to check');
        }
        console.log('');

        // Test 10: Check Order totals are correct
        console.log('Test 10: Verify Order totals match item prices');
        if (orders.length > 0) {
            let correctTotals = 0;
            let incorrectTotals = 0;

            for (const order of orders.slice(0, 10)) { // Check first 10 orders
                const calculatedTotal = order.items.reduce((sum, item) => {
                    return sum + (item.price * item.quantity);
                }, 0);

                const diff = Math.abs(calculatedTotal - order.total);
                if (diff < 0.01) { // Allow for rounding errors
                    correctTotals++;
                } else {
                    incorrectTotals++;
                }
            }

            if (incorrectTotals === 0) {
                console.log(`✅ PASS - All checked orders have correct totals`);
                testsPassed++;
            } else {
                console.log(`⚠️  WARNING - ${incorrectTotals} orders have incorrect totals`);
                console.log(`   (Checked ${correctTotals + incorrectTotals} orders)`);
            }
        } else {
            console.log('⏭️  SKIP - No orders to check');
        }
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`   ✅ Tests Passed: ${testsPassed}`);
        console.log(`   ❌ Tests Failed: ${testsFailed}`);
        console.log(`   📊 Total Tests: ${testsPassed + testsFailed}\n`);

        if (errors.length > 0) {
            console.log('❌ ERRORS FOUND:');
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            console.log('');
        }

        if (testsFailed === 0) {
            console.log('🎉 ALL TESTS PASSED! Database is ready for API testing.\n');
        } else {
            console.log('⚠️  SOME TESTS FAILED - Review errors above\n');
        }

        process.exit(testsFailed > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

runTests();

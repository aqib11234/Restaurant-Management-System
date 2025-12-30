/**
 * LICENSE TESTING SCRIPT
 * 
 * This script demonstrates how to test the hybrid licensing system
 * Run this file with: node testLicense.js
 * 
 * Make sure MongoDB is running and the server is started
 */

const baseURL = 'http://localhost:5000/api';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${baseURL}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        console.error('API call failed:', error.message);
        return { status: 500, data: { error: error.message } };
    }
}

// Test scenarios
async function runTests() {
    console.log('🧪 HYBRID LICENSE TESTING SCRIPT\n');
    console.log('='.repeat(60));

    // Test 1: Signup (creates trial)
    console.log('\n📝 Test 1: Signup with Trial License');
    console.log('-'.repeat(60));

    const signupData = {
        restaurantName: 'Test Restaurant ' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'password123'
    };

    const signup = await apiCall('/auth/signup', 'POST', signupData);
    console.log('Status:', signup.status);
    console.log('Response:', JSON.stringify(signup.data, null, 2));

    if (signup.status !== 201) {
        console.log('❌ Signup failed!');
        return;
    }

    const token = signup.data.token;
    const restaurantId = signup.data.restaurant.id;

    console.log('\n✅ Signup successful!');
    console.log('Restaurant ID:', restaurantId);
    console.log('Trial expires:', signup.data.restaurant.subscriptionEndsAt);
    console.log('Trial days remaining:', signup.data.restaurant.trialDaysRemaining);

    // Test 2: Login
    console.log('\n\n🔐 Test 2: Login');
    console.log('-'.repeat(60));

    const login = await apiCall('/auth/login', 'POST', {
        email: signupData.email,
        password: signupData.password
    });

    console.log('Status:', login.status);
    console.log('Days remaining:', login.data.restaurant?.daysRemaining);
    console.log('✅ Login successful!');

    // Test 3: Access protected route (should work - trial is active)
    console.log('\n\n🔒 Test 3: Access Protected Route (Trial Active)');
    console.log('-'.repeat(60));

    const dashboard = await apiCall('/dashboard', 'GET', null, token);
    console.log('Status:', dashboard.status);

    if (dashboard.status === 200) {
        console.log('✅ Access granted - Trial is active');
    } else {
        console.log('❌ Access denied:', dashboard.data);
    }

    // Test 4: List all restaurants
    console.log('\n\n📋 Test 4: List All Restaurants');
    console.log('-'.repeat(60));

    const restaurants = await apiCall('/admin/restaurants', 'GET');
    console.log('Status:', restaurants.status);
    console.log('Total restaurants:', restaurants.data.count);
    console.log('\nRestaurants:');
    restaurants.data.restaurants?.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.name}`);
        console.log(`   License: ${r.licenseType} (${r.plan || 'N/A'})`);
        console.log(`   Valid: ${r.hasValidLicense}`);
        console.log(`   Days Remaining: ${r.daysRemaining}`);
        console.log(`   Active: ${r.isActive}`);
    });

    // Test 5: Convert to lifetime
    console.log('\n\n♾️  Test 5: Convert to Lifetime License');
    console.log('-'.repeat(60));

    const convert = await apiCall('/admin/convert-to-lifetime', 'POST', {
        restaurantId: restaurantId
    });

    console.log('Status:', convert.status);
    console.log('Response:', JSON.stringify(convert.data, null, 2));

    if (convert.status === 200) {
        console.log('✅ Converted to lifetime license!');
    }

    // Test 6: Access after conversion (should still work)
    console.log('\n\n🔒 Test 6: Access After Lifetime Conversion');
    console.log('-'.repeat(60));

    const dashboardAfter = await apiCall('/dashboard', 'GET', null, token);
    console.log('Status:', dashboardAfter.status);

    if (dashboardAfter.status === 200) {
        console.log('✅ Access granted - Lifetime license is active');
    } else {
        console.log('❌ Access denied:', dashboardAfter.data);
    }

    // Test 7: Create another restaurant and test subscription extension
    console.log('\n\n📝 Test 7: Create Second Restaurant & Test Subscription Extension');
    console.log('-'.repeat(60));

    const signup2 = await apiCall('/auth/signup', 'POST', {
        restaurantName: 'Test Restaurant 2 ' + Date.now(),
        email: `test2${Date.now()}@example.com`,
        password: 'password123'
    });

    if (signup2.status === 201) {
        const restaurant2Id = signup2.data.restaurant.id;
        console.log('✅ Second restaurant created:', restaurant2Id);

        // Extend subscription by 30 days
        const extend = await apiCall('/admin/extend-subscription', 'POST', {
            restaurantId: restaurant2Id,
            days: 30
        });

        console.log('\nExtension status:', extend.status);
        console.log('New expiration:', extend.data.restaurant?.subscriptionEndsAt);
        console.log('Days remaining:', extend.data.restaurant?.daysRemaining);
        console.log('✅ Subscription extended!');
    }

    // Test 8: Deactivate restaurant
    console.log('\n\n🚫 Test 8: Deactivate Restaurant');
    console.log('-'.repeat(60));

    const deactivate = await apiCall('/admin/deactivate-restaurant', 'POST', {
        restaurantId: restaurantId
    });

    console.log('Status:', deactivate.status);
    console.log('Response:', JSON.stringify(deactivate.data, null, 2));

    if (deactivate.status === 200) {
        console.log('✅ Restaurant deactivated!');

        // Try to access (should fail)
        console.log('\n🔒 Attempting to access deactivated restaurant...');
        const accessDeactivated = await apiCall('/dashboard', 'GET', null, token);
        console.log('Status:', accessDeactivated.status);

        if (accessDeactivated.status === 403) {
            console.log('✅ Access correctly denied:', accessDeactivated.data.error);
        } else {
            console.log('❌ Should have been denied!');
        }
    }

    // Test 9: Reactivate restaurant
    console.log('\n\n✅ Test 9: Reactivate Restaurant');
    console.log('-'.repeat(60));

    const activate = await apiCall('/admin/activate-restaurant', 'POST', {
        restaurantId: restaurantId
    });

    console.log('Status:', activate.status);

    if (activate.status === 200) {
        console.log('✅ Restaurant reactivated!');

        // Try to access (should work)
        const accessReactivated = await apiCall('/dashboard', 'GET', null, token);
        console.log('Access status:', accessReactivated.status);

        if (accessReactivated.status === 200) {
            console.log('✅ Access granted after reactivation!');
        }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS COMPLETED!');
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);

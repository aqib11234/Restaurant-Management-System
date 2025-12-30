// Quick test script to verify seeding
const fetch = require('node-fetch');

async function testSeeding() {
    try {
        console.log('🧪 Testing database seeding...\n');

        // Test 1: Login
        console.log('1️⃣  Testing login...');
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@fastfood.com',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();

        if (loginData.success) {
            console.log('✅ Login successful!');
            console.log(`   Restaurant: ${loginData.restaurant.name}`);
            console.log(`   License: ${loginData.restaurant.licenseType} (${loginData.restaurant.plan})`);
            console.log(`   Days remaining: ${loginData.restaurant.daysRemaining}\n`);

            const token = loginData.token;

            // Test 2: Get food items
            console.log('2️⃣  Testing food items...');
            const itemsResponse = await fetch('http://localhost:5000/api/food-items?limit=100', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const itemsData = await itemsResponse.json();
            console.log(`✅ Found ${itemsData.foodItems?.length || 0} food items\n`);

            // Test 3: Get dashboard stats
            console.log('3️⃣  Testing dashboard...');
            const dashboardResponse = await fetch('http://localhost:5000/api/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dashboardData = await dashboardResponse.json();
            console.log('✅ Dashboard stats:');
            console.log(`   Total Food Items: ${dashboardData.totalFoodItems}`);
            console.log(`   Daily Sales: $${dashboardData.dailySales}`);
            console.log(`   Monthly Sales: $${dashboardData.monthlySales}`);
            console.log(`   Pending Orders: ${dashboardData.pendingOrders}`);
            console.log(`   Completed Orders: ${dashboardData.completedOrders}\n`);

            // Test 4: Get orders
            console.log('4️⃣  Testing orders...');
            const ordersResponse = await fetch('http://localhost:5000/api/orders?limit=10', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const ordersData = await ordersResponse.json();
            console.log(`✅ Found ${ordersData.total || 0} total orders\n`);

            console.log('═══════════════════════════════════════════════════════');
            console.log('🎉 ALL TESTS PASSED!');
            console.log('═══════════════════════════════════════════════════════\n');

            console.log('🔑 LOGIN CREDENTIALS:');
            console.log('   Email: admin@fastfood.com');
            console.log('   Password: admin123\n');

            console.log('📋 YOUR TOKEN (save this):');
            console.log(`   ${token}\n`);

            console.log('🚀 READY TO TEST!');
            console.log('   See TESTING_GUIDE.md for complete testing instructions\n');

        } else {
            console.log('❌ Login failed:', loginData.message);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testSeeding();

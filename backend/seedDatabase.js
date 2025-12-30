const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const FoodItem = require('./models/FoodItem');
const Order = require('./models/Order');
const SalesHistory = require('./models/SalesHistory');
const MonthlySales = require('./models/MonthlySales');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Fast food items with realistic images
const foodItems = [
    // Burgers
    { name: 'Classic Beef Burger', price: 8.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', description: 'Juicy beef patty with lettuce, tomato, and special sauce' },
    { name: 'Cheese Burger', price: 9.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400', description: 'Double cheese with beef patty' },
    { name: 'Chicken Burger', price: 8.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400', description: 'Crispy chicken with mayo and lettuce' },
    { name: 'Veggie Burger', price: 7.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400', description: 'Plant-based patty with fresh vegetables' },
    { name: 'Bacon Burger', price: 10.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', description: 'Beef patty with crispy bacon and cheese' },

    // Pizza
    { name: 'Margherita Pizza', price: 12.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', description: 'Classic tomato, mozzarella, and basil' },
    { name: 'Pepperoni Pizza', price: 14.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', description: 'Loaded with pepperoni and cheese' },
    { name: 'BBQ Chicken Pizza', price: 15.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', description: 'BBQ sauce, chicken, and red onions' },
    { name: 'Vegetarian Pizza', price: 13.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400', description: 'Fresh vegetables and cheese' },

    // Fried Chicken
    { name: 'Fried Chicken (6 pcs)', price: 11.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', description: 'Crispy fried chicken pieces' },
    { name: 'Chicken Wings (8 pcs)', price: 9.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', description: 'Spicy buffalo wings' },
    { name: 'Chicken Tenders', price: 8.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400', description: 'Tender chicken strips with dipping sauce' },

    // Sides
    { name: 'French Fries', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', description: 'Crispy golden fries' },
    { name: 'Onion Rings', price: 4.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', description: 'Crispy battered onion rings' },
    { name: 'Mozzarella Sticks', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400', description: 'Fried mozzarella with marinara sauce' },
    { name: 'Coleslaw', price: 2.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400', description: 'Fresh cabbage salad' },

    // Drinks
    { name: 'Coca Cola', price: 2.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', description: 'Chilled soft drink' },
    { name: 'Pepsi', price: 2.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400', description: 'Refreshing cola' },
    { name: 'Orange Juice', price: 3.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', description: 'Fresh orange juice' },
    { name: 'Milkshake', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', description: 'Creamy vanilla milkshake' },

    // Desserts
    { name: 'Chocolate Cake', price: 5.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', description: 'Rich chocolate cake' },
    { name: 'Ice Cream Sundae', price: 4.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', description: 'Vanilla ice cream with toppings' },
    { name: 'Apple Pie', price: 3.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400', description: 'Warm apple pie' },

    // Sandwiches
    { name: 'Club Sandwich', price: 7.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', description: 'Triple-decker with chicken and bacon' },
    { name: 'Grilled Cheese', price: 5.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400', description: 'Melted cheese on toasted bread' },
    { name: 'BLT Sandwich', price: 6.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400', description: 'Bacon, lettuce, and tomato' },
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Restaurant.deleteMany({});
        await User.deleteMany({});
        await FoodItem.deleteMany({});
        await Order.deleteMany({});
        await SalesHistory.deleteMany({});
        await MonthlySales.deleteMany({});
        console.log('✅ Existing data cleared\n');

        // Create restaurant with trial license
        console.log('🏢 Creating restaurant...');
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

        const restaurant = new Restaurant({
            name: 'FastFood Paradise',
            licenseType: 'subscription',
            plan: 'trial',
            subscriptionEndsAt: trialEndDate,
            isActive: true
        });
        await restaurant.save();
        console.log(`✅ Restaurant created: ${restaurant.name} (ID: ${restaurant._id})`);
        console.log(`   License: ${restaurant.licenseType} (${restaurant.plan})`);
        console.log(`   Trial ends: ${restaurant.subscriptionEndsAt.toLocaleDateString()}\n`);

        // Create owner user
        console.log('👤 Creating owner user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const owner = new User({
            email: 'admin@fastfood.com',
            passwordHash: hashedPassword,
            role: 'owner',
            restaurantId: restaurant._id
        });
        await owner.save();
        console.log(`✅ Owner created: ${owner.email}`);
        console.log(`   Password: admin123\n`);

        // Create food items
        console.log('🍔 Creating food items...');
        const createdItems = [];
        for (const item of foodItems) {
            const foodItem = new FoodItem({
                ...item,
                restaurantId: restaurant._id,
                available: true
            });
            await foodItem.save();
            createdItems.push(foodItem);
        }
        console.log(`✅ Created ${createdItems.length} food items\n`);

        // Create random orders for the past 30 days
        console.log('📦 Creating random orders...');
        const orders = [];
        const now = new Date();

        for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
            const ordersPerDay = Math.floor(Math.random() * 10) + 5; // 5-15 orders per day

            for (let i = 0; i < ordersPerDay; i++) {
                const orderDate = new Date(now);
                orderDate.setDate(now.getDate() - daysAgo);
                orderDate.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM - 8 PM
                orderDate.setMinutes(Math.floor(Math.random() * 60));

                // Random 2-4 items per order
                const numItems = Math.floor(Math.random() * 3) + 2;
                const orderItems = [];
                let total = 0;

                for (let j = 0; j < numItems; j++) {
                    const randomItem = createdItems[Math.floor(Math.random() * createdItems.length)];
                    const quantity = Math.floor(Math.random() * 3) + 1;

                    orderItems.push({
                        foodItem: randomItem._id,
                        name: randomItem.name,
                        price: randomItem.price,
                        quantity: quantity
                    });

                    total += randomItem.price * quantity;
                }

                const order = new Order({
                    restaurantId: restaurant._id,
                    table: Math.floor(Math.random() * 20) + 1,
                    items: orderItems,
                    total: Math.round(total * 100) / 100,
                    status: 'completed',
                    createdAt: orderDate,
                    updatedAt: orderDate
                });

                await order.save();
                orders.push(order);
            }
        }
        console.log(`✅ Created ${orders.length} orders\n`);

        // Create sales history from orders
        console.log('📊 Creating sales history...');

        // Group orders by day
        const dailySales = new Map();
        const monthlySales = new Map();

        for (const order of orders) {
            const orderDate = new Date(order.createdAt);
            const dayKey = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), orderDate.getUTCDate()));
            const monthKey = `${orderDate.getUTCFullYear()}-${orderDate.getUTCMonth() + 1}`;

            // Daily sales
            if (!dailySales.has(dayKey.toISOString())) {
                dailySales.set(dayKey.toISOString(), {
                    date: dayKey,
                    orders: 0,
                    revenue: 0,
                    orderDetails: []
                });
            }

            const daySales = dailySales.get(dayKey.toISOString());
            daySales.orders++;
            daySales.revenue += order.total;
            daySales.orderDetails.push({
                orderId: order._id,
                table: order.table,
                total: order.total,
                createdAt: order.createdAt,
                status: order.status,
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            });

            // Monthly sales
            if (!monthlySales.has(monthKey)) {
                monthlySales.set(monthKey, {
                    year: orderDate.getUTCFullYear(),
                    month: orderDate.getUTCMonth() + 1,
                    totalSales: 0,
                    totalOrders: 0
                });
            }

            const monthSales = monthlySales.get(monthKey);
            monthSales.totalSales += order.total;
            monthSales.totalOrders++;
        }

        // Save daily sales history
        for (const [key, data] of dailySales) {
            const salesHistory = new SalesHistory({
                restaurantId: restaurant._id,
                date: data.date,
                period: 'daily',
                orders: data.orders,
                revenue: Math.round(data.revenue * 100) / 100,
                orderDetails: data.orderDetails
            });
            await salesHistory.save();
        }
        console.log(`✅ Created ${dailySales.size} daily sales records`);

        // Save monthly sales
        for (const [key, data] of monthlySales) {
            const monthlySale = new MonthlySales({
                restaurantId: restaurant._id,
                year: data.year,
                month: data.month,
                totalSales: Math.round(data.totalSales * 100) / 100,
                totalOrders: data.totalOrders
            });
            await monthlySale.save();
        }
        console.log(`✅ Created ${monthlySales.size} monthly sales records\n`);

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 DATABASE SEEDING COMPLETE!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📋 SUMMARY:');
        console.log(`   Restaurant: ${restaurant.name}`);
        console.log(`   Restaurant ID: ${restaurant._id}`);
        console.log(`   Food Items: ${createdItems.length}`);
        console.log(`   Orders: ${orders.length}`);
        console.log(`   Sales History: ${dailySales.size} days`);
        console.log(`   Monthly Sales: ${monthlySales.size} months\n`);

        console.log('🔑 LOGIN CREDENTIALS:');
        console.log(`   Email: admin@fastfood.com`);
        console.log(`   Password: admin123\n`);

        console.log('🧪 TEST COMMANDS:');
        console.log('   Login:');
        console.log('   curl -X POST http://localhost:5000/api/auth/login \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d "{\\"email\\":\\"admin@fastfood.com\\",\\"password\\":\\"admin123\\"}"\n');

        console.log('   View Dashboard:');
        console.log('   curl http://localhost:5000/api/dashboard/stats \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');

        console.log('═══════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

// Run seeding
seedDatabase();

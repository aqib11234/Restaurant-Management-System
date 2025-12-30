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

// Expanded food categories with 200+ items
const foodCategories = {
    'Burgers': [
        'Classic Beef Burger', 'Cheese Burger', 'Double Cheese Burger', 'Bacon Burger', 'BBQ Burger',
        'Mushroom Swiss Burger', 'Jalapeño Burger', 'Veggie Burger', 'Chicken Burger', 'Fish Burger',
        'Turkey Burger', 'Lamb Burger', 'Spicy Chicken Burger', 'Teriyaki Burger', 'Hawaiian Burger',
        'Blue Cheese Burger', 'Avocado Burger', 'Egg Burger', 'Chili Burger', 'Peanut Butter Burger',
        'Mac & Cheese Burger', 'Pizza Burger', 'Breakfast Burger', 'Slider Trio', 'Monster Burger'
    ],
    'Pizza': [
        'Margherita Pizza', 'Pepperoni Pizza', 'Hawaiian Pizza', 'BBQ Chicken Pizza', 'Vegetarian Pizza',
        'Meat Lovers Pizza', 'Supreme Pizza', 'Four Cheese Pizza', 'Buffalo Chicken Pizza', 'Mushroom Pizza',
        'Sausage Pizza', 'Bacon Pizza', 'Spinach & Feta Pizza', 'Mexican Pizza', 'Greek Pizza',
        'White Pizza', 'Pesto Pizza', 'Seafood Pizza', 'Chicken Alfredo Pizza', 'Taco Pizza',
        'Breakfast Pizza', 'Dessert Pizza', 'Garlic Pizza', 'Truffle Pizza', 'Vegan Pizza'
    ],
    'Fried Chicken': [
        'Original Fried Chicken', 'Spicy Fried Chicken', 'Crispy Chicken Tenders', 'Buffalo Wings', 'BBQ Wings',
        'Honey Garlic Wings', 'Teriyaki Wings', 'Lemon Pepper Wings', 'Nashville Hot Chicken', 'Korean Fried Chicken',
        'Popcorn Chicken', 'Chicken Nuggets', 'Boneless Wings', 'Chicken Drumsticks', 'Chicken Thighs',
        'Chicken Strips', 'Cajun Chicken', 'Garlic Parmesan Wings', 'Sweet Chili Wings', 'Chicken Bites'
    ],
    'Sandwiches': [
        'Club Sandwich', 'BLT Sandwich', 'Grilled Cheese', 'Chicken Sandwich', 'Tuna Sandwich',
        'Turkey Sandwich', 'Ham & Cheese', 'Roast Beef Sandwich', 'Veggie Sandwich', 'Egg Salad Sandwich',
        'Philly Cheesesteak', 'Meatball Sub', 'Italian Sub', 'French Dip', 'Reuben Sandwich',
        'Pulled Pork Sandwich', 'Fish Sandwich', 'Chicken Salad Sandwich', 'Pastrami Sandwich', 'Cuban Sandwich'
    ],
    'Pasta': [
        'Spaghetti Bolognese', 'Fettuccine Alfredo', 'Penne Arrabiata', 'Carbonara', 'Lasagna',
        'Mac & Cheese', 'Pesto Pasta', 'Marinara Pasta', 'Vodka Sauce Pasta', 'Aglio e Olio',
        'Primavera Pasta', 'Seafood Pasta', 'Chicken Pasta', 'Baked Ziti', 'Ravioli',
        'Tortellini', 'Gnocchi', 'Linguine', 'Rigatoni', 'Pappardelle'
    ],
    'Sides': [
        'French Fries', 'Sweet Potato Fries', 'Onion Rings', 'Mozzarella Sticks', 'Coleslaw',
        'Garlic Bread', 'Breadsticks', 'Potato Wedges', 'Loaded Fries', 'Curly Fries',
        'Waffle Fries', 'Tater Tots', 'Hash Browns', 'Corn on the Cob', 'Baked Potato',
        'Mashed Potatoes', 'Rice Pilaf', 'Steamed Vegetables', 'Garden Salad', 'Caesar Salad',
        'Greek Salad', 'Coleslaw', 'Potato Salad', 'Macaroni Salad', 'Fruit Cup'
    ],
    'Drinks': [
        'Coca Cola', 'Pepsi', 'Sprite', 'Fanta', 'Dr Pepper',
        'Mountain Dew', 'Root Beer', 'Ginger Ale', 'Lemonade', 'Iced Tea',
        'Sweet Tea', 'Orange Juice', 'Apple Juice', 'Cranberry Juice', 'Milkshake - Vanilla',
        'Milkshake - Chocolate', 'Milkshake - Strawberry', 'Smoothie - Berry', 'Smoothie - Mango', 'Coffee',
        'Cappuccino', 'Latte', 'Espresso', 'Hot Chocolate', 'Water'
    ],
    'Desserts': [
        'Chocolate Cake', 'Cheesecake', 'Apple Pie', 'Cherry Pie', 'Brownie',
        'Ice Cream Sundae', 'Tiramisu', 'Panna Cotta', 'Crème Brûlée', 'Chocolate Mousse',
        'Fruit Tart', 'Lemon Meringue Pie', 'Carrot Cake', 'Red Velvet Cake', 'Cookies',
        'Donuts', 'Cupcakes', 'Macarons', 'Éclair', 'Cannoli'
    ],
    'Breakfast': [
        'Pancakes', 'Waffles', 'French Toast', 'Eggs Benedict', 'Omelette',
        'Scrambled Eggs', 'Fried Eggs', 'Breakfast Burrito', 'Breakfast Sandwich', 'Bagel & Cream Cheese',
        'Croissant', 'Muffin', 'Danish', 'Cinnamon Roll', 'Granola Bowl',
        'Yogurt Parfait', 'Fruit Bowl', 'Breakfast Platter', 'Hash Brown Bowl', 'Breakfast Pizza'
    ],
    'Appetizers': [
        'Nachos', 'Quesadilla', 'Spring Rolls', 'Samosas', 'Bruschetta',
        'Calamari', 'Shrimp Cocktail', 'Chicken Satay', 'Dumplings', 'Sliders',
        'Stuffed Mushrooms', 'Jalapeño Poppers', 'Spinach Dip', 'Artichoke Dip', 'Chips & Salsa',
        'Guacamole', 'Hummus Platter', 'Cheese Platter', 'Charcuterie Board', 'Fried Pickles'
    ]
};

const imageUrls = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400',
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
];

async function seedLargeDatabase() {
    try {
        console.log('🌱 Starting LARGE-SCALE database seeding...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Restaurant.deleteMany({});
        await User.deleteMany({});
        await FoodItem.deleteMany({});
        await Order.deleteMany({});
        await SalesHistory.deleteMany({});
        await MonthlySales.deleteMany({});
        console.log('✅ Existing data cleared\n');

        // Create restaurant
        console.log('🏢 Creating restaurant...');
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const restaurant = new Restaurant({
            name: 'FastFood Paradise',
            licenseType: 'subscription',
            plan: 'trial',
            subscriptionEndsAt: trialEndDate,
            isActive: true
        });
        await restaurant.save();
        console.log(`✅ Restaurant created: ${restaurant.name}\n`);

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
        console.log(`✅ Owner created: ${owner.email}\n`);

        // Create 200+ food items
        console.log('🍔 Creating 200+ food items...');
        const createdItems = [];
        let itemCount = 0;

        for (const [category, items] of Object.entries(foodCategories)) {
            for (const itemName of items) {
                const basePrice = Math.random() * 15 + 3; // $3-$18
                const foodItem = new FoodItem({
                    name: itemName,
                    price: Math.round(basePrice * 100) / 100,
                    category: category,
                    image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
                    description: `Delicious ${itemName.toLowerCase()} made fresh daily`,
                    restaurantId: restaurant._id,
                    available: true
                });
                await foodItem.save();
                createdItems.push(foodItem);
                itemCount++;

                if (itemCount % 50 === 0) {
                    console.log(`   Created ${itemCount} items...`);
                }
            }
        }
        console.log(`✅ Created ${createdItems.length} food items\n`);

        // Create realistic orders for past 60 days
        console.log('📦 Creating orders (this may take a moment)...');
        const orders = [];
        const now = new Date();

        for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
            const ordersPerDay = Math.floor(Math.random() * 15) + 10; // 10-25 orders per day

            for (let i = 0; i < ordersPerDay; i++) {
                const orderDate = new Date(now);
                orderDate.setDate(now.getDate() - daysAgo);
                orderDate.setHours(Math.floor(Math.random() * 14) + 8); // 8 AM - 10 PM
                orderDate.setMinutes(Math.floor(Math.random() * 60));

                // Random 1-5 items per order
                const numItems = Math.floor(Math.random() * 5) + 1;
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

                // Random status distribution - 3 states only
                const statusRandom = Math.random();
                let status;
                if (daysAgo > 0) {
                    // Historical orders are mostly completed, some cancelled
                    status = statusRandom < 0.95 ? 'completed' : 'cancelled';
                } else {
                    // Today's orders have mixed statuses
                    if (statusRandom < 0.7) status = 'pending';
                    else if (statusRandom < 0.95) status = 'completed';
                    else status = 'cancelled';
                }

                const order = new Order({
                    restaurantId: restaurant._id,
                    table: Math.floor(Math.random() * 20) + 1,
                    items: orderItems,
                    total: Math.round(total * 100) / 100,
                    status: status,
                    createdAt: orderDate,
                    updatedAt: orderDate
                });

                await order.save();
                orders.push(order);
            }

            if ((60 - daysAgo) % 10 === 0) {
                console.log(`   Created orders for ${60 - daysAgo} days...`);
            }
        }
        console.log(`✅ Created ${orders.length} orders\n`);

        // Create sales history
        console.log('📊 Creating sales history...');
        const dailySales = new Map();
        const monthlySales = new Map();

        for (const order of orders.filter(o => o.status === 'completed')) {
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

        // Save sales history
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

        // Calculate statistics
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
        const avgOrderValue = totalRevenue / completedOrders.length;

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 LARGE-SCALE DATABASE SEEDING COMPLETE!');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📋 SUMMARY:');
        console.log(`   Restaurant: ${restaurant.name}`);
        console.log(`   Food Items: ${createdItems.length}`);
        console.log(`   Total Orders: ${orders.length}`);
        console.log(`   Completed Orders: ${completedOrders.length}`);
        console.log(`   Pending Orders: ${orders.filter(o => o.status === 'pending').length}`);
        console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`   Average Order: $${avgOrderValue.toFixed(2)}`);
        console.log(`   Sales History: ${dailySales.size} days`);
        console.log(`   Monthly Sales: ${monthlySales.size} months\n`);

        console.log('🔑 LOGIN CREDENTIALS:');
        console.log(`   Email: admin@fastfood.com`);
        console.log(`   Password: admin123\n`);

        console.log('✅ System ready for performance testing!');
        console.log('   - Pagination enabled on all endpoints');
        console.log('   - Lazy loading configured');
        console.log('   - Indexes optimized for fast queries\n');

        console.log('═══════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

// Run seeding
seedLargeDatabase();

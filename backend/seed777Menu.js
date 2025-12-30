const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const FoodItem = require('./models/FoodItem');
const Order = require('./models/Order');
const SalesHistory = require('./models/SalesHistory');
const MonthlySales = require('./models/MonthlySales');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 777 Restaurant Menu
const menuItems = [
    // 777 NASHTA
    { name: 'Pratha Chany', price: 200, category: '777 NASHTA' },
    { name: 'Puri', price: 100, category: '777 NASHTA' },
    { name: 'Halwa', price: 50, category: '777 NASHTA' },
    { name: 'Anda', price: 200, category: '777 NASHTA' },
    { name: 'Milk Tea', price: 50, category: '777 NASHTA' },
    { name: 'Green Tea', price: 80, category: '777 NASHTA' },
    { name: 'Black Tea', price: 50, category: '777 NASHTA' },
    { name: 'Omelette Egg', price: 50, category: '777 NASHTA' },

    // 777 MUTTON KARAHI
    { name: '777 Special Karahi (Mutton) Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: '777 Special Karahi (Mutton) Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Balochi Mutton Karahi Half', price: 1500, category: '777 MUTTON KARAHI' },
    { name: 'Balochi Mutton Karahi Full', price: 2900, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Karahi Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Karahi Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Achari Karahi Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Achari Karahi Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Makhni Karahi Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Makhni Karahi Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Brown Karahi Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Brown Karahi Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Mutton White Karahi Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton White Karahi Full', price: 3000, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Namkeen Shinwari Half', price: 1600, category: '777 MUTTON KARAHI' },
    { name: 'Mutton Namkeen Shinwari Full', price: 3000, category: '777 MUTTON KARAHI' },

    // 777 CHICKEN KARAHI
    { name: 'Special Karahi (Chicken) Half', price: 850, category: '777 CHICKEN KARAHI' },
    { name: 'Special Karahi (Chicken) Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Balochi Karahi (Chicken) Half', price: 850, category: '777 CHICKEN KARAHI' },
    { name: 'Balochi Karahi (Chicken) Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Brown Karahi Half', price: 850, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Brown Karahi Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken White Karahi Half', price: 900, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken White Karahi Full', price: 1600, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Shinwari Half', price: 900, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Shinwari Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Namkeen Shinwari Half', price: 850, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Namkeen Shinwari Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Achari Karahi Half', price: 900, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Achari Karahi Full', price: 1500, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Makhni Karahi Half', price: 900, category: '777 CHICKEN KARAHI' },
    { name: 'Chicken Makhni Karahi Full', price: 1500, category: '777 CHICKEN KARAHI' },

    // 777 PARATHA
    { name: 'Allu Pratha', price: 130, category: '777 PARATHA' },
    { name: 'Anda Pratha', price: 130, category: '777 PARATHA' },
    { name: 'Simple Pratha', price: 50, category: '777 PARATHA' },
    { name: 'Chicken Pratha', price: 220, category: '777 PARATHA' },
    { name: 'Chicken Cheese Pratha', price: 250, category: '777 PARATHA' },
    { name: 'Allu Cheese Pratha', price: 200, category: '777 PARATHA' },
    { name: 'BBQ Pratha', price: 250, category: '777 PARATHA' },
    { name: 'BBQ Cheese Pratha', price: 300, category: '777 PARATHA' },
    { name: 'Keema Pratha', price: 260, category: '777 PARATHA' },
    { name: 'Keema Cheese Pratha', price: 350, category: '777 PARATHA' },

    // 777 BBQ
    { name: '777 Special BBQ', price: 650, category: '777 BBQ' },
    { name: 'Chicken Tikka Leg Piece/Breast', price: 580, category: '777 BBQ' },
    { name: 'Chicken Seekh Kabab', price: 650, category: '777 BBQ' },
    { name: 'Chicken Boti Plate (10 pcs)', price: 650, category: '777 BBQ' },
    { name: 'Beef Seekh Kabab (4 pcs)', price: 600, category: '777 BBQ' },
    { name: 'Chicken Malai Boti (10 pcs)', price: 600, category: '777 BBQ' },
    { name: 'Beef Tikka Boti (10 pcs)', price: 1600, category: '777 BBQ' },
    { name: 'Chicken Rashmi Kabab (4 pcs)', price: 650, category: '777 BBQ' },

    // CHICKEN ROLLS
    { name: 'Chicken Chatni Roll', price: 230, category: 'CHICKEN ROLLS' },
    { name: 'Mayo Garlic Roll', price: 300, category: 'CHICKEN ROLLS' },
    { name: 'Chicken Cheese Roll', price: 300, category: 'CHICKEN ROLLS' },
    { name: 'Ketchup Roll', price: 230, category: 'CHICKEN ROLLS' },
    { name: 'Sizzling Roll', price: 300, category: 'CHICKEN ROLLS' },
    { name: 'Rashmi Roll', price: 260, category: 'CHICKEN ROLLS' },
    { name: 'Rashmi Ketchup Roll', price: 260, category: 'CHICKEN ROLLS' },
    { name: 'Rashmi Garlic Roll', price: 290, category: 'CHICKEN ROLLS' },
    { name: 'Rashmi Cheese Roll', price: 290, category: 'CHICKEN ROLLS' },

    // BEEF ROLLS
    { name: 'Seekh Kabab Roll', price: 270, category: 'BEEF ROLLS' },
    { name: 'Beef Seekh Ketchup Roll', price: 270, category: 'BEEF ROLLS' },
    { name: 'Beef Cheese Roll', price: 300, category: 'BEEF ROLLS' },
    { name: 'Beef Garlic Roll', price: 300, category: 'BEEF ROLLS' },

    // Nuggets
    { name: '5 Pcs Nuggets', price: 400, category: 'Nuggets' },
    { name: '10 Pcs Nuggets', price: 780, category: 'Nuggets' },

    // Fries
    { name: 'Half Fries', price: 200, category: 'Fries' },
    { name: 'Full Fries', price: 360, category: 'Fries' },
    { name: 'Mayo Fries', price: 250, category: 'Fries' },
    { name: 'Loaded Fries', price: 600, category: 'Fries' },

    // Fresh Juice
    { name: 'Peach Juice', price: 250, category: 'Fresh Juice' },
    { name: 'Apple Juice', price: 250, category: 'Fresh Juice' },
    { name: 'Strawberry Juice', price: 250, category: 'Fresh Juice' },
    { name: 'Seasons Fresh Juice', price: 280, category: 'Fresh Juice' },

    // Margarita
    { name: 'Mint Margarita', price: 250, category: 'Margarita' },
    { name: 'Blue Margarita', price: 250, category: 'Margarita' },
    { name: 'Peach Margarita', price: 250, category: 'Margarita' },
    { name: 'Strawberry Margarita', price: 280, category: 'Margarita' },

    // 777 BURGERS
    { name: 'Zinger Burger', price: 399, category: '777 BURGERS' },
    { name: 'Zinger Cheese Burger', price: 450, category: '777 BURGERS' },
    { name: 'Chicken Burger', price: 320, category: '777 BURGERS' },
    { name: 'Afghani Burger', price: 299, category: '777 BURGERS' },
    { name: 'Grill Burger', price: 499, category: '777 BURGERS' },
    { name: 'Double Decker Burger', price: 599, category: '777 BURGERS' },
    { name: '777 Special Burger', price: 1199, category: '777 BURGERS' },
    { name: 'Chicken Cheese Burger', price: 350, category: '777 BURGERS' },

    // Shawarma Rolls
    { name: 'Chicken Shawarma Roll', price: 300, category: 'Shawarma Rolls' },
    { name: 'Chicken Zinger Shawarma Roll', price: 400, category: 'Shawarma Rolls' },
    { name: 'Zinger Cheese Shawarma Roll', price: 450, category: 'Shawarma Rolls' },
    { name: 'Chicken Cheese Shawarma', price: 320, category: 'Shawarma Rolls' },

    // ICE CREAMS
    { name: 'Kulfa 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Kulfa 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: 'Mango 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Mango 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: 'Vanilla 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Vanilla 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: 'Strawberry 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Strawberry 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: 'Pista 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Pista 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: 'Kaju 1 Scope', price: 160, category: 'ICE CREAMS' },
    { name: 'Kaju 2 Scope', price: 220, category: 'ICE CREAMS' },
    { name: '777 Special Ice Cream', price: 350, category: 'ICE CREAMS' },

    // Others
    { name: 'Biryani Single', price: 300, category: 'Others' },
    { name: 'Mineral Water', price: 100, category: 'Others' },
    { name: 'Mineral Water Small', price: 60, category: 'Others' },
    { name: 'Cold Drink 1.5 Ltr', price: 220, category: 'Others' },
    { name: 'Cold Drink Tin', price: 110, category: 'Others' },
    { name: 'Cold Drink Sting', price: 150, category: 'Others' },
    { name: 'Salad', price: 60, category: 'Others' },
    { name: 'Raita', price: 60, category: 'Others' },
    { name: 'Tandoori Roti', price: 30, category: 'Others' }
];

async function seed777Restaurant() {
    try {
        console.log('🌱 Seeding 777 Restaurant Menu...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Restaurant.deleteMany({});
        await User.deleteMany({});
        await FoodItem.deleteMany({});
        await Order.deleteMany({});
        await SalesHistory.deleteMany({});
        await MonthlySales.deleteMany({});
        console.log('✅ Cleared\n');

        // Create restaurant
        console.log('🏢 Creating restaurant...');
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const restaurant = new Restaurant({
            name: '777 Restaurant',
            licenseType: 'subscription',
            plan: 'trial',
            subscriptionEndsAt: trialEndDate,
            isActive: true
        });
        await restaurant.save();
        console.log(`✅ Restaurant: ${restaurant.name}\n`);

        // Create owner
        console.log('👤 Creating owner...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const owner = new User({
            email: 'admin@777restaurant.com',
            passwordHash: hashedPassword,
            role: 'owner',
            restaurantId: restaurant._id
        });
        await owner.save();
        console.log(`✅ Owner: ${owner.email}\n`);

        // Create menu items
        console.log('🍽️  Creating menu items...');
        const createdItems = [];
        for (const item of menuItems) {
            const foodItem = new FoodItem({
                ...item,
                restaurantId: restaurant._id,
                image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
                description: `Delicious ${item.name}`,
                available: true
            });
            await foodItem.save();
            createdItems.push(foodItem);
        }
        console.log(`✅ Created ${createdItems.length} menu items\n`);

        // Create sample orders
        console.log('📦 Creating sample orders...');
        const orders = [];
        const now = new Date();

        for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
            const ordersPerDay = Math.floor(Math.random() * 10) + 5;

            for (let i = 0; i < ordersPerDay; i++) {
                const orderDate = new Date(now);
                orderDate.setDate(now.getDate() - daysAgo);
                orderDate.setHours(Math.floor(Math.random() * 14) + 8);
                orderDate.setMinutes(Math.floor(Math.random() * 60));

                const numItems = Math.floor(Math.random() * 4) + 1;
                const orderItems = [];
                let total = 0;

                for (let j = 0; j < numItems; j++) {
                    const randomItem = createdItems[Math.floor(Math.random() * createdItems.length)];
                    const quantity = Math.floor(Math.random() * 2) + 1;

                    orderItems.push({
                        foodItem: randomItem._id,
                        name: randomItem.name,
                        price: randomItem.price,
                        quantity: quantity
                    });

                    total += randomItem.price * quantity;
                }

                const statusRandom = Math.random();
                let status;
                if (daysAgo > 0) {
                    status = statusRandom < 0.95 ? 'completed' : 'cancelled';
                } else {
                    if (statusRandom < 0.7) status = 'pending';
                    else if (statusRandom < 0.95) status = 'completed';
                    else status = 'cancelled';
                }

                const order = new Order({
                    restaurantId: restaurant._id,
                    table: Math.floor(Math.random() * 20) + 1,
                    items: orderItems,
                    total: total,
                    status: status,
                    createdAt: orderDate,
                    updatedAt: orderDate
                });

                await order.save();
                orders.push(order);
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

        for (const [key, data] of dailySales) {
            const salesHistory = new SalesHistory({
                restaurantId: restaurant._id,
                date: data.date,
                period: 'daily',
                orders: data.orders,
                revenue: data.revenue,
                orderDetails: data.orderDetails
            });
            await salesHistory.save();
        }

        for (const [key, data] of monthlySales) {
            const monthlySale = new MonthlySales({
                restaurantId: restaurant._id,
                year: data.year,
                month: data.month,
                totalSales: data.totalSales,
                totalOrders: data.totalOrders
            });
            await monthlySale.save();
        }

        console.log(`✅ Sales history created\n`);

        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 777 RESTAURANT MENU LOADED!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`📋 Menu Items: ${createdItems.length}`);
        console.log(`📦 Orders: ${orders.length}`);
        console.log(`🔑 Email: admin@777restaurant.com`);
        console.log(`🔑 Password: admin123\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seed777Restaurant();

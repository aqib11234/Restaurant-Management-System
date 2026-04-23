const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const FoodItem = require('./models/FoodItem');
const Order = require('./models/Order');
const SalesHistory = require('./models/SalesHistory');
const MonthlySales = require('./models/MonthlySales');

const EMAIL = 'ak123@gmail.com';
const PASSWORD = '12345678';

const foodItems = [
    // Burgers
    { name: 'Classic Beef Burger', price: 8.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', description: 'Juicy beef patty with lettuce, tomato, and special sauce' },
    { name: 'Cheese Burger', price: 9.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400', description: 'Double cheese with beef patty' },
    { name: 'Chicken Burger', price: 8.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400', description: 'Crispy chicken with mayo and lettuce' },
    { name: 'Veggie Burger', price: 7.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400', description: 'Plant-based patty with fresh vegetables' },
    { name: 'Bacon Burger', price: 10.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', description: 'Beef patty with crispy bacon and cheese' },
    { name: 'Mushroom Swiss Burger', price: 10.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400', description: 'Beef patty with sautéed mushrooms and Swiss cheese' },
    { name: 'Spicy Jalapeno Burger', price: 9.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400', description: 'Beef patty with fresh jalapenos and spicy mayo' },

    // Pizza
    { name: 'Margherita Pizza', price: 12.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', description: 'Classic tomato, mozzarella, and basil' },
    { name: 'Pepperoni Pizza', price: 14.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', description: 'Loaded with pepperoni and cheese' },
    { name: 'BBQ Chicken Pizza', price: 15.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', description: 'BBQ sauce, chicken, and red onions' },
    { name: 'Vegetarian Pizza', price: 13.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400', description: 'Fresh vegetables and cheese' },
    { name: 'Four Cheese Pizza', price: 16.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', description: 'Mozzarella, parmesan, cheddar, and gorgonzola' },
    { name: 'Hawaiian Pizza', price: 14.49, category: 'Pizza', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', description: 'Ham and pineapple on a cheese pizza' },
    { name: 'Supreme Pizza', price: 17.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1593504049359-7b7d923b2114?w=400', description: 'Pepperoni, sausage, mushrooms, onions, and peppers' },

    // Fried Chicken
    { name: 'Fried Chicken (6 pcs)', price: 11.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', description: 'Crispy fried chicken pieces' },
    { name: 'Chicken Wings (8 pcs)', price: 9.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', description: 'Spicy buffalo wings' },
    { name: 'Chicken Tenders', price: 8.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400', description: 'Tender chicken strips with dipping sauce' },
    { name: 'Popcorn Chicken', price: 6.99, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1569058242252-62324e7d5567?w=400', description: 'Bite-sized crispy chicken pieces' },
    { name: 'Grilled Chicken Breast', price: 12.49, category: 'Fried Chicken', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400', description: 'Seasoned and grilled chicken breast' },

    // Sides
    { name: 'French Fries', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', description: 'Crispy golden fries' },
    { name: 'Onion Rings', price: 4.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', description: 'Crispy battered onion rings' },
    { name: 'Mozzarella Sticks', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400', description: 'Fried mozzarella with marinara sauce' },
    { name: 'Coleslaw', price: 2.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400', description: 'Fresh cabbage salad' },
    { name: 'Garlic Bread', price: 4.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400', description: 'Toasted bread with garlic butter' },
    { name: 'Garden Salad', price: 6.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', description: 'Fresh mixed greens and vegetables' },

    // Drinks
    { name: 'Coca Cola', price: 2.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', description: 'Chilled soft drink' },
    { name: 'Pepsi', price: 2.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400', description: 'Refreshing cola' },
    { name: 'Orange Juice', price: 3.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', description: 'Fresh orange juice' },
    { name: 'Milkshake', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', description: 'Creamy vanilla milkshake' },
    { name: 'Iced Tea', price: 2.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', description: 'Refreshing iced tea with lemon' },
    { name: 'Lemonade', price: 3.29, category: 'Drinks', image: 'https://images.unsplash.com/photo-1621263764253-62323e449265?w=400', description: 'Freshly squeezed lemonade' },
    { name: 'Coffee', price: 2.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', description: 'Hot brewed coffee' },

    // Desserts
    { name: 'Chocolate Cake', price: 5.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', description: 'Rich chocolate cake' },
    { name: 'Ice Cream Sundae', price: 4.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', description: 'Vanilla ice cream with toppings' },
    { name: 'Apple Pie', price: 3.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400', description: 'Warm apple pie' },
    { name: 'Cheesecake', price: 6.49, category: 'Desserts', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400', description: 'Creamy New York style cheesecake' },
    { name: 'Brownie', price: 3.49, category: 'Desserts', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400', description: 'Warm chocolate brownie' },

    // Sandwiches
    { name: 'Club Sandwich', price: 7.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', description: 'Triple-decker with chicken and bacon' },
    { name: 'Grilled Cheese', price: 5.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400', description: 'Melted cheese on toasted bread' },
    { name: 'BLT Sandwich', price: 6.99, category: 'Sandwiches', image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400', description: 'Bacon, lettuce, and tomato' },
];

async function seedUser() {
    try {
        console.log('🌱 Starting dummy data population for', EMAIL);
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
        console.log('✅ MongoDB Connected');

        // Drop legacy indexes that cause duplicate key errors
        try {
            await mongoose.connection.collection('saleshistories').dropIndex('date_1_period_1');
            console.log('🗑️ Dropped legacy date_1_period_1 index from saleshistories');
        } catch (e) { }
        try {
            await mongoose.connection.collection('monthlysales').dropIndex('year_1_month_1');
            console.log('🗑️ Dropped legacy year_1_month_1 index from monthlysales');
        } catch (e) { }

        let user = await User.findOne({ email: EMAIL });
        let restaurant;

        if (!user) {
            console.log('👤 User not found, creating new restaurant and user...');
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14);

            restaurant = new Restaurant({
                name: 'AK123 Restaurant',
                licenseType: 'subscription',
                plan: 'trial',
                subscriptionEndsAt: trialEndDate,
                isActive: true
            });
            await restaurant.save();

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(PASSWORD, salt);

            user = new User({
                email: EMAIL,
                passwordHash: hashedPassword,
                role: 'owner',
                restaurantId: restaurant._id
            });
            await user.save();
        } else {
            console.log('👤 User found, using existing restaurant...');
            restaurant = await Restaurant.findById(user.restaurantId);
            
            // Clear existing data for this restaurant (except User and Restaurant)
            await FoodItem.deleteMany({ restaurantId: restaurant._id });
            await Order.deleteMany({ restaurantId: restaurant._id });
            await SalesHistory.deleteMany({ restaurantId: restaurant._id });
            await MonthlySales.deleteMany({ restaurantId: restaurant._id });
            console.log('🗑️ Cleared existing items/orders for this user.');
        }

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

        console.log('📦 Creating random orders for the past 30 days...');
        const orders = [];
        const now = new Date();

        for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
            const ordersPerDay = Math.floor(Math.random() * 10) + 5; 

            for (let i = 0; i < ordersPerDay; i++) {
                const orderDate = new Date(now);
                orderDate.setDate(now.getDate() - daysAgo);
                orderDate.setHours(Math.floor(Math.random() * 12) + 8); 
                orderDate.setMinutes(Math.floor(Math.random() * 60));

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

        console.log('📊 Creating sales history...');
        const dailySales = new Map();
        const monthlySales = new Map();

        for (const order of orders) {
            const orderDate = new Date(order.createdAt);
            const dayKey = new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), orderDate.getUTCDate()));
            const monthKey = `${orderDate.getUTCFullYear()}-${orderDate.getUTCMonth() + 1}`;

            if (!dailySales.has(dayKey.toISOString())) {
                dailySales.set(dayKey.toISOString(), { date: dayKey, orders: 0, revenue: 0, orderDetails: [] });
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
                items: order.items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price }))
            });

            if (!monthlySales.has(monthKey)) {
                monthlySales.set(monthKey, { year: orderDate.getUTCFullYear(), month: orderDate.getUTCMonth() + 1, totalSales: 0, totalOrders: 0 });
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
                revenue: Math.round(data.revenue * 100) / 100,
                orderDetails: data.orderDetails
            });
            await salesHistory.save();
        }

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

        console.log('🎉 Data successfully seeded for', EMAIL);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding user:', error);
        process.exit(1);
    }
}

seedUser();

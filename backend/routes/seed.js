const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');
const SalesHistory = require('../models/SalesHistory');
const MonthlySales = require('../models/MonthlySales');

// Generate random test data for performance testing
router.post('/generate-test-data', async (req, res) => {
  try {
    const { orders = 1000, foodItems = 500, users = 50 } = req.body;

    console.log(`Generating ${orders} orders, ${foodItems} food items, and ${users} users...`);

    // Generate food items
    const categories = ['Pizza', 'Burgers', 'Salads', 'Pasta', 'Main Course', 'Desserts', 'Beverages'];
    const foodItemNames = [
      'Margherita Pizza', 'Pepperoni Pizza', 'Chicken Burger', 'Beef Burger', 'Caesar Salad',
      'Greek Salad', 'Pasta Carbonara', 'Pasta Alfredo', 'Fish and Chips', 'Chicken Wings',
      'Chocolate Cake', 'Ice Cream', 'Coca Cola', 'Sprite', 'Coffee', 'Tea'
    ];

    const foodItemsData = [];
    for (let i = 0; i < foodItems; i++) {
      foodItemsData.push({
        name: `${foodItemNames[Math.floor(Math.random() * foodItemNames.length)]} ${i + 1}`,
        price: Math.floor(Math.random() * 50) + 5, // $5-$55
        category: categories[Math.floor(Math.random() * categories.length)],
        description: `Delicious ${categories[Math.floor(Math.random() * categories.length)]} item`,
        available: Math.random() > 0.1 // 90% available
      });
    }

    // Insert food items in batches
    const insertedFoodItems = await FoodItem.insertMany(foodItemsData);
    console.log(`Inserted ${insertedFoodItems.length} food items`);

    // Generate users
    const usersData = [];
    for (let i = 0; i < users; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersData.push({
        username: `user${i + 1}`,
        email: `user${i + 1}@test.com`,
        password: hashedPassword,
        role: Math.random() > 0.9 ? 'admin' : 'user'
      });
    }

    // Insert users in batches
    const insertedUsers = await User.insertMany(usersData);
    console.log(`Inserted ${insertedUsers.length} users`);

    // Generate orders
    const ordersData = [];
    const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

    for (let i = 0; i < orders; i++) {
      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per order
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const randomFoodItem = insertedFoodItems[Math.floor(Math.random() * insertedFoodItems.length)];
        items.push({
          foodItem: randomFoodItem._id,
          name: randomFoodItem.name,
          price: randomFoodItem.price,
          quantity: Math.floor(Math.random() * 3) + 1 // 1-3 quantity
        });
      }

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Random date within last 30 days
      const randomDays = Math.floor(Math.random() * 30);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - randomDays);

      ordersData.push({
        table: Math.floor(Math.random() * 20) + 1, // Tables 1-20
        items: items,
        total: total,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }

    // Insert orders in batches of 100 to avoid memory issues
    const batchSize = 100;
    let insertedOrdersCount = 0;

    for (let i = 0; i < ordersData.length; i += batchSize) {
      const batch = ordersData.slice(i, i + batchSize);
      await Order.insertMany(batch);
      insertedOrdersCount += batch.length;
      console.log(`Inserted ${insertedOrdersCount}/${ordersData.length} orders`);
    }

    res.json({
      message: 'Test data generated successfully!',
      data: {
        foodItems: insertedFoodItems.length,
        users: insertedUsers.length,
        orders: insertedOrdersCount
      }
    });

  } catch (error) {
    console.error('Generate test data error:', error);
    res.status(500).json({ message: 'Error generating test data', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { username: 'admin' },
      { username: 'admin', password: hashedPassword, role: 'admin' },
      { upsert: true }
    );

    // Clear existing food items
    await FoodItem.deleteMany({});
    console.log('Cleared existing food items');

    // Create comprehensive 777 Restaurant menu
    const sampleFoodItems = [
      // 🍳 777 Nashta
      { name: 'Pratha (Half)', price: 50, category: '🍳 777 Nashta', description: 'Half portion pratha', available: true },
      { name: 'Pratha (Full)', price: 200, category: '🍳 777 Nashta', description: 'Full portion pratha', available: true },
      { name: 'Chany (Half)', price: 100, category: '🍳 777 Nashta', description: 'Half portion chany', available: true },
      { name: 'Puri', price: 50, category: '🍳 777 Nashta', description: 'Crispy puri', available: true },
      { name: 'Halwa', price: 200, category: '🍳 777 Nashta', description: 'Sweet halwa', available: true },
      { name: 'Anda', price: 50, category: '🍳 777 Nashta', description: 'Boiled egg', available: true },
      { name: 'Milk Tea', price: 80, category: '🍳 777 Nashta', description: 'Creamy milk tea', available: true },
      { name: 'Green Tea', price: 50, category: '🍳 777 Nashta', description: 'Fresh green tea', available: true },
      { name: 'Black Tea', price: 50, category: '🍳 777 Nashta', description: 'Classic black tea', available: true },
      { name: 'Omelette Egg', price: 70, category: '🍳 777 Nashta', description: 'Fluffy omelette', available: true },

      // 🫓 777 Paratha
      { name: 'Allu Pratha', price: 130, category: '🫓 777 Paratha', description: 'Potato stuffed paratha', available: true },
      { name: 'Anda Pratha', price: 130, category: '🫓 777 Paratha', description: 'Egg stuffed paratha', available: true },
      { name: 'Simple Pratha', price: 50, category: '🫓 777 Paratha', description: 'Plain paratha', available: true },
      { name: 'Chicken Pratha', price: 220, category: '🫓 777 Paratha', description: 'Chicken stuffed paratha', available: true },
      { name: 'Chicken Cheese Pratha', price: 250, category: '🫓 777 Paratha', description: 'Chicken and cheese paratha', available: true },
      { name: 'Allu Cheese Pratha', price: 250, category: '🫓 777 Paratha', description: 'Potato and cheese paratha', available: true },
      { name: 'BBQ Pratha', price: 250, category: '🫓 777 Paratha', description: 'BBQ stuffed paratha', available: true },
      { name: 'BBQ Cheese Pratha', price: 260, category: '🫓 777 Paratha', description: 'BBQ and cheese paratha', available: true },
      { name: 'Keema Pratha', price: 300, category: '🫓 777 Paratha', description: 'Minced meat paratha', available: true },
      { name: 'Keema Cheese Pratha', price: 350, category: '🫓 777 Paratha', description: 'Keema and cheese paratha', available: true },

      // 🍖 777 Mutton Karahi
      { name: '777 Special Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion special mutton karahi', available: true },
      { name: '777 Special Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion special mutton karahi', available: true },
      { name: 'Balochi Mutton Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion balochi mutton karahi', available: true },
      { name: 'Balochi Mutton Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion balochi mutton karahi', available: true },
      { name: 'Mutton Karahi (Half)', price: 1500, category: '🍖 777 Mutton Karahi', description: 'Half portion mutton karahi', available: true },
      { name: 'Mutton Karahi (Full)', price: 2900, category: '🍖 777 Mutton Karahi', description: 'Full portion mutton karahi', available: true },
      { name: 'Mutton Achari Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion achari mutton karahi', available: true },
      { name: 'Mutton Achari Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion achari mutton karahi', available: true },
      { name: 'Mutton Makhni Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion makhni mutton karahi', available: true },
      { name: 'Mutton Makhni Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion makhni mutton karahi', available: true },
      { name: 'Mutton Brown Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion brown mutton karahi', available: true },
      { name: 'Mutton Brown Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion brown mutton karahi', available: true },
      { name: 'Mutton White Karahi (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion white mutton karahi', available: true },
      { name: 'Mutton White Karahi (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion white mutton karahi', available: true },
      { name: 'Mutton Namkeen Shinwari (Half)', price: 1600, category: '🍖 777 Mutton Karahi', description: 'Half portion namkeen shinwari mutton karahi', available: true },
      { name: 'Mutton Namkeen Shinwari (Full)', price: 3000, category: '🍖 777 Mutton Karahi', description: 'Full portion namkeen shinwari mutton karahi', available: true },

      // 🍗 777 Chicken Karahi
      { name: 'Special Karahi (Half)', price: 850, category: '🍗 777 Chicken Karahi', description: 'Half portion special chicken karahi', available: true },
      { name: 'Special Karahi (Full)', price: 1500, category: '🍗 777 Chicken Karahi', description: 'Full portion special chicken karahi', available: true },
      { name: 'Balochi Karahi (Half)', price: 850, category: '🍗 777 Chicken Karahi', description: 'Half portion balochi chicken karahi', available: true },
      { name: 'Balochi Karahi (Full)', price: 1500, category: '🍗 777 Chicken Karahi', description: 'Full portion balochi chicken karahi', available: true },
      { name: 'Chicken Brown Karahi (Half)', price: 850, category: '🍗 777 Chicken Karahi', description: 'Half portion brown chicken karahi', available: true },
      { name: 'Chicken Brown Karahi (Full)', price: 1500, category: '🍗 777 Chicken Karahi', description: 'Full portion brown chicken karahi', available: true },
      { name: 'Chicken White Karahi (Half)', price: 900, category: '🍗 777 Chicken Karahi', description: 'Half portion white chicken karahi', available: true },
      { name: 'Chicken White Karahi (Full)', price: 1600, category: '🍗 777 Chicken Karahi', description: 'Full portion white chicken karahi', available: true },
      { name: 'Chicken Shinwari (Half)', price: 900, category: '🍗 777 Chicken Karahi', description: 'Half portion shinwari chicken karahi', available: true },
      { name: 'Chicken Shinwari (Full)', price: 1600, category: '🍗 777 Chicken Karahi', description: 'Full portion shinwari chicken karahi', available: true },
      { name: 'Chicken Namkeen Shinwari (Half)', price: 850, category: '🍗 777 Chicken Karahi', description: 'Half portion namkeen shinwari chicken karahi', available: true },
      { name: 'Chicken Namkeen Shinwari (Full)', price: 1500, category: '🍗 777 Chicken Karahi', description: 'Full portion namkeen shinwari chicken karahi', available: true },
      { name: 'Chicken Achari Karahi (Half)', price: 900, category: '🍗 777 Chicken Karahi', description: 'Half portion achari chicken karahi', available: true },
      { name: 'Chicken Achari Karahi (Full)', price: 1600, category: '🍗 777 Chicken Karahi', description: 'Full portion achari chicken karahi', available: true },
      { name: 'Chicken Makhni Karahi (Half)', price: 900, category: '🍗 777 Chicken Karahi', description: 'Half portion makhni chicken karahi', available: true },
      { name: 'Chicken Makhni Karahi (Full)', price: 1600, category: '🍗 777 Chicken Karahi', description: 'Full portion makhni chicken karahi', available: true },

      // 🔥 777 BBQ
      { name: 'Chicken Tikka Leg Piece/Breast', price: 580, category: '🔥 777 BBQ', description: 'Grilled chicken tikka', available: true },
      { name: 'Chicken Seekh Kabab', price: 650, category: '🔥 777 BBQ', description: 'Spicy chicken seekh kabab', available: true },
      { name: 'Chicken Boti Plate (10 pcs)', price: 650, category: '🔥 777 BBQ', description: '10 pieces chicken boti', available: true },
      { name: 'Beef Seekh Kabab (4 pcs)', price: 600, category: '🔥 777 BBQ', description: '4 pieces beef seekh kabab', available: true },
      { name: 'Chicken Malai Boti (10 pcs)', price: 600, category: '🔥 777 BBQ', description: 'Creamy chicken boti', available: true },
      { name: 'Beef Tikka Boti (10 pcs)', price: 600, category: '🔥 777 BBQ', description: 'Beef tikka boti pieces', available: true },
      { name: 'Chicken Rashmi Kabab (4 pcs)', price: 600, category: '🔥 777 BBQ', description: 'Special rashmi kabab', available: true },

      // 🌯 Chicken Rolls
      { name: 'Chicken Chatni Roll', price: 230, category: '🌯 Chicken Rolls', description: 'Chicken roll with chatni', available: true },
      { name: 'Mayo Garlic Roll', price: 300, category: '🌯 Chicken Rolls', description: 'Mayo garlic chicken roll', available: true },
      { name: 'Chicken Cheese Roll', price: 300, category: '🌯 Chicken Rolls', description: 'Chicken cheese roll', available: true },
      { name: 'Ketchup Roll', price: 200, category: '🌯 Chicken Rolls', description: 'Chicken roll with ketchup', available: true },
      { name: 'Sizzling Roll', price: 300, category: '🌯 Chicken Rolls', description: 'Hot sizzling chicken roll', available: true },
      { name: 'Rashmi Roll', price: 260, category: '🌯 Chicken Rolls', description: 'Rashmi chicken roll', available: true },
      { name: 'Rashmi Ketchup Roll', price: 260, category: '🌯 Chicken Rolls', description: 'Rashmi with ketchup', available: true },
      { name: 'Rashmi Garlic Roll', price: 260, category: '🌯 Chicken Rolls', description: 'Rashmi garlic roll', available: true },
      { name: 'Rashmi Cheese Roll', price: 290, category: '🌯 Chicken Rolls', description: 'Rashmi cheese roll', available: true },

      // 🥩 Beef Rolls
      { name: 'Seekh Kabab Roll', price: 270, category: '🥩 Beef Rolls', description: 'Beef seekh kabab roll', available: true },
      { name: 'Beef Seekh Ketchup Roll', price: 270, category: '🥩 Beef Rolls', description: 'Beef seekh with ketchup', available: true },
      { name: 'Beef Cheese Roll', price: 300, category: '🥩 Beef Rolls', description: 'Beef cheese roll', available: true },
      { name: 'Beef Garlic Roll', price: 300, category: '🥩 Beef Rolls', description: 'Beef garlic roll', available: true },

      // 🍗 Nuggets
      { name: '5 Pcs Nuggets', price: 400, category: '🍗 Nuggets', description: '5 pieces chicken nuggets', available: true },
      { name: '10 Pcs Nuggets', price: 780, category: '🍗 Nuggets', description: '10 pieces chicken nuggets', available: true },

      // 🍟 Fries
      { name: 'Half Fries', price: 200, category: '🍟 Fries', description: 'Half portion fries', available: true },
      { name: 'Full Fries', price: 360, category: '🍟 Fries', description: 'Full portion fries', available: true },
      { name: 'Mayo Fries', price: 500, category: '🍟 Fries', description: 'Fries with mayo', available: true },
      { name: 'Loaded Fries', price: 600, category: '🍟 Fries', description: 'Loaded fries with toppings', available: true },

      // 🥤 Fresh Juice
      { name: 'Peach Juice', price: 250, category: '🥤 Fresh Juice', description: 'Fresh peach juice', available: true },
      { name: 'Apple Juice', price: 250, category: '🥤 Fresh Juice', description: 'Fresh apple juice', available: true },
      { name: 'Strawberry Juice', price: 250, category: '🥤 Fresh Juice', description: 'Fresh strawberry juice', available: true },
      { name: 'Seasons Fresh Juice', price: 280, category: '🥤 Fresh Juice', description: 'Seasonal fresh juice', available: true },

      // 🍹 Margarita
      { name: 'Mint Margarita', price: 250, category: '🍹 Margarita', description: 'Refreshing mint margarita', available: true },
      { name: 'Blue Margarita', price: 250, category: '🍹 Margarita', description: 'Blue colored margarita', available: true },
      { name: 'Peach Margarita', price: 250, category: '🍹 Margarita', description: 'Peach flavored margarita', available: true },
      { name: 'Strawberry Margarita', price: 280, category: '🍹 Margarita', description: 'Strawberry margarita', available: true },

      // 🍔 777 Burgers
      { name: 'Zinger Burger', price: 399, category: '🍔 777 Burgers', description: 'Crispy zinger burger', available: true },
      { name: 'Zinger Cheese Burger', price: 450, category: '🍔 777 Burgers', description: 'Zinger burger with cheese', available: true },
      { name: 'Chicken Burger', price: 320, category: '🍔 777 Burgers', description: 'Grilled chicken burger', available: true },
      { name: 'Afghani Burger', price: 250, category: '🍔 777 Burgers', description: 'Afghani style burger', available: true },
      { name: 'Grill Burger', price: 299, category: '🍔 777 Burgers', description: 'Grilled burger', available: true },
      { name: 'Double Decker Burger', price: 499, category: '🍔 777 Burgers', description: 'Double layer burger', available: true },
      { name: '777 Special Burger', price: 550, category: '🍔 777 Burgers', description: 'Restaurant special burger', available: true },
      { name: 'Chicken Cheese Burger', price: 350, category: '🍔 777 Burgers', description: 'Chicken burger with cheese', available: true },

      // 🌯 Shawarma Rolls
      { name: 'Chicken Shawarma Roll', price: 250, category: '🌯 Shawarma Rolls', description: 'Chicken shawarma roll', available: true },
      { name: 'Chicken Zinger Shawarma Roll', price: 320, category: '🌯 Shawarma Rolls', description: 'Zinger chicken shawarma', available: true },
      { name: 'Zinger Cheese Shawarma Roll', price: 450, category: '🌯 Shawarma Rolls', description: 'Zinger cheese shawarma', available: true },
      { name: 'Chicken Cheese Shawarma', price: 320, category: '🌯 Shawarma Rolls', description: 'Chicken cheese shawarma', available: true },

      // 🍨 Ice Creams
      { name: 'Kulfa (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop kulfa ice cream', available: true },
      { name: 'Kulfa (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop kulfa ice cream', available: true },
      { name: 'Mango (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop mango ice cream', available: true },
      { name: 'Mango (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop mango ice cream', available: true },
      { name: 'Vanilla (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop vanilla ice cream', available: true },
      { name: 'Vanilla (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop vanilla ice cream', available: true },
      { name: 'Strawberry (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop strawberry ice cream', available: true },
      { name: 'Strawberry (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop strawberry ice cream', available: true },
      { name: 'Pista (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop pista ice cream', available: true },
      { name: 'Pista (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop pista ice cream', available: true },
      { name: 'Kaju (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop kaju ice cream', available: true },
      { name: 'Kaju (2 Scoop)', price: 220, category: '🍨 Ice Creams', description: '2 scoop kaju ice cream', available: true },
      { name: '777 Special (1 Scoop)', price: 350, category: '🍨 Ice Creams', description: 'Restaurant special ice cream', available: true },

      // 🍛 Other Items
      { name: 'Biryani Single', price: 300, category: '🍛 Other Items', description: 'Single portion biryani', available: true },
      { name: 'Biryani Family', price: 560, category: '🍛 Other Items', description: 'Family portion biryani', available: true },
      { name: 'Mineral Water Large', price: 100, category: '🍛 Other Items', description: 'Large bottle mineral water', available: true },
      { name: 'Mineral Water Small', price: 60, category: '🍛 Other Items', description: 'Small bottle mineral water', available: true },
      { name: 'Cold Drink 1.5 Ltr', price: 220, category: '🍛 Other Items', description: '1.5 liter cold drink', available: true },
      { name: 'Cold Drink Tin', price: 110, category: '🍛 Other Items', description: 'Tin cold drink', available: true },
      { name: 'Cold Drink Sting', price: 150, category: '🍛 Other Items', description: 'Sting energy drink', available: true },
      { name: 'Salad', price: 60, category: '🍛 Other Items', description: 'Fresh salad', available: true },
      { name: 'Raita', price: 30, category: '🍛 Other Items', description: 'Yogurt raita', available: true },
      { name: 'Tandoori Roti', price: 30, category: '🍛 Other Items', description: 'Tandoori roti', available: true }
    ];

    // Insert food items and get their IDs
    const insertedFoodItems = [];
    for (const item of sampleFoodItems) {
      const inserted = await FoodItem.findOneAndUpdate(
        { name: item.name },
        item,
        { upsert: true, new: true }
      );
      insertedFoodItems.push(inserted);
    }

    // Skip sample orders for now - focus on food items
    console.log('Food items seeded successfully');

    res.json({ message: 'Database seeded successfully!' });
  } catch (error) {
    console.error('Seed data error:', error);
    res.status(500).json({ message: 'Error seeding database' });
  }
});

// Generate actual orders that will create sales history through normal flow
router.post('/generate-sales-history', async (req, res) => {
  try {
    console.log('Generating 2 months of actual orders to create sales history...');

    // First, ensure we have food items
    const foodItemsCount = await FoodItem.countDocuments();
    if (foodItemsCount === 0) {
      console.log('No food items found, seeding basic food items first...');
      const sampleFoodItems = [
        { name: 'Chicken Tikka Leg Piece/Breast', price: 580, category: '🔥 777 BBQ', description: 'Grilled chicken tikka' },
        { name: 'Chicken Seekh Kabab', price: 650, category: '🔥 777 BBQ', description: 'Spicy chicken seekh kabab' },
        { name: 'Special Karahi (Half)', price: 850, category: '🍗 777 Chicken Karahi', description: 'Half portion special chicken karahi' },
        { name: 'Special Karahi (Full)', price: 1500, category: '🍗 777 Chicken Karahi', description: 'Full portion special chicken karahi' },
        { name: 'Chicken Cheese Roll', price: 300, category: '🌯 Chicken Rolls', description: 'Chicken cheese roll' },
        { name: 'Zinger Burger', price: 399, category: '🍔 777 Burgers', description: 'Crispy zinger burger' },
        { name: 'Kulfa (1 Scoop)', price: 160, category: '🍨 Ice Creams', description: '1 scoop kulfa ice cream' },
        { name: 'Milk Tea', price: 80, category: '🍳 777 Nashta', description: 'Creamy milk tea' },
        { name: 'Cold Drink Tin', price: 110, category: '🍛 Other Items', description: 'Tin cold drink' },
        { name: 'Half Fries', price: 200, category: '🍟 Fries', description: 'Half portion fries' }
      ];

      await FoodItem.insertMany(sampleFoodItems);
      console.log('Seeded food items');
    }

    const foodItems = await FoodItem.find({ available: true });
    const currentDate = new Date();
    const twoMonthsAgo = new Date(currentDate);
    twoMonthsAgo.setMonth(currentDate.getMonth() - 2);

    // Generate orders for the last 60 days
    const ordersData = [];
    let totalOrdersCreated = 0;

    for (let day = 0; day < 60; day++) {
      const orderDate = new Date(twoMonthsAgo);
      orderDate.setDate(twoMonthsAgo.getDate() + day);

      // Generate 15-40 orders per day
      const ordersPerDay = Math.floor(Math.random() * 25) + 15;

      for (let orderNum = 0; orderNum < ordersPerDay; orderNum++) {
        const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
        const items = [];

        for (let j = 0; j < numItems; j++) {
          const randomFoodItem = foodItems[Math.floor(Math.random() * foodItems.length)];
          items.push({
            foodItem: randomFoodItem._id,
            name: randomFoodItem.name,
            price: randomFoodItem.price,
            quantity: Math.floor(Math.random() * 3) + 1 // 1-3 quantity
          });
        }

        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order with random time during the day
        const orderTime = new Date(orderDate);
        orderTime.setHours(Math.floor(Math.random() * 12) + 11, Math.floor(Math.random() * 60)); // 11 AM to 11 PM

        ordersData.push({
          table: Math.floor(Math.random() * 20) + 1, // Tables 1-20
          items: items,
          total: total,
          status: 'completed', // All test orders are completed to generate sales
          createdAt: orderTime,
          updatedAt: orderTime
        });

        totalOrdersCreated++;
      }
    }

    // Insert orders in batches
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < ordersData.length; i += batchSize) {
      const batch = ordersData.slice(i, i + batchSize);
      await Order.insertMany(batch);
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${ordersData.length} orders`);
    }

    // Now trigger the sales history creation by calling the order completion logic
    // This will create the sales history data through the normal flow
    console.log('Processing orders to generate sales history...');

    // Group orders by date and create sales history entries
    const salesHistoryData = [];
    const monthlySalesData = [];

    // Get all completed orders from the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const completedOrders = await Order.find({
      status: 'completed',
      createdAt: { $gte: sixtyDaysAgo }
    });

    // Group by date
    const dailyGroups = {};
    completedOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = [];
      }
      dailyGroups[dateKey].push(order);
    });

    // Create daily sales history
    Object.keys(dailyGroups).forEach(dateKey => {
      const dayOrders = dailyGroups[dateKey];
      const totalOrders = dayOrders.length;
      const totalRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0);

      salesHistoryData.push({
        date: new Date(dateKey),
        period: 'daily',
        orders: totalOrders,
        revenue: totalRevenue,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Group by month for monthly sales
    const monthlyGroups = {};
    Object.keys(dailyGroups).forEach(dateKey => {
      const [year, month] = dateKey.split('-');
      const monthKey = `${year}-${month}`;
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(...dailyGroups[dateKey]);
    });

    // Create monthly sales
    Object.keys(monthlyGroups).forEach(monthKey => {
      const monthOrders = monthlyGroups[monthKey];
      const totalOrders = monthOrders.length;
      const totalRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
      const [year, month] = monthKey.split('-');

      monthlySalesData.push({
        year: parseInt(year),
        month: parseInt(month),
        totalSales: totalRevenue,
        totalOrders: totalOrders,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add monthly sales history entry
      salesHistoryData.push({
        date: new Date(parseInt(year), parseInt(month) - 1, 1),
        period: 'monthly',
        orders: totalOrders,
        revenue: totalRevenue,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Clear existing sales data and insert new
    await SalesHistory.deleteMany({});
    await MonthlySales.deleteMany({});

    await SalesHistory.insertMany(salesHistoryData);
    await MonthlySales.insertMany(monthlySalesData);

    console.log(`Generated sales history: ${salesHistoryData.length} records`);

    res.json({
      message: 'Sales history test data generated successfully!',
      data: {
        ordersCreated: totalOrdersCreated,
        salesHistoryRecords: salesHistoryData.length,
        monthlySalesRecords: monthlySalesData.length,
        dateRange: {
          from: twoMonthsAgo.toISOString().split('T')[0],
          to: currentDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Generate sales history error:', error);
    res.status(500).json({ message: 'Error generating sales history data', error: error.message });
  }
});

module.exports = router;
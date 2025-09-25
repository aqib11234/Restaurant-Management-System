const router = require('express').Router();
const FoodItem = require('../models/FoodItem');
const { authenticateToken } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 100 } = req.query;
    const query = { available: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const foodItems = await FoodItem.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await FoodItem.countDocuments(query);

    res.json({
      foodItems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get food items error:', error);
    res.status(500).json({ message: 'Error fetching food items' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, price, category, image, description } = req.body;

    const foodItem = new FoodItem({
      name,
      price: parseFloat(price),
      category,
      image: image || '/api/placeholder/200/150',
      description
    });

    await foodItem.save();
    res.status(201).json({ message: 'Food item created successfully', foodItem });
  } catch (error) {
    console.error('Create food item error:', error);
    res.status(500).json({ message: 'Error creating food item' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image, description } = req.body;

    const foodItem = await FoodItem.findByIdAndUpdate(
      id,
      {
        name,
        price: parseFloat(price),
        category,
        image,
        description
      },
      { new: true }
    );

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json({ message: 'Food item updated successfully', foodItem });
  } catch (error) {
    console.error('Update food item error:', error);
    res.status(500).json({ message: 'Error updating food item' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const foodItem = await FoodItem.findByIdAndUpdate(
      id,
      { available: false },
      { new: true }
    );

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json({ message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Delete food item error:', error);
    res.status(500).json({ message: 'Error deleting food item' });
  }
});

module.exports = router;
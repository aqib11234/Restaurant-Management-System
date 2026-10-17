const router = require('express').Router();
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const { authenticateToken, authenticateAndEnforceLicense } = require('../middleware/auth');

function validateFood({ name, price, category }) {
  if (!name || !String(name).trim()) return 'Name is required';
  if (!category || !String(category).trim()) return 'Category is required';
  const p = Number(price);
  if (price === '' || price == null || !Number.isFinite(p) || p < 0 || p > 10000) return 'Price must be a number between 0 and 10000';
  return null;
}

// Protected route - auth required for viewing food items
router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { search, category, page = 1, limit = 100 } = req.query;
    const query = { available: true, restaurantId };

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

router.post('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { name, price, category, image, description } = req.body;

    const err = validateFood({ name, price, category });
    if (err) return res.status(400).json({ message: err });

    const foodItem = new FoodItem({
      restaurantId,
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

router.put('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const { name, price, category, image, description } = req.body;

    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Food item not found' });
    const err = validateFood({ name, price, category });
    if (err) return res.status(400).json({ message: err });

    const update = { name, price: parseFloat(price), category };
    if (image) update.image = image;
    if (description !== undefined) update.description = description;

    const foodItem = await FoodItem.findOneAndUpdate(
      { _id: id, restaurantId },
      update,
      { new: true, runValidators: true }
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

router.delete('/:id', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Food item not found' });
    const foodItem = await FoodItem.findOneAndUpdate(
      { _id: id, restaurantId },
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
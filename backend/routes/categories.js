const router = require('express').Router();
const FoodItem = require('../models/FoodItem');

router.get('/', async (req, res) => {
  try {
    const categories = await FoodItem.distinct('category', { available: true });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

module.exports = router;
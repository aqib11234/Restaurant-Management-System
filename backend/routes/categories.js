const router = require('express').Router();
const FoodItem = require('../models/FoodItem');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const categories = await FoodItem.distinct('category', { available: true, restaurantId });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

module.exports = router;
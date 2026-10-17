const router = require('express').Router();
const { authenticateAndEnforceLicense } = require('../middleware/auth');

// Restaurant-wide settings shared by every device
router.get('/', authenticateAndEnforceLicense, async (req, res) => {
  const r = req.restaurant;
  res.json({ name: r.name, tableCount: r.tableCount || 20 });
});

router.put('/', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const r = req.restaurant;
    const { tableCount } = req.body;
    if (tableCount !== undefined) {
      const n = Number(tableCount);
      if (!Number.isInteger(n) || n < 1 || n > 200) {
        return res.status(400).json({ message: 'Number of tables must be between 1 and 200' });
      }
      r.tableCount = n;
    }
    await r.save();
    res.json({ name: r.name, tableCount: r.tableCount });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

module.exports = router;

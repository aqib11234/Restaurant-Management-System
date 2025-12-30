# Quick Reference: Updating Existing Routes

## 🔄 Migration Checklist

Follow these steps to update your existing routes to support multi-tenant licensing:

### Step 1: Update Middleware Import

**Before:**
```javascript
const { authenticateToken } = require('../middleware/auth');
```

**After:**
```javascript
const { authenticateAndEnforceLicense } = require('../middleware/auth');
```

---

### Step 2: Update Route Middleware

**Before:**
```javascript
router.get('/some-route', authenticateToken, async (req, res) => {
  // ...
});
```

**After:**
```javascript
router.get('/some-route', authenticateAndEnforceLicense, async (req, res) => {
  // ...
});
```

---

### Step 3: Extract restaurantId

Add this at the beginning of your route handler:

```javascript
router.get('/some-route', authenticateAndEnforceLicense, async (req, res) => {
  const restaurantId = req.user.restaurantId;
  
  // Now use restaurantId in all queries...
});
```

---

### Step 4: Update All Database Queries

#### Find/FindOne
**Before:**
```javascript
const orders = await Order.find({ status: 'pending' });
```

**After:**
```javascript
const orders = await Order.find({ 
  restaurantId,
  status: 'pending' 
});
```

#### Count
**Before:**
```javascript
const count = await Order.countDocuments({ status: 'completed' });
```

**After:**
```javascript
const count = await Order.countDocuments({ 
  restaurantId,
  status: 'completed' 
});
```

#### Aggregate
**Before:**
```javascript
const result = await Order.aggregate([
  { $match: { status: 'completed' } },
  // ...
]);
```

**After:**
```javascript
const result = await Order.aggregate([
  { $match: { restaurantId, status: 'completed' } },
  // ...
]);
```

#### Create/Insert
**Before:**
```javascript
const order = new Order({
  table: 5,
  items: [...],
  total: 100
});
```

**After:**
```javascript
const order = new Order({
  restaurantId,
  table: 5,
  items: [...],
  total: 100
});
```

#### Update
**Before:**
```javascript
await Order.findByIdAndUpdate(orderId, { status: 'completed' });
```

**After:**
```javascript
await Order.findOneAndUpdate(
  { _id: orderId, restaurantId },
  { status: 'completed' }
);
```

#### Delete
**Before:**
```javascript
await Order.findByIdAndDelete(orderId);
```

**After:**
```javascript
await Order.findOneAndDelete({ _id: orderId, restaurantId });
```

---

## 📝 Complete Example

### Before (No Multi-Tenancy)
```javascript
const router = require('express').Router();
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order' });
  }
});

module.exports = router;
```

### After (With Multi-Tenancy + License Enforcement)
```javascript
const router = require('express').Router();
const Order = require('../models/Order');
const { authenticateAndEnforceLicense } = require('../middleware/auth');

router.get('/orders', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    
    // ✅ Filter by restaurantId
    const orders = await Order.find({ 
      restaurantId,
      status: 'pending' 
    });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.post('/orders', authenticateAndEnforceLicense, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    
    // ✅ Include restaurantId
    const order = new Order({
      ...req.body,
      restaurantId
    });
    
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order' });
  }
});

module.exports = router;
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Forgetting to filter by restaurantId
```javascript
// WRONG - No restaurantId filter
const orders = await Order.find({ status: 'pending' });
```

### ❌ Mistake 2: Using findById without restaurantId check
```javascript
// WRONG - User could access other restaurant's data
const order = await Order.findById(orderId);
```

### ✅ Correct:
```javascript
const order = await Order.findOne({ _id: orderId, restaurantId });
```

### ❌ Mistake 3: Not including restaurantId when creating
```javascript
// WRONG - Missing restaurantId
const order = new Order({ table: 5, items: [...] });
```

### ✅ Correct:
```javascript
const order = new Order({ restaurantId, table: 5, items: [...] });
```

---

## 🧪 Testing Your Updates

After updating a route, test:

1. **Create two restaurants** (signup twice with different emails)
2. **Login to Restaurant A**, get token A
3. **Login to Restaurant B**, get token B
4. **Create data with token A**
5. **Try to access with token B** → Should NOT see Restaurant A's data
6. **Try to access with token A** → Should ONLY see Restaurant A's data

---

## 📋 Routes to Update

Update these files in `backend/routes/`:

- [ ] `dashboard.js` - See `dashboard.EXAMPLE.js` for reference
- [ ] `foodItems.js`
- [ ] `orders.js`
- [ ] `sales.js`
- [ ] `categories.js`

**Note:** `auth.js` and `admin.js` are already updated!

---

## 🎯 Priority Order

1. **High Priority** - Routes that read/write sensitive data:
   - `orders.js`
   - `sales.js`
   - `dashboard.js`

2. **Medium Priority** - Routes that manage resources:
   - `foodItems.js`

3. **Low Priority** - Public/read-only routes:
   - `categories.js` (if you want categories to be restaurant-specific)

---

## 💡 Tips

- Always extract `restaurantId` at the top of your route handler
- Use `findOne` with `{ _id, restaurantId }` instead of `findById`
- Test with multiple restaurants to ensure isolation
- Check the `dashboard.EXAMPLE.js` file for a complete working example

---

**Need help?** Check `LICENSING_GUIDE.md` for full documentation.

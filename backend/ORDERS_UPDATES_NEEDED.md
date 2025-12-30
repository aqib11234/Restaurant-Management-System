# Orders Route - Multi-Tenant Updates Needed

The orders.js file has been partially updated. The following manual updates are still needed to add `restaurantId` filtering to all database operations:

## Updates Required:

### 1. Status Update Route (Line ~117)
Add after `const { status } = req.body;`:
```javascript
const restaurantId = req.user.restaurantId;
```

Change `const order = await Order.findById(id);` to:
```javascript
const order = await Order.findOne({ _id: id, restaurantId });
```

### 2. Monthly Sales Updates (Lines ~142, ~195)
Change:
```javascript
await MonthlySales.findOneAndUpdate({ year, month }, ...)
```
To:
```javascript
await MonthlySales.findOneAndUpdate({ restaurantId, year, month }, ...)
```

### 3. Sales History Updates (Lines ~166, ~178, ~204, ~216)
Change all instances from:
```javascript
await SalesHistory.findOneAndUpdate({ date: ..., period: ... }, { ... })
```
To:
```javascript
await SalesHistory.findOneAndUpdate({ restaurantId, date: ..., period: ... }, { restaurantId, ... })
```

### 4. Add Items Route (Line ~232)
Add after `const { items: newItems, additionalTotal } = req.body;`:
```javascript
const restaurantId = req.user.restaurantId;
```

Change `const order = await Order.findById(id);` to:
```javascript
const order = await Order.findOne({ _id: id, restaurantId });
```

### 5. Remove Item Quantity Route (Line ~261)
Add after `const { itemIndex } = req.body;`:
```javascript
const restaurantId = req.user.restaurantId;
```

Change `const order = await Order.findById(id);` to:
```javascript
const order = await Order.findOne({ _id: id, restaurantId });
```

### 6. Delete Route (Line ~307)
Add after `const { id } = req.params;`:
```javascript
const restaurantId = req.user.restaurantId;
```

Change `const order = await Order.findByIdAndDelete(id);` to:
```javascript
const order = await Order.findOneAndDelete({ _id: id, restaurantId });
```

---

**Note:** The middleware has been updated to `authenticateAndEnforceLicense` on all routes. The above changes will complete the multi-tenant isolation for the orders module.

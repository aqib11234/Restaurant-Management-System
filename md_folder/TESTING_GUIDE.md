# 🧪 Complete Testing Guide

## 🎉 Database Populated Successfully!

Your database now contains:
- ✅ 1 Restaurant (FastFood Paradise)
- ✅ 1 Owner User
- ✅ 26 Food Items (with real images)
- ✅ 200+ Orders (past 30 days)
- ✅ Sales History (daily & monthly)

---

## 🔑 Login Credentials

**Email:** `admin@fastfood.com`  
**Password:** `admin123`

---

## 📋 Testing Checklist

### ✅ Phase 1: Authentication & Dashboard

#### 1. Login
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@fastfood.com\",\"password\":\"admin123\"}"
```

**Expected:** Returns JWT token and user info

**Save the token!** You'll need it for all other requests.

#### 2. View Dashboard Stats
```bash
curl http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Shows total items, sales, orders, top dishes

---

### ✅ Phase 2: Food Items Management

#### 3. List All Food Items
```bash
curl "http://localhost:5000/api/food-items?limit=50" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns 26 food items with images

#### 4. Add New Food Item
```bash
curl -X POST http://localhost:5000/api/food-items ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Spicy Wings\",\"price\":12.99,\"category\":\"Fried Chicken\",\"description\":\"Extra spicy chicken wings\",\"image\":\"https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400\"}"
```

**Expected:** Food item created successfully

#### 5. Update Food Item
```bash
curl -X PUT http://localhost:5000/api/food-items/ITEM_ID_HERE ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Name\",\"price\":13.99,\"category\":\"Fried Chicken\",\"description\":\"Updated description\"}"
```

**Expected:** Food item updated

#### 6. Delete Food Item (Soft Delete)
```bash
curl -X DELETE http://localhost:5000/api/food-items/ITEM_ID_HERE ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Food item marked as unavailable

---

### ✅ Phase 3: Order Management

#### 7. View All Orders
```bash
curl "http://localhost:5000/api/orders?status=all&limit=20" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns list of orders

#### 8. Place New Order
```bash
curl -X POST http://localhost:5000/api/orders ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"table\":5,\"items\":[{\"foodItem\":\"FOOD_ITEM_ID\",\"name\":\"Burger\",\"price\":8.99,\"quantity\":2}],\"total\":17.98}"
```

**Expected:** Order placed successfully

#### 9. Update Order Status
```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID_HERE/status ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"preparing\"}"
```

**Expected:** Order status updated

**Test all statuses:**
- `pending` → `preparing` → `ready` → `completed`
- `cancelled`

#### 10. Add Items to Order
```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID_HERE/add-items ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"items\":[{\"foodItem\":\"FOOD_ITEM_ID\",\"name\":\"Fries\",\"price\":3.99,\"quantity\":1}],\"additionalTotal\":3.99}"
```

**Expected:** Items added to order

#### 11. Remove Item from Order
```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID_HERE/remove-item-quantity ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"itemIndex\":0}"
```

**Expected:** Item quantity decreased or removed

#### 12. Cancel Order
```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID_HERE/status ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"cancelled\"}"
```

**Expected:** Order cancelled

#### 13. Delete Order
```bash
curl -X DELETE http://localhost:5000/api/orders/ORDER_ID_HERE ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Order deleted

---

### ✅ Phase 4: Sales History

#### 14. View Daily Sales
```bash
curl "http://localhost:5000/api/sales?period=daily" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns last 7 days of sales

#### 15. View Monthly Sales
```bash
curl "http://localhost:5000/api/sales?period=monthly" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns last 6 months of sales

#### 16. View Sales History (Detailed)
```bash
curl "http://localhost:5000/api/sales/history?groupBy=daily" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns detailed daily sales with order details

#### 17. View Orders for Specific Date
```bash
curl "http://localhost:5000/api/sales/orders/daily/2025-12-30" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Returns all orders for that date

---

### ✅ Phase 5: Multi-Tenant Testing

#### 18. Create Second Restaurant
```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantName\":\"Pizza Palace\",\"email\":\"pizza@example.com\",\"password\":\"password123\"}"
```

**Expected:** New restaurant created with trial

#### 19. Login to Second Restaurant
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"pizza@example.com\",\"password\":\"password123\"}"
```

**Expected:** Returns different token

#### 20. Verify Data Isolation
Use token from Restaurant 2 to access data:
```bash
curl http://localhost:5000/api/food-items ^
  -H "Authorization: Bearer RESTAURANT_2_TOKEN"
```

**Expected:** Should return EMPTY list (no food items for Restaurant 2)

---

### ✅ Phase 6: License Management

#### 21. List All Restaurants
```bash
curl http://localhost:5000/api/admin/restaurants
```

**Expected:** Shows all restaurants with license status

#### 22. Convert to Lifetime License
```bash
curl -X POST http://localhost:5000/api/admin/convert-to-lifetime ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"YOUR_RESTAURANT_ID\"}"
```

**Expected:** Restaurant converted to lifetime

#### 23. Extend Subscription
```bash
curl -X POST http://localhost:5000/api/admin/extend-subscription ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"YOUR_RESTAURANT_ID\",\"days\":30}"
```

**Expected:** Subscription extended by 30 days

#### 24. Deactivate Restaurant
```bash
curl -X POST http://localhost:5000/api/admin/deactivate-restaurant ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"YOUR_RESTAURANT_ID\"}"
```

**Expected:** Restaurant deactivated

#### 25. Try to Access After Deactivation
```bash
curl http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** 403 error "Restaurant account is deactivated"

---

## 🎯 Testing Scenarios

### Scenario 1: Complete Order Flow
1. ✅ Login
2. ✅ View food items
3. ✅ Place order (pending)
4. ✅ Update to preparing
5. ✅ Update to ready
6. ✅ Update to completed
7. ✅ Check sales history (should include new order)

### Scenario 2: Order Modification
1. ✅ Place order with 2 items
2. ✅ Add 1 more item
3. ✅ Remove 1 item
4. ✅ Complete order
5. ✅ Verify total is correct

### Scenario 3: Order Cancellation
1. ✅ Place order
2. ✅ Complete order (adds to sales)
3. ✅ Cancel order (removes from sales)
4. ✅ Check sales history (should be updated)

### Scenario 4: Multi-Tenant Isolation
1. ✅ Create Restaurant A
2. ✅ Add food items to Restaurant A
3. ✅ Create Restaurant B
4. ✅ Login to Restaurant B
5. ✅ Try to view Restaurant A's items → Should fail

### Scenario 5: License Expiration
1. ✅ Create restaurant with trial
2. ✅ Manually set expiration to past date (in MongoDB)
3. ✅ Try to access → Should get "Subscription expired"
4. ✅ Extend subscription
5. ✅ Access should work again

---

## 📊 Sales History PDF Structure

When implementing PDF export, use this simple structure:

```
═══════════════════════════════════════════════════════════
                    SALES HISTORY REPORT
                    FastFood Paradise
═══════════════════════════════════════════════════════════

Period: December 1-30, 2025
Generated: December 30, 2025 3:20 PM

───────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────
Total Orders: 245
Total Revenue: $3,456.78
Average Order: $14.11

───────────────────────────────────────────────────────────
ORDER DETAILS
───────────────────────────────────────────────────────────

Date: December 30, 2025
Time: 10:30 AM
Order #: ORD-001
Table: 5
Status: Completed

Items:
  1x Classic Beef Burger      $8.99
  2x French Fries             $7.98
  1x Coca Cola                $2.49
                          ─────────
Total:                       $19.46

───────────────────────────────────────────────────────────

Date: December 30, 2025
Time: 11:15 AM
Order #: ORD-002
Table: 3
Status: Completed

Items:
  1x Pepperoni Pizza         $14.99
  1x Milkshake                $4.99
                          ─────────
Total:                       $19.98

───────────────────────────────────────────────────────────
END OF REPORT
═══════════════════════════════════════════════════════════
```

---

## 🚀 Ready to Test!

Your database is fully populated. Start testing with:

1. **Login first:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login ^
     -H "Content-Type: application/json" ^
     -d "{\"email\":\"admin@fastfood.com\",\"password\":\"admin123\"}"
   ```

2. **Save the token from the response**

3. **Start testing each endpoint above!**

---

## 💡 Tips

- Replace `YOUR_TOKEN_HERE` with actual JWT token
- Replace `ITEM_ID_HERE` with actual food item ID
- Replace `ORDER_ID_HERE` with actual order ID
- Use `^` for line continuation in Windows CMD
- For PowerShell, use `` ` `` instead of `^`

---

**Happy Testing! 🎉**

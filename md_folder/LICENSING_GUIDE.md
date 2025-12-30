# Hybrid Licensing System - Implementation Guide

## 🎯 Overview

This Restaurant Management System (RMS) implements a **hybrid licensing model** with two license types:

1. **Lifetime License** - One-time payment, permanent access
2. **Subscription License** - Recurring payment (trial/monthly/yearly)

All data is isolated by `restaurantId` to ensure multi-tenant security.

---

## 📦 Database Schema

### Collections

#### 1. **Restaurants**
```javascript
{
  _id: ObjectId,
  name: String,
  licenseType: "lifetime" | "subscription",
  plan: "trial" | "monthly" | "yearly" | null,
  subscriptionEndsAt: Date | null,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **Users**
```javascript
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  role: "owner" | "staff",
  restaurantId: ObjectId,  // Links to Restaurant
  createdAt: Date
}
```

#### 3. **FoodItems, Orders, SalesHistory, MonthlySales**
All include:
```javascript
{
  // ... other fields
  restaurantId: ObjectId,  // Multi-tenant isolation
}
```

---

## 🔐 Authentication & JWT

### JWT Payload Structure
```javascript
{
  userId: ObjectId,
  restaurantId: ObjectId,  // CRITICAL for multi-tenancy
  role: "owner" | "staff"
}
```

### Token Generation
Tokens are generated on signup and login and include the `restaurantId` for data isolation.

---

## 🛡️ License Enforcement

### Middleware: `enforceLicense`

Located in: `backend/middleware/auth.js`

**Logic:**
1. Extract `restaurantId` from JWT
2. Load restaurant record from database
3. Check if restaurant is active
4. Apply license validation:
   - **Lifetime**: Always allow access (if active)
   - **Subscription**: Check if `subscriptionEndsAt >= today`
5. Block access if invalid/expired

**Usage:**
```javascript
const { authenticateAndEnforceLicense } = require('./middleware/auth');

router.get('/protected-route', authenticateAndEnforceLicense, (req, res) => {
  // req.user contains: { userId, restaurantId, role }
  // req.restaurant contains: Restaurant document
  // Access granted only if license is valid
});
```

**Error Codes:**
- `NO_RESTAURANT` - No restaurant associated with account
- `RESTAURANT_NOT_FOUND` - Restaurant doesn't exist
- `RESTAURANT_DEACTIVATED` - Restaurant is inactive
- `NO_SUBSCRIPTION` - No subscription found
- `SUBSCRIPTION_EXPIRED` - Subscription has expired
- `INVALID_LICENSE` - Unknown license type

---

## 🧾 Signup Flow

### Endpoint: `POST /api/auth/signup`

**Request:**
```json
{
  "restaurantName": "My Restaurant",
  "email": "owner@example.com",
  "password": "securepassword"
}
```

**Process:**
1. Create restaurant with:
   - `licenseType`: "subscription"
   - `plan`: "trial"
   - `subscriptionEndsAt`: today + 14 days
   - `isActive`: true
2. Create owner user linked to restaurant
3. Return JWT with `restaurantId`

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "owner@example.com",
    "role": "owner",
    "restaurantId": "restaurant_id"
  },
  "restaurant": {
    "id": "restaurant_id",
    "name": "My Restaurant",
    "licenseType": "subscription",
    "plan": "trial",
    "subscriptionEndsAt": "2025-01-13T...",
    "trialDaysRemaining": 14
  }
}
```

---

## 🔧 Admin / Manual Controls

### Endpoints (LOCAL TESTING ONLY)

All endpoints are under `/api/admin/`

#### 1. **List All Restaurants**
```bash
GET /api/admin/restaurants
```

Returns all restaurants with license status.

#### 2. **Convert to Lifetime**
```bash
POST /api/admin/convert-to-lifetime
Body: { "restaurantId": "..." }
```

Converts a subscription to lifetime license.

#### 3. **Extend Subscription**
```bash
POST /api/admin/extend-subscription
Body: { "restaurantId": "...", "days": 30 }
```

Extends subscription by specified days (1-3650).

#### 4. **Deactivate Restaurant**
```bash
POST /api/admin/deactivate-restaurant
Body: { "restaurantId": "..." }
```

Blocks all access to the restaurant.

#### 5. **Activate Restaurant**
```bash
POST /api/admin/activate-restaurant
Body: { "restaurantId": "..." }
```

Re-enables access to a deactivated restaurant.

#### 6. **Change Plan**
```bash
POST /api/admin/change-plan
Body: { "restaurantId": "...", "plan": "monthly" }
```

Changes subscription plan (trial/monthly/yearly).

---

## 🧪 Testing Scenarios

### Setup
1. Ensure MongoDB is running: `mongodb://localhost:27017/rms_local`
2. Start the server: `npm run dev` (in backend folder)

### Scenario 1: New Signup → Trial Works
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "Test Restaurant",
    "email": "test@example.com",
    "password": "password123"
  }'

# Use returned token to access protected routes
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Access granted (trial is active for 14 days)

### Scenario 2: Trial Expires → Access Blocked
```bash
# Manually set subscriptionEndsAt to past date in MongoDB
# Then try to access
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** 403 error with "Subscription expired"

### Scenario 3: Lifetime License → Always Allowed
```bash
# Convert to lifetime
curl -X POST http://localhost:5000/api/admin/convert-to-lifetime \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "YOUR_RESTAURANT_ID"}'

# Access protected route
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Access granted (lifetime license never expires)

### Scenario 4: Two Restaurants → Cannot See Each Other's Data

1. Create two restaurants with different signups
2. Login to Restaurant A, get token A
3. Login to Restaurant B, get token B
4. Use token A to access data → should only see Restaurant A's data
5. Use token B to access data → should only see Restaurant B's data

**Expected:** Complete data isolation

### Automated Testing
Run the comprehensive test script:
```bash
cd backend
node testLicense.js
```

---

## 🔒 Data Isolation Implementation

### All Routes Must Filter by restaurantId

**Example:**
```javascript
// ❌ WRONG - No filtering
const orders = await Order.find({ status: 'pending' });

// ✅ CORRECT - Filtered by restaurantId
const orders = await Order.find({ 
  restaurantId: req.user.restaurantId,
  status: 'pending' 
});
```

### Middleware Ensures Isolation

The `enforceLicense` middleware automatically adds `req.user.restaurantId` to all requests, making it easy to filter:

```javascript
router.get('/orders', authenticateAndEnforceLicense, async (req, res) => {
  // req.user.restaurantId is guaranteed to exist
  const orders = await Order.find({ 
    restaurantId: req.user.restaurantId 
  });
  res.json(orders);
});
```

---

## 📌 Key Files

| File | Purpose |
|------|---------|
| `models/Restaurant.js` | Restaurant schema with license fields |
| `models/User.js` | User schema with restaurantId |
| `middleware/auth.js` | JWT auth + license enforcement |
| `routes/auth.js` | Signup/login with multi-tenant support |
| `routes/admin.js` | License management endpoints |
| `testLicense.js` | Automated testing script |

---

## 🚀 Quick Start

### 1. Start MongoDB
```bash
# Make sure MongoDB is running on localhost:27017
```

### 2. Start Server
```bash
cd backend
npm install
npm run dev
```

### 3. Test Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "My Restaurant",
    "email": "owner@example.com",
    "password": "password123"
  }'
```

### 4. View All Restaurants
```bash
curl http://localhost:5000/api/admin/restaurants
```

### 5. Run Automated Tests
```bash
node testLicense.js
```

---

## 🎯 Production Considerations

**This implementation is for LOCAL TESTING ONLY.**

For production deployment, you would need to:

1. **Secure Admin Routes** - Add authentication/authorization
2. **Payment Integration** - Stripe, PayPal, etc.
3. **Webhook Handlers** - Auto-update subscriptions
4. **Email Notifications** - Trial expiring, subscription renewed, etc.
5. **Rate Limiting** - Prevent abuse
6. **Logging & Monitoring** - Track license events
7. **Cloud Database** - MongoDB Atlas or similar
8. **Environment Variables** - Secure JWT secrets

---

## 📚 API Reference

### Authentication
- `POST /api/auth/signup` - Create restaurant + owner
- `POST /api/auth/login` - Authenticate user

### Admin (Local Testing)
- `GET /api/admin/restaurants` - List all restaurants
- `POST /api/admin/convert-to-lifetime` - Convert to lifetime
- `POST /api/admin/extend-subscription` - Extend subscription
- `POST /api/admin/deactivate-restaurant` - Deactivate
- `POST /api/admin/activate-restaurant` - Activate
- `POST /api/admin/change-plan` - Change plan

### Protected Routes
All existing routes (`/api/dashboard`, `/api/orders`, etc.) should be updated to use `authenticateAndEnforceLicense` middleware.

---

## ✅ Checklist

- [x] Restaurant model with licensing
- [x] User model with restaurantId
- [x] All data models include restaurantId
- [x] License enforcement middleware
- [x] Multi-tenant signup flow
- [x] Admin license management
- [x] Testing script
- [x] Documentation

---

## 🆘 Troubleshooting

### "Subscription expired" on new signup
- Check that `subscriptionEndsAt` is set to 14 days in the future
- Verify server time is correct

### Can't access data after signup
- Ensure JWT includes `restaurantId`
- Check that `enforceLicense` middleware is applied
- Verify restaurant `isActive` is true

### Two restaurants seeing each other's data
- Ensure all queries filter by `restaurantId`
- Check that JWT contains correct `restaurantId`

---

**Built for local development and testing. Extend for production use.**

# API Testing Commands (Windows PowerShell/CMD)

## 🧪 Quick Test Commands

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

---

## 🔐 Authentication

### Signup (Creates Restaurant with 14-day Trial)
```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantName\":\"My Restaurant\",\"email\":\"owner@example.com\",\"password\":\"password123\"}"
```

**Save the token from the response!**

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"owner@example.com\",\"password\":\"password123\"}"
```

---

## 🔒 Protected Routes (Requires Token)

### Access Dashboard (Replace YOUR_TOKEN_HERE)
```bash
curl -X GET http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:**
- ✅ If trial is active: Returns dashboard data
- ❌ If trial expired: 403 error "Subscription expired"

---

## 🛠️ Admin Endpoints (Local Testing)

### List All Restaurants
```bash
curl http://localhost:5000/api/admin/restaurants
```

### Convert to Lifetime License
```bash
curl -X POST http://localhost:5000/api/admin/convert-to-lifetime ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"RESTAURANT_ID_HERE\"}"
```

### Extend Subscription by 30 Days
```bash
curl -X POST http://localhost:5000/api/admin/extend-subscription ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"RESTAURANT_ID_HERE\",\"days\":30}"
```

### Deactivate Restaurant
```bash
curl -X POST http://localhost:5000/api/admin/deactivate-restaurant ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"RESTAURANT_ID_HERE\"}"
```

### Activate Restaurant
```bash
curl -X POST http://localhost:5000/api/admin/activate-restaurant ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"RESTAURANT_ID_HERE\"}"
```

### Change Plan
```bash
curl -X POST http://localhost:5000/api/admin/change-plan ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"RESTAURANT_ID_HERE\",\"plan\":\"monthly\"}"
```

---

## 🧪 Complete Test Flow

### Step 1: Create Restaurant
```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantName\":\"Test Restaurant\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Copy the token and restaurantId from response**

### Step 2: Access Dashboard (Should Work - Trial Active)
```bash
curl -X GET http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 3: List Restaurants
```bash
curl http://localhost:5000/api/admin/restaurants
```

### Step 4: Convert to Lifetime
```bash
curl -X POST http://localhost:5000/api/admin/convert-to-lifetime ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantId\":\"YOUR_RESTAURANT_ID\"}"
```

### Step 5: Access Dashboard Again (Should Still Work - Lifetime)
```bash
curl -X GET http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔄 Test Data Isolation

### Create Restaurant A
```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantName\":\"Restaurant A\",\"email\":\"restaurantA@example.com\",\"password\":\"password123\"}"
```
**Save token as TOKEN_A**

### Create Restaurant B
```bash
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"restaurantName\":\"Restaurant B\",\"email\":\"restaurantB@example.com\",\"password\":\"password123\"}"
```
**Save token as TOKEN_B**

### Access with Token A
```bash
curl -X GET http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer TOKEN_A"
```
**Should only see Restaurant A's data**

### Access with Token B
```bash
curl -X GET http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer TOKEN_B"
```
**Should only see Restaurant B's data**

---

## 📝 Notes

- Replace `YOUR_TOKEN_HERE` with actual JWT token from signup/login
- Replace `YOUR_RESTAURANT_ID` with actual restaurant ID
- Use `^` for line continuation in Windows CMD
- For PowerShell, use `` ` `` instead of `^`
- For Linux/Mac, use `\` instead of `^`

---

## 🚀 Automated Testing

Instead of running commands manually, use the automated test script:

```bash
cd backend
node testLicense.js
```

This will run all test scenarios automatically!

# Authentication Fix - Setup Instructions

## Problem
The application was showing "Invalid or expired token" error due to JWT secret key mismatch between token generation and verification.

## Solution Applied
Fixed the JWT secret key inconsistency in `backend/routes/auth.js`.

## Setup Steps

### 1. Create Environment File
Create a `.env` file in the `backend` directory:

```bash
cd backend
copy .env.example .env
```

Or manually create `backend/.env` with this content:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/restaurant_management

# JWT Configuration
JWT_SECRET=restaurant_secret_key

# Server Configuration
PORT=5000

# Node Environment
NODE_ENV=development
```

### 2. Clear Browser Storage
Since old tokens were created with the wrong secret, you need to clear them:

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Local Storage**, select `http://localhost:3000`
4. Delete the `token` and `user` items
5. Refresh the page

**OR** simply logout and login again.

### 3. Login Again
1. Navigate to `http://localhost:3000`
2. Use the demo credentials:
   - **Username:** `admin`
   - **Password:** `admin123`
3. The dashboard should now load without errors!

## Verification
After logging in, the dashboard should display:
- Total Tables
- Food Items
- Daily Sales
- Monthly Sales
- Order Status
- Top Selling Dishes

## Troubleshooting

### If you still see the error:
1. Make sure MongoDB is running
2. Restart the backend server
3. Clear browser cache and local storage
4. Try logging in with a fresh browser session

### Create Admin User (if needed)
If the admin user doesn't exist, you can create one by making a POST request to the signup endpoint:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@restaurant.com",
    "password": "admin123"
  }'
```

Or use the signup form in the application.

## Technical Details
- **Fixed File:** `backend/routes/auth.js` (line 75)
- **Change:** Updated JWT secret from `'your-secret-key'` to `'restaurant_secret_key'`
- **Reason:** Must match the secret used in `backend/middleware/auth.js`

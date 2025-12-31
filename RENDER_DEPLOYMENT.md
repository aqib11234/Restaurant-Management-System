# 🚀 Render.com Deployment Guide

## Quick Deploy Steps

### Option 1: Using render.yaml (Recommended)

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Add Render.com deployment config"
   git push origin master
   ```

2. **In Render.com Dashboard:**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select: `aqib11234/Restaurant-Management-System`
   - Render will automatically detect `render.yaml`
   - Click "Apply"

3. **Set Environment Variables:**
   - Go to your service → Environment
   - Add these variables:
     ```
     MONGODB_URI=mongodb+srv://RMS:rrObABdVDDmeygrz@cluster0.npqkxtv.mongodb.net/restaurant_management?retryWrites=true&w=majority&appName=Cluster0
     JWT_SECRET=restaurant_secret_key_2024_secure_token
     NODE_ENV=production
     PORT=5000
     ```

### Option 2: Manual Setup

1. **Create New Web Service:**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect GitHub repository

2. **Configure Service:**
   ```
   Name: rms-backend
   Region: Singapore (or closest to you)
   Branch: master
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Set Environment Variables:**
   Same as Option 1

---

## 📋 Render.com Configuration

### Build Settings
```
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### Environment Variables
```env
MONGODB_URI=mongodb+srv://RMS:rrObABdVDDmeygrz@cluster0.npqkxtv.mongodb.net/restaurant_management?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=restaurant_secret_key_2024_secure_token
NODE_ENV=production
PORT=5000
```

### Health Check
```
Health Check Path: /api/health
```

---

## 🔧 Troubleshooting

### Error: "Could not read package.json"

**Solution:** Set Root Directory to `backend`

In Render Dashboard:
1. Go to Settings
2. Find "Root Directory"
3. Set to: `backend`
4. Save changes

### Error: "Build failed"

**Solution:** Check build logs and ensure:
1. Root Directory is set to `backend`
2. Build Command is `npm install`
3. Start Command is `npm start`

### Error: "MongoDB connection failed"

**Solution:** 
1. Verify MONGODB_URI is set correctly
2. Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for testing)
3. Ensure database user has proper permissions

---

## ✅ Post-Deployment Checklist

- [ ] Service is deployed and running
- [ ] Environment variables are set
- [ ] Health check is passing (`/api/health`)
- [ ] Can access API endpoints
- [ ] MongoDB Atlas connection working
- [ ] Test login endpoint
- [ ] Test food items endpoint

---

## 🧪 Test Your Deployment

Once deployed, test with:

```bash
# Replace YOUR_RENDER_URL with your actual Render URL
RENDER_URL="https://rms-backend.onrender.com"

# Test health check
curl $RENDER_URL/api/health

# Test login
curl -X POST $RENDER_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@777restaurant.com","password":"admin123"}'

# Test food items (use token from login)
curl $RENDER_URL/api/food-items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Expected Response

### Health Check
```json
{
  "status": "OK",
  "message": "Restaurant Management System API is running",
  "timestamp": "2025-12-30T13:30:00.000Z"
}
```

### Login
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "admin@777restaurant.com",
    "role": "owner"
  },
  "restaurant": {
    "name": "777 Restaurant",
    "licenseType": "subscription"
  }
}
```

---

## 🌐 Frontend Deployment

### Current Deployment
- **Service Name:** Restaurant-Management-System-f
- **Type:** Static Site (Create React App)
- **Backend Service:** Restaurant-Management-System-2

### ⚠️ Important: Fix Localhost Issue

The frontend needs to be configured to use the production backend URL instead of localhost.

#### Step 1: Verify Environment Variable in Render

1. Go to Render Dashboard
2. Select **Restaurant-Management-System-f** (frontend static site)
3. Go to **Environment** tab
4. Add/Update this environment variable:
   ```
   Key: REACT_APP_API_BASE_URL
   Value: https://restaurant-management-system-2-sy9q.onrender.com/api
   ```
   ⚠️ **Note:** The variable name is `REACT_APP_API_BASE_URL` (not `REACT_APP_API_URL`)

#### Step 2: Trigger Rebuild

After updating the environment variable:
1. Go to **Manual Deploy** section
2. Click **Deploy latest commit** or **Clear build cache & deploy**
3. Wait for the build to complete (~2-5 minutes)

#### Step 3: Verify Fix

1. Open your deployed frontend URL
2. Open browser DevTools (F12) → Network tab
3. Try to login/signup
4. Verify API calls go to `https://restaurant-management-system-2-sy9q.onrender.com/api/...`
5. Should NOT see calls to `localhost:5000`

### Initial Frontend Deployment (If Not Yet Deployed)

1. **Create Static Site:**
   - New + → Static Site
   - Connect repository: `aqib11234/Restaurant-Management-System`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

2. **Environment Variables:**
   ```
   REACT_APP_API_BASE_URL=https://restaurant-management-system-2-sy9q.onrender.com/api
   ```

---

## 💡 Important Notes

1. **Free Tier Limitations:**
   - Service spins down after 15 minutes of inactivity
   - First request after spin-down takes 30-60 seconds
   - 750 hours/month free

2. **MongoDB Atlas:**
   - Already configured and working
   - No changes needed
   - Data persists across deployments

3. **Environment Variables:**
   - Never commit `.env` to GitHub
   - Always set in Render Dashboard
   - Use Render's secret management

---

## 🔒 Security Recommendations

1. **Change JWT_SECRET** to a strong random string
2. **Whitelist specific IPs** in MongoDB Atlas (not 0.0.0.0/0)
3. **Enable HTTPS** (automatic on Render)
4. **Use Render Secrets** for sensitive data
5. **Rotate credentials** regularly

---

## 📚 Resources

- **Render Docs:** https://render.com/docs
- **Node.js on Render:** https://render.com/docs/deploy-node-express-app
- **Environment Variables:** https://render.com/docs/environment-variables
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/

---

**Your RMS is ready to deploy on Render.com! 🚀**

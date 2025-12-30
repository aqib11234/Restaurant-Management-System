# 🚀 MongoDB Atlas Migration Guide

## ✅ Step-by-Step Setup

### Step 1: Create .env File

1. Navigate to `backend` directory
2. Create a new file named `.env` (without .example)
3. Copy the following content:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://RMS:rrObABdVDDmeygrz@cluster0.npqkxtv.mongodb.net/restaurant_management?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret
JWT_SECRET=restaurant_secret_key_2024_secure_token

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Step 2: Test Atlas Connection

Run the test script to verify connection:

```bash
cd backend
node testAtlasConnection.js
```

**Expected Output:**
```
✅ Successfully connected to MongoDB Atlas!
📊 Connection Details:
   Database: restaurant_management
   Host: cluster0.npqkxtv.mongodb.net
```

### Step 3: Seed Database (If Empty)

If the database is empty, run the seed script:

```bash
node seed777Menu.js
```

This will populate:
- ✅ 777 Restaurant
- ✅ 119 Menu Items
- ✅ Sample Orders
- ✅ Sales History

### Step 4: Start Server

```bash
npm run dev
```

**Expected Output:**
```
✅ MongoDB Connected Successfully
📍 Database: restaurant_management
🌐 Host: cluster0.npqkxtv.mongodb.net
🚀 Server running on http://localhost:5000
```

---

## 🔧 Troubleshooting

### Error: "Authentication failed"

**Solution:**
1. Check username and password in connection string
2. Verify database user exists in Atlas
3. Ensure password doesn't have special characters (or URL-encode them)

### Error: "IP not whitelisted"

**Solution:**
1. Go to MongoDB Atlas Dashboard
2. Network Access → Add IP Address
3. For testing: Add `0.0.0.0/0` (allows all IPs)
4. For production: Add your specific IP

### Error: "ENOTFOUND"

**Solution:**
1. Check internet connection
2. Verify cluster URL is correct
3. Check firewall settings

---

## 📊 Verify Migration

### Check Data in Atlas

1. Go to MongoDB Atlas Dashboard
2. Click "Browse Collections"
3. Select `restaurant_management` database
4. Verify collections exist:
   - restaurants
   - users
   - fooditems
   - orders
   - saleshistories
   - monthlysales

### Test API Endpoints

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@777restaurant.com","password":"admin123"}'

# Get Food Items
curl http://localhost:5000/api/food-items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Use environment variables for credentials
- Keep .env file in .gitignore
- Use strong passwords
- Whitelist specific IPs in production
- Rotate credentials regularly

### ❌ DON'T:
- Hardcode credentials in code
- Commit .env file to git
- Use weak passwords
- Allow all IPs (0.0.0.0/0) in production
- Share credentials publicly

---

## 📝 Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secure_random_string` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |

---

## 🎯 Connection String Format

```
mongodb+srv://<username>:<password>@<cluster-url>/<database>?<options>
```

**Your Connection String:**
```
mongodb+srv://RMS:rrObABdVDDmeygrz@cluster0.npqkxtv.mongodb.net/restaurant_management?retryWrites=true&w=majority&appName=Cluster0
```

**Breakdown:**
- **Username:** RMS
- **Password:** rrObABdVDDmeygrz
- **Cluster:** cluster0.npqkxtv.mongodb.net
- **Database:** restaurant_management
- **Options:** retryWrites=true&w=majority&appName=Cluster0

---

## ✅ Migration Checklist

- [ ] Create .env file with Atlas credentials
- [ ] Test connection with `node testAtlasConnection.js`
- [ ] Seed database if empty
- [ ] Start server and verify connection
- [ ] Test API endpoints
- [ ] Verify data in Atlas dashboard
- [ ] Update frontend if needed
- [ ] Test complete application flow

---

## 🚀 Next Steps

1. **Test Locally:** Verify everything works with Atlas
2. **Monitor Performance:** Check Atlas metrics dashboard
3. **Backup Data:** Use Atlas backup features
4. **Scale:** Upgrade to paid tier when needed

---

## 📞 Support

- **MongoDB Atlas Docs:** https://www.mongodb.com/docs/atlas/
- **Connection Issues:** https://www.mongodb.com/docs/atlas/troubleshoot-connection/
- **Security:** https://www.mongodb.com/docs/atlas/security/

---

**✅ Your RMS is now ready to use MongoDB Atlas!**

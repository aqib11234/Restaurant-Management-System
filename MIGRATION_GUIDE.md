# Quick Migration Guide

## 🚀 Run This After Code Deployment

### Via Render Shell (Recommended)

1. **Open Render Dashboard**
   - Go to: https://dashboard.render.com/
   - Select service: `Restaurant-Management-System-2`

2. **Open Shell**
   - Click "Shell" tab in the left sidebar
   - Wait for shell to connect

3. **Run Migration**
   ```bash
   node fixRestaurantIdMigration.js
   ```

4. **Verify Output**
   You should see:
   ```
   ✅ Connected to MongoDB
   📊 Found 1 restaurant(s)
   🏪 Using restaurant: [Your Restaurant Name]
   📅 Fixing MonthlySales records...
   ✅ Updated X MonthlySales records
   📊 Fixing SalesHistory records...
   ✅ Updated X SalesHistory records
   ✅ Migration completed successfully!
   ```

### Alternative: Via Local Connection to Production DB

If you have the MongoDB connection string:

```bash
# Set environment variable
$env:MONGODB_URI="your-mongodb-atlas-connection-string"

# Run migration
node backend/fixRestaurantIdMigration.js
```

## ✅ Verification Steps

After migration:

1. **Check Dashboard**
   - Daily Sales should show today's value
   - Monthly Sales should show current month
   - Completed Orders should show total count
   - Top Selling Dishes should be populated

2. **Check Sales History**
   - Should show all dates including 2025-12-30 and later
   - Click on any date to expand and see orders

3. **Create Test Order**
   - Create a new order
   - Mark it as completed
   - Verify it appears immediately in dashboard and sales history

## 🆘 Troubleshooting

### Migration shows "0 records updated"
- This is actually good! It means data was already correct
- Or no sales data exists yet

### "Connection failed" error
- Check if MongoDB is accessible
- Verify MONGODB_URI environment variable is set
- Check Render service logs

### Dashboard still shows zero
- Wait 1-2 minutes for cache to clear
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify backend logs on Render

## 📞 Need Help?

Check these files:
- `SALES_DATA_FIX.md` - Full technical documentation
- Render logs - For runtime errors
- Browser console - For frontend errors

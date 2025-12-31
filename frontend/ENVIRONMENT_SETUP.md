# Frontend Environment Configuration

## Environment Variables

The frontend uses environment variables to configure the API endpoint. This allows the same code to work in both local development and production environments.

### Required Environment Variable

- `REACT_APP_API_BASE_URL`: The base URL for the backend API

### Setup Instructions

#### For Local Development

1. Create a `.env` file in the `frontend` directory:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `.env` and set:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:5000/api
   ```

3. Restart your development server if it's already running

#### For Production (Render Static Site)

When deploying the frontend to Render as a Static Site:

1. Go to your Render Dashboard
2. Select your frontend static site: `Restaurant-Management-System-f`
3. Go to **Environment** section
4. Add the following environment variable:
   ```
   Key: REACT_APP_API_BASE_URL
   Value: https://restaurant-management-system-2-sy9q.onrender.com/api
   ```
5. Save changes
6. Trigger a manual deploy or push changes to trigger automatic deployment

### Important Notes

- **DO NOT commit `.env` files** to Git (they are already in `.gitignore`)
- The `.env.example` file is a template and can be committed
- Environment variables in Create React App **must** start with `REACT_APP_`
- Changes to environment variables require a rebuild of the application
- In production, Render will inject the environment variables during the build process

### Verification

After setting up the environment variable, you can verify it's working by:

1. Opening the browser console
2. Checking network requests - they should go to the correct API URL
3. Testing login/signup functionality

### Troubleshooting

**Problem:** Frontend still calling localhost after deployment

**Solution:** 
1. Verify the environment variable is set in Render Dashboard
2. Trigger a manual deploy to rebuild with new environment variables
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

**Problem:** CORS errors

**Solution:**
- Ensure backend has CORS enabled (already configured in `backend/server.js`)
- Verify the backend URL is correct and accessible
- Check that the backend service is running on Render

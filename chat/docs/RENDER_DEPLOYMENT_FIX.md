# Render Deployment Fix Guide

## Issue Summary
We've addressed a 405 Method Not Allowed error that was occurring during user registration in the production environment. The primary causes were:

1. Incorrect environment detection in the frontend code
2. The frontend was making API calls to itself instead of to the backend service
3. Inconsistent CORS configuration in the backend

## Files Updated

### Frontend Changes
1. `chat/src/components/common/AuthContext.jsx`
   - Changed environment detection from hostname-based to using `process.env.NODE_ENV`
   - Updated API URL construction to use environment variables in all environments

2. `chat/src/hooks/useSocketConnection.js`
   - Applied the same environment detection method for consistency

### Environment Configuration
1. `server/.env.update` - Contains the updated environment variables for the backend:
   ```
   CLIENT_ORIGIN=https://chat-app-frontend-hgqg.onrender.com
   NODE_ENV=production
   ```

2. `chat/.env.update` - Contains the updated environment variables for the frontend:
   ```
   REACT_APP_API_URL=https://chat-app-backend.onrender.com
   REACT_APP_SOCKET_URL=https://chat-app-backend.onrender.com
   REACT_APP_ENV=production
   ```

## Deployment Steps

### Frontend Service (chat-app-frontend)
1. In the Render dashboard, go to your frontend service
2. Navigate to the Environment tab
3. Add/update these environment variables:
   - `REACT_APP_API_URL`: `https://chat-app-backend-clc5.onrender.com`
   - `REACT_APP_SOCKET_URL`: `https://chat-app-backend-clc5.onrender.com`
   - `REACT_APP_ENV`: `production`
4. Save changes and trigger a new deployment

### Backend Service (chat-app-backend)
1. In the Render dashboard, go to your backend service
2. Navigate to the Environment tab
3. Add/update this environment variable:
   - `CLIENT_ORIGIN`: `https://chat-app-frontend-hgqg.onrender.com`
   - `NODE_ENV`: `production` (verify this is set)
4. Save changes and trigger a new deployment

## Important Notes
1. React environment variables are embedded during the build process, so you must redeploy the frontend after changing them
2. The backend needs the correct CLIENT_ORIGIN to accept CORS requests from the frontend
3. Both services need to be redeployed for the changes to take effect
4. If you use custom domains in the future, update these settings accordingly

## Testing After Deployment
1. After both services are redeployed, try registering a new user
2. Check the browser console for any CORS or API errors
3. Monitor the Render logs for both frontend and backend services to ensure proper communication

## Rollback Plan
If issues persist, you can revert to the previous environment configuration and code changes. The core changes were in:
- `AuthContext.jsx`
- `useSocketConnection.js`
- Environment variables in Render

# API Configuration Fix

## Issue Resolved

This document outlines the fix for the `405 Method Not Allowed` error that was occurring during user registration in the production environment. The error occurred because the frontend was attempting to make API calls to itself rather than to the backend service.

Error seen in the console:
```
POST https://chat-app-frontend-hgqg.onrender.com/api/users/register 405 (Method Not Allowed)
```

## Changes Made

The fix involved updating how the application detects whether it's running in a production environment and how it determines the API URLs to use. We made the following changes:

1. In `AuthContext.jsx`:
   - Changed the production environment detection from hostname-based to using `process.env.NODE_ENV`
   - Updated the API URL construction to prioritize the environment variable (`REACT_APP_API_URL`) in all environments

2. In `useSocketConnection.js`:
   - Applied the same production environment detection method for consistency

## How to Configure

To ensure the application works correctly in production, you need to set the appropriate environment variables in your Render.com dashboard:

1. Log into your Render dashboard
2. Navigate to your frontend service (chat-app-frontend-hgqg)
3. Go to the "Environment" tab
4. Add/update the following environment variables:

```
REACT_APP_API_URL=https://your-backend-service-name.onrender.com
REACT_APP_SOCKET_URL=https://your-backend-service-name.onrender.com
```

Replace `your-backend-service-name` with the actual subdomain of your backend service on Render.

## Important Notes

1. These environment variables are embedded during the build process, so after changing them, you'll need to trigger a new deployment for the changes to take effect.

2. The frontend and backend are deployed as separate services on Render, so you must explicitly configure the frontend to communicate with the backend using its full URL.

3. In local development, the application will continue to use `http://localhost:4500` as the default if no environment variables are set.

4. If your backend is configured to use HTTPS in production (which is the Render default), make sure your environment variables include `https://` as shown above.

# Comprehensive Guide to Checking, Debugging and Testing render.yaml

This guide provides a detailed approach to validate, debug, and test your `render.yaml` configuration for Render deployments.

## 1. Install and Use Render CLI

The Render CLI provides tools to validate and test your configuration locally.

```bash
# Install Render CLI
npm install -g @renderinc/cli

# Validate your render.yaml
render validate

# Preview deployment (simulates deployment without actually deploying)
render preview
```

## 2. Manual Validation Checklist

### Service Configuration Checks

- [ ] Service names are unique and descriptive
- [ ] Correct service types are used (`web`, `cron`, etc.)
- [ ] Docker paths are correct:
  - [ ] `dockerfilePath` points to valid Dockerfile
  - [ ] `dockerContext` points to correct directory
- [ ] Environment variables are properly defined
- [ ] Service-to-service references use correct syntax

```bash
# Check Dockerfile paths
ls -la ./server/Dockerfile
ls -la ./chat/Dockerfile

# Verify Docker contexts contain necessary files
ls -la ./server
ls -la ./chat
```

### Environment Variable Checks

- [ ] Required environment variables are defined
- [ ] Sensitive values use `sync: false`
- [ ] Service-to-service references are correctly formatted:

```yaml
fromService:
  name: service-name
  type: service-type
  property: property-name
```

### Health Check Validation

```bash
# Test backend health check endpoint
curl http://localhost:4500/

# Test frontend health check
curl http://localhost:3000/
```

## 3. Docker Testing

Test your Docker configurations locally before deploying:

```bash
# Test backend Dockerfile
cd server
docker build -t chat-app-backend . --target production
docker run -p 4500:4500 -e NODE_ENV=production -e PORT=4500 -e JWT_SECRET=test -e MONGO_URI=your_test_mongo_uri chat-app-backend

# Test frontend Dockerfile
cd ../chat
docker build -t chat-app-frontend . --target production
docker run -p 80:80 chat-app-frontend
```

## 4. Common Issues and Solutions

### Build Context Issues

If your builds fail with missing files:

```
ERROR: unable to prepare context: unable to evaluate symlinks in Dockerfile path: 
lstat /var/lib/docker/tmp/.../Dockerfile: no such file or directory
```

- Ensure `dockerfilePath` is relative to the repository root
- Verify `dockerContext` contains all files needed for the build

### Environment Variable Issues

If services can't connect to each other:

1. Check service-to-service references in render.yaml
2. Verify environment variables are being passed correctly
3. Test with hardcoded values temporarily

```yaml
# Example fix for service reference:
- key: REACT_APP_API_URL
  fromService:
    name: chat-app-backend
    type: web
    property: url
```

### Health Check Failures

If services fail health checks:

1. Ensure the health check endpoint exists and returns 200
2. For backend: Add a simple health route:

```javascript
app.get('/', (req, res) => {
  res.status(200).send('Service is healthy');
});
```

3. For frontend: Ensure nginx is properly configured

## 5. Deployment Testing Script

Create a test script to verify your deployment:

```bash
#!/bin/bash
# render-test.sh

BACKEND_URL=$1
FRONTEND_URL=$2

echo "Testing backend health..."
curl -s $BACKEND_URL/ | grep -q "healthy" && echo "✅ Backend health check passed" || echo "❌ Backend health check failed"

echo "Testing frontend..."
curl -s $FRONTEND_URL | grep -q "<title>" && echo "✅ Frontend loading" || echo "❌ Frontend loading failed"

echo "Testing API endpoints..."
curl -s $BACKEND_URL/api/health && echo "✅ API responding" || echo "❌ API test failed"

# Add more specific tests for your application...
```

Usage:
```bash
chmod +x render-test.sh
./render-test.sh https://chat-app-backend.onrender.com https://chat-app-frontend.onrender.com
```

## 6. Render Dashboard Verification

After deployment:

1. Check service logs for errors
2. Verify environment variables are set correctly
3. Test service URLs directly
4. Monitor resource usage
5. Check deploy hooks and webhooks if configured

## 7. Advanced Testing

### Service Connection Testing

```javascript
// Test script to verify backend-frontend connectivity
const fetch = require('node-fetch');

async function testConnection() {
  try {
    const res = await fetch(process.env.REACT_APP_API_URL + '/api/health');
    console.log('Connection test:', res.status === 200 ? 'PASSED' : 'FAILED');
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  } catch (err) {
    console.error('Connection test FAILED:', err.message);
  }
}

testConnection();
```

### Database Connection Testing

```javascript
// Test MongoDB connection
const mongoose = require('mongoose');

async function testDbConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connection: PASSED');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Database connection: FAILED', err.message);
  }
}

testDbConnection();
```

## Next Steps

1. Set up continuous integration tests that validate render.yaml
2. Create automated deployment tests
3. Implement monitoring for your deployed services

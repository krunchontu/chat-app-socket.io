# Render.yaml Testing Toolkit

This toolkit provides comprehensive tools for validating, testing, and debugging your render.yaml configuration and Render deployments.

## Quick Start

1. Run the validation script:
   ```bash
   chmod +x validate-render-deployment.sh
   ./validate-render-deployment.sh
   ```

2. For a deployed application, test it with:
   ```bash
   ./validate-render-deployment.sh --backend-url=https://your-backend.onrender.com --frontend-url=https://your-frontend.onrender.com
   ```

## Files Included

### Documentation

- **render-testing-guide.md**: Comprehensive guide to checking, debugging, and testing render.yaml
- **render-yaml-analysis.md**: Detailed analysis of your specific render.yaml configuration
- **RENDER-TESTING-README.md**: This file - overview of all tools

### Scripts

- **validate-render-config.js**: Node.js script to validate render.yaml structure
- **test-socket-connection.js**: Script to test WebSocket connections
- **test-render-deployment.js**: Script to test deployed Render applications
- **validate-render-deployment.sh**: Main script that orchestrates the validation process

### Configuration

- **render-recommended.yaml**: Improved version of render.yaml with best practices

## Installation

1. Clone the repository or copy the files to your project:
   ```bash
   git clone https://github.com/yourusername/render-testing-toolkit.git
   cd render-testing-toolkit
   ```

2. Make the shell script executable:
   ```bash
   chmod +x validate-render-deployment.sh
   ```

3. Install required Node.js packages:
   ```bash
   npm install ws
   ```

## Tool Usage

### validate-render-config.js

Validates the structure of your render.yaml file:

```bash
node validate-render-config.js [path-to-render.yaml]
```

Features:
- Validates file existence and format
- Checks service configuration correctness
- Verifies Docker contexts and paths 
- Validates environment variable definitions
- Checks service-to-service references

### test-socket-connection.js

Tests WebSocket connections to your backend service:

```bash
node test-socket-connection.js [socket-url]
```

Example:
```bash
node test-socket-connection.js wss://chat-app-backend.onrender.com
```

Features:
- Tests connection establishment
- Sends/receives test messages
- Provides detailed connection information
- Auto-detects WebSocket libraries

### test-render-deployment.js

Tests a deployed Render application:

```bash
node test-render-deployment.js --backend-url=URL --frontend-url=URL [--verbose=true] [--timeout=5000]
```

Features:
- Tests backend health
- Verifies frontend availability
- Checks API endpoints
- Tests WebSocket connections
- Verifies environment variables

### validate-render-deployment.sh

Main script that orchestrates the entire validation process:

```bash
./validate-render-deployment.sh [options]
```

Options:
- `--backend-url=URL`: URL of the deployed backend service
- `--frontend-url=URL`: URL of the deployed frontend service
- `--verbose`: Enable verbose output
- `-h, --help`: Show help message

Features:
- Validates render.yaml configuration
- Checks Docker contexts and builds
- Tests deployed services
- Tests WebSocket connections
- Provides a summary of all tests

## Common Issues and Solutions

### Docker Build Failures

If Docker builds fail, check:
- Docker is installed and running
- Dockerfile paths are correct
- All required files are in the Docker context

### WebSocket Connection Issues

If WebSocket tests fail:
- Verify the backend URL is correct
- Ensure WebSocket support is enabled on the server
- Check if the server is behind a proxy that might block WebSockets

### Environment Variable Problems

If environment variable tests fail:
- Verify all required variables are set in the Render dashboard
- Check for typos in variable names
- Ensure service-to-service references are correct

## Best Practices

1. **Use Docker Multi-Stage Builds**:
   The provided Dockerfiles use multi-stage builds to optimize for both development and production.

2. **Define Resource Limits**:
   Use the resource limits in render-recommended.yaml to prevent unexpected costs.

3. **Implement Health Checks**:
   Define health check paths for all services to ensure Render can monitor them properly.

4. **Secure Sensitive Variables**:
   Always use `sync: false` for sensitive environment variables.

5. **Test Locally Before Deployment**:
   Use the validation scripts to test your configuration before deploying to Render.

## Next Steps

1. Set up continuous integration tests that validate render.yaml
2. Create automated deployment tests
3. Implement monitoring for your deployed services

## Contributing

Feel free to contribute to this toolkit by submitting issues or pull requests.

## License

MIT License

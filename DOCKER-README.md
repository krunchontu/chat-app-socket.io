# Docker Setup for Chat App

This repository contains Docker configurations for both development and production environments for the chat application.

## Project Structure

- `chat/` - Frontend React application
- `server/` - Backend Node.js API
- `docker-compose.yml` - Development environment configuration
- `docker-compose.prod.yml` - Production environment configuration
- `docker-utils.sh` - Bash script for Docker operations (Unix/Linux/macOS)
- `docker-utils.ps1` - PowerShell script for Docker operations (Windows)

## Development Environment

The development environment is optimized for active development with features like:
- Hot reloading for both frontend and backend
- Volume mounts for real-time code changes
- Environment variables suitable for development

### Starting Development Environment

```bash
# Start all services
docker-compose up

# Start a specific service
docker-compose up frontend
docker-compose up backend

# Build and start (use after Dockerfile changes)
docker-compose up --build
```

### Stopping Development Environment

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (useful for clean restart)
docker-compose down -v
```

## Production Environment

The production environment is optimized for performance and stability:
- Minimal container sizes
- No development dependencies
- Nginx serving static frontend files
- Optimized build processes

### Starting Production Environment

```bash
# Start all production services
docker-compose -f docker-compose.prod.yml up -d

# Build and start (recommended for production)
docker-compose -f docker-compose.prod.yml up -d --build
```

### Stopping Production Environment

```bash
# Stop all production services
docker-compose -f docker-compose.prod.yml down
```

## Docker Utility Scripts

For convenience, this project includes utility scripts that provide a simpler interface for common Docker operations.

### For Unix/Linux/macOS users (docker-utils.sh)

Make the script executable:
```bash
# On Unix/Linux/macOS
chmod +x docker-utils.sh
```

Usage examples:
```bash
# Start development environment
./docker-utils.sh dev-up

# Start production environment
./docker-utils.sh prod-up

# View logs for backend
./docker-utils.sh logs-backend

# See all available commands
./docker-utils.sh help
```

### For Windows users (docker-utils.ps1)

Usage examples:
```powershell
# Start development environment
.\docker-utils.ps1 dev-up

# Start production environment
.\docker-utils.ps1 prod-up

# View logs for frontend
.\docker-utils.ps1 logs-frontend

# See all available commands
.\docker-utils.ps1 help
```

## Environment Variables

This project uses environment variables for configuration. See `.env.example` files in both the `chat/` and `server/` directories.

For production, make sure to set all required environment variables before deployment:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT authentication
- `API_URL` - Backend API URL for frontend
- `SOCKET_URL` - WebSocket URL for frontend
- `NEW_RELIC_LICENSE_KEY` - New Relic monitoring (optional)
- `LOGDNA_KEY` - LogDNA logging (optional)

## Docker Optimization

The Dockerfiles are optimized for multi-stage builds to keep image sizes small while providing development conveniences:

1. **Frontend (chat/Dockerfile)**:
   - Development stage with hot reloading
   - Build stage that creates optimized static files
   - Production stage using Nginx to serve static files

2. **Backend (server/Dockerfile)**:
   - Development stage with all dependencies and hot reloading
   - Production stage with only production dependencies

## Troubleshooting

### Cannot Connect to Backend

Check if:
- The backend container is running: `docker-compose ps`
- Environment variables are correctly set
- Network settings in docker-compose files are correct

### Changes Not Reflecting

For development:
- Ensure volume mounts are correct
- Check container logs: `docker-compose logs frontend` or `docker-compose logs backend`
- Restart the service: `docker-compose restart frontend` or `docker-compose restart backend`

### Production Issues

- Check container logs: `docker-compose -f docker-compose.prod.yml logs`
- Verify environment variables are set correctly
- Ensure MongoDB is accessible from the container

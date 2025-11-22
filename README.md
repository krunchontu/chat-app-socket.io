# Chat App with Socket.IO

A full-stack real-time chat application built with Node.js, Express, Socket.IO, React, and MongoDB.

## 🚀 Features

### Core Functionality
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: JWT-based authentication with secure password requirements
- **Message Management**: Edit, delete, and react to messages
- **User Presence**: Real-time online/offline status tracking
- **Message History**: Persistent message storage with MongoDB
- **Message Search**: Full-text search across message history
- **Threaded Conversations**: Reply to specific messages

### Security & Protection
- **Account Lockout**: Automatic lockout after 5 failed login attempts (15-minute lock)
- **Strong Password Requirements**: 8+ characters, uppercase, lowercase, number, special character
- **Token Blacklisting**: Proper logout with JWT token invalidation
- **Rate Limiting**: API (100 req/15min) and Socket.IO (30-60 events/min) protection
- **Input Sanitization**: XSS and NoSQL injection protection
- **CORS Protection**: Strict whitelist-based CORS policy
- **Production Security**: Debug logging disabled, mock DB blocked in production

### Monitoring & Operations
- **Health Endpoints**: `/health`, `/health/readiness`, `/health/liveness`
- **API Documentation**: Interactive Swagger UI at `/api-docs`
- **Structured Logging**: Context-rich logging with LogDNA integration
- **APM Monitoring**: New Relic application performance monitoring

## 📚 API Documentation

Once the server is running, access the interactive API documentation at:

**Local Development**: http://localhost:5000/api-docs
**Production**: https://your-domain.com/api-docs

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Authentication testing interface
- Example requests and responses

## Project Structure

- `/server` - Backend API and Socket.IO server built with Node.js and Express
- `/chat` - Frontend React application
- `/docs` - Project documentation and planning

## Containerization & Deployment

This project is fully containerized and set up with CI/CD for automated deployment.

### Docker Configuration

The application is containerized using Docker:

- **Backend**: Node.js container with monitoring and logging capabilities
- **Frontend**: Multi-stage build with Node.js for building and Nginx for serving the static files
- **Development**: Docker Compose for local development with MongoDB included

### CI/CD Pipeline

A complete CI/CD pipeline is configured using GitHub Actions with branch-specific behavior:

1. **Testing**: Runs on all branches (main, develop, release)
   - Executes unit tests for both frontend and backend
   - Ensures code quality and prevents regressions

2. **Build**: Runs on develop and release branches
   - Creates and pushes Docker images to GitHub Container Registry
   - Tags images with appropriate metadata for deployment

3. **Deploy**: Runs only on the release branch
   - Automatically deploys to Render when changes are pushed
   - Performs health checks to verify deployment success

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our branch strategy and workflow.

### Deployment

The application is deployed to Render with the following components:

- **Backend Service**: Containerized Node.js application
- **Frontend Service**: Containerized Nginx serving React static files
- **Database**: MongoDB Atlas (external database service)

## Monitoring & Logging

The application includes comprehensive monitoring and logging:

- **APM**: New Relic for application performance monitoring
- **Logging**: LogDNA for centralized log management
- **Health Checks**: Docker health checks for container monitoring

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js (v18+)
- MongoDB (optional if using Docker)

### Running with Docker

```bash
# Start all services
docker-compose up

# Backend API will be available at http://localhost:4500
# Frontend will be available at http://localhost:3000
```

You can also use the provided test script to check your Docker setup:

**On Unix/Linux/Mac:**
```bash
# Make the script executable
chmod +x test-docker-setup.sh
# Run the setup test
./test-docker-setup.sh
```

**On Windows:**
```powershell
# Run the setup test
powershell -ExecutionPolicy Bypass -File .\test-docker-setup.ps1
```

### Running Without Docker

#### Backend

```bash
cd server
npm install
cp .env.example .env  # Configure your environment variables
npm start
```

#### Frontend

```bash
cd chat
npm install
npm start
```

## Environment Variables

### Backend

See `.env.example` in the server directory for required environment variables.

### Frontend

See `.env.example` in the chat directory for required environment variables.

## Render Deployment

This project includes a `render.yaml` file for easy deployment to Render. To deploy:

1. Fork/clone this repository
2. Sign up for a Render account
3. Connect your GitHub repository to Render
4. Configure the required environment variables
5. Deploy the services

## GitHub Actions Secrets

For the CI/CD pipeline to work, you need to configure these GitHub secrets:

- `RENDER_API_KEY`: API key for Render
- `RENDER_BACKEND_SERVICE_ID`: ID of your Render backend service
- `RENDER_FRONTEND_SERVICE_ID`: ID of your Render frontend service
- `BACKEND_URL`: URL of your deployed backend application
- `NEW_RELIC_LICENSE_KEY`: Your New Relic license key
- `LOGDNA_KEY`: Your LogDNA ingestion key

## Monitoring Setup

### New Relic

1. Sign up for a New Relic account
2. Obtain your license key
3. Add it to your environment variables and GitHub secrets

### LogDNA

1. Sign up for a LogDNA account
2. Obtain your ingestion key
3. Add it to your environment variables and GitHub secrets

## MongoDB Atlas Setup

Since this project uses MongoDB Atlas instead of a local MongoDB instance:

1. **Create a MongoDB Atlas account**: Sign up at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a new cluster**: Follow the Atlas UI to create a free tier cluster

3. **Set up database access**:
   - Create a database user with appropriate permissions
   - Set up network access (IP allow list or allow access from anywhere for development)

4. **Get your connection string**:
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string

5. **Add to environment variables**:
   - Add the connection string to your `.env` file as `MONGO_URI`
   - Make sure to replace `<username>`, `<password>`, and `<dbname>` in the connection string

6. **For production**:
   - Add the connection string to your Render environment variables
   - Add as a GitHub secret named `MONGO_URI` for CI/CD

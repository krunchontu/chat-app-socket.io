# Backend Dockerfile - Optimized for both development and production

# Base stage for shared configuration
FROM node:18-alpine as base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base as development
# Install all dependencies including devDependencies
RUN npm install
# Copy application code
COPY . .
# Set environment variables for development
ENV NODE_ENV=development
ENV PORT=4500
ENV NEW_RELIC_NO_CONFIG_FILE=true
# Expose port
EXPOSE 4500
# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4500/ || exit 1
# Command to run application with nodemon for hot-reloading
CMD ["npm", "run", "dev"]

# Production stage
FROM base as production
# Install production dependencies only
RUN npm ci --only=production
# Copy application code
COPY . .
# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=4500
ENV NEW_RELIC_NO_CONFIG_FILE=true
# Expose port
EXPOSE 4500
# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4500/ || exit 1
# Command to run application
CMD ["npm", "run", "start:prod"]

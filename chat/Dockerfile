# Frontend Dockerfile - Optimized for both development and production

# Base development stage
FROM node:18-alpine as base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Development stage
FROM base as development
ENV NODE_ENV=development
EXPOSE 3000
# Command to start development server with hot-reloading
CMD ["npm", "start"]

# Build stage for production
FROM base as build
RUN npm run build

# Production stage
FROM nginx:alpine as production
# Copy built files from build stage to nginx
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx configuration
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
# Expose port
EXPOSE 80
# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
# Command to start nginx
CMD ["nginx", "-g", "daemon off;"]

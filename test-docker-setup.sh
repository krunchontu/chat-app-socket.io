#!/bin/bash

# Test script for Docker Compose setup with MongoDB Atlas

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit the .env file with your MongoDB Atlas connection string before proceeding."
    exit 1
fi

# Check if MongoDB URI is set
if ! grep -q "MONGO_URI=" .env; then
    echo "MONGO_URI is not set in .env file. Please set it before proceeding."
    exit 1
fi

echo "Starting Docker Compose services..."
docker-compose up -d

echo "Checking backend health..."
for i in {1..10}; do
    echo "Attempt $i..."
    if curl -s http://localhost:4500 | grep -q "Chat Server is running"; then
        echo "Backend is up and running!"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo "Backend failed to start properly. Check logs with: docker-compose logs backend"
        docker-compose down
        exit 1
    fi
    
    sleep 5
done

echo "Checking frontend availability..."
curl -s -I http://localhost:3000 | head -n 1

echo "All services are up and running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:4500"
echo ""
echo "To stop the services, run: docker-compose down"

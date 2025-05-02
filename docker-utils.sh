#!/bin/bash
# Docker utilities for chat application

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage information
show_usage() {
  echo -e "${YELLOW}Chat App Docker Utilities${NC}"
  echo
  echo "Usage: ./docker-utils.sh [command]"
  echo
  echo "Commands:"
  echo "  dev-up        Start development environment"
  echo "  dev-down      Stop development environment"
  echo "  prod-up       Start production environment"
  echo "  prod-down     Stop production environment"
  echo "  rebuild       Rebuild all containers (dev environment)"
  echo "  rebuild-prod  Rebuild all containers (prod environment)"
  echo "  logs          View logs from all containers"
  echo "  logs-frontend View logs from frontend container"
  echo "  logs-backend  View logs from backend container"
  echo "  status        Show status of all containers"
  echo "  clean         Remove all unused containers, networks, images (frees disk space)"
  echo "  help          Show this help message"
}

# Check if Docker is installed and running
check_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
  fi
  
  if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
  fi
}

# Execute commands based on the argument
case "$1" in
  dev-up)
    check_docker
    echo -e "${GREEN}Starting development environment...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Development environment started!${NC}"
    echo -e "Frontend: http://localhost:3000"
    echo -e "Backend: http://localhost:4500"
    ;;
    
  dev-down)
    check_docker
    echo -e "${YELLOW}Stopping development environment...${NC}"
    docker-compose down
    echo -e "${GREEN}Development environment stopped.${NC}"
    ;;
    
  prod-up)
    check_docker
    echo -e "${GREEN}Starting production environment...${NC}"
    docker-compose -f docker-compose.prod.yml up -d
    echo -e "${GREEN}Production environment started!${NC}"
    echo -e "Frontend: http://localhost"
    echo -e "Backend: http://localhost:4500"
    ;;
    
  prod-down)
    check_docker
    echo -e "${YELLOW}Stopping production environment...${NC}"
    docker-compose -f docker-compose.prod.yml down
    echo -e "${GREEN}Production environment stopped.${NC}"
    ;;
    
  rebuild)
    check_docker
    echo -e "${YELLOW}Rebuilding development environment...${NC}"
    docker-compose down
    docker-compose up -d --build
    echo -e "${GREEN}Development environment rebuilt and started!${NC}"
    ;;
    
  rebuild-prod)
    check_docker
    echo -e "${YELLOW}Rebuilding production environment...${NC}"
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d --build
    echo -e "${GREEN}Production environment rebuilt and started!${NC}"
    ;;
    
  logs)
    check_docker
    echo -e "${GREEN}Showing logs from all containers...${NC}"
    docker-compose logs -f
    ;;
    
  logs-frontend)
    check_docker
    echo -e "${GREEN}Showing logs from frontend container...${NC}"
    docker-compose logs -f frontend
    ;;
    
  logs-backend)
    check_docker
    echo -e "${GREEN}Showing logs from backend container...${NC}"
    docker-compose logs -f backend
    ;;
    
  status)
    check_docker
    echo -e "${GREEN}Container status:${NC}"
    docker-compose ps
    ;;
    
  clean)
    check_docker
    echo -e "${YELLOW}Cleaning unused Docker resources...${NC}"
    echo -e "This will remove all unused containers, networks, and images."
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker system prune -a
      echo -e "${GREEN}Docker system cleaned.${NC}"
    fi
    ;;
    
  help|*)
    show_usage
    ;;
esac

#!/bin/bash

# Render Deployment Validation and Testing Script
# This script will run all validation and testing tools for your Render deployment

# Color codes for terminal output
RESET="\033[0m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"
BOLD="\033[1m"

# Function to print section headers
section() {
  echo -e "\n${BOLD}${CYAN}$1${RESET}\n"
}

# Function to print success messages
success() {
  echo -e "${GREEN}✓${RESET} $1"
}

# Function to print error messages
error() {
  echo -e "${RED}✗${RESET} $1"
}

# Function to print info messages
info() {
  echo -e "${BLUE}ℹ${RESET} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  error "Node.js is required but not installed. Please install Node.js and try again."
  exit 1
fi

# Handle command line arguments
BACKEND_URL=""
FRONTEND_URL=""
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-url=*)
      BACKEND_URL="${1#*=}"
      shift
      ;;
    --frontend-url=*)
      FRONTEND_URL="${1#*=}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo -e "${BOLD}Render Deployment Validation and Testing Script${RESET}"
      echo ""
      echo "Usage: ./validate-render-deployment.sh [options]"
      echo ""
      echo "Options:"
      echo "  --backend-url=URL   URL of the deployed backend service"
      echo "  --frontend-url=URL  URL of the deployed frontend service"
      echo "  --verbose           Enable verbose output"
      echo "  -h, --help          Show this help message"
      echo ""
      echo "Example:"
      echo "  ./validate-render-deployment.sh --backend-url=https://chat-app-backend.onrender.com --frontend-url=https://chat-app-frontend.onrender.com"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      echo "Use -h or --help to see available options."
      exit 1
      ;;
  esac
done

section "RENDER DEPLOYMENT VALIDATION"
info "Starting comprehensive validation of Render configuration and deployment"

# Step 1: Check render.yaml file existence
if [ -f "render.yaml" ]; then
  success "render.yaml found"
else
  error "render.yaml not found in the current directory!"
  exit 1
fi

# Step 2: Validate render.yaml configuration
section "VALIDATING RENDER.YAML"
if [ -f "validate-render-config.js" ]; then
  info "Running render.yaml validation script..."
  node validate-render-config.js
  
  if [ $? -eq 0 ]; then
    success "render.yaml validation passed"
  else
    error "render.yaml validation failed"
    info "Please check the issues reported above and fix them before deployment"
  fi
else
  error "validate-render-config.js not found!"
  info "Please ensure the script exists in the current directory"
  exit 1
fi

# Step 3: Check Docker contexts
section "CHECKING DOCKER CONTEXTS"
info "Verifying Docker contexts from render.yaml..."

# Backend Dockerfile check
if [ -f "server/Dockerfile" ]; then
  success "Backend Dockerfile exists"
else
  error "Backend Dockerfile not found at server/Dockerfile"
fi

# Frontend Dockerfile check
if [ -f "chat/Dockerfile" ]; then
  success "Frontend Dockerfile exists"
else
  error "Frontend Dockerfile not found at chat/Dockerfile"
fi

# Step 4: Try to check Docker build (if Docker is installed)
if command -v docker &> /dev/null; then
  section "TESTING DOCKER BUILDS"
  
  # Check backend Docker build
  info "Testing backend Docker build..."
  if [ -d "server" ]; then
    echo "docker build -t chat-app-backend-test server -f server/Dockerfile --target production --no-cache"
    if [ "$VERBOSE" = true ]; then
      docker build -t chat-app-backend-test server -f server/Dockerfile --target production --no-cache
    else
      docker build -t chat-app-backend-test server -f server/Dockerfile --target production --no-cache &> /dev/null
    fi
    
    if [ $? -eq 0 ]; then
      success "Backend Docker build successful"
    else
      error "Backend Docker build failed"
    fi
  else
    error "server directory not found"
  fi
  
  # Check frontend Docker build
  info "Testing frontend Docker build..."
  if [ -d "chat" ]; then
    echo "docker build -t chat-app-frontend-test chat -f chat/Dockerfile --target production --no-cache"
    if [ "$VERBOSE" = true ]; then
      docker build -t chat-app-frontend-test chat -f chat/Dockerfile --target production --no-cache
    else
      docker build -t chat-app-frontend-test chat -f chat/Dockerfile --target production --no-cache &> /dev/null
    fi
    
    if [ $? -eq 0 ]; then
      success "Frontend Docker build successful"
    else
      error "Frontend Docker build failed"
    fi
  else
    error "chat directory not found"
  fi
else
  info "Docker not installed. Skipping Docker build tests."
fi

# Step 5: Test deployed services if URLs provided
if [ -n "$BACKEND_URL" ] && [ -n "$FRONTEND_URL" ]; then
  section "TESTING DEPLOYED SERVICES"
  info "Testing the deployed services..."
  
  # Test using test-render-deployment.js
  if [ -f "test-render-deployment.js" ]; then
    VERBOSE_FLAG=""
    if [ "$VERBOSE" = true ]; then
      VERBOSE_FLAG="--verbose=true"
    fi
    
    info "Running deployment tests..."
    node test-render-deployment.js --backend-url="$BACKEND_URL" --frontend-url="$FRONTEND_URL" $VERBOSE_FLAG
    
    if [ $? -eq 0 ]; then
      success "Deployment tests passed"
    else
      error "Deployment tests failed"
      info "Please check the issues reported above"
    fi
  else
    error "test-render-deployment.js not found!"
    info "Please ensure the script exists in the current directory"
  fi
else
  info "Backend and/or frontend URLs not provided. Skipping deployment tests."
  info "To run deployment tests, use --backend-url and --frontend-url options."
fi

# Step 6: Test socket connection if backend URL provided
if [ -n "$BACKEND_URL" ]; then
  section "TESTING WEBSOCKET CONNECTION"
  info "Testing WebSocket connection to $BACKEND_URL..."
  
  if [ -f "test-socket-connection.js" ]; then
    # Convert HTTP URL to WebSocket URL
    WS_URL=$(echo $BACKEND_URL | sed 's/^http/ws/')
    
    info "Running WebSocket connection test..."
    node test-socket-connection.js "$WS_URL"
    
    if [ $? -eq 0 ]; then
      success "WebSocket connection test passed"
    else
      error "WebSocket connection test failed"
    fi
  else
    error "test-socket-connection.js not found!"
    info "Please ensure the script exists in the current directory"
  fi
else
  info "Backend URL not provided. Skipping WebSocket connection test."
  info "To test WebSocket connection, use --backend-url option."
fi

section "VALIDATION SUMMARY"
echo "The validation process has completed."
echo ""
echo "Next steps:"
echo "1. Fix any issues reported above"
echo "2. Use the Render CLI to validate your configuration:"
echo "   npm install -g @renderinc/cli"
echo "   render validate"
echo "3. Deploy your application to Render"
echo "4. Test your deployed application using:"
echo "   ./validate-render-deployment.sh --backend-url=YOUR_BACKEND_URL --frontend-url=YOUR_FRONTEND_URL"
echo ""

success "Validation process completed"

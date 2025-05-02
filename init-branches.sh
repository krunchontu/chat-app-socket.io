#!/bin/bash

# Script to initialize the develop and release branches for the CI/CD pipeline
echo "Initializing branches for CI/CD pipeline setup..."

# Ensure we're at the root of the repository
if [ ! -f "docker-compose.yml" ] || [ ! -d "server" ] || [ ! -d "chat" ]; then
  echo "Error: This script must be run from the root of the repository."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Create and push develop branch
echo "Creating develop branch..."
git checkout -b develop || git checkout develop
echo "Develop branch created or already exists."

# Create and push release branch from develop
echo "Creating release branch from develop..."
git checkout develop
git checkout -b release || git checkout release
echo "Release branch created or already exists."

# Return to original branch
git checkout $CURRENT_BRANCH
echo "Returned to $CURRENT_BRANCH branch."

echo ""
echo "Branch setup completed!"
echo "The following branches are now available:"
echo "- main/master: Production code"
echo "- release: Release candidate code, triggers both CI and CD"
echo "- develop: Integration branch for development, triggers only CI"
echo ""
echo "See CONTRIBUTING.md for development workflow details."

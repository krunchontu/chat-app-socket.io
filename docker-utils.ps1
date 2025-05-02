# Docker utilities for chat application (Windows PowerShell version)

# Colors for terminal output
$Green = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow
$Red = [ConsoleColor]::Red

# Function to display usage information
function Show-Usage {
    Write-Host "Chat App Docker Utilities" -ForegroundColor $Yellow
    Write-Host
    Write-Host "Usage: .\docker-utils.ps1 [command]"
    Write-Host
    Write-Host "Commands:"
    Write-Host "  dev-up        Start development environment"
    Write-Host "  dev-down      Stop development environment"
    Write-Host "  prod-up       Start production environment"
    Write-Host "  prod-down     Stop production environment"
    Write-Host "  rebuild       Rebuild all containers (dev environment)"
    Write-Host "  rebuild-prod  Rebuild all containers (prod environment)"
    Write-Host "  logs          View logs from all containers"
    Write-Host "  logs-frontend View logs from frontend container"
    Write-Host "  logs-backend  View logs from backend container"
    Write-Host "  status        Show status of all containers"
    Write-Host "  clean         Remove all unused containers, networks, images (frees disk space)"
    Write-Host "  help          Show this help message"
}

# Check if Docker is installed and running
function Check-Docker {
    try {
        $null = docker --version
    }
    catch {
        Write-Host "Docker is not installed or not in PATH. Please install Docker first." -ForegroundColor $Red
        exit 1
    }
    
    try {
        $null = docker info
    }
    catch {
        Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor $Red
        exit 1
    }
}

# Main command handler
if ($args.Count -eq 0) {
    Show-Usage
    exit 0
}

$command = $args[0]

switch ($command) {
    "dev-up" {
        Check-Docker
        Write-Host "Starting development environment..." -ForegroundColor $Green
        docker-compose up -d
        Write-Host "Development environment started!" -ForegroundColor $Green
        Write-Host "Frontend: http://localhost:3000"
        Write-Host "Backend: http://localhost:4500"
    }
    
    "dev-down" {
        Check-Docker
        Write-Host "Stopping development environment..." -ForegroundColor $Yellow
        docker-compose down
        Write-Host "Development environment stopped." -ForegroundColor $Green
    }
    
    "prod-up" {
        Check-Docker
        Write-Host "Starting production environment..." -ForegroundColor $Green
        docker-compose -f docker-compose.prod.yml up -d
        Write-Host "Production environment started!" -ForegroundColor $Green
        Write-Host "Frontend: http://localhost"
        Write-Host "Backend: http://localhost:4500"
    }
    
    "prod-down" {
        Check-Docker
        Write-Host "Stopping production environment..." -ForegroundColor $Yellow
        docker-compose -f docker-compose.prod.yml down
        Write-Host "Production environment stopped." -ForegroundColor $Green
    }
    
    "rebuild" {
        Check-Docker
        Write-Host "Rebuilding development environment..." -ForegroundColor $Yellow
        docker-compose down
        docker-compose up -d --build
        Write-Host "Development environment rebuilt and started!" -ForegroundColor $Green
    }
    
    "rebuild-prod" {
        Check-Docker
        Write-Host "Rebuilding production environment..." -ForegroundColor $Yellow
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d --build
        Write-Host "Production environment rebuilt and started!" -ForegroundColor $Green
    }
    
    "logs" {
        Check-Docker
        Write-Host "Showing logs from all containers..." -ForegroundColor $Green
        docker-compose logs -f
    }
    
    "logs-frontend" {
        Check-Docker
        Write-Host "Showing logs from frontend container..." -ForegroundColor $Green
        docker-compose logs -f frontend
    }
    
    "logs-backend" {
        Check-Docker
        Write-Host "Showing logs from backend container..." -ForegroundColor $Green
        docker-compose logs -f backend
    }
    
    "status" {
        Check-Docker
        Write-Host "Container status:" -ForegroundColor $Green
        docker-compose ps
    }
    
    "clean" {
        Check-Docker
        Write-Host "Cleaning unused Docker resources..." -ForegroundColor $Yellow
        Write-Host "This will remove all unused containers, networks, and images."
        $confirmation = Read-Host "Continue? (y/n)"
        if ($confirmation -eq 'y') {
            docker system prune -a
            Write-Host "Docker system cleaned." -ForegroundColor $Green
        }
    }
    
    default {
        Show-Usage
    }
}

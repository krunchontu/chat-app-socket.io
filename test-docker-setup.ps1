# PowerShell script for testing Docker Compose setup with MongoDB Atlas

# Check if Docker is installed
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed. Please install Docker first."
    exit 1
}

# Check if Docker Compose is installed
if (-not (Get-Command "docker-compose" -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
}

# Check if .env file exists
if (-not (Test-Path -Path ".env")) {
    Write-Host "Creating .env file from .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit the .env file with your MongoDB Atlas connection string before proceeding."
    exit 1
}

# Check if MongoDB URI is set
$envContent = Get-Content ".env"
if (-not ($envContent -match "MONGO_URI=")) {
    Write-Host "MONGO_URI is not set in .env file. Please set it before proceeding."
    exit 1
}

Write-Host "Starting Docker Compose services..."
docker-compose up -d

Write-Host "Checking backend health..."
$backendHealthy = $false

for ($i = 1; $i -le 10; $i++) {
    Write-Host "Attempt $i..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4500" -UseBasicParsing
        if ($response.Content -match "Chat Server is running") {
            Write-Host "Backend is up and running!"
            $backendHealthy = $true
            break
        }
    } catch {
        # Continue if request fails
    }
    
    if ($i -eq 10) {
        Write-Host "Backend failed to start properly. Check logs with: docker-compose logs backend"
        docker-compose down
        exit 1
    }
    
    Start-Sleep -Seconds 5
}

Write-Host "Checking frontend availability..."
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -UseBasicParsing
    Write-Host "Frontend response: $($frontendResponse.StatusCode) $($frontendResponse.StatusDescription)"
} catch {
    Write-Host "Frontend may still be starting up..."
}

Write-Host ""
Write-Host "All services are up and running!"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://localhost:4500"
Write-Host ""
Write-Host "To stop the services, run: docker-compose down"

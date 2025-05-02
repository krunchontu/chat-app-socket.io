# PowerShell script to initialize the develop and release branches for the CI/CD pipeline
Write-Host "Initializing branches for CI/CD pipeline setup..." -ForegroundColor Green

# Ensure we're at the root of the repository
if (-not (Test-Path "docker-compose.yml") -or -not (Test-Path "server") -or -not (Test-Path "chat")) {
    Write-Host "Error: This script must be run from the root of the repository." -ForegroundColor Red
    exit 1
}

# Get current branch
$CurrentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $CurrentBranch" -ForegroundColor Cyan

# Create and checkout develop branch
Write-Host "Creating develop branch..." -ForegroundColor Yellow
try {
    git checkout -b develop
    Write-Host "Develop branch created." -ForegroundColor Green
} catch {
    git checkout develop
    Write-Host "Develop branch already exists, switched to it." -ForegroundColor Yellow
}

# Create and checkout release branch from develop
Write-Host "Creating release branch from develop..." -ForegroundColor Yellow
try {
    git checkout -b release
    Write-Host "Release branch created." -ForegroundColor Green
} catch {
    git checkout release
    Write-Host "Release branch already exists, switched to it." -ForegroundColor Yellow
}

# Return to original branch
git checkout $CurrentBranch
Write-Host "Returned to $CurrentBranch branch." -ForegroundColor Cyan

Write-Host ""
Write-Host "Branch setup completed!" -ForegroundColor Green
Write-Host "The following branches are now available:" -ForegroundColor Green
Write-Host "- main/master: Production code" -ForegroundColor White
Write-Host "- release: Release candidate code, triggers both CI and CD" -ForegroundColor White
Write-Host "- develop: Integration branch for development, triggers only CI" -ForegroundColor White
Write-Host ""
Write-Host "See CONTRIBUTING.md for development workflow details." -ForegroundColor Cyan

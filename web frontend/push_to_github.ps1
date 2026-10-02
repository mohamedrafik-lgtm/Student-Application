# PowerShell script to push to GitHub
Write-Host "Starting Git operations..." -ForegroundColor Green

# Initialize git if not already done
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
}

# Add all files
Write-Host "Adding all files..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Complete ERP system with ID card designer and all features"

# Set up remote
Write-Host "Setting up remote repository..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/samehrafeeq/erp_stablev0.4_frontend.git

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main --force

Write-Host "Done! Check your GitHub repository." -ForegroundColor Green

@echo off
echo Setting up Git repository...
git init
git add .
git commit -m "Initial commit with complete ERP system"

echo Setting up remote repository...
git remote add origin https://github.com/samehrafeeq/erp_stablev0.4_frontend.git

echo Pushing to GitHub...
git push -u origin main --force

echo Done!
pause

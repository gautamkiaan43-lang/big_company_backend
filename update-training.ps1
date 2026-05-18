Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "Waiting for processes to terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Pushing schema to database..." -ForegroundColor Cyan
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Schema push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Prisma generate failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Seeding training data..." -ForegroundColor Cyan
node src/seed-training.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Training seeding failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Database updated and training data seeded successfully!" -ForegroundColor Green
Write-Host "You can now start the dev server with: npm run dev" -ForegroundColor Yellow

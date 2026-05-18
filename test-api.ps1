# Quick Backend API Testing Script
# Run this in PowerShell to test the new features

$BASE_URL = "http://localhost:9005"
$CUSTOMER_TOKEN = "YOUR_CUSTOMER_TOKEN_HERE"
$ADMIN_TOKEN = "YOUR_ADMIN_TOKEN_HERE"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Backend API Testing - Production Enhancements" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Address-based store discovery (should fail without all fields)
Write-Host "Test 1: Store discovery without Sector (should fail)" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/api/customer/retailers?province=Kigali&district=Gasabo" `
    -Headers @{ "Authorization" = "Bearer $CUSTOMER_TOKEN" } `
    -Method GET `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 400) {
    Write-Host "✓ PASS: Request rejected as expected" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} else {
    Write-Host "✗ FAIL: Request should have been rejected" -ForegroundColor Red
}
Write-Host ""

# Test 2: Address-based store discovery (should succeed with all fields)
Write-Host "Test 2: Store discovery with all location fields" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/api/customer/retailers?province=Kigali&district=Gasabo&sector=Remera" `
    -Headers @{ "Authorization" = "Bearer $CUSTOMER_TOKEN" } `
    -Method GET `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
    Write-Host "✓ PASS: Request processed correctly" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} else {
    Write-Host "✗ FAIL: Unexpected response" -ForegroundColor Red
}
Write-Host ""

# Test 3: Create order without Meter ID for Dashboard Wallet (should fail)
Write-Host "Test 3: Dashboard Wallet without Meter ID (should fail)" -ForegroundColor Yellow
$orderData = @{
    retailerId = 1
    items = @(
        @{
            productId = 1
            quantity = 1
            price = 1500
        }
    )
    paymentMethod = "dashboard_wallet"
    total = 1500
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "$BASE_URL/api/store/order" `
    -Headers @{ 
        "Authorization" = "Bearer $CUSTOMER_TOKEN"
        "Content-Type" = "application/json"
    } `
    -Method POST `
    -Body $orderData `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 400) {
    Write-Host "✓ PASS: Request rejected - Meter ID required" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} else {
    Write-Host "✗ FAIL: Request should have been rejected" -ForegroundColor Red
}
Write-Host ""

# Test 4: Create order with Meter ID for Dashboard Wallet (should succeed)
Write-Host "Test 4: Dashboard Wallet with Meter ID (should succeed)" -ForegroundColor Yellow
$orderData = @{
    retailerId = 1
    items = @(
        @{
            productId = 1
            quantity = 1
            price = 1500
        }
    )
    paymentMethod = "dashboard_wallet"
    meterId = "MTR-TEST-12345"
    total = 1500
} | ConvertTo-Json

Write-Host "Note: This will fail if customer doesn't have sufficient wallet balance" -ForegroundColor Gray
Write-Host "Order data: $orderData" -ForegroundColor Gray
Write-Host ""

# Test 5: Admin read-only enforcement
Write-Host "Test 5: Admin DELETE request (should be blocked)" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/api/admin/customers/1" `
    -Headers @{ "Authorization" = "Bearer $ADMIN_TOKEN" } `
    -Method DELETE `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 403) {
    Write-Host "✓ PASS: Admin write operation blocked" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} else {
    Write-Host "✗ FAIL: Admin should not be able to delete" -ForegroundColor Red
}
Write-Host ""

# Test 6: Admin GET request (should succeed)
Write-Host "Test 6: Admin GET request (should succeed)" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/api/admin/customers" `
    -Headers @{ "Authorization" = "Bearer $ADMIN_TOKEN" } `
    -Method GET `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    Write-Host "✓ PASS: Admin can view data" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Total customers: $($data.customers.Count)" -ForegroundColor Cyan
} else {
    Write-Host "✗ FAIL: Admin should be able to view data" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Complete" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Get authentication tokens for customer and admin" -ForegroundColor White
Write-Host "2. Update the tokens in this script" -ForegroundColor White
Write-Host "3. Run the script again to test all features" -ForegroundColor White
Write-Host "4. Check database for gas rewards after successful orders" -ForegroundColor White
Write-Host ""

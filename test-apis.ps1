# API Testing Script

Write-Host "🧪 Testing Consumer Dashboard APIs..." -ForegroundColor Cyan

# Login to get token
Write-Host "`n1. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    phone = "250788100001"
    pin = "1234"
    role = "consumer"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app//store/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    $token = $loginResponse.access_token
    Write-Host "✅ Login successful! Token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test Customer Profile
Write-Host "`n2. Testing GET /store/customers/me..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/customers/me' -Method GET -Headers $headers
    Write-Host "✅ Profile: $($profile.data.full_name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Wallets
Write-Host "`n3. Testing GET /store/wallets..." -ForegroundColor Yellow
try {
    $wallets = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/wallets' -Method GET -Headers $headers
    Write-Host "✅ Wallets found: $($wallets.data.Count)" -ForegroundColor Green
    foreach ($wallet in $wallets.data) {
        Write-Host "   - $($wallet.type): $($wallet.balance) $($wallet.currency)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Gas Meters
Write-Host "`n4. Testing GET /store/gas/meters..." -ForegroundColor Yellow
try {
    $meters = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/gas/meters' -Method GET -Headers $headers
    Write-Host "✅ Gas meters found: $($meters.data.Count)" -ForegroundColor Green
    foreach ($meter in $meters.data) {
        Write-Host "   - $($meter.meter_number): $($meter.alias_name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Gas Rewards Balance
Write-Host "`n5. Testing GET /store/gas/rewards/balance..." -ForegroundColor Yellow
try {
    $rewards = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/gas/rewards/balance' -Method GET -Headers $headers
    Write-Host "✅ Gas rewards: $($rewards.data.total_units) m3 (Tier: $($rewards.data.tier))" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Gas Rewards History
Write-Host "`n6. Testing GET /store/gas/rewards/history..." -ForegroundColor Yellow
try {
    $history = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/gas/rewards/history' -Method GET -Headers $headers
    Write-Host "✅ Rewards history: $($history.data.Count) records" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Gas Rewards Leaderboard
Write-Host "`n7. Testing GET /store/gas/rewards/leaderboard..." -ForegroundColor Yellow
try {
    $leaderboard = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/gas/rewards/leaderboard?period=month' -Method GET -Headers $headers
    Write-Host "✅ Leaderboard: $($leaderboard.data.Count) entries" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Customer Orders
Write-Host "`n8. Testing GET /store/customers/me/orders..." -ForegroundColor Yellow
try {
    $orders = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/customers/me/orders' -Method GET -Headers $headers
    Write-Host "✅ Orders found: $($orders.data.Count)" -ForegroundColor Green
    foreach ($order in $orders.data) {
        Write-Host "   - $($order.order_type): $($order.amount) RWF ($($order.status))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Wallet Transactions
Write-Host "`n9. Testing GET /store/wallets/transactions..." -ForegroundColor Yellow
try {
    $transactions = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/wallets/transactions' -Method GET -Headers $headers
    Write-Host "✅ Transactions found: $($transactions.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test Gas Usage
Write-Host "`n10. Testing GET /store/gas/usage..." -ForegroundColor Yellow
try {
    $usage = Invoke-RestMethod -Uri 'https://big-company-production.up.railway.app/store/gas/usage' -Method GET -Headers $headers
    Write-Host "✅ Gas usage records: $($usage.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Cyan

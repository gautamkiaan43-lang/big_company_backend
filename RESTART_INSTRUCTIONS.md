# Backend Server Restart Instructions

## Problem
Backend dev server has not loaded the new code changes for customer creation.

## Solution

### Option 1: Manual Restart (Recommended)
1. Go to the terminal running backend `npm run dev`
2. Press `Ctrl+C` to stop the server
3. Run `npm run dev` again

### Option 2: Kill and Restart
```powershell
# In a new terminal:
cd c:\Users\asus\OneDrive\Documents\big_company\backend

# Kill all node processes (WARNING: This will stop ALL node processes)
taskkill /F /IM node.exe

# Wait 2 seconds
Start-Sleep -Seconds 2

# Restart backend
npm run dev
```

### Option 3: Find and Kill Specific Process
```powershell
# Find backend process
Get-Process -Name node | Where-Object {$_.Path -like '*backend*'}

# Kill specific PID (replace XXXX with actual PID)
Stop-Process -Id XXXX -Force

# Restart
npm run dev
```

## Verification
After restart, the console log should appear:
```
📝 Creating customer with data: { first_name: '...', last_name: '...', ... }
```

## Test
Create a new customer:
- First Name: "Rahul"
- Last Name: "Sharma"  
- Phone: "+250788111222"
- Password: "test123"

Expected result: Customer name should be "Rahul Sharma" ✅

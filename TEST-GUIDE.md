# 🧪 Call Scheduling System - Full Test Guide

## Prerequisites

Before running tests, ensure you have:

1. **Environment Variables in `.env.local`:**
   ```env
   EXTERNAL_DATABASE_URL=your_database_url
   CRON_SECRET=your_cron_secret
   NEXT_PUBLIC_SITE_URL=https://bedelulu.co
   ```

2. **Database Access:** Your database must be accessible

3. **Production URL:** Your site must be deployed and accessible

---

## 🧪 Running the Test Suite

### Option 1: Run All Tests Locally

```bash
npm run test-calls
```

This will test:
- ✅ Database connection
- ✅ Timezone calculations
- ✅ Customer querying logic
- ✅ Queue system status
- ✅ Customer scheduling data
- ✅ Cron endpoint (if URL and secret provided)

### Option 2: Test Cron Endpoint Directly

**Manual Test (using curl/PowerShell):**

```powershell
# Get your CRON_SECRET from Vercel environment variables
$cronSecret = "YOUR_CRON_SECRET_HERE"
$headers = @{
    "Authorization" = "Bearer $cronSecret"
}

Invoke-RestMethod -Uri "https://bedelulu.co/api/calls/process" -Method GET -Headers $headers
```

**Expected Response:**
```json
{
  "success": true,
  "queued": 0,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "executionTimeMs": 234
}
```

---

## 🔍 What the Tests Check

### 1. Database Connection ✅
- Verifies database is accessible
- Shows customer statistics
- Checks for scheduling data

### 2. Timezone Calculation ✅
- Tests timezone handling for different zones
- Verifies IANA timezone format support
- Checks DST handling

### 3. Get Customers Due For Calls ✅
- Queries customers who need calls
- Checks welcome call vs daily call logic
- Verifies time window (4 hours back, 20 min forward)

### 4. Queue System ✅
- Checks queue status
- Identifies stuck items
- Shows pending/processing/failed counts

### 5. Customer Scheduling Data ✅
- Verifies all customers have required data
- Identifies missing `call_time_hour` or `next_call_scheduled_at`
- Shows scheduling issues

### 6. Cron Endpoint ✅
- Tests authentication
- Verifies endpoint is accessible
- Checks response format

---

## 🚨 Common Issues & Fixes

### Issue: "EXTERNAL_DATABASE_URL not found"
**Fix:** Add to `.env.local`:
```env
EXTERNAL_DATABASE_URL=postgresql://user:pass@host:port/db
```

### Issue: "CRON_SECRET not found"
**Fix:** Get from Vercel → Settings → Environment Variables
Add to `.env.local`:
```env
CRON_SECRET=your_secret_here
```

### Issue: "Unauthorized" (401) when testing cron
**Fix:** 
1. Verify `CRON_SECRET` in Vercel matches your test
2. Make sure header format is: `Bearer YOUR_SECRET`
3. Redeploy after adding secret

### Issue: "No customers due for calls"
**This is normal if:**
- No customers have `next_call_scheduled_at` in the time window
- All customers already received calls today
- Customers are paused/disabled

---

## ✅ Verification Checklist

After running tests, verify:

- [ ] Database connection works
- [ ] At least one customer has scheduling data
- [ ] Queue system is accessible
- [ ] Cron endpoint returns 200 (not 401)
- [ ] No stuck items in queue
- [ ] All active customers have `call_time_hour` set

---

## 🔄 Testing the Full Flow

### Step 1: Check Current State
```bash
npm run test-calls
```

### Step 2: Manually Trigger Cron (if needed)
```powershell
# Test the cron endpoint
$headers = @{ "Authorization" = "Bearer YOUR_CRON_SECRET" }
Invoke-RestMethod -Uri "https://bedelulu.co/api/calls/process" -Method GET -Headers $headers
```

### Step 3: Check Queue
The test will show queue status. You can also check in admin dashboard.

### Step 4: Verify Calls Are Made
- Check Vercel function logs
- Check VAPI dashboard
- Check customer call logs in database

---

## 📊 Expected Test Results

**All Green ✅ = System Ready:**
```
✅ cronEndpoint
✅ getCustomers  
✅ timezone
✅ database
✅ queue
✅ customerScheduling
✅ scheduleNext

Results: 7/7 tests passed
🎉 All tests passed! System is ready.
```

**Some Red ❌ = Needs Attention:**
- Review specific test output
- Fix identified issues
- Re-run tests

---

## 🆘 Need Help?

If tests fail:
1. Check error messages in test output
2. Verify environment variables are set
3. Check database connectivity
4. Verify cron secret matches Vercel


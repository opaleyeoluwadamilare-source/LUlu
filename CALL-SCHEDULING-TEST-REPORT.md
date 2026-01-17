# 📋 Call Scheduling System - Full Test Report & Verification

## ✅ What I've Fixed

### 1. **Added Unique Constraint to Database Schema** ✅
- **Location:** `lib/db.ts` - Added unique index on `call_queue` table
- **Purpose:** Prevents duplicate calls by ensuring `ON CONFLICT DO NOTHING` in `enqueueCall` actually works
- **Constraint:** `unique_customer_call_active` on `(customer_id, call_type)` where status is pending/retrying/processing

### 2. **Verified Webhook Doesn't Trigger Immediate Calls** ✅
- **Location:** `app/api/webhooks/stripe/route.ts` line 239
- **Status:** Webhook correctly does NOT trigger immediate calls
- **Result:** All calls go through cron at proper scheduled times

### 3. **Created Test Scripts** ✅
- `scripts/test-call-scheduling.js` - Comprehensive test suite
- `scripts/verify-call-system.js` - Quick verification script

---

## 🧪 How to Test

### **Option 1: Quick Verification (Recommended)**

```bash
npm run verify-calls
```

**Requirements:**
- `EXTERNAL_DATABASE_URL` in `.env.local`

**What it checks:**
- ✅ Unique constraint exists
- ✅ Active customers count
- ✅ Customers due for calls
- ✅ Queue status
- ✅ System issues

### **Option 2: Full Test Suite**

```bash
npm run test-calls
```

**Requirements:**
- `EXTERNAL_DATABASE_URL` in `.env.local`
- `CRON_SECRET` in `.env.local` (optional, for endpoint test)
- `NEXT_PUBLIC_SITE_URL` in `.env.local` (optional, for endpoint test)

### **Option 3: Manual Cron Endpoint Test**

**Using PowerShell:**
```powershell
# Get CRON_SECRET from Vercel → Settings → Environment Variables
$cronSecret = "YOUR_CRON_SECRET_HERE"
$headers = @{
    "Authorization" = "Bearer $cronSecret"
}

$response = Invoke-RestMethod -Uri "https://bedelulu.co/api/calls/process" -Method GET -Headers $headers
$response | ConvertTo-Json
```

**Expected Response:**
```json
{
  "success": true,
  "queued": 0,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "executionTimeMs": 234,
  "skipped": 0
}
```

**What to check:**
- ✅ Returns `200 OK` (not `401 Unauthorized`)
- ✅ `success: true`
- ✅ Response includes execution time
- ✅ No errors in response

---

## 🔍 System Flow Verification

### **1. Payment → Scheduling Flow**

**What should happen:**
1. Customer pays via Stripe
2. Webhook receives `checkout.session.completed`
3. Customer status updated to `Paid`
4. Phone validated
5. `next_call_scheduled_at` calculated and set
6. **NO immediate call triggered** ✅
7. Cron job picks up customer at scheduled time

**Verify in database:**
```sql
SELECT id, name, payment_status, phone_validated, 
       call_time_hour, call_time_minute, timezone,
       next_call_scheduled_at, welcome_call_completed
FROM customers
WHERE payment_status = 'Paid'
ORDER BY id DESC
LIMIT 5;
```

**Check:**
- ✅ `payment_status = 'Paid'`
- ✅ `phone_validated = true`
- ✅ `call_time_hour` is NOT NULL
- ✅ `next_call_scheduled_at` is NOT NULL
- ✅ `welcome_call_completed = false` (for new customers)

### **2. Cron Job → Call Flow**

**What should happen:**
1. Cron runs every 15 minutes
2. Queries customers with `next_call_scheduled_at` in time window (4 hours back, 20 min forward)
3. Enqueues calls (unique constraint prevents duplicates)
4. Processes queue
5. Makes VAPI calls
6. Updates `welcome_call_completed` or `last_call_date`
7. Schedules next call

**Verify cron is working:**
- Check cron service dashboard (cron-job.org)
- Look for successful executions (HTTP 200)
- Check Vercel function logs for cron executions

**Verify calls are being made:**
- Check VAPI dashboard for call activity
- Check `call_logs` table in database
- Check `call_queue` table status

### **3. Post-Call → Next Call Flow**

**What should happen:**
1. Call completes (via VAPI webhook)
2. `last_call_date` updated to today
3. `next_call_scheduled_at` calculated for tomorrow
4. Next call scheduled automatically

**Verify in database:**
```sql
SELECT id, name, last_call_date, next_call_scheduled_at,
       welcome_call_completed, total_calls_made
FROM customers
WHERE payment_status = 'Paid'
  AND welcome_call_completed = true
ORDER BY last_call_date DESC
LIMIT 5;
```

**Check:**
- ✅ `last_call_date` is today's date (for customers called today)
- ✅ `next_call_scheduled_at` is set for tomorrow
- ✅ `total_calls_made` increments after each call

---

## 🛡️ Duplicate Prevention Layers

### **Layer 1: Unique Constraint** ✅
- Database-level enforcement
- Prevents duplicate queue entries
- **Status:** Added to schema

### **Layer 2: Pre-Queue Check** ✅
- `getCustomersDueForCalls` checks `last_call_date < CURRENT_DATE`
- Prevents querying customers already called today
- **Status:** Implemented

### **Layer 3: Pre-Call Check** ✅
- `processCallQueue` verifies before making call
- Double-checks `welcome_call_completed` and `last_call_date`
- **Status:** Implemented

### **Layer 4: Post-Call Verification** ✅
- Verifies flags are set after call
- Throws error if verification fails
- **Status:** Implemented

---

## 🚨 Common Issues & Solutions

### **Issue: Calls not happening**

**Check:**
1. Is cron job running? (Check cron service dashboard)
2. Are customers scheduled? (Run `npm run verify-calls`)
3. Are customers in time window? (Check `next_call_scheduled_at`)
4. Is phone validated? (Check `phone_validated = true`)

**Fix:**
- Verify cron job is enabled and running
- Check customer scheduling data
- Manually trigger via admin dashboard if needed

### **Issue: Duplicate calls**

**Check:**
1. Does unique constraint exist? (Run `npm run verify-calls`)
2. Are defensive checks working? (Check logs)

**Fix:**
- Run migration to add unique constraint if missing
- Check for stuck queue items

### **Issue: Calls at wrong time**

**Check:**
1. Is `call_time_hour` set correctly?
2. Is `timezone` in IANA format?
3. Is `next_call_scheduled_at` calculated correctly?

**Fix:**
- Verify timezone format (should be `America/New_York`, not `Eastern (ET)`)
- Check `calculateNextCallTime` function
- Manually reschedule via admin dashboard

---

## ✅ Production Readiness Checklist

- [ ] Unique constraint exists in database
- [ ] Cron job is set up and running
- [ ] `CRON_SECRET` is set in Vercel
- [ ] At least one test customer has scheduling data
- [ ] Manual cron endpoint test returns 200
- [ ] No stuck items in queue
- [ ] All active customers have `call_time_hour` set
- [ ] Webhook doesn't trigger immediate calls
- [ ] Defensive checks are working

---

## 📊 Expected Test Results

**All Green = System Ready:**
```
✅ Unique constraint: EXISTS
✅ Active customers: 5
✅ Scheduled calls: 5
✅ Customers due now: 2
✅ System health: GOOD

🎉 System looks good! Ready for production.
```

---

## 🔄 Next Steps

1. **Run verification:** `npm run verify-calls`
2. **Test cron endpoint manually** (see Option 3 above)
3. **Monitor first few calls** to ensure they work
4. **Check Vercel logs** for any errors
5. **Verify calls in VAPI dashboard**

---

## 📝 Notes

- The system uses a 4-hour lookback window to catch missed calls
- Cron processes max 10 customers per run (Vercel Hobby plan limit)
- Calls are queued first, then processed (prevents timeouts)
- Unique constraint prevents duplicates at database level
- Defensive checks prevent duplicates at application level


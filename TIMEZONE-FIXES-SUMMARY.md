# 🕐 Timezone & Call Scheduling Fixes - Complete

## ✅ Issues Fixed

### Issue 1: Timezone Format Mismatch (CRITICAL)
**Problem:** Database was storing display labels like "Eastern (ET)" instead of IANA format like "America/New_York"

**Impact:** 
- `calculateNextCallTime()` requires IANA format for `Intl.DateTimeFormat`
- Calls would be scheduled at wrong times or fail entirely

**Fix Applied:**
- `app/api/database/submit/route.ts`: Now stores IANA timezone format directly from frontend
- Display label only used for `call_time` string (user-facing)
- Database `timezone` column now stores: `"America/New_York"` (not `"Eastern (ET)"`)

---

### Issue 2: Missing call_time_hour and call_time_minute on Signup
**Problem:** These fields were NULL after signup, only set later in Stripe webhook

**Impact:**
- Cron job couldn't calculate `next_call_scheduled_at` without hour/minute
- Customers might not get scheduled properly

**Fix Applied:**
- `app/api/database/submit/route.ts`: Now parses `call_time` and stores `call_time_hour` and `call_time_minute` immediately on signup
- Uses `parseCallTime()` from `lib/call-scheduler.ts`
- Handles formats: "7:00 AM", "7am", "early", "mid-morning", "late"

---

### Issue 3: Missing next_call_scheduled_at After Payment
**Problem:** Not always calculated and set after payment confirmation

**Impact:**
- Cron job wouldn't find customers for daily calls
- `getCustomersDueForCalls()` looks for `next_call_scheduled_at BETWEEN now AND 20min`

**Fix Applied:**
- `app/api/webhooks/stripe/route.ts`: Now calculates and sets `next_call_scheduled_at` after payment
- Uses `calculateNextCallTime()` with IANA timezone format
- Handles both cases: when `call_time_hour` already exists, or needs parsing

---

## 🔄 Complete Flow (Now Fixed)

### 1. User Signs Up
```
Frontend → Sends: timezone = "America/New_York" (IANA format)
Database → Stores: timezone = "America/New_York" ✅
Database → Parses: call_time = "7:00 AM" → hour=7, minute=0 ✅
Database → Stores: call_time_hour = 7, call_time_minute = 0 ✅
```

### 2. User Pays
```
Stripe Webhook → Reads: timezone = "America/New_York" ✅
Stripe Webhook → Reads: call_time_hour = 7, call_time_minute = 0 ✅
Stripe Webhook → Calculates: next_call_scheduled_at = UTC time for 7:00 AM in America/New_York ✅
Database → Stores: next_call_scheduled_at = [UTC timestamp] ✅
```

### 3. Cron Job Runs
```
Cron → Queries: WHERE next_call_scheduled_at BETWEEN now AND 20min ✅
Cron → Finds customers due for calls ✅
Cron → Enqueues calls ✅
```

### 4. Call Queue Processes
```
Queue → Makes Vapi call ✅
Queue → On success: Calls scheduleNextCall() ✅
scheduleNextCall() → Reads: timezone = "America/New_York" ✅
scheduleNextCall() → Reads: call_time_hour = 7, call_time_minute = 0 ✅
scheduleNextCall() → Calculates: next_call_scheduled_at for tomorrow ✅
Database → Stores: next_call_scheduled_at = [UTC timestamp] ✅
```

---

## 📋 Files Modified

1. **`app/api/database/submit/route.ts`**
   - ✅ Stores IANA timezone format (not display label)
   - ✅ Parses `call_time` and stores `call_time_hour` and `call_time_minute`
   - ✅ Adds these columns to INSERT statement

2. **`app/api/webhooks/stripe/route.ts`**
   - ✅ Calculates and sets `next_call_scheduled_at` after payment
   - ✅ Uses IANA timezone format from database
   - ✅ Handles both parsed and unparsed call times

---

## ✅ Verification Checklist

- [x] Timezone stored as IANA format in database
- [x] `call_time_hour` and `call_time_minute` set on signup
- [x] `next_call_scheduled_at` calculated after payment
- [x] `scheduleNextCall()` uses IANA timezone (already correct)
- [x] `calculateNextCallTime()` receives IANA format (now fixed)
- [x] Cron job can find customers with `next_call_scheduled_at`
- [x] All timezone conversions use `Intl.DateTimeFormat` correctly

---

## 🧪 Testing Recommendations

1. **New Signup Flow:**
   - Sign up with timezone "America/Los_Angeles"
   - Verify database stores: `timezone = "America/Los_Angeles"`
   - Verify database stores: `call_time_hour = 7`, `call_time_minute = 0`

2. **Payment Flow:**
   - Complete payment
   - Verify database has: `next_call_scheduled_at` set to correct UTC time
   - Verify time matches 7:00 AM Pacific time

3. **Cron Job:**
   - Wait for scheduled time
   - Verify cron finds customer in `getCustomersDueForCalls()`
   - Verify call is made at correct time

4. **After Call:**
   - Verify `scheduleNextCall()` calculates next call correctly
   - Verify `next_call_scheduled_at` is set for tomorrow

---

## 🚨 Important Notes

- **Existing Customers:** May have display labels in `timezone` column
  - These will need migration or will fail when `calculateNextCallTime()` is called
  - Consider adding migration script to convert labels to IANA format

- **Backward Compatibility:** 
  - Code handles both formats where possible
  - But IANA format is required for `calculateNextCallTime()` to work

---

## 📝 Migration Needed?

If you have existing customers with display labels in `timezone` column, you'll need to migrate them:

```sql
-- Example migration (run manually or create migration script)
UPDATE customers 
SET timezone = CASE timezone
  WHEN 'Eastern (ET)' THEN 'America/New_York'
  WHEN 'Central (CT)' THEN 'America/Chicago'
  WHEN 'Mountain (MT)' THEN 'America/Denver'
  WHEN 'Pacific (PT)' THEN 'America/Los_Angeles'
  -- ... etc
  ELSE 'America/New_York' -- Default fallback
END
WHERE timezone NOT LIKE 'America/%' AND timezone NOT LIKE 'Europe/%' AND timezone NOT LIKE 'Asia/%' AND timezone NOT LIKE 'Pacific/%' AND timezone NOT LIKE 'Australia/%';
```


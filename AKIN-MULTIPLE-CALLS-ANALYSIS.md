# 🔍 Analysis: Why Akin Got Multiple Calls & Others Didn't

## 📊 What Happened (Based on Logs)

**Timeline:**
- **19:04:00** - Cron ran, initiated call for customer 17 (Akin)
- **19:04:05 - 19:05:30** - Webhook storm (30+ webhooks in ~90 seconds)
- **19:06:00** - Cron ran, processed 0 customers
- **19:08:00** - Cron ran, processed 0 customers

**Akin's Calls:**
1. Welcome call (first call)
2. Daily call #1 (at 19:04:00)
3. Daily call #2 (likely triggered by webhook storm)

---

## 🎯 Root Cause Analysis

### **Why Akin Got Multiple Daily Calls:**

#### **Scenario 1: Race Condition (Most Likely)**
```
1. 19:04:00 - Cron initiates daily call #1 for Akin
2. 19:04:05 - Call completes, webhook #1 arrives
3. 19:04:05 - Webhook processes, schedules next call
4. 19:04:06 - BUT last_call_date NOT YET SET (still processing)
5. 19:04:07 - Webhook #2 arrives (duplicate/retry)
6. 19:04:07 - Webhook #2 sees last_call_date is NULL
7. 19:04:07 - Webhook #2 schedules ANOTHER call (duplicate!)
8. 19:04:08 - last_call_date finally gets set
9. 19:04:09 - Daily call #2 gets queued and processed
```

**The Problem:**
- `last_call_date` is set in `call-queue.ts` AFTER the Vapi call succeeds
- But webhook handler ALSO sets `last_call_date` and schedules next call
- If multiple webhooks arrive before `last_call_date` is committed, each one thinks "no call today yet"
- Each webhook schedules another call

#### **Scenario 2: Webhook Storm Duplicate Processing**
```
1. 19:04:00 - Call initiated
2. 19:04:05 - 30+ webhooks arrive (Vapi retry storm)
3. Idempotency check might have failed if:
   - First webhook: transcript = NULL, duration = NULL (not fully processed yet)
   - Second webhook: transcript = NULL, duration = NULL (still processing)
   - Both pass idempotency check (neither has transcript + duration)
   - Both schedule next call
```

**The Problem:**
- Idempotency check requires BOTH transcript AND duration to be set
- If webhooks arrive before transcript is ready, they all pass the check
- Each schedules another call

---

## ❌ Why Other Customers Didn't Get Calls

### **Reason 1: `last_call_date` Already Set to Today**
```sql
-- Query checks:
AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)
```
If a customer was called earlier today (even if it failed), `last_call_date` might be set, blocking them.

### **Reason 2: Missing `next_call_scheduled_at`**
```sql
-- Query has fallback for NULL next_call_scheduled_at:
(next_call_scheduled_at IS NULL
 AND call_time_hour IS NOT NULL
 AND timezone IS NOT NULL
 AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
```
But this fallback might not be working correctly, or customers don't have `call_time_hour`/`timezone` set.

### **Reason 3: Time Window Mismatch**
```sql
-- Query window:
next_call_scheduled_at BETWEEN $1 AND $2
-- $1 = 4 hours ago
-- $2 = 1 hour from now
```
If a customer's `next_call_scheduled_at` is outside this window, they won't be picked up.

---

## 🔧 The Fix Needed

### **Fix 1: Set `last_call_date` IMMEDIATELY After Call Initiation**

**Current Flow (BROKEN):**
```
1. Call initiated → logCallAttempt() creates call_log
2. Call succeeds → UPDATE last_call_date (in call-queue.ts)
3. Webhook arrives → ALSO updates last_call_date
```

**Problem:** Between step 1 and 2, webhook can arrive and see `last_call_date = NULL`

**Fixed Flow:**
```
1. Call initiated → Set last_call_date = CURRENT_DATE IMMEDIATELY
2. Call succeeds → Verify last_call_date is set
3. Webhook arrives → Check last_call_date, skip if already today
```

### **Fix 2: Improve Idempotency Check**

**Current Check:**
```typescript
// Only skips if BOTH transcript AND duration exist
WHERE transcript IS NOT NULL AND duration_seconds IS NOT NULL
```

**Problem:** If webhook arrives before transcript is ready, check passes

**Fixed Check:**
```typescript
// Also check if call_log exists with this vapi_call_id
// If exists, skip even if transcript/duration not ready yet
WHERE vapi_call_id = $1
// Then check if fully processed
AND transcript IS NOT NULL AND duration_seconds IS NOT NULL
```

### **Fix 3: Add Defensive Check in Webhook Handler**

Before scheduling next call, check:
```typescript
// Check if already called today
const today = new Date().toISOString().split('T')[0]
if (last_call_date && last_call_date.toISOString().split('T')[0] === today) {
  // Already called today, skip scheduling
  return
}
```

---

## 📋 Diagnostic Endpoint

I've created `/api/admin/diagnose-calls` to check:
- Akin's customer record and call logs
- Why other customers aren't being picked up
- Pending queue status
- All customers' call status

**Access it:**
```
https://www.bedelulu.co/api/admin/diagnose-calls?secret=YOUR_ADMIN_SECRET
```

This will show us exactly what's in the database.

---

## 🎯 Next Steps

1. **Check diagnostic endpoint** to see actual database state
2. **Implement Fix 1**: Set `last_call_date` immediately when call is initiated
3. **Implement Fix 2**: Improve idempotency check to catch duplicate webhooks earlier
4. **Implement Fix 3**: Add defensive check in webhook handler

Once we see the diagnostic results, we'll know exactly what to fix!


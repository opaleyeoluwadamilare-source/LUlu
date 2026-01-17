# 🚨 CRITICAL: Fix Duplicate Calls (Akin Got 8 Calls!)

## 🔍 Root Cause

**The Problem:**
1. `last_call_date` is set AFTER call succeeds (in `call-queue.ts` line 177)
2. But calls are INITIATED before `last_call_date` is set
3. Multiple cron runs can pick up the same customer before `last_call_date` is committed
4. Each cron run initiates a new call → 8 calls!

**The Flow (BROKEN):**
```
19:00:00 - Cron #1: Finds Akin (last_call_date = NULL) → Initiates Call #1
19:00:05 - Call #1 initiated, but last_call_date NOT YET SET
19:00:10 - Cron #2: Still sees last_call_date = NULL → Initiates Call #2
19:00:15 - Cron #3: Still sees last_call_date = NULL → Initiates Call #3
... (repeat 8 times)
19:01:00 - Call #1 succeeds → Sets last_call_date (TOO LATE!)
```

---

## ✅ The Fix

**Set `last_call_date` IMMEDIATELY when call is initiated**, not when it succeeds.

**New Flow (FIXED):**
```
19:00:00 - Cron #1: Finds Akin (last_call_date = NULL) → Initiates Call #1
19:00:01 - IMMEDIATELY set last_call_date = TODAY (before Vapi call)
19:00:05 - Cron #2: Sees last_call_date = TODAY → SKIPS (already called today)
19:00:10 - Cron #3: Sees last_call_date = TODAY → SKIPS
... (all subsequent crons skip)
19:01:00 - Call #1 succeeds → Updates call log (last_call_date already set)
```

---

## 🔧 Implementation

### Fix 1: Set `last_call_date` Before Initiating Call

**Location:** `lib/call-queue.ts` - Before making Vapi call

**Change:**
```typescript
// BEFORE making Vapi call, set last_call_date to prevent duplicates
if (item.call_type === 'daily') {
  await client.query(
    `UPDATE customers 
     SET last_call_date = CURRENT_DATE,
         updated_at = NOW()
     WHERE id = $1
       AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)`,
    [item.customer_id]
  )
}

// THEN make the call
const result = await Promise.race([callPromise, timeoutPromise])
```

### Fix 2: Add Defensive Check in Query

**Location:** `lib/call-queue.ts` - Defensive check #1

**Enhance:**
```typescript
// DEFENSIVE CHECK #1: Verify call should still be made
const verify = await client.query(
  `SELECT last_call_date, call_status
   FROM customers
   WHERE id = $1`,
  [item.customer_id]
)

if (verify.rows.length === 0) {
  // Customer deleted, skip
  continue
}

const customer = verify.rows[0]
const today = new Date().toISOString().split('T')[0]
const lastCallDate = customer.last_call_date ? new Date(customer.last_call_date).toISOString().split('T')[0] : null

// CRITICAL: Skip if already called today
if (item.call_type === 'daily' && lastCallDate === today) {
  console.log(`⏭️ Skipping customer ${item.customer_id} - already called today`)
  // Mark queue item as completed (duplicate prevention)
  await client.query(
    `UPDATE call_queue SET status = 'completed' WHERE id = $1`,
    [item.id]
  )
  continue
}
```

### Fix 3: Improve Webhook Idempotency

**Location:** `app/api/webhooks/vapi/route.ts`

**Enhance idempotency check to catch calls earlier:**
```typescript
// Check if call_log exists for this vapi_call_id (even without transcript)
const existingCallLog = await pool.query(
  `SELECT id, transcript, duration_seconds, updated_at
   FROM call_logs 
   WHERE vapi_call_id = $1
   ORDER BY created_at DESC
   LIMIT 1`,
  [call.id]
)

// If call_log exists, check if it's fully processed
if (existingCallLog.rows.length > 0) {
  const existing = existingCallLog.rows[0]
  
  // If fully processed (has transcript + duration), skip
  if (existing.transcript && existing.duration_seconds) {
    // ... existing idempotency logic ...
    return NextResponse.json({ received: true, alreadyProcessed: true })
  }
  
  // If call_log exists but not fully processed, update it (don't skip)
  // This handles the case where webhook arrives before transcript is ready
}
```

---

## ⚠️ Cron Lookback Window

**Current:** 4 hours back, 20 minutes forward

**User Request:** Change to 15 minutes back

**Impact:**
- ✅ Prevents processing very old calls (4 hours is too long)
- ✅ Faster processing (smaller window = faster queries)
- ⚠️ Might miss calls if cron is delayed (but 15 min is still safe)

**Change in `lib/call-queue.ts`:**
```typescript
// OLD:
const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

// NEW:
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
```

**Also update `lib/call-scheduler.ts`:**
```typescript
// OLD:
const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

// NEW:
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
```

---

## 🎯 Summary of Changes

1. ✅ Set `last_call_date` BEFORE initiating call (prevents duplicates)
2. ✅ Add defensive check to skip if already called today
3. ✅ Improve webhook idempotency to catch duplicates earlier
4. ✅ Change cron lookback from 4 hours to 15 minutes

---

## 🚀 Implementation Order

1. **Fix 1** (set `last_call_date` early) - MOST CRITICAL
2. **Fix 2** (defensive check) - Safety net
3. **Fix 3** (webhook idempotency) - Already done, just enhance
4. **Fix 4** (cron window) - User requested

---

## ⚠️ Important Notes

- Setting `last_call_date` early means if call fails, customer won't get retry today
- But this is BETTER than getting 8 duplicate calls!
- Failed calls can be manually retriggered via admin dashboard
- Or we can add logic to reset `last_call_date` if call fails (but be careful!)


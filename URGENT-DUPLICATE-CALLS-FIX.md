# 🚨 URGENT: Duplicate Calls Root Cause Analysis

## Problems Identified:

### ❌ **CRITICAL ISSUE #1: No Unique Constraint on call_queue**

**Location:** `/lib/db.ts` - line 152-165

The `call_queue` table has NO unique constraint!

```sql
CREATE TABLE IF NOT EXISTS call_queue (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  call_type VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  ...
)
```

**Problem:** The `enqueueCall` function uses `ON CONFLICT DO NOTHING`, but there's NO constraint to conflict with!

**Result:** Every time the cron runs (every 15 minutes), it can insert DUPLICATE queue entries for the same customer.

---

### ❌ **CRITICAL ISSUE #2: Race Condition - Double Triggering**

**Location 1:** Webhook triggers call - `/app/api/webhooks/stripe/route.ts` line 208  
**Location 2:** Cron also picks up same customer - `/app/api/calls/process/route.ts` line 19-39

**The Flow:**
1. Customer pays → Webhook fires
2. Webhook triggers welcome call via `/api/calls/trigger` (fire-and-forget)
3. **15 minutes later:** Cron runs
4. Cron checks: "Is `welcome_call_completed = false`?" → YES
5. Cron queues ANOTHER welcome call
6. Customer gets called TWICE (or more!)

**Root cause:** The webhook call is async/non-blocking, and `welcome_call_completed` isn't set to true immediately.

---

### ❌ **CRITICAL ISSUE #3: Wide Time Window**

**Location:** `/lib/call-queue.ts` line 44

```javascript
const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000)
```

**Problem:** Cron looks back 60 MINUTES for pending calls.

**Result:** If a call fails or gets stuck, it keeps getting retried every 15 minutes for an hour!

---

### ❌ **ISSUE #4: Wrong Times**

**Likely cause:** Calls are being triggered immediately upon payment (via webhook) instead of waiting for the customer's preferred time.

**Location:** `/app/api/webhooks/stripe/route.ts` line 208 - triggers call immediately  
**Should be:** Calls should only happen at scheduled `call_time` in customer's timezone

---

## 🛠️ Required Fixes:

### **FIX #1: Add Unique Constraint**
```sql
ALTER TABLE call_queue 
ADD CONSTRAINT unique_customer_call_pending 
UNIQUE (customer_id, call_type, status) 
WHERE status IN ('pending', 'retrying', 'processing');
```

This prevents duplicate queue entries for the same customer/call_type.

### **FIX #2: Don't Trigger Welcome Call from Webhook**
Remove immediate trigger. Let cron handle ALL calls at proper times.

### **FIX #3: Reduce Time Window**
Change from 60 minutes back to 15 minutes:
```javascript
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
```

### **FIX #4: Welcome Calls Should Respect Time**
Welcome calls should ALSO wait for the preferred call time, not trigger immediately.

---

## 📊 Impact:

**Current state:**
- ❌ Welcome calls trigger immediately on payment (wrong time)
- ❌ Cron also queues welcome call 15 min later (duplicate)
- ❌ No unique constraint allows infinite duplicates
- ❌ 60-minute lookback causes even more retries

**Users experience:**
- 🔴 Multiple calls within minutes
- 🔴 Calls at random times (right after payment, not at preferred time)
- 🔴 Frustration and confusion

---

## ✅ Immediate Action Required:

1. **Add unique constraint to database**
2. **Disable immediate webhook trigger**
3. **Reduce cron lookback window**
4. **Make welcome calls respect preferred time**


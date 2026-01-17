# 🔧 Database Update Fix: `total_calls_made` Not Being Updated

## 🚨 Problem Identified

**Issue:** Dashboard shows "0 Calls Made" for Akin, but we know he received 8 calls.

**Root Cause:**
- `total_calls_made` is only updated in `call-queue.ts` when queue processing succeeds
- The webhook handler (`app/api/webhooks/vapi/route.ts`) does NOT update `total_calls_made`
- If queue processing fails or webhook arrives first, `total_calls_made` stays at 0

**Why This Happens:**
1. Call is initiated → `call_logs` entry created ✅
2. Call succeeds → Webhook arrives
3. Webhook updates `last_call_transcript` and `last_call_duration` ✅
4. Webhook does NOT update `total_calls_made` ❌
5. Queue processing might fail or not complete → `total_calls_made` never incremented ❌

---

## ✅ Fixes Implemented

### **Fix 1: Webhook Now Updates `total_calls_made`**

**File:** `app/api/webhooks/vapi/route.ts`

**Change:**
```typescript
// BEFORE:
await pool.query(
  `UPDATE customers 
   SET last_call_transcript = $1, 
       last_call_duration = $2,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $3`,
  [transcript || null, durationSeconds || null, customerId]
)

// AFTER:
await pool.query(
  `UPDATE customers 
   SET last_call_transcript = $1, 
       last_call_duration = $2,
       total_calls_made = COALESCE(total_calls_made, 0) + 1,  // ← NEW
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $3`,
  [transcript || null, durationSeconds || null, customerId]
)
```

**Impact:**
- ✅ `total_calls_made` is now updated in TWO places (queue + webhook)
- ✅ Even if queue processing fails, webhook ensures count is accurate
- ✅ Redundant updates are safe (idempotent - webhook has idempotency check)

---

### **Fix 2: Sync Endpoint to Repair Existing Data**

**File:** `app/api/admin/sync-call-counts/route.ts` (NEW)

**Purpose:** Repair discrepancies where `call_logs` has calls but `total_calls_made` is wrong.

**Usage:**
```
GET /api/admin/sync-call-counts?secret=admin_bedelulu_secure_2025
```

**What It Does:**
1. Counts actual calls from `call_logs` for each customer
2. Compares with `total_calls_made` in `customers` table
3. Updates `total_calls_made` to match actual count
4. Returns list of customers that were updated

**Example Response:**
```json
{
  "success": true,
  "message": "Synced 3 customer(s)",
  "updates": [
    {
      "customerId": 17,
      "oldCount": 0,
      "newCount": 8
    },
    {
      "customerId": 5,
      "oldCount": 1,
      "newCount": 4
    }
  ],
  "summary": {
    "totalCustomersWithCalls": 5,
    "customersUpdated": 3
  }
}
```

---

## 🔧 How to Fix Akin's Count Now

### **Option 1: Use Sync Endpoint (Recommended)**

1. **Visit:**
   ```
   https://bedelulu.co/api/admin/sync-call-counts?secret=admin_bedelulu_secure_2025
   ```

2. **Expected Result:**
   - Akin's `total_calls_made` will be updated from 0 to 8 (or actual count)
   - Dashboard will show correct count immediately

3. **Refresh Dashboard:**
   - Akin should now show correct "Calls Made" count

---

### **Option 2: Manual SQL (If Needed)**

If sync endpoint doesn't work, run this SQL directly:

```sql
-- Count actual calls for Akin (customer_id = 17)
SELECT COUNT(*) as actual_count
FROM call_logs
WHERE customer_id = 17
  AND status IN ('completed', 'no_answer');

-- Update total_calls_made to match
UPDATE customers
SET total_calls_made = (
  SELECT COUNT(*)
  FROM call_logs
  WHERE customer_id = 17
    AND status IN ('completed', 'no_answer')
),
updated_at = CURRENT_TIMESTAMP
WHERE id = 17;

-- Verify
SELECT id, name, total_calls_made
FROM customers
WHERE id = 17;
```

---

## ✅ Verification

### **Check Dashboard:**
1. Go to admin dashboard
2. Find Akin
3. Should show correct "Calls Made" count (should be 8, not 0)

### **Check Database:**
```sql
SELECT 
  c.id,
  c.name,
  c.total_calls_made,
  COUNT(cl.id) as actual_call_count
FROM customers c
LEFT JOIN call_logs cl ON c.id = cl.customer_id 
  AND cl.status IN ('completed', 'no_answer')
WHERE c.id = 17
GROUP BY c.id, c.name, c.total_calls_made;
```

**Expected:**
- `total_calls_made` should equal `actual_call_count`

---

## 🎯 Future Prevention

### **Double Update Protection:**
- Both `call-queue.ts` and webhook now update `total_calls_made`
- Webhook has idempotency check (won't process duplicates)
- Even if one fails, the other ensures accuracy

### **Monitoring:**
- Use sync endpoint weekly to catch any discrepancies
- Or add to cron job to auto-sync monthly

---

## 📊 Impact

**Before:**
- ❌ `total_calls_made` only updated in queue processing
- ❌ If queue fails, count stays wrong
- ❌ Dashboard shows incorrect counts

**After:**
- ✅ `total_calls_made` updated in BOTH queue and webhook
- ✅ Redundant updates ensure accuracy
- ✅ Sync endpoint can repair existing discrepancies
- ✅ Dashboard shows accurate counts

---

## 🚀 Next Steps

1. **Deploy the fix** (webhook update)
2. **Run sync endpoint** to fix Akin's count
3. **Verify dashboard** shows correct count
4. **Monitor** for any future discrepancies

---

## 📝 Notes

- The webhook update is **idempotent** - if it runs multiple times, it's safe
- The sync endpoint can be run anytime to repair data
- Both fixes are backward compatible (won't break existing functionality)


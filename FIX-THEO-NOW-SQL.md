# 🚨 URGENT: Fix Theo NOW - SQL Commands

**Run these SQL commands directly in your database console:**

---

## 🎯 **Step 1: Go to Your Database Console**

### **If using Vercel Postgres:**
1. Go to: https://vercel.com/dashboard
2. Click your project → **Storage** tab
3. Click your Postgres database
4. Click **".sql" Query** tab
5. Paste the SQL below

### **OR if using another PostgreSQL host:**
Connect to your database and run these commands.

---

## 📝 **SQL Commands to Run:**

```sql
-- Step 1: Mark Theo's welcome call as completed
UPDATE customers 
SET welcome_call_completed = true,
    call_status = 'completed',
    total_calls_made = GREATEST(COALESCE(total_calls_made, 0), 4),
    updated_at = NOW()
WHERE id = 7;

-- Step 2: Clear his pending welcome call from queue
UPDATE call_queue 
SET status = 'completed',
    updated_at = NOW()
WHERE customer_id = 7 
  AND call_type = 'welcome'
  AND status IN ('pending', 'retrying');

-- Step 3: Verify it worked
SELECT 
  id, 
  name, 
  welcome_call_completed, 
  total_calls_made,
  call_status
FROM customers 
WHERE id = 7;

-- Step 4: Check queue is cleared
SELECT 
  id, 
  customer_id, 
  call_type, 
  status
FROM call_queue 
WHERE customer_id = 7
  AND status IN ('pending', 'retrying');
```

---

## ✅ **Expected Results:**

### **After Step 1 & 2:**
```
UPDATE 1
UPDATE 1
```

### **After Step 3 (Verification):**
```
id | name | welcome_call_completed | total_calls_made | call_status
7  | Theo | true                   | 4                | completed
```

### **After Step 4 (Queue Check):**
```
(0 rows)  ← Should be empty!
```

---

## 🎯 **What This Does:**

1. **Sets `welcome_call_completed = true`** → Tells system Theo already got welcome call
2. **Sets `total_calls_made = 4`** → Records he got 4 calls (the duplicates)
3. **Clears queue entry** → Removes the pending welcome call
4. **Verifies** → Confirms it worked

---

## ⏰ **Why NOW:**

- Theo has **1 pending welcome call** in queue
- Cron runs **every 15 minutes**
- If it runs before we fix → **5th duplicate call!**
- Running SQL takes **30 seconds**
- Vercel deployment takes **5-10 minutes**

**Run the SQL NOW to prevent 5th call!**

---

## 🔒 **Safe to Run:**

These commands:
- ✅ Only affect Theo (customer_id = 7)
- ✅ Mark existing status as completed
- ✅ Don't delete any data
- ✅ Are reversible if needed

---

## 📋 **After Running:**

1. ✅ Theo won't get 5th call
2. ✅ Our defensive system will skip him (welcome_call_completed = true)
3. ✅ Cron can continue running safely
4. ✅ Other customers work normally

---

**Copy the SQL above and run it NOW in your database console!**

Once done, reply "Done" and I'll verify it worked.

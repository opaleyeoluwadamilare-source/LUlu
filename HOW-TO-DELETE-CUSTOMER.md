# 🗑️ How to Delete Customer: Olatijani02@gmail.com

## ⚠️ IMPORTANT: Read This First!

**I CANNOT access your database directly.** That would be a security risk.

**YOU need to run these commands** in your database.

This guide shows you **exactly how to do it safely**.

---

## ✅ What Will Happen

After deletion:
- ✅ Customer completely removed from database
- ✅ All related records deleted (call queue, logs, context)
- ✅ They can sign up fresh with same email
- ✅ Welcome call will work when they pay
- ✅ No conflicts or issues

---

## 📝 Step-by-Step Instructions

### **Step 1: Connect to Your Database**

**Option A: Render Dashboard (EASIEST - RECOMMENDED)**

1. Go to: https://dashboard.render.com
2. Log in
3. Find your PostgreSQL database
4. Click on it
5. Click **"Connect"** button
6. Select **"External Connection"** or **"Web Shell"**
7. You'll see a SQL query interface

**Option B: Use Command Line**

Open terminal and run:
```bash
psql "postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r?sslmode=require"
```

**Option C: Use Database Client (pgAdmin, DBeaver, etc.)**

Connection details:
- Host: `dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com`
- Database: `connections_ue6r`
- Username: `connections_user`
- Password: `2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP`
- Port: `5432`
- SSL: **Required** (enable SSL/TLS)

---

### **Step 2: Verify Customer Exists (SAFE - Just Looking)**

Copy and paste this query:

```sql
SELECT 
  id, 
  name, 
  email, 
  payment_status, 
  stripe_customer_id,
  created_at
FROM customers 
WHERE email = 'Olatijani02@gmail.com';
```

**Expected Result:**
- Should show 1 row
- Note the `id` number (you'll verify this later)

**If it shows nothing:** Customer already deleted or wrong email!

---

### **Step 3: Check Related Records (SAFE - Just Counting)**

Copy and paste these queries one by one:

```sql
-- Count call queue entries
SELECT COUNT(*) as queue_count 
FROM call_queue 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- Count call logs
SELECT COUNT(*) as logs_count 
FROM call_logs 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- Count customer context
SELECT COUNT(*) as context_count 
FROM customer_context 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');
```

**Expected Result:**
- Numbers showing how many related records exist
- Could be 0 for all (that's fine!)

---

### **Step 4: Delete Related Records**

⚠️ **NOW we're making changes!** Run these in order:

**Delete 1: Call Queue**
```sql
DELETE FROM call_queue 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
```

Expected: `DELETE X` (where X is the count from Step 3)

---

**Delete 2: Call Logs**
```sql
DELETE FROM call_logs 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
```

Expected: `DELETE X` (where X is the count from Step 3)

---

**Delete 3: Customer Context**
```sql
DELETE FROM customer_context 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
```

Expected: `DELETE X` (where X is the count from Step 3)

---

### **Step 5: Delete the Customer Record**

⚠️ **This is the final deletion:**

```sql
DELETE FROM customers 
WHERE email = 'Olatijani02@gmail.com';
```

Expected: `DELETE 1`

---

### **Step 6: Verify Deletion (SAFE - Checking)**

Run this to confirm:

```sql
SELECT * FROM customers WHERE email = 'Olatijani02@gmail.com';
```

**Expected Result:** No rows (empty result)

**If it still shows a row:** Something went wrong, don't panic! Contact me.

---

## ✅ Success Checklist

After completing all steps:

- [x] Ran Step 2 - Found the customer ✅
- [x] Ran Step 3 - Counted related records ✅
- [x] Ran Step 4 - Deleted related records ✅
- [x] Ran Step 5 - Deleted customer ✅
- [x] Ran Step 6 - Verified deletion ✅

**Result:** Customer completely removed! ✅

---

## 🎯 What Happens Next

### **When Customer Signs Up Again:**

1. ✅ Goes to https://Bedelulu.co
2. ✅ Completes signup with **same email** (Olatijani02@gmail.com)
3. ✅ System creates **NEW customer record** (fresh ID)
4. ✅ `payment_status = 'Pending'`
5. ✅ Completes payment
6. ✅ Webhook fires → Updates to `payment_status = 'Paid'`
7. ✅ **Welcome call triggers** (fresh start!)
8. ✅ Daily calls scheduled

**Everything will work perfectly!** ✅

---

## 🚨 Troubleshooting

### Issue: "Cannot delete - foreign key constraint"

**Cause:** Didn't delete related records first

**Fix:** Run Step 4 commands in order (call_queue, call_logs, customer_context, then customers)

---

### Issue: "0 rows deleted" at Step 5

**Cause:** Customer already deleted or wrong email

**Fix:** Run Step 2 again to check if customer exists

---

### Issue: "Permission denied"

**Cause:** Database user doesn't have DELETE permission

**Fix:** Contact database admin or use database owner credentials

---

### Issue: Deleted wrong customer by mistake

**Bad news:** Cannot undo after deletion

**Prevention:** ALWAYS run Step 2 first to verify the customer before deleting!

---

## 🔒 Safety Notes

**This deletion:**
- ✅ Only affects `Olatijani02@gmail.com`
- ✅ Does NOT affect other customers
- ✅ Does NOT break your database
- ✅ Cannot be undone (no rollback after commit)

**Before deleting:**
- ✅ Run verification queries (Step 2-3)
- ✅ Make sure it's the right customer
- ✅ Confirm email is correct

---

## 📄 Quick Copy-Paste Version

If you're experienced with SQL, here's the complete script:

```sql
-- Verify (SAFE)
SELECT * FROM customers WHERE email = 'Olatijani02@gmail.com';

-- Delete related records
DELETE FROM call_queue WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');
DELETE FROM call_logs WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');
DELETE FROM customer_context WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- Delete customer
DELETE FROM customers WHERE email = 'Olatijani02@gmail.com';

-- Verify (SAFE)
SELECT * FROM customers WHERE email = 'Olatijani02@gmail.com';
```

---

## 🎉 After Deletion

**Tell the customer:**
- ✅ "We're ready now!"
- ✅ "Go to https://Bedelulu.co"
- ✅ "Sign up again (same email is fine)"
- ✅ "Complete payment"
- ✅ "You'll get your welcome call!"

---

**Time to Complete:** 5 minutes  
**Difficulty:** Easy (just copy-paste)  
**Risk:** Very low (only affects one customer)  
**Reversible:** No (verify first!)

---

**Ready? Open your database and follow the steps above!** 🚀

**Need help? Let me know what step you're on and any error messages you see.**

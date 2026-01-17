-- ============================================
-- DELETE CUSTOMER: Olatijani02@gmail.com
-- ============================================
-- Date: $(date)
-- Purpose: Remove refunded customer for fresh signup
-- Safe: Only affects this one customer
-- ============================================

-- STEP 1: VERIFY the customer exists (READ ONLY - SAFE)
-- Copy this first and check the results
SELECT 
  id, 
  name, 
  email, 
  payment_status, 
  stripe_customer_id,
  created_at,
  updated_at
FROM customers 
WHERE email = 'Olatijani02@gmail.com';

-- Expected: Should show 1 customer record
-- Note the ID number for verification

-- ============================================
-- STEP 2: CHECK related records (READ ONLY - SAFE)
-- ============================================

-- Check call queue entries
SELECT COUNT(*) as queue_count 
FROM call_queue 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- Check call logs
SELECT COUNT(*) as logs_count 
FROM call_logs 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- Check customer context
SELECT COUNT(*) as context_count 
FROM customer_context 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- ============================================
-- STEP 3: DELETE related records FIRST
-- (Must delete in this order due to foreign keys)
-- ============================================

-- 3a. Delete from call_queue
DELETE FROM call_queue 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
-- Expected: Deleted X rows (or 0 if none)

-- 3b. Delete from call_logs
DELETE FROM call_logs 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
-- Expected: Deleted X rows (or 0 if none)

-- 3c. Delete from customer_context
DELETE FROM customer_context 
WHERE customer_id = (
  SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com'
);
-- Expected: Deleted X rows (or 0 if none)

-- ============================================
-- STEP 4: DELETE the customer record
-- ============================================

DELETE FROM customers 
WHERE email = 'Olatijani02@gmail.com';
-- Expected: Deleted 1 row

-- ============================================
-- STEP 5: VERIFY deletion (READ ONLY - SAFE)
-- ============================================

-- Should return NO rows
SELECT * FROM customers WHERE email = 'Olatijani02@gmail.com';

-- Should return 0
SELECT COUNT(*) FROM call_queue 
WHERE customer_id IN (SELECT id FROM customers WHERE email = 'Olatijani02@gmail.com');

-- ============================================
-- COMPLETE! Customer fully removed.
-- They can now sign up fresh with same email.
-- ============================================

-- ROLLBACK (if you made a mistake and need to undo)
-- If you're in a transaction and haven't committed:
-- ROLLBACK;

-- Note: If you already committed, you cannot undo.
-- Always run STEP 1 and 2 first to verify!

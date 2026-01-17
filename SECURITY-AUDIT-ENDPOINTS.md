# 🔒 Security Audit: Open Endpoints

**Date:** November 20, 2025  
**Status:** ⚠️ SEVERAL INSECURE DEBUG ENDPOINTS FOUND

---

## 🚨 CRITICAL: Highly Dangerous Endpoints

### 1. **`/api/debug/delete-customer`** 🔴 CRITICAL
**Risk Level:** 🔴 **EXTREME**

**What it does:**
- Deletes customers completely from database
- Removes all call history, queue items, context
- Irreversible data deletion

**Security:**
- Only protected by secret: `debug_bedelulu_2025_temp`
- Secret is HARDCODED in the file
- Anyone with the secret can delete ANY customer

**Example:**
```
/api/debug/delete-customer?email=customer@email.com&secret=debug_bedelulu_2025_temp
```

**Danger:**
- Delete paying customers
- Destroy revenue records
- Remove call history
- No recovery possible

---

### 2. **`/api/debug/raw-query`** 🔴 CRITICAL
**Risk Level:** 🔴 **EXTREME**

**What it does:**
- Exposes raw database query results
- Shows all customer data
- Displays scheduled calls
- Full database structure visible

**Security:**
- Only protected by secret: `debug_bedelulu_2025_temp`
- Returns full database records

**Danger:**
- Leak customer PII (names, emails, phones)
- Expose payment status
- Show call schedules
- Database structure revealed

---

### 3. **`/api/debug/check-customer`** 🟠 HIGH
**Risk Level:** 🟠 **HIGH**

**What it does:**
- Shows all customer details
- Displays Stripe IDs
- Shows payment status
- Shows phone numbers

**Security:**
- Protected by secret: `debug_bedelulu_2025_temp`

**Danger:**
- Customer PII exposure
- Stripe customer IDs visible
- Payment information leak

---

## ⚠️ MODERATE RISK: Debug Endpoints

### 4. **`/api/debug/activate-daily-calls`**
- Activates calls for customers
- Protected by secret

### 5. **`/api/debug/check-queue`**
- Shows call queue status
- Protected by secret

### 6. **`/api/debug/clean-queue`**
- Deletes queue items
- Protected by secret

### 7. **`/api/debug/delete-test-calls`**
- Deletes test call records
- Protected by secret

### 8. **`/api/debug/direct-call`**
- Makes direct Vapi calls
- Protected by secret

### 9. **`/api/debug/process-now`**
- Forces call processing
- Protected by secret

### 10. **`/api/debug/show-payload`**
- Shows webhook payloads
- Protected by secret

### 11. **`/api/debug/simulate-webhook`**
- Simulates Stripe webhooks
- Can mark customers as paid
- Protected by secret

### 12. **`/api/debug/single-call`**
- Makes test calls
- Protected by secret

### 13. **`/api/debug/test-vapi`**
- Tests Vapi integration
- Protected by secret

### 14. **`/api/debug/test-webhook`**
- Tests webhook processing
- Protected by secret

### 15. **`/api/debug/trigger-call`**
- Triggers calls manually
- Protected by secret

### 16. **`/api/debug/verify-customer`**
- Shows customer verification status
- Protected by secret

### 17. **`/api/debug/view-queue`**
- Shows call queue details
- Protected by secret

---

## 🟡 LOW RISK: Information Disclosure

### 18. **`/api/test-stripe-links`** 🟡 LOW
**Risk Level:** 🟡 **LOW**

**What it does:**
```javascript
return NextResponse.json({
  starterLink: process.env.NEXT_PUBLIC_STRIPE_STARTER_LINK,
  fullLink: process.env.NEXT_PUBLIC_STRIPE_FULL_LINK,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
})
```

**Security:** NO PROTECTION AT ALL

**Danger:**
- Exposes Stripe payment links
- Exposes site URL
- Anyone can access
- Could be used to craft phishing attacks

---

## ✅ LEGITIMATE: Admin Endpoints (Newly Created)

### 19. **`/api/admin/phone-validation-status`** ✅ OK
**Risk Level:** 🟢 **LOW** (if secret changed)

**Security:**
- Protected by `ADMIN_SECRET` env variable
- Default: `admin_bedelulu_secure_2025`
- Shows customer phone validation status
- Read-only

**Action Needed:**
- Change `ADMIN_SECRET` in Vercel

---

### 20. **`/api/admin/fix-phone-validation`** ✅ OK
**Risk Level:** 🟢 **LOW** (if secret changed)

**Security:**
- Protected by `ADMIN_SECRET` env variable
- Fixes phone validation for customers
- Triggers welcome calls

**Action Needed:**
- Change `ADMIN_SECRET` in Vercel

---

## 🔍 NO PNG/IMAGE ENDPOINTS FOUND

**Good news:** No PNG generation or image processing endpoints exist.

---

## 📊 Summary

### **Critical Issues:**
- **17 debug endpoints** with hardcoded secret `debug_bedelulu_2025_temp`
- **1 endpoint** with NO protection (`/api/test-stripe-links`)
- **2 admin endpoints** with default secret (should change)

### **Shared Secret:**
Almost all debug endpoints use the SAME hardcoded secret:
```
debug_bedelulu_2025_temp
```

This means:
- If one endpoint is compromised, ALL are compromised
- Secret is in the codebase (could be exposed via GitHub, etc.)
- Cannot be changed without code deployment

---

## 🎯 Recommended Actions

### **IMMEDIATE (Delete These):**

1. **`/api/debug/delete-customer`** - Can delete paying customers! 🔴
2. **`/api/debug/raw-query`** - Exposes all database data! 🔴
3. **`/api/test-stripe-links`** - No protection at all! 🟡

### **HIGHLY RECOMMENDED (Delete Entire Debug Folder):**

Delete: `/app/api/debug/` (all 17 endpoints)

**Why:**
- All are dev/testing tools
- Not needed in production
- Hardcoded secret is a security risk
- Create attack surface

**Keep:** The 2 new admin endpoints (phone validation)

---

### **IF YOU KEEP DEBUG ENDPOINTS:**

**Option A: Add Environment Variable Secret**
```typescript
const DEBUG_SECRET = process.env.DEBUG_SECRET || 'fallback_secret'
```
Then set `DEBUG_SECRET` in Vercel

**Option B: Add IP Whitelist**
```typescript
const allowedIPs = ['your.ip.address']
if (!allowedIPs.includes(request.ip)) {
  return unauthorized
}
```

**Option C: Require Login/Auth**
- Add proper authentication
- Check session/JWT
- Require admin role

---

### **FOR ADMIN ENDPOINTS:**

Change the secret immediately:
```bash
# In Vercel:
ADMIN_SECRET=your_very_secure_random_string_here_xyz789
```

---

## 🚨 Security Risk Assessment

### **If Endpoints Are Discovered:**

**Attacker could:**
1. Delete all customers (`/api/debug/delete-customer`)
2. See all customer data (`/api/debug/raw-query`, `/api/debug/check-customer`)
3. Make unauthorized calls (`/api/debug/direct-call`)
4. Mark fake customers as paid (`/api/debug/simulate-webhook`)
5. Delete call history (`/api/debug/delete-test-calls`)
6. See Stripe payment links (`/api/test-stripe-links`)

**Impact:**
- Customer data breach (GDPR violation)
- Revenue loss (deleted customers)
- Fraudulent calls (cost you money)
- Business disruption
- Legal liability

---

## ✅ What to Delete vs Keep

### **DELETE (Not Needed in Production):**

```bash
# Delete entire debug folder:
rm -rf app/api/debug/

# Delete test endpoint:
rm -rf app/api/test-stripe-links/
```

**Total to delete:** 18 endpoints

---

### **KEEP (Needed for Production):**

```
✅ /app/api/admin/phone-validation-status/ (change secret!)
✅ /app/api/admin/fix-phone-validation/ (change secret!)
✅ /app/api/calls/process/ (cron job uses this)
✅ /app/api/calls/trigger/ (internal use)
✅ /app/api/create-payment-intent/ (payment flow)
✅ /app/api/database/init/ (database setup)
✅ /app/api/database/migrate/ (database migrations)
✅ /app/api/database/submit/ (signup flow)
✅ /app/api/webhooks/stripe/ (Stripe integration)
✅ /app/api/webhooks/vapi/ (Vapi integration)
```

**Total to keep:** 10 endpoints

---

## 📋 Action Checklist

**BEFORE deleting, confirm you want to:**

- [ ] Delete entire `/app/api/debug/` folder (17 endpoints)
- [ ] Delete `/app/api/test-stripe-links/` (1 endpoint)
- [ ] Change `ADMIN_SECRET` in Vercel environment variables
- [ ] Keep admin endpoints with new secret
- [ ] Keep all production endpoints

**After deletion:**
- [ ] Test signup flow still works
- [ ] Test payment flow still works
- [ ] Test calls still trigger
- [ ] Test admin dashboard still works
- [ ] Redeploy to Vercel

---

## 🎯 My Recommendation

### **PRIORITY 1: DELETE IMMEDIATELY** 🔴
```bash
# These are dangerous:
rm -rf app/api/debug/delete-customer/
rm -rf app/api/debug/raw-query/
rm -rf app/api/test-stripe-links/
```

### **PRIORITY 2: DELETE ALL DEBUG ENDPOINTS** 🟠
```bash
# Clean up entire debug folder:
rm -rf app/api/debug/
```

### **PRIORITY 3: SECURE ADMIN ENDPOINTS** 🟡
```bash
# In Vercel Environment Variables:
ADMIN_SECRET=Generate_A_Strong_Random_String_Here_123
```

---

**Waiting for your confirmation before I take any action!**

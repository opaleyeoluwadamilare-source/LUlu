# 🔍 CHECK LOGS - Your Friend's Welcome Call

## ⏰ Current Status: 5+ Minutes After Payment

Your friend paid and hasn't received welcome call yet. Let's verify everything is working.

---

## 🎯 **STEP 1: Check Vercel Webhook Logs** (Most Important!)

### **Go Here:**
```
https://vercel.com/your-account/bedelulu/logs
```

### **Filter Settings:**
1. **Function:** Select `api/webhooks/stripe`
2. **Time:** Last 15 minutes
3. **Status:** All

### **What to Look For:**

#### ✅ **SUCCESS - Look for these messages:**
```
🔍 Webhook received: customerId: "123", email: "friend@email.com"
✅ Looking up customer by ID: 123
✅ Updated customer 123 to Paid status
```

#### ❌ **ERROR - Look for these messages:**
```
❌ No customer ID or email found in Stripe session
❌ No customer found with ID: 123
Error: [any error message]
```

### **What It Means:**

**If you see "✅ Updated customer X to Paid status":**
- ✅ Webhook worked perfectly!
- ✅ Customer is marked as "Paid"
- ✅ Welcome call is queued
- ✅ Just waiting for cron job

**If you see "❌ No customer found":**
- ⚠️ Problem with database lookup
- ⚠️ Need to investigate

**If you see NOTHING:**
- ⚠️ Webhook never fired
- ⚠️ Need to check Stripe webhook setup

---

## 🎯 **STEP 2: Check Vercel Cron Job Logs**

### **Go Here:**
```
https://vercel.com/your-account/bedelulu/logs
```

### **Filter Settings:**
1. **Function:** Select `api/calls/process`
2. **Time:** Last 1 hour
3. **Status:** All

### **What to Look For:**

#### ✅ **SUCCESS - Look for these messages:**
```
🆔 Creating checkout for customer ID: 123
✅ Looking up customer by ID: 123
processed: 5, succeeded: 3, failed: 0
```

#### **Check the timestamp:**
- When did the LAST cron job run?
- Example: "3:15pm" means next run is at "3:30pm"

### **What It Means:**

**If last run was BEFORE payment:**
- ✅ Normal - waiting for next cron run
- ⏰ Next run will process the call

**If last run was AFTER payment:**
- ⚠️ Cron ran but didn't process the call
- ⚠️ Need to investigate why

**If you see NO recent runs:**
- ❌ Cron job not hitting your API
- ❌ Need to check cron-job.org setup

---

## 🎯 **STEP 3: Check Stripe Webhook Dashboard**

### **Go Here:**
```
https://dashboard.stripe.com/webhooks
```

### **Find Your Webhook:**
- URL should be: `https://bedelulu.co/api/webhooks/stripe`

### **Check Recent Events:**
1. Look for `checkout.session.completed` event
2. Click on it
3. Check the **Response** tab

### **What to Look For:**

#### ✅ **SUCCESS:**
```
Status: 200 OK
Response: {"received":true}
```

#### ❌ **FAILURE:**
```
Status: 400, 401, 500, etc.
Response: {"error": "..."}
```

### **What It Means:**

**If Status = 200:**
- ✅ Webhook delivered successfully
- ✅ Your API received it

**If Status = 401:**
- ❌ Wrong webhook secret
- ❌ Webhook can't authenticate

**If Status = 500:**
- ❌ Error in your webhook code
- ❌ Need to check Vercel logs for error details

---

## 🎯 **STEP 4: Check Cron Job Schedule**

### **Go Here:**
```
https://console.cron-job.org/jobs
```

### **Check Your Job:**
1. Find the job that hits: `https://bedelulu.co/api/calls/process`
2. Check **Schedule**: Should say "Every 15 minutes"
3. Check **Last Execution**: When did it last run?
4. Check **Next Execution**: When will it run next?

### **What to Look For:**

#### ✅ **GOOD:**
```
Schedule: */15 * * * * (every 15 minutes)
Last execution: 2:45pm - Success (200)
Next execution: 3:00pm
```

#### ⚠️ **NEEDS FIX:**
```
Schedule: 0 * * * * (every 60 minutes)
Last execution: 2:00pm - Success (200)
Next execution: 3:00pm
```

#### ❌ **PROBLEM:**
```
Schedule: */15 * * * *
Last execution: 2:45pm - Failed (401, 500)
Next execution: 3:00pm
```

### **What It Means:**

**If schedule = 15 minutes:**
- ✅ Good! Calls process every 15 min
- ⏰ Wait for next execution time

**If schedule = 60 minutes:**
- ⚠️ Slow! Change to 15 minutes
- ⏰ Calls take up to 1 hour

**If last execution FAILED:**
- ❌ Wrong CRON_SECRET or API error
- ❌ Need to fix authorization

---

## 📊 **QUICK DIAGNOSTIC CHECKLIST**

Copy this and fill in what you see:

```
PAYMENT TIME: [What time did friend pay? e.g., 2:47pm]

STRIPE WEBHOOK:
[ ] ✅ Event sent (Status 200)
[ ] ❌ Event failed (Status: ___)
[ ] ❓ Can't find event

VERCEL WEBHOOK LOGS:
[ ] ✅ "Updated customer X to Paid status"
[ ] ❌ Error message: _______________
[ ] ❓ No logs found

VERCEL CRON LOGS:
Last run: [Time: _____]
Next run: [Time: _____]
[ ] ✅ Runs every 15 minutes
[ ] ⚠️ Runs every 60 minutes
[ ] ❌ No recent runs

CRON-JOB.ORG:
Schedule: [15 min or 60 min?]
Last execution: [Time: ___] [Status: ___]
Next execution: [Time: ___]

DATABASE (if accessible):
[ ] ✅ Customer payment_status = "Paid"
[ ] ❌ Customer payment_status = "Pending"
[ ] ❓ Can't check
```

---

## 🎯 **After You Check - Tell Me:**

Based on what you find, I'll tell you:
- ✅ If everything is working (just need to wait)
- ⚠️ What needs to be fixed
- 🔧 Exactly how to fix it

---

## 🚨 **Most Likely Scenarios:**

### **Scenario 1: Everything Working (Most Likely)**
- ✅ Webhook fired successfully
- ✅ Customer marked as "Paid"
- ✅ Cron runs every 15 min
- ⏰ Just waiting for next cron execution
- **Solution:** Wait 5-10 more minutes

### **Scenario 2: Cron is Set to 60 Minutes**
- ✅ Webhook worked
- ✅ Customer marked as "Paid"
- ⚠️ Cron runs every 60 min (slow!)
- **Solution:** Change cron to 15 minutes

### **Scenario 3: Webhook Didn't Fire**
- ❌ No webhook event in Stripe
- ❌ Customer still "Pending"
- **Solution:** Check webhook setup, might need to resend

### **Scenario 4: Cron Not Running**
- ✅ Webhook worked
- ❌ Cron hasn't run since payment
- **Solution:** Check cron-job.org authentication

---

## 📞 **What to Do Now:**

1. **Check all 4 steps above**
2. **Fill in the diagnostic checklist**
3. **Copy/paste results here**
4. **I'll tell you exactly what to do next**

---

This will take you 3-5 minutes to check everything. Go do it now and come back with the results! 🚀

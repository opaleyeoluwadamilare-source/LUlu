# 🔔 Stripe Webhook Setup - Final Step!

## ✅ Status Check

**API Keys:** ✅ All added and working!
- Site is live at: https://Bedelulu.co ✅
- Stripe is configured ✅ (Using **LIVE** mode - `cs_live_` sessions detected)
- Payment flow is working ✅

---

## 🎯 Last Critical Step: Set Up Webhook

Without the webhook, customers **won't receive welcome calls** after payment!

---

## 📋 Quick Setup (5 minutes)

### **Step 1: Create Webhook in Stripe Dashboard**

1. Go to: **https://dashboard.stripe.com/webhooks**
2. Click **"Add endpoint"** button

3. **Fill in these details:**
   - **Endpoint URL:** `https://Bedelulu.co/api/webhooks/stripe`
   - **Description:** `Bedelulu production webhook`
   - **Events to send:** 
     - Click **"Select events"**
     - Search for: `checkout.session.completed`
     - Check the box ✅
     - Click **"Add events"**

4. Click **"Add endpoint"**

---

### **Step 2: Get Webhook Secret**

After creating the webhook:

1. Click on the webhook you just created
2. Find the **"Signing secret"** section
3. Click **"Reveal"** or the copy icon
4. Copy the secret (it starts with `whsec_`)

---

### **Step 3: Add Secret to Vercel**

1. Go to: **https://vercel.com/dashboard**
2. Click your **Bedelulu** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   ```
   Name:  STRIPE_WEBHOOK_SECRET
   Value: whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. Select:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
7. Click **"Save"**

---

### **Step 4: Redeploy**

1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Wait ~2 minutes for deployment to complete

---

## ✅ Verification

After redeploying, test the webhook:

### **Option 1: Make a Test Payment**
1. Go to https://Bedelulu.co
2. Click "GET STARTED"
3. Complete signup form
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete payment
6. Check if webhook fired

### **Option 2: Send Test Event from Stripe**
1. In Stripe Dashboard → Webhooks
2. Click on your webhook
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**
6. Should see **200 OK** response

---

## 🔍 How to Verify Webhook is Working

### **Check #1: Stripe Dashboard**
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook
3. Check **"Recent deliveries"** section
4. Should see events with **200 OK** status

### **Check #2: Vercel Logs**
1. Go to Vercel Dashboard → Your Project
2. Click **"Logs"** tab
3. Filter by: `/api/webhooks/stripe`
4. Look for successful webhook processing

### **Check #3: Database**
After a test payment, check your database:
```sql
SELECT * FROM customers 
WHERE payment_status = 'Paid' 
ORDER BY created_at DESC 
LIMIT 1;
```
Should have:
- `stripe_customer_id` populated
- `stripe_subscription_id` populated
- `payment_status = 'Paid'`

---

## 🚨 Common Issues

### Issue: Webhook Returns 401 Unauthorized
**Fix:**
- Make sure `STRIPE_WEBHOOK_SECRET` is set in Vercel
- Verify you copied the correct secret
- Redeploy after adding the secret

### Issue: Webhook Returns 500 Error
**Fix:**
- Check Vercel logs for error details
- Verify database connection is working
- Check that all environment variables are set

### Issue: Welcome Call Not Triggered
**Fix:**
- Verify `VAPI_API_KEY` is set in Vercel
- Check customer's `phone_validated = true` in database
- Check Vercel logs for Vapi API errors

---

## 📊 What Happens When Webhook Works

**After successful payment:**

1. ✅ Stripe sends webhook to your endpoint
2. ✅ Your app receives the event
3. ✅ Customer's `payment_status` updated to "Paid"
4. ✅ `stripe_customer_id` and `stripe_subscription_id` saved
5. ✅ **Welcome call triggered immediately** (if phone is valid)
6. ✅ Customer added to daily call schedule
7. ✅ Cron job will process daily calls at scheduled time

---

## ⚠️ Important Note: You're Using LIVE MODE

I noticed your Stripe checkout sessions start with `cs_live_` which means you're using **LIVE** Stripe keys (not test keys).

**This means:**
- ✅ Real payments will be processed
- ✅ Real charges will occur
- ⚠️ Use real credit cards (test cards won't work)

**For testing, consider:**
1. Using very small amounts (like $0.50) for testing
2. Immediately refunding test payments
3. Or switching to **test mode keys** (starts with `sk_test_` and `pk_test_`)

---

## 🎉 After Webhook is Set Up

You'll be **100% operational**! ✅

**What works:**
- ✅ Users can sign up
- ✅ Payments process through Stripe
- ✅ Welcome calls trigger immediately
- ✅ Daily calls are scheduled
- ✅ Cron job processes calls every 15 minutes
- ✅ Everything is tracked in database

---

## 🧪 Full Test Flow

Once webhook is set up, test everything:

1. **Go to:** https://Bedelulu.co
2. **Click:** "GET STARTED"
3. **Complete:** All 9 signup steps
4. **Select:** Starter plan
5. **Pay:** Complete Stripe checkout
6. **Verify:**
   - Should redirect to thank you page
   - Check Stripe webhook fired (200 OK)
   - Check database has customer record
   - If phone is valid and time matches, welcome call should trigger

---

**Current Status:** ⏳ Waiting for webhook setup

**Time to Complete:** ~5 minutes

**After This:** 🎉 You're LIVE! ✅

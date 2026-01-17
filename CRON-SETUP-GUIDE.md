# 🔄 External Cron Job Setup Guide for Bedelulu.co

## Overview
Your app needs an external cron service to trigger daily call processing every 15 minutes.

---

## 🔐 Step 1: Generate & Add Secrets to Vercel

### 1.1 Generated Secrets (SAVE THESE SECURELY!)

**Copy these and add to Vercel Environment Variables:**

```env
CRON_SECRET=5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997
MIGRATION_SECRET=11f18e21e8992ec428819c6e20f3de1066d866ef720fdfa2660feb5e1a3e208c
```

⚠️ **IMPORTANT:** Save these secrets securely! You'll need them for Vercel setup.

### 1.2 Add to Vercel
1. Go to: https://vercel.com/your-username/bedelulu/settings/environment-variables
2. Add **CRON_SECRET** → Paste the value above → Add to **Production**, **Preview**, **Development**
3. Add **MIGRATION_SECRET** → Paste the value above → Add to **Production**, **Preview**, **Development**
4. **Redeploy** your app after adding these

---

## 📡 Step 2: Set Up External Cron Service

### Your Cron Endpoint Details:

```
URL: https://Bedelulu.co/api/calls/process
Method: GET
Schedule: Every 15 minutes
Header: Authorization: Bearer YOUR_CRON_SECRET
```

---

## 🎯 Recommended Service: Cron-job.org (Free & Reliable)

### Step-by-Step Setup:

1. **Sign Up**
   - Go to: https://cron-job.org/en/signup/
   - Create a free account (no credit card required)

2. **Create New Cron Job**
   - After login, click **"Create cronjob"**

3. **Configure the Job:**
   
   **Title:**
   ```
   Bedelulu - Process Daily Calls
   ```

   **URL:**
   ```
   https://Bedelulu.co/api/calls/process
   ```

   **Request Method:**
   ```
   GET
   ```

   **Schedule:**
   - Click **"Every 15 minutes"**
   - Or custom: `*/15 * * * *` (every 15 minutes)

   **Request Headers:**
   - Click **"Add Header"**
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET` (replace with actual secret from Step 1)

   **Advanced Settings:**
   - Timeout: 60 seconds
   - Execution: Enabled
   - Save responses: Yes (for debugging)

4. **Save & Activate**
   - Click **"Create cronjob"**
   - Make sure it's **enabled** (toggle should be green)

---

## 🔄 Alternative Services

### Option 2: EasyCron
- Website: https://www.easycron.com
- Free tier: 100 executions/month (enough for ~7 days at 15-min intervals)
- Setup similar to Cron-job.org

### Option 3: UptimeRobot (Bonus: Monitoring)
- Website: https://uptimerobot.com
- Free tier: 50 monitors, 5-minute intervals
- Provides uptime monitoring + cron functionality
- Setup:
  1. Create "HTTP(s)" monitor
  2. URL: `https://Bedelulu.co/api/calls/process`
  3. Monitoring Interval: 5 minutes (premium) or 15 minutes (adjust as needed)
  4. Add Custom HTTP Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## ✅ Step 3: Verify It's Working

### 3.1 Check Cron Service Dashboard
- After 15 minutes, check your cron service dashboard
- Look for successful responses (HTTP 200)
- Check execution logs

### 3.2 Check Your App Logs
- Go to Vercel Dashboard → Your Project → Logs
- Look for entries like:
  ```
  ✅ Cron job completed: queued: 5, processed: 5, succeeded: 5
  ```

### 3.3 Manual Test (Optional)
You can manually trigger the endpoint to test:

```bash
curl -X GET https://Bedelulu.co/api/calls/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "queued": 0,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "executionTimeMs": 234
}
```

---

## 🚨 Troubleshooting

### Error: "Unauthorized" (401)
- Check that `CRON_SECRET` is correctly set in Vercel
- Verify the `Authorization` header matches exactly: `Bearer YOUR_SECRET`
- Make sure you redeployed after adding the secret

### Error: "Function Timeout"
- Normal if processing many customers
- The endpoint is designed to handle timeouts gracefully
- Customers will be processed in the next cron run

### No Calls Being Made
1. Check database has customers with:
   - `payment_status = 'Paid'`
   - `phone_validated = true`
2. Check Vapi API key is set in Vercel
3. Check call logs in database:
   ```sql
   SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📊 What the Cron Job Does

Every 15 minutes, it:
1. ✅ Finds customers due for calls (based on timezone + time preference)
2. ✅ Adds them to call queue
3. ✅ Processes queue (makes Vapi API calls)
4. ✅ Logs all attempts
5. ✅ Retries failed calls automatically

**Window:** Calls scheduled within 20-minute window are processed (allows for cron timing flexibility)

---

## 🎯 Next Steps After Cron Setup

1. ✅ Set up cron job (you're doing this now)
2. ⏭️ Add other environment variables to Vercel:
   - `VAPI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://Bedelulu.co`
3. ⏭️ Run database migration
4. ⏭️ Set up Stripe webhook
5. ⏭️ Test full flow!

---

## 📝 Quick Reference

**Endpoint:** `https://Bedelulu.co/api/calls/process`  
**Method:** `GET`  
**Schedule:** `*/15 * * * *` (every 15 minutes)  
**Header:** `Authorization: Bearer YOUR_CRON_SECRET`  
**Timeout:** 60 seconds  

---

**Last Updated:** $(date)  
**Status:** Ready for setup ⏳

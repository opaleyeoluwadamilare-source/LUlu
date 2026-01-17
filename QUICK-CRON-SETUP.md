# ⚡ Quick Cron Setup for Bedelulu.co

## 🎯 Your Specific Configuration

### Cron Job Details:
```
URL:      https://Bedelulu.co/api/calls/process
Method:   GET
Schedule: Every 15 minutes (*/15 * * * *)
Header:   Authorization: Bearer 5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997
```

---

## ✅ 3-Step Setup

### Step 1: Add Secrets to Vercel (2 minutes)

1. Go to: **https://vercel.com/your-project/settings/environment-variables**
2. Add these two environment variables:

```env
CRON_SECRET=5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997
MIGRATION_SECRET=11f18e21e8992ec428819c6e20f3de1066d866ef720fdfa2660feb5e1a3e208c
```

3. Make sure to add them to **Production**, **Preview**, AND **Development**
4. Click **Save**
5. **Redeploy** your app (or it will auto-deploy)

---

### Step 2: Set Up Cron-job.org (5 minutes)

1. **Sign up:** https://cron-job.org/en/signup/
   - Free account, no credit card needed

2. **Create New Cronjob:**
   - Click **"Create cronjob"** button

3. **Fill in these exact values:**

   | Field | Value |
   |-------|-------|
   | **Title** | `Bedelulu - Process Calls` |
   | **URL** | `https://Bedelulu.co/api/calls/process` |
   | **Method** | `GET` |
   | **Schedule** | Click "Every 15 minutes" button |

4. **Add Authorization Header:**
   - Scroll to **"Request headers"**
   - Click **"Add header"**
   - **Name:** `Authorization`
   - **Value:** `Bearer 5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997`

5. **Advanced Settings:**
   - Timeout: `60` seconds
   - Make sure **"Enabled"** is checked ✅

6. **Save:**
   - Click **"Create cronjob"**
   - Verify it shows as **"Enabled"** (green toggle)

---

### Step 3: Test It's Working (2 minutes)

**Option A: Wait 15 minutes**
- Check Cron-job.org dashboard
- Look for green checkmark ✅
- Click on the job to see response logs

**Option B: Test Manually Right Now**
```bash
curl -X GET https://Bedelulu.co/api/calls/process \
  -H "Authorization: Bearer 99dd33e2d82e741b3687a9633e3b46fe74dee60582ed8b949ea4d048222c879d"
```

**Expected Response:**
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

## 🎉 That's It!

Your cron job is now set up. It will:
- ✅ Run every 15 minutes automatically
- ✅ Check for customers due for calls
- ✅ Process the call queue
- ✅ Handle retries automatically

---

## 📊 Monitor Your Cron Job

### Check Cron-job.org Dashboard:
- Go to: https://cron-job.org/en/members/jobs/
- See execution history
- View response logs
- Check success rate

### Check Vercel Logs:
- Go to: https://vercel.com/your-project
- Click **"Logs"** tab
- Filter by `/api/calls/process`
- Look for successful executions

---

## 🚨 Common Issues

### "Unauthorized" Error
- Make sure `CRON_SECRET` is added to Vercel
- Verify you redeployed after adding it
- Check the Authorization header is exactly: `Bearer 99dd33e2d82e741b3687a9633e3b46fe74dee60582ed8b949ea4d048222c879d`

### No Calls Being Made
- Check you have customers with `payment_status = 'Paid'` in database
- Verify `VAPI_API_KEY` is set in Vercel
- Make sure database migration is complete

### Timeout Errors
- This is normal if processing many customers
- Endpoint handles timeouts gracefully
- Customers will be processed in next run (15 min later)

---

## 📞 Need Help?

Check the detailed guide: `CRON-SETUP-GUIDE.md`

---

**Endpoint:** https://Bedelulu.co/api/calls/process  
**Schedule:** Every 15 minutes  
**Status:** Ready to activate! 🚀

# Stripe Webhook Setup Guide

## 🎯 Overview

Webhooks are needed to automatically update payment status in your database when a customer completes payment. You have two options:

1. **Local Development**: Use Stripe CLI to forward webhooks to localhost
2. **Production**: Deploy your app first, then configure webhook in Stripe Dashboard

---

## 🏠 Option 1: Local Development (No Deployment Needed)

### Step 1: Install Stripe CLI

**Windows:**
```powershell
# Using Scoop
scoop install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases
```

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### Step 3: Forward Webhooks to Localhost

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will:
- Forward all Stripe events to your local server
- Display a webhook signing secret (starts with `whsec_`)
- Show you all webhook events in real-time

### Step 4: Copy the Webhook Secret

When you run `stripe listen`, you'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy this secret and add it to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Restart Your Dev Server

```bash
npm run dev
```

### Step 6: Test the Webhook

1. Complete a test payment
2. Watch the `stripe listen` terminal - you should see the webhook event
3. Check your database - payment status should update to "Paid"

---

## 🚀 Option 2: Production (Deploy First)

### Step 1: Deploy Your App

Deploy to Vercel, Netlify, or your hosting platform. Make sure:
- Environment variables are set (STRIPE_SECRET_KEY, etc.)
- The app is accessible at a public URL (e.g., `https://yoursite.com`)

### Step 2: Configure Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Set **Endpoint URL** to: `https://yoursite.com/api/webhooks/stripe`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
5. Click **"Add endpoint"**

### Step 3: Copy the Webhook Signing Secret

1. After creating the endpoint, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** and copy the secret (starts with `whsec_`)

### Step 4: Add Webhook Secret to Environment Variables

**In your hosting platform (Vercel/Netlify/etc.):**
1. Go to your project settings
2. Find "Environment Variables"
3. Add:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
4. Redeploy your app

**Or in `.env.local` for local testing:**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Test the Webhook

1. Complete a test payment on your live site
2. Check Stripe Dashboard → Webhooks → Your endpoint
3. You should see successful webhook deliveries
4. Check your database - payment status should update to "Paid"

---

## 🔍 Verify Webhook is Working

### Check Webhook Logs in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. View "Recent deliveries" - you should see successful requests

### Check Your Database

After a successful payment, run:
```sql
SELECT email, payment_status, stripe_customer_id 
FROM customers 
WHERE payment_status = 'Paid';
```

You should see the customer with `payment_status = 'Paid'` and their Stripe IDs populated.

---

## ⚠️ Important Notes

1. **Webhook Secret is Different for Local vs Production**
   - Local: Use the secret from `stripe listen`
   - Production: Use the secret from Stripe Dashboard

2. **Webhook Events**
   - Currently listening for: `checkout.session.completed`
   - This fires when a customer successfully completes payment

3. **Webhook Security**
   - Always verify webhook signatures (already implemented in your code)
   - Never expose your webhook secret
   - Use HTTPS in production

4. **Testing**
   - Use Stripe test mode for safe testing
   - Test webhooks before going live

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events

1. **Check endpoint URL is correct** in Stripe Dashboard
2. **Verify webhook secret** matches in your environment variables
3. **Check server logs** for webhook errors
4. **Ensure HTTPS** is enabled in production

### "Invalid signature" Error

- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- Restart your server after adding the secret
- For local: Use the secret from `stripe listen`, not from Dashboard

### Webhook Receives Events But Database Not Updating

1. Check database connection
2. Check webhook logs in Stripe Dashboard for error details
3. Verify customer email matches in database

---

## ✅ Quick Checklist

**For Local Development:**
- [ ] Stripe CLI installed
- [ ] `stripe listen` running
- [ ] Webhook secret added to `.env.local`
- [ ] Dev server restarted
- [ ] Test payment completed
- [ ] Database updated to "Paid"

**For Production:**
- [ ] App deployed to public URL
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to hosting platform env vars
- [ ] App redeployed
- [ ] Test payment completed
- [ ] Database updated to "Paid"


# 🚀 Complete Setup Checklist

## ✅ What's Already Done

- [x] Onboarding flow with 9 steps
- [x] Timezone detection and selection
- [x] Progress persistence (localStorage)
- [x] PostgreSQL database integration
- [x] Database schema and API endpoints
- [x] Stripe Checkout Sessions (with cancel_url)
- [x] Webhook endpoint (`/api/webhooks/stripe`)
- [x] Thank you page
- [x] Auto-restore progress when returning from Stripe

---

## 🔧 What You Need to Do Now

### 1. Environment Variables Setup

Make sure your `.env.local` has all these variables:

```env
# Database (✅ Already set)
EXTERNAL_DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r

# Stripe Keys (Replace with your actual keys)
STRIPE_SECRET_KEY=sk_live_XXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX

# ⚠️ MISSING: Webhook Secret (get from Stripe CLI or Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ⚠️ MISSING: Site URL (your production URL or localhost for testing)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# For production: NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

### 2. Get Webhook Secret

**For Local Testing:**
```bash
# Install Stripe CLI if needed
# Then run:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret it shows (starts with whsec_)
# Add to .env.local as STRIPE_WEBHOOK_SECRET
```

**For Production:**
1. Deploy your app first
2. Go to: https://dashboard.stripe.com/webhooks
3. Add endpoint: `https://yoursite.com/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Copy the signing secret
6. Add to your hosting platform's environment variables

### 3. Set Site URL

**For Local Development:**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**For Production:**
```env
NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

### 4. Restart Dev Server

After adding environment variables:
```bash
npm run dev
```

**Important:** `NEXT_PUBLIC_` variables require a server restart to be loaded!

---

## 🧪 Testing Checklist

### Test 1: Database Connection
- [ ] Start dev server: `npm run dev`
- [ ] Go to: http://localhost:3000/signup
- [ ] Fill out the form and submit
- [ ] Check console for "Database save" success message
- [ ] Verify data saved in PostgreSQL

### Test 2: Stripe Checkout
- [ ] Select a plan (Starter or Full)
- [ ] Should redirect to Stripe checkout page
- [ ] Click "Cancel" on Stripe page
- [ ] Should return to signup page with progress restored
- [ ] All form data should still be there

### Test 3: Complete Payment (Test Mode Recommended)
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Complete payment
- [ ] Should redirect to `/thank-you` page
- [ ] Check database - `payment_status` should be "Paid"

### Test 4: Webhook (After Payment)
- [ ] If using Stripe CLI: Check terminal for webhook event
- [ ] If in production: Check Stripe Dashboard → Webhooks → Recent deliveries
- [ ] Verify webhook shows "200 OK" response
- [ ] Check database - customer should have `stripe_customer_id` and `stripe_subscription_id`

---

## 🚨 Common Issues & Fixes

### Issue: "Database save failed"
**Fix:** 
- Check `EXTERNAL_DATABASE_URL` is correct
- Verify database is accessible
- Check network connection

### Issue: "Stripe link not configured"
**Fix:**
- Restart dev server after adding `NEXT_PUBLIC_` variables
- Check `NEXT_PUBLIC_SITE_URL` is set

### Issue: "Webhook signature verification failed"
**Fix:**
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- For local: Use secret from `stripe listen`
- For production: Use secret from Stripe Dashboard
- Restart server after adding secret

### Issue: "Invalid Stripe link"
**Fix:**
- Checkout Sessions are created dynamically now
- No need for `NEXT_PUBLIC_STRIPE_STARTER_LINK` or `NEXT_PUBLIC_STRIPE_FULL_LINK`
- Make sure `STRIPE_SECRET_KEY` is set

---

## 📋 Pre-Launch Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database connection working
- [ ] Stripe checkout working
- [ ] Cancel button returns to signup
- [ ] Webhook receiving events
- [ ] Database updating on payment
- [ ] Thank you page showing correctly
- [ ] Test with real payment (small amount)
- [ ] Verify email notifications (if added)
- [ ] Check mobile responsiveness
- [ ] Test all 9 onboarding steps
- [ ] Verify progress restoration works

---

## 🎯 Next Steps

1. **Add missing environment variables** (webhook secret, site URL)
2. **Restart dev server**
3. **Test the full flow** (signup → payment → webhook)
4. **Deploy to production** when ready
5. **Configure production webhook** in Stripe Dashboard

---

## 📚 Documentation Files

- `WEBHOOK-SETUP.md` - Detailed webhook setup guide
- `STRIPE-SETUP.md` - Stripe configuration guide
- `README-DATABASE.md` - Database setup guide

---

## ✅ You're Almost Ready!

The code is complete. You just need to:
1. Add the webhook secret
2. Set the site URL
3. Restart your server
4. Test the flow

Then you're good to go! 🚀


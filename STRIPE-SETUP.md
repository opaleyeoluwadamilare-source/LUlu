# Stripe Configuration Guide

## ✅ What's Already Configured

- **Secret Key**: Added to `.env.local` (LIVE key)
- **Publishable Key**: Added to `.env.local` (LIVE key)
- **Webhook Endpoint**: `/api/webhooks/stripe` (ready to receive events)

## ⚠️ Important: You're Using LIVE Keys

These are **LIVE/Production** Stripe keys, which means:
- **Real charges will be processed**
- **Real money will be collected**
- Make sure your payment links are configured correctly

## 🔧 Still Need to Configure

### 1. Stripe Payment Links

You need to create Payment Links in your Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/products
2. Create two products:
   - **Starter Plan**: $29/month
   - **Full Delusion Plan**: $49/month
3. Create Payment Links for each product
4. Configure the redirect URLs:
   - **Success URL**: `https://yoursite.com/thank-you`
   - **Cancel URL**: `https://yoursite.com/signup`
5. Copy the Payment Link URLs and add to `.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_STARTER_LINK=https://buy.stripe.com/XXXXX
   NEXT_PUBLIC_STRIPE_FULL_LINK=https://buy.stripe.com/XXXXX
   ```

### 2. Stripe Webhook Secret

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL to: `https://yoursite.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_XXXXX
   ```

### 3. Site URL

Add your production site URL to `.env.local`:
```
NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

## 📋 Complete .env.local Template

```env
# Database
EXTERNAL_DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r

# Stripe (LIVE KEYS - Replace with your actual keys)
STRIPE_SECRET_KEY=sk_live_XXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Stripe Payment Links
NEXT_PUBLIC_STRIPE_STARTER_LINK=https://buy.stripe.com/XXXXX
NEXT_PUBLIC_STRIPE_FULL_LINK=https://buy.stripe.com/XXXXX

# Site URL
NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

## 🧪 Testing

### Test Mode (Recommended First)

Before going live, consider testing with test keys:
1. Get test keys from: https://dashboard.stripe.com/test/apikeys
2. Replace the live keys in `.env.local` temporarily
3. Test the full flow
4. Switch back to live keys when ready

### Webhook Testing

Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## ⚠️ Security Notes

- **Never commit `.env.local` to git** (already in `.gitignore`)
- **Never share your secret keys publicly**
- **Use environment variables in production** (Vercel, Render, etc.)
- **Rotate keys if they're ever exposed**

## ✅ Checklist

- [x] Secret key added
- [x] Publishable key added
- [ ] Payment links created and added
- [ ] Webhook endpoint configured
- [ ] Webhook secret added
- [ ] Site URL configured
- [ ] Tested payment flow
- [ ] Webhook tested


# Payment Methods Setup Guide

## ✅ Payment Links Created

Your Stripe Payment Links have been created and added to `.env.local`:

- **Starter Plan**: https://buy.stripe.com/bJecN70fN1ja3qjcN34wM03
- **Full Delusion Plan**: https://buy.stripe.com/fZu7sN2nVd1SaSLdR74wM04

## 💳 Enabling Payment Methods

### Current Status
- ✅ **Card payments**: Enabled
- ⏳ **Link**: Needs to be enabled in Stripe dashboard
- ⏳ **Apple Pay**: Auto-enabled when account is verified
- ⏳ **Google Pay**: Auto-enabled when account is verified

### Step 1: Enable Stripe Link

1. Go to: https://dashboard.stripe.com/account/payments/settings
2. Scroll to "Payment methods"
3. Find "Link" and toggle it ON
4. Save changes

### Step 2: Update Payment Links (After Enabling Link)

Once Link is enabled, run:

```bash
node scripts/enable-payment-methods.js
```

This will update your payment links to include Link as a payment option.

### Step 3: Apple Pay & Google Pay

**Apple Pay** and **Google Pay** are automatically enabled and will appear in checkout when:

- ✅ Your Stripe account is verified (business information complete)
- ✅ Customer is on a supported device:
  - **Apple Pay**: iOS devices, Safari on Mac
  - **Google Pay**: Android devices, Chrome browser
- ✅ Customer has Apple Pay/Google Pay set up on their device
- ✅ Payment amount is within supported limits

**No additional configuration needed!** They'll appear automatically in your payment links.

## 🧪 Testing Payment Methods

### Test Card Payments
Use Stripe test cards: https://stripe.com/docs/testing

### Test Apple Pay
- Use an iOS device or Safari on Mac
- Visit your payment link
- Apple Pay button should appear automatically

### Test Google Pay
- Use an Android device or Chrome browser
- Visit your payment link
- Google Pay button should appear automatically

### Test Link
- After enabling Link in dashboard
- Visit your payment link
- "Pay with Link" option should appear

## 📋 Payment Link Features

Your payment links include:
- ✅ Automatic redirect to `/thank-you` after payment
- ✅ Promotion codes enabled
- ✅ Billing address collection required
- ✅ Recurring monthly subscriptions
- ✅ Mobile-optimized checkout

## 🔄 Updating Payment Links

If you need to update payment links later:

1. **Via Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/payment-links
   - Click on a payment link
   - Edit settings
   - Save changes

2. **Via Script**:
   - Update `scripts/enable-payment-methods.js`
   - Run: `node scripts/enable-payment-methods.js`

## ⚠️ Important Notes

- Payment links are **LIVE** - real charges will be processed
- Apple Pay/Google Pay appear automatically - no code changes needed
- Link must be enabled in dashboard before it appears
- All payment methods work on mobile and desktop

## ✅ Checklist

- [x] Payment links created
- [x] Links added to `.env.local`
- [ ] Link enabled in Stripe dashboard
- [ ] Payment links updated (run script after enabling Link)
- [ ] Tested card payments
- [ ] Tested on mobile device (for Apple Pay/Google Pay)
- [ ] Verified redirect to thank-you page


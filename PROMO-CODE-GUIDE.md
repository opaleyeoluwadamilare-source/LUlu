# 🎟️ Promo Code Guide

## Overview

This guide explains how to create and manage promo codes for your friends to try out Bedelulu with discounts.

## ✅ What's Already Set Up

- ✅ Checkout supports promo codes (`allow_promotion_codes: true`)
- ✅ Works with both Starter ($29) and Full ($49) plans
- ✅ Webhook tracks promo code usage
- ✅ Automatic discount application in Stripe checkout

## 🚀 Quick Start

### Create Your First Promo Code

1. **Open the script:**
   ```bash
   # Edit scripts/create-promo-code.js
   # Configure your promo code settings at the top
   ```

2. **Configure your code:**
   ```javascript
   const promoConfig = {
     code: 'FRIEND50',           // Code users enter
     discountType: 'percentage',  // 'percentage' or 'amount_off'
     discountValue: 50,           // 50% off
     duration: 'once',            // 'once', 'forever', or 'repeating'
     maxRedemptions: 50,          // Limit uses
     description: '50% off first month for friends'
   }
   ```

3. **Run the script:**
   ```bash
   node scripts/create-promo-code.js
   ```

4. **Share the code with friends!**

## 📋 Common Promo Code Configurations

### 50% Off First Month (Recommended)
```javascript
code: 'FRIEND50',
discountType: 'percentage',
discountValue: 50,
duration: 'once',
maxRedemptions: 100
```
**Result:** First month $14.50 (Starter) or $24.50 (Full), then full price

### Free First Month
```javascript
code: 'FREEMONTH',
discountType: 'percentage',
discountValue: 100,
duration: 'once',
maxRedemptions: 50
```
**Result:** First month FREE, then $29/$49 per month

### $10 Off First Month
```javascript
code: 'SAVE10',
discountType: 'amount_off',
discountValue: 1000,  // $10.00 in cents
duration: 'once',
maxRedemptions: 100
```
**Result:** First month $19 (Starter) or $39 (Full), then full price

### 25% Off for 3 Months
```javascript
code: 'FRIEND25',
discountType: 'percentage',
discountValue: 25,
duration: 'repeating',
durationInMonths: 3,
maxRedemptions: 50
```
**Result:** 25% off for first 3 months, then full price

## 🎯 How Users Apply Promo Codes

1. User goes to signup page
2. Selects a plan (Starter or Full)
3. Completes the signup form
4. Redirected to Stripe checkout
5. Clicks **"Add promotion code"** link
6. Enters your promo code (e.g., "FRIEND50")
7. Discount applies automatically
8. Completes payment

## 📊 Tracking Promo Code Usage

### In Stripe Dashboard

1. Go to: https://dashboard.stripe.com/promotion_codes
2. Find your promo code
3. See:
   - Total redemptions
   - Remaining uses
   - Revenue impact

### In Server Logs

When a promo code is used, you'll see:
```
🎟️  Promo code used: FRIEND50 - $14.50 discount applied
```

## ⚙️ Advanced Configuration

### Expiration Dates

Set a code to expire:
```javascript
expiresAt: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
```

### Unlimited Uses

Remove usage limit:
```javascript
maxRedemptions: null  // Unlimited
```

### Forever Discount

Apply discount to all future payments:
```javascript
duration: 'forever'
```

## 🔒 Security & Best Practices

### Code Format Rules
- ✅ Uppercase letters and numbers only
- ✅ Max 20 characters
- ✅ Examples: `FRIEND50`, `TRYIT`, `BETA2024`
- ❌ No spaces, special characters, or lowercase

### Usage Limits
- Set `maxRedemptions` to control costs
- Monitor usage in Stripe Dashboard
- Deactivate codes when needed

### Expiration
- Set expiration dates for time-limited offers
- Prevents old codes from being used indefinitely

## 🛠️ Managing Promo Codes

### View All Codes
- Stripe Dashboard: https://dashboard.stripe.com/promotion_codes

### Deactivate a Code
1. Go to Stripe Dashboard
2. Find the promotion code
3. Click "Deactivate"

### Update a Code
- You can't modify existing codes
- Create a new code with different settings
- Deactivate the old one

### Check Usage
- View redemptions in Stripe Dashboard
- Check server logs for usage tracking

## ❓ FAQ

### Q: Do users need to enter a credit card?
**A:** Yes, even with 100% off codes. This is standard for subscriptions - the card is needed for future billing.

### Q: Can I create multiple codes?
**A:** Yes! Run the script multiple times with different configurations.

### Q: What if a code is already used?
**A:** Stripe prevents duplicate use per customer (if configured). Each redemption counts toward `maxRedemptions`.

### Q: Can I change a code after creation?
**A:** No, but you can deactivate it and create a new one.

### Q: Do codes work with both plans?
**A:** Yes! The same code works for both Starter ($29) and Full ($49) plans.

### Q: What happens when max redemptions is reached?
**A:** Stripe automatically rejects the code. Users see an error message.

## 🐛 Troubleshooting

### Code Not Working
1. Check code is active in Stripe Dashboard
2. Verify `maxRedemptions` hasn't been reached
3. Check expiration date hasn't passed
4. Ensure code format is correct (uppercase, alphanumeric)

### Script Errors
1. Verify `STRIPE_SECRET_KEY` is set in `.env.local`
2. Check code format matches requirements
3. Ensure discount values are valid (1-100 for percentage)
4. Check Stripe Dashboard for existing codes

### Discount Not Applying
1. Verify `allow_promotion_codes: true` in checkout (already set)
2. Check code is active in Stripe
3. Verify code hasn't expired
4. Check usage limits

## 📝 Example Workflow

1. **Create code:**
   ```bash
   node scripts/create-promo-code.js
   ```

2. **Share with friends:**
   - "Hey! Try Bedelulu with code FRIEND50 for 50% off your first month! 🚀"

3. **Monitor usage:**
   - Check Stripe Dashboard
   - Review server logs

4. **Adjust as needed:**
   - Create new codes for different offers
   - Deactivate old codes when done

## ✅ Checklist

- [ ] Promo code script created
- [ ] First promo code created
- [ ] Code shared with friends
- [ ] Stripe Dashboard access configured
- [ ] Usage tracking verified
- [ ] Server logs checked for promo code usage

---

**Need help?** Check Stripe documentation: https://stripe.com/docs/billing/subscriptions/coupons


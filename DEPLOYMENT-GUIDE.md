# 🚀 Deployment Guide: GitHub + Vercel

## Step 1: Initialize Git & Push to GitHub

### 1.1 Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Complete onboarding flow with Stripe integration"
```

### 1.2 Create GitHub Repository

1. Go to: https://github.com/new
2. Create a new repository (don't initialize with README)
3. Copy the repository URL

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub to Vercel

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. Click **"Import"**

### 2.2 Configure Project Settings

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 2.3 Add Environment Variables

**⚠️ CRITICAL: Add all these environment variables in Vercel:**

Go to **Project Settings → Environment Variables** and add:

```env
# Database
EXTERNAL_DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r

# Stripe (LIVE KEYS - Replace with your actual keys)
STRIPE_SECRET_KEY=sk_live_XXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX

# ⚠️ IMPORTANT: Get this after deployment (see Step 3)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ⚠️ IMPORTANT: Use your Vercel deployment URL
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**Important Notes:**
- Add each variable one by one
- Make sure to add them for **Production**, **Preview**, and **Development** environments
- `NEXT_PUBLIC_SITE_URL` should be your Vercel URL (you'll get this after first deploy)

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Copy your deployment URL (e.g., `https://your-app.vercel.app`)

---

## Step 3: Configure Stripe Webhook (After Deployment)

### 3.1 Get Your Production URL

After Vercel deployment, you'll get a URL like:
- `https://your-app.vercel.app`
- Or custom domain if you set one up

### 3.2 Set Up Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/stripe`
4. **Description**: "Production webhook for payment updates"
5. **Events to send**: Select `checkout.session.completed`
6. Click **"Add endpoint"**

### 3.3 Get Webhook Secret

1. After creating the endpoint, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** and copy the secret (starts with `whsec_`)

### 3.4 Add Webhook Secret to Vercel

1. Go back to Vercel → Your Project → Settings → Environment Variables
2. Add: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx` (use the secret you just copied)
3. **Redeploy** your application (Vercel will auto-redeploy or click "Redeploy")

---

## Step 4: Update Site URL (If Needed)

If you set a custom domain or want to update `NEXT_PUBLIC_SITE_URL`:

1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_SITE_URL` to your final URL
3. Redeploy

---

## Step 5: Test Everything

### 5.1 Test Database Connection

1. Visit: `https://your-app.vercel.app/signup`
2. Fill out the form
3. Check if data saves to database

### 5.2 Test Stripe Checkout

1. Select a plan
2. Should redirect to Stripe checkout
3. Click "Cancel" → Should return to signup page
4. Complete a test payment

### 5.3 Test Webhook

1. Complete a test payment
2. Go to Stripe Dashboard → Webhooks → Your endpoint
3. Check "Recent deliveries" - should show successful webhook
4. Check your database - `payment_status` should be "Paid"

---

## 🔒 Security Checklist

- [x] `.env.local` is in `.gitignore` (already done)
- [ ] Environment variables added to Vercel (not in code)
- [ ] Webhook secret is secure
- [ ] Using HTTPS (Vercel provides this automatically)
- [ ] Database credentials are secure

---

## 🐛 Troubleshooting

### Build Fails

- Check build logs in Vercel
- Make sure all dependencies are in `package.json`
- Check for TypeScript errors

### Environment Variables Not Working

- Make sure you added them in Vercel (not just `.env.local`)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Webhook Not Working

- Verify webhook URL is correct in Stripe Dashboard
- Check `STRIPE_WEBHOOK_SECRET` is set in Vercel
- Check Vercel function logs for errors
- Make sure webhook endpoint is accessible (not blocked)

### Database Connection Issues

- Verify `EXTERNAL_DATABASE_URL` is correct
- Check if database allows connections from Vercel IPs
- Check database is not paused (Render free tier pauses after inactivity)

---

## 📋 Quick Checklist

**Before Deployment:**
- [ ] Code committed to GitHub
- [ ] `.env.local` is NOT committed (check `.gitignore`)
- [ ] All code is working locally

**During Deployment:**
- [ ] Repository connected to Vercel
- [ ] All environment variables added to Vercel
- [ ] First deployment successful

**After Deployment:**
- [ ] Webhook configured in Stripe Dashboard
- [ ] Webhook secret added to Vercel
- [ ] Site URL updated in Vercel
- [ ] Tested full payment flow
- [ ] Verified webhook is working

---

## 🎉 You're Live!

Once everything is tested and working, your app is live and ready to accept payments!

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Next.js Deployment: https://nextjs.org/docs/deployment


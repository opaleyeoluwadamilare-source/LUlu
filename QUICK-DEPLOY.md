# ⚡ Quick Deploy Steps

## 1. Push to GitHub

```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 2. Deploy to Vercel

1. Go to: https://vercel.com/new
2. Import your GitHub repository
3. **Add these environment variables** (Project Settings → Environment Variables):

```
EXTERNAL_DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r

STRIPE_SECRET_KEY=sk_live_XXXXX

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX

NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

4. Click **Deploy**
5. After deployment, copy your Vercel URL

## 3. Set Up Stripe Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy the webhook secret (starts with `whsec_`)
5. Add to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
6. Redeploy

## 4. Update Site URL

Update `NEXT_PUBLIC_SITE_URL` in Vercel to match your final URL, then redeploy.

Done! 🎉


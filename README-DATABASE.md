# PostgreSQL Database Setup

This project uses PostgreSQL on Render for data storage.

## Environment Variables

Add these to your `.env.local` file:

```env
# Render PostgreSQL Database
EXTERNAL_DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a.oregon-postgres.render.com/connections_ue6r

# Optional: Internal Database URL (for Render services)
DATABASE_URL=postgresql://connections_user:2Ru2D0EoL6ZNELR2wGUHopZx9vmTIvJP@dpg-d483c9qli9vc7392boa0-a/connections_ue6r

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX
NEXT_PUBLIC_STRIPE_STARTER_LINK=https://buy.stripe.com/XXXXX
NEXT_PUBLIC_STRIPE_FULL_LINK=https://buy.stripe.com/XXXXX
NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

## Database Schema

The database will automatically create the `customers` table on first use with the following schema:

- `id` - Primary key (auto-increment)
- `name` - Customer name
- `email` - Customer email (unique)
- `phone` - Customer phone number
- `timezone` - Customer timezone
- `call_time` - Scheduled call time
- `goals` - Customer goals (text)
- `biggest_insecurity` - Customer insecurity (text)
- `delusion_level` - Selected delusion level
- `plan` - Selected plan (starter/full)
- `payment_status` - Payment status (Pending/Paid)
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Stripe subscription ID
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

## Initialize Database

The database will automatically initialize on first API call. You can also manually initialize it:

1. **Via API endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/database/init
   ```

2. **Via script (requires dotenv):**
   ```bash
   npm install dotenv
   node scripts/init-database.js
   ```

## Testing the Connection

After setting up your `.env.local`, restart your dev server:

```bash
npm run dev
```

The database will automatically create the table structure on the first submission.

## API Endpoints

- `POST /api/database/submit` - Submit customer data
- `POST /api/database/init` - Initialize database schema
- `POST /api/webhooks/stripe` - Stripe webhook handler (updates payment status)

## Notes

- The database uses SSL connections (required for Render PostgreSQL)
- Email addresses are unique - duplicate emails will update existing records
- Payment status is updated automatically via Stripe webhooks


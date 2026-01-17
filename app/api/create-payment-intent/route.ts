import { NextRequest, NextResponse } from 'next/server'

// Dynamic import to avoid issues if Stripe is not installed
let stripe: any = null
async function getStripe() {
  if (!stripe) {
    const Stripe = (await import('stripe')).default
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })
  }
  return stripe
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, customerEmail } = body

    // Log customer info for debugging
    if (customerId) {
      console.log(`🆔 Creating checkout for customer ID: ${customerId}`)
    }

    const stripe = await getStripe()

    // Get site URL from request headers (most reliable) or environment variable
    // This ensures it works in all environments without requiring Vercel login
    const origin = request.headers.get('origin') || 
                   request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   request.headers.get('host') ? 
                     (request.headers.get('host')?.includes('localhost') ? 
                       `http://${request.headers.get('host')}` : 
                       `https://${request.headers.get('host')}`) : null
    
    // Use origin from request, fallback to env var, then to production domain
    let siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.com'
    
    // Ensure URL doesn't have trailing slash and is properly formatted
    siteUrl = siteUrl.replace(/\/$/, '')
    
    // Log for debugging (remove in production if needed)
    console.log('🔗 Payment redirect URL:', siteUrl)
    console.log('🔍 Request headers:', {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host')
    })
    
    // Single plan: $1/day = $30/month
    const amount = 3000 // $30.00/month in cents

    console.log(`💰 Creating checkout: $${(amount / 100).toFixed(2)}/month`)

    // Create a checkout session for subscription with 7-day free trial
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Lulu Daily Calls - $1/Day',
              description: 'Daily phone calls from Lulu with personalized affirmations, real companionship, and accountability. Billed monthly at $30.',
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/signup`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      // Store customer database ID for reliable webhook lookup
      client_reference_id: customerId || undefined,
      // Pre-fill email from signup form (improves UX)
      customer_email: customerEmail || undefined,
      metadata: {
        plan: 'standard',
        customer_id: customerId || '', // Backup in metadata
        form_email: customerEmail || '', // Original email from form
      },
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
      },
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 }
    )
  }
}


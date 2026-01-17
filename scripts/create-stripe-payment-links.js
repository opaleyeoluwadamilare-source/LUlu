// Script to create Stripe Payment Links with Apple Pay, Google Pay, and Link enabled
require('dotenv').config({ path: '.env.local' })

const Stripe = require('stripe')

async function createPaymentLinks() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
    process.exit(1)
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    console.log('🔄 Creating Stripe products and payment links...\n')

    // Create Starter Plan Product
    console.log('📦 Creating Starter Plan product...')
    const starterProduct = await stripe.products.create({
      name: 'Starter Plan',
      description: '5 calls/week (Mon-Fri), 2-minute calls, Standard confidence scripts',
    })

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    })

    console.log('✅ Starter product created:', starterProduct.id)
    console.log('   Price ID:', starterPrice.id)

    // Create Full Delusion Plan Product
    console.log('\n📦 Creating Full Delusion Plan product...')
    const fullProduct = await stripe.products.create({
      name: 'Full Delusion Plan',
      description: '7 calls/week (Daily), 3-minute calls, Personalized scripts, Emergency text boost',
    })

    const fullPrice = await stripe.prices.create({
      product: fullProduct.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    })

    console.log('✅ Full Delusion product created:', fullProduct.id)
    console.log('   Price ID:', fullPrice.id)

    // Create Payment Link for Starter Plan
    console.log('\n🔗 Creating Starter Plan payment link...')
    const starterPaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: starterPrice.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${siteUrl}/thank-you`,
        },
      },
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        cancel_url: `${siteUrl}/signup`,
        return_url: `${siteUrl}/signup`,
      },
    })

    console.log('✅ Starter payment link created!')
    console.log('   URL:', starterPaymentLink.url)

    // Create Payment Link for Full Delusion Plan
    console.log('\n🔗 Creating Full Delusion Plan payment link...')
    const fullPaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: fullPrice.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${siteUrl}/thank-you`,
        },
      },
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        cancel_url: `${siteUrl}/signup`,
        return_url: `${siteUrl}/signup`,
      },
    })

    console.log('✅ Full Delusion payment link created!')
    console.log('   URL:', fullPaymentLink.url)

    // Output for .env.local
    console.log('\n' + '='.repeat(60))
    console.log('📝 Add these to your .env.local file:')
    console.log('='.repeat(60))
    console.log(`NEXT_PUBLIC_STRIPE_STARTER_LINK=${starterPaymentLink.url}`)
    console.log(`NEXT_PUBLIC_STRIPE_FULL_LINK=${fullPaymentLink.url}`)
    console.log('='.repeat(60))
    console.log('\n✅ Payment links created successfully!')
    console.log('💳 Payment method enabled: Card')
    console.log('\n📱 To enable Apple Pay, Google Pay, and Link:')
    console.log('   1. Go to: https://dashboard.stripe.com/account/payments/settings')
    console.log('   2. Enable "Link" in Payment methods')
    console.log('   3. Apple Pay and Google Pay are automatically available if your account is verified')
    console.log('   4. They will appear automatically in checkout once enabled\n')

  } catch (error) {
    console.error('❌ Error creating payment links:', error.message)
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Details:', error.raw?.message)
    }
    process.exit(1)
  }
}

createPaymentLinks()


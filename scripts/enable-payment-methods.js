// Script to update existing payment links to enable Link, Apple Pay, and Google Pay
// Run this AFTER enabling Link in your Stripe dashboard
require('dotenv').config({ path: '.env.local' })

const Stripe = require('stripe')

async function enablePaymentMethods() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const starterLink = process.env.NEXT_PUBLIC_STRIPE_STARTER_LINK
  const fullLink = process.env.NEXT_PUBLIC_STRIPE_FULL_LINK

  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
    process.exit(1)
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    console.log('🔄 Updating payment links to enable Link, Apple Pay, and Google Pay...\n')

    // Extract payment link IDs from URLs
    const getPaymentLinkId = (url) => {
      const match = url.match(/\/plink_([a-zA-Z0-9]+)/)
      return match ? match[1] : null
    }

    if (starterLink) {
      const starterLinkId = getPaymentLinkId(starterLink)
      if (starterLinkId) {
        console.log('📝 Updating Starter Plan payment link...')
        try {
          await stripe.paymentLinks.update(starterLinkId, {
            payment_method_types: ['card', 'link'],
          })
          console.log('✅ Starter Plan payment link updated!')
        } catch (error) {
          if (error.message.includes('link is invalid')) {
            console.log('⚠️  Link is not enabled in your Stripe account yet')
            console.log('   Enable it at: https://dashboard.stripe.com/account/payments/settings')
          } else {
            throw error
          }
        }
      }
    }

    if (fullLink) {
      const fullLinkId = getPaymentLinkId(fullLink)
      if (fullLinkId) {
        console.log('\n📝 Updating Full Delusion Plan payment link...')
        try {
          await stripe.paymentLinks.update(fullLinkId, {
            payment_method_types: ['card', 'link'],
          })
          console.log('✅ Full Delusion Plan payment link updated!')
        } catch (error) {
          if (error.message.includes('link is invalid')) {
            console.log('⚠️  Link is not enabled in your Stripe account yet')
            console.log('   Enable it at: https://dashboard.stripe.com/account/payments/settings')
          } else {
            throw error
          }
        }
      }
    }

    console.log('\n✅ Payment links updated!')
    console.log('💳 Payment methods: Card, Link')
    console.log('📱 Apple Pay and Google Pay will appear automatically if:')
    console.log('   - Your Stripe account is verified')
    console.log('   - Customer is on a supported device/browser')
    console.log('   - Customer has Apple Pay/Google Pay set up\n')

  } catch (error) {
    console.error('❌ Error updating payment links:', error.message)
    process.exit(1)
  }
}

enablePaymentMethods()


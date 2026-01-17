// Script to update existing payment links with cancel URL support
// This adds metadata that can be used, but Stripe Payment Links use browser back button
require('dotenv').config({ path: '.env.local' })

const Stripe = require('stripe')

async function updatePaymentLinks() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.com'
  const starterLink = process.env.NEXT_PUBLIC_STRIPE_STARTER_LINK
  const fullLink = process.env.NEXT_PUBLIC_STRIPE_FULL_LINK

  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
    process.exit(1)
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    console.log('🔄 Updating payment links with return URLs...\n')

    // Extract payment link IDs from URLs
    const getPaymentLinkId = (url) => {
      // Payment link URLs are like: https://buy.stripe.com/XXXXX
      // We need to list payment links and find by URL, or extract ID if available
      const match = url.match(/\/plink_([a-zA-Z0-9]+)/)
      if (match) return match[1]
      
      // Try to extract from buy.stripe.com URL
      const buyMatch = url.match(/buy\.stripe\.com\/([a-zA-Z0-9]+)/)
      if (buyMatch) {
        // List all payment links and find the one matching this URL
        return null // Will need to list and match
      }
      return null
    }

    // List all payment links
    const paymentLinks = await stripe.paymentLinks.list({ limit: 100 })
    
    if (starterLink) {
      const starterLinkObj = paymentLinks.data.find(pl => pl.url === starterLink)
      if (starterLinkObj) {
        console.log('📝 Updating Starter Plan payment link...')
        try {
          await stripe.paymentLinks.update(starterLinkObj.id, {
            metadata: {
              cancel_url: `${siteUrl}/signup`,
              return_url: `${siteUrl}/signup`,
            },
          })
          console.log('✅ Starter Plan payment link updated!')
        } catch (error) {
          console.log('⚠️  Could not update Starter link:', error.message)
        }
      } else {
        console.log('⚠️  Starter payment link not found in your Stripe account')
      }
    }

    if (fullLink) {
      const fullLinkObj = paymentLinks.data.find(pl => pl.url === fullLink)
      if (fullLinkObj) {
        console.log('\n📝 Updating Full Delusion Plan payment link...')
        try {
          await stripe.paymentLinks.update(fullLinkObj.id, {
            metadata: {
              cancel_url: `${siteUrl}/signup`,
              return_url: `${siteUrl}/signup`,
            },
          })
          console.log('✅ Full Delusion Plan payment link updated!')
        } catch (error) {
          console.log('⚠️  Could not update Full link:', error.message)
        }
      } else {
        console.log('⚠️  Full Delusion payment link not found in your Stripe account')
      }
    }

    console.log('\n✅ Payment links updated!')
    console.log('📝 Note: Stripe Payment Links use the browser back button for cancellation')
    console.log('   When users click back, they will return to your site')
    console.log('   The signup page will automatically restore their progress\n')

  } catch (error) {
    console.error('❌ Error updating payment links:', error.message)
    process.exit(1)
  }
}

updatePaymentLinks()


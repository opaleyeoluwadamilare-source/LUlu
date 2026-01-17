// Script to create Stripe promo codes for friends to try out
// Production-ready with comprehensive error handling and validation
const fs = require('fs')
const path = require('path')

// Load .env.local manually to handle UTF-16 encoding
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    let content
    try {
      content = fs.readFileSync(envPath, 'utf8')
      // Check if it looks like UTF-16 (has null bytes)
      if (content.includes('\x00')) {
        content = fs.readFileSync(envPath, 'utf16le')
      }
    } catch (e) {
      content = fs.readFileSync(envPath, 'utf16le')
    }
    content.split(/\r?\n/).forEach(line => {
      line = line.trim()
      if (!line || line.startsWith('#')) return
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

const Stripe = require('stripe')

async function createPromoCode() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
    console.error('   Please add your Stripe secret key to .env.local')
    process.exit(1)
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-11-20.acacia'
  })

  // ============================================
  // CONFIGURE YOUR PROMO CODE HERE
  // ============================================
  const promoConfig = {
    // The code users will enter (e.g., "FRIEND50", "TRYIT", "BETA2024")
    // Must be uppercase, alphanumeric, max 20 characters
    code: 'FREEMONTH5',
    
    // Discount type: 'percentage' or 'amount_off'
    discountType: 'percentage', // or 'amount_off'
    
    // Discount value:
    // - For percentage: 50 = 50% off (1-100)
    // - For amount_off: 1000 = $10.00 off (in cents)
    discountValue: 100, // 100% off = FREE first month
    
    // Duration: 'once', 'forever', or 'repeating'
    // - 'once': Discount applies only to first payment
    // - 'forever': Discount applies to all payments
    // - 'repeating': Discount applies for X months (set durationInMonths)
    duration: 'once', // First month only
    
    // If duration is 'repeating', how many months?
    durationInMonths: null, // e.g., 3 for 3 months
    
    // Maximum number of times this code can be used (null = unlimited)
    maxRedemptions: 5, // Limit to 5 uses (for 5 friends)
    
    // Expiration date (null = never expires)
    // Format: Unix timestamp in seconds
    // Example: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
    expiresAt: null, // e.g., Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    
    // Description (optional, for your reference)
    description: 'Free first month for 5 friends'
  }

  // ============================================
  // VALIDATION
  // ============================================
  if (!promoConfig.code || typeof promoConfig.code !== 'string') {
    console.error('❌ Invalid promo code: Code must be a non-empty string')
    process.exit(1)
  }

  if (promoConfig.code.length > 20) {
    console.error('❌ Invalid promo code: Code must be 20 characters or less')
    process.exit(1)
  }

  if (!/^[A-Z0-9]+$/.test(promoConfig.code)) {
    console.error('❌ Invalid promo code: Code must contain only uppercase letters and numbers')
    process.exit(1)
  }

  if (promoConfig.discountType === 'percentage' && (promoConfig.discountValue < 1 || promoConfig.discountValue > 100)) {
    console.error('❌ Invalid discount: Percentage must be between 1 and 100')
    process.exit(1)
  }

  if (promoConfig.discountType === 'amount_off' && promoConfig.discountValue < 1) {
    console.error('❌ Invalid discount: Amount must be greater than 0')
    process.exit(1)
  }

  if (promoConfig.duration === 'repeating' && (!promoConfig.durationInMonths || promoConfig.durationInMonths < 1)) {
    console.error('❌ Invalid duration: durationInMonths must be set and >= 1 when duration is "repeating"')
    process.exit(1)
  }

  if (promoConfig.maxRedemptions !== null && promoConfig.maxRedemptions < 1) {
    console.error('❌ Invalid maxRedemptions: Must be >= 1 or null for unlimited')
    process.exit(1)
  }

  try {
    console.log('🎟️  Creating Stripe promo code...\n')
    console.log('📋 Configuration:')
    console.log(`   Code: ${promoConfig.code}`)
    console.log(`   Discount: ${promoConfig.discountValue}${promoConfig.discountType === 'percentage' ? '%' : ' cents'}`)
    console.log(`   Duration: ${promoConfig.duration}${promoConfig.duration === 'repeating' ? ` (${promoConfig.durationInMonths} months)` : ''}`)
    console.log(`   Max uses: ${promoConfig.maxRedemptions || 'Unlimited'}`)
    console.log(`   Expires: ${promoConfig.expiresAt ? new Date(promoConfig.expiresAt * 1000).toLocaleDateString() : 'Never'}`)
    console.log(`   Description: ${promoConfig.description || 'None'}\n`)

    // Step 1: Create the coupon (the discount itself)
    console.log('📦 Step 1: Creating coupon...')
    const couponId = `coupon_${promoConfig.code.toLowerCase()}`
    
    const couponData = {
      name: promoConfig.code,
      id: couponId,
      ...(promoConfig.discountType === 'percentage' 
        ? { percent_off: promoConfig.discountValue }
        : { amount_off: promoConfig.discountValue, currency: 'usd' }
      ),
      duration: promoConfig.duration,
      ...(promoConfig.duration === 'repeating' && promoConfig.durationInMonths 
        ? { duration_in_months: promoConfig.durationInMonths }
        : {}
      ),
    }

    let coupon
    try {
      coupon = await stripe.coupons.create(couponData)
      console.log('✅ Coupon created successfully')
      console.log(`   Coupon ID: ${coupon.id}`)
    } catch (error) {
      if (error.code === 'resource_already_exists') {
        console.log('⚠️  Coupon already exists, retrieving existing one...')
        try {
          coupon = await stripe.coupons.retrieve(couponId)
          console.log('✅ Using existing coupon')
          console.log(`   Coupon ID: ${coupon.id}`)
        } catch (retrieveError) {
          console.error('❌ Failed to retrieve existing coupon:', retrieveError.message)
          throw retrieveError
        }
      } else {
        throw error
      }
    }

    // Step 2: Create the promotion code (what users enter)
    console.log('\n🎫 Step 2: Creating promotion code...')
    const promotionCodeData = {
      coupon: coupon.id,
      code: promoConfig.code,
      ...(promoConfig.maxRedemptions ? { max_redemptions: promoConfig.maxRedemptions } : {}),
      ...(promoConfig.expiresAt ? { expires_at: promoConfig.expiresAt } : {}),
      metadata: {
        description: promoConfig.description || '',
        created_by: 'promo_code_script',
        created_at: new Date().toISOString()
      }
    }

    let promotionCode
    try {
      promotionCode = await stripe.promotionCodes.create(promotionCodeData)
      console.log('✅ Promotion code created successfully')
    } catch (error) {
      if (error.code === 'resource_already_exists') {
        console.log('⚠️  Promotion code already exists, checking existing codes...')
        try {
          // List existing codes and find this one
          const existingCodes = await stripe.promotionCodes.list({ 
            code: promoConfig.code, 
            limit: 1,
            active: true
          })
          
          if (existingCodes.data.length > 0) {
            promotionCode = existingCodes.data[0]
            console.log('✅ Using existing promotion code')
            console.log(`   Promotion Code ID: ${promotionCode.id}`)
          } else {
            // Try to find inactive ones
            const allCodes = await stripe.promotionCodes.list({ 
              code: promoConfig.code, 
              limit: 10
            })
            if (allCodes.data.length > 0) {
              console.log('⚠️  Found inactive promotion code. Reactivating...')
              promotionCode = await stripe.promotionCodes.update(allCodes.data[0].id, { active: true })
              console.log('✅ Reactivated promotion code')
            } else {
              throw new Error('Code exists but could not retrieve it')
            }
          }
        } catch (retrieveError) {
          console.error('❌ Failed to retrieve existing promotion code:', retrieveError.message)
          throw retrieveError
        }
      } else {
        throw error
      }
    }

    // Step 3: Display results
    console.log('\n' + '='.repeat(70))
    console.log('🎉 PROMO CODE CREATED SUCCESSFULLY!')
    console.log('='.repeat(70))
    console.log(`\n📝 Code: ${promotionCode.code}`)
    console.log(`💰 Discount: ${promoConfig.discountValue}${promoConfig.discountType === 'percentage' ? '%' : ' cents'}`)
    console.log(`⏱️  Duration: ${promoConfig.duration}${promoConfig.duration === 'repeating' ? ` (${promoConfig.durationInMonths} months)` : ''}`)
    console.log(`🔢 Uses: ${promotionCode.times_redeemed || 0}${promotionCode.max_redemptions ? ` / ${promotionCode.max_redemptions}` : ' / Unlimited'}`)
    console.log(`📅 Expires: ${promotionCode.expires_at ? new Date(promotionCode.expires_at * 1000).toLocaleDateString() : 'Never'}`)
    console.log(`✅ Status: ${promotionCode.active ? 'Active' : 'Inactive'}`)
    
    // Calculate example savings
    if (promoConfig.discountType === 'percentage') {
      const starterSavings = (29 * promoConfig.discountValue / 100).toFixed(2)
      const fullSavings = (49 * promoConfig.discountValue / 100).toFixed(2)
      console.log(`\n💵 Example savings:`)
      console.log(`   Starter Plan: $${starterSavings} off (from $29.00)`)
      console.log(`   Full Plan: $${fullSavings} off (from $49.00)`)
    } else {
      const savings = (promoConfig.discountValue / 100).toFixed(2)
      console.log(`\n💵 Savings: $${savings} off`)
    }

    console.log(`\n🔗 Share this code with friends: ${promotionCode.code}`)
    console.log('\n💡 How to use:')
    console.log('   1. Go to your signup page')
    console.log('   2. Select a plan (Starter or Full Delusion)')
    console.log('   3. Complete the signup form')
    console.log('   4. In Stripe checkout, click "Add promotion code"')
    console.log('   5. Enter:', promotionCode.code)
    console.log('   6. Discount will be applied automatically!')
    console.log('\n' + '='.repeat(70))

    // Create shareable message
    console.log('\n📱 Quick share message:')
    const discountText = promoConfig.discountType === 'percentage' 
      ? `${promoConfig.discountValue}% off`
      : `$${(promoConfig.discountValue / 100).toFixed(2)} off`
    const durationText = promoConfig.duration === 'once' 
      ? 'your first month'
      : promoConfig.duration === 'forever'
      ? 'every month'
      : `for ${promoConfig.durationInMonths} months`
    
    console.log(`\n"Hey! Try Bedelulu with code ${promotionCode.code} for ${discountText} ${durationText}! 🚀"`)
    console.log(`\nOr customize your own message with the code: ${promotionCode.code}`)

    // Additional info
    console.log('\n📊 Management:')
    console.log('   View in Stripe Dashboard: https://dashboard.stripe.com/coupons')
    console.log('   Track usage: https://dashboard.stripe.com/promotion_codes')
    console.log('   Deactivate: Update the code in Stripe Dashboard if needed')

  } catch (error) {
    console.error('\n❌ Error creating promo code:', error.message)
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Stripe Error Code:', error.code)
      console.error('   Details:', error.raw?.message || error.message)
      if (error.param) {
        console.error('   Parameter:', error.param)
      }
    }
    console.error('\n💡 Troubleshooting:')
    console.error('   - Check your STRIPE_SECRET_KEY is correct')
    console.error('   - Verify the code format (uppercase, alphanumeric)')
    console.error('   - Check if code already exists in Stripe Dashboard')
    console.error('   - Ensure discount values are valid')
    process.exit(1)
  }
}

// Run the script
createPromoCode()


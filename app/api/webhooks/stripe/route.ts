import { NextRequest, NextResponse } from 'next/server'
import { trackWebhookEvent } from '@/lib/monitoring'

// Dynamic import to avoid issues if Stripe is not installed
let stripe: any = null

async function getStripe() {
  if (!stripe) {
    try {
      const Stripe = (await import('stripe')).default
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-11-20.acacia',
      })
    } catch (error) {
      console.error('Stripe package not installed')
      return null
    }
  }
  return stripe
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const stripeInstance = await getStripe()
  if (!stripeInstance) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  let event: any

  try {
    event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

    // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    
    // Get customer database ID from session (preferred method)
    const customerId = session.client_reference_id || session.metadata?.customer_id
    const customerEmail = session.customer_email || session.customer_details?.email
    
    // Log for debugging
    console.log('🔍 Webhook received:', {
      customerId: customerId || 'none',
      email: customerEmail || 'none',
      sessionId: session.id
    })

    // Must have either customer ID or email
    if (!customerId && !customerEmail) {
      console.error('❌ No customer ID or email found in Stripe session')
      return NextResponse.json({ received: true })
    }

    // Track promo code usage (optional logging)
    const discountApplied = session.total_details?.amount_discount > 0
    const promoCodeInfo = discountApplied && session.discount
      ? {
          code: session.discount?.coupon?.name || 'Unknown',
          discountAmount: (session.total_details.amount_discount / 100).toFixed(2),
          discountType: session.discount?.coupon?.percent_off ? 'percentage' : 'amount',
          discountValue: session.discount?.coupon?.percent_off || (session.discount?.coupon?.amount_off ? (session.discount.coupon.amount_off / 100).toFixed(2) : 'N/A')
        }
      : null

    if (promoCodeInfo) {
      console.log(`🎟️  Promo code used: ${promoCodeInfo.code} - $${promoCodeInfo.discountAmount} discount applied`)
    }

    try {
      const { getPool } = await import('@/lib/db')
      const pool = getPool()

      const stripeCustomerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id || ''
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription || ''

      // Update customer record in PostgreSQL
      // Use customer ID if available (most reliable), fallback to email
      let result
      
      if (customerId) {
        // Primary method: Look up by database ID
        console.log(`✅ Looking up customer by ID: ${customerId}`)
        result = await pool.query(
          `UPDATE customers 
           SET payment_status = $1,
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING id, phone, call_time, timezone, email`,
          ['Paid', stripeCustomerId, subscriptionId || null, customerId]
        )
      } else {
        // Fallback method: Look up by email (for backward compatibility)
        console.log(`⚠️  Falling back to email lookup: ${customerEmail}`)
        result = await pool.query(
          `UPDATE customers 
           SET payment_status = $1,
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $4
           RETURNING id, phone, call_time, timezone, email`,
          ['Paid', stripeCustomerId, subscriptionId || null, customerEmail]
        )
      }

      if (result.rows.length === 0) {
        const identifier = customerId ? `ID: ${customerId}` : `email: ${customerEmail}`
        console.warn(`❌ No customer found with ${identifier}`)
        trackWebhookEvent('checkout.session.completed', false, {
          customerId: customerId || 'none',
          email: customerEmail || 'none',
          error: 'Customer not found'
        })
      } else {
        const customer = result.rows[0]
        console.log(`✅ Updated customer ${customer.id} to Paid status`)
        
        trackWebhookEvent('checkout.session.completed', true, {
          customerId: customer.id,
          email: customerEmail,
          promoCodeUsed: promoCodeInfo ? promoCodeInfo.code : null
        })

        // IMPROVED: Validate phone number with better error handling
        try {
          const { validateAndStorePhone } = await import('@/lib/phone-validation')
          const phoneValidation = await validateAndStorePhone(customer.id, customer.phone)
          
          if (!phoneValidation.isValid) {
            console.error(`❌ Phone validation FAILED for customer ${customer.id}:`, {
              customerId: customer.id,
              customerName: customer.name || 'Unknown',
              email: customer.email,
              phone: customer.phone,
              error: phoneValidation.error,
              method: phoneValidation.method
            })
            
            // CRITICAL: Log this for admin monitoring
            console.error(`🚨 ADMIN ALERT: Customer ${customer.id} (${customer.email}) paid but phone validation failed! They won't receive calls.`)
            
            // TODO: Send email/Slack notification to admin
            // For now, the console error will show up in Vercel logs
          } else {
            // CRITICAL FIX: Parse call time and calculate next_call_scheduled_at
            const { parseCallTime, calculateNextCallTime } = await import('@/lib/call-scheduler')
            
            // Get call time (use stored hour/minute if available, otherwise parse from string)
            let callTimeHour: number | null = customer.call_time_hour
            let callTimeMinute: number | null = customer.call_time_minute
            
            // If not already parsed, parse from call_time string
            if (!callTimeHour && customer.call_time) {
              const parsedTime = parseCallTime(customer.call_time)
              if (parsedTime) {
                callTimeHour = parsedTime.hour
                callTimeMinute = parsedTime.minute
                
                // Store parsed values
                await pool.query(
                  `UPDATE customers 
                   SET call_time_hour = $1, call_time_minute = $2
                   WHERE id = $3`,
                  [callTimeHour, callTimeMinute, customer.id]
                )
                console.log(`✅ Call time parsed for customer ${customer.id}: ${callTimeHour}:${callTimeMinute}`)
              }
            }
            
            // CRITICAL FIX: Calculate and set next_call_scheduled_at using IANA timezone
            if (callTimeHour !== null && customer.timezone) {
              // Ensure timezone is IANA format (not display label)
              // If it's a label like "Eastern (ET)", we need to convert it
              // But ideally it should already be IANA format from database/submit
              const timezoneIANA = customer.timezone
              
              try {
                const nextCallTime = calculateNextCallTime(
                  callTimeHour,
                  callTimeMinute || 0,
                  timezoneIANA
                )
                
                await pool.query(
                  `UPDATE customers 
                   SET next_call_scheduled_at = $1
                   WHERE id = $2`,
                  [nextCallTime, customer.id]
                )
                
                console.log(`✅ Next call scheduled for customer ${customer.id}: ${nextCallTime.toISOString()}`)
                console.log(`   (${callTimeHour}:${callTimeMinute || 0} in ${timezoneIANA})`)
              } catch (error: any) {
                console.error(`❌ Failed to calculate next call time for customer ${customer.id}:`, error.message)
                console.error(`   Timezone: ${timezoneIANA}, Hour: ${callTimeHour}, Minute: ${callTimeMinute}`)
                // Don't fail webhook - payment succeeded, admin can fix scheduling
              }
            } else {
              console.warn(`⚠️ Cannot schedule call for customer ${customer.id}: missing call_time_hour or timezone`)
              console.warn(`   call_time_hour: ${callTimeHour}, timezone: ${customer.timezone}`)
            }

            // FIXED: Don't trigger welcome call immediately - let cron handle it at proper time
            // This prevents duplicate calls and ensures calls happen at customer's preferred time
            console.log(`✅ Customer ${customer.id} payment processed`)
            console.log(`📞 Welcome call will be made at customer's preferred time via cron job`)
            console.log(`   Customer will receive call at: ${customer.call_time || '9am'} in their timezone`)
          }
        } catch (error: any) {
          console.error('❌ Error in post-payment setup:', error)
          console.error('Stack:', error.stack)
          // Don't fail webhook - payment succeeded, we'll handle this via admin endpoints
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
    }
  }

  return NextResponse.json({ received: true })
}


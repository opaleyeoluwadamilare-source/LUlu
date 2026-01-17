/**
 * Check specific customers (Akin and others) to see why they weren't called
 * This script requires database access
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkSpecificCustomers() {
  console.log('🔍 Checking Specific Customers (Akin and Others)')
  console.log('='.repeat(60))
  console.log('')
  
  try {
    // Find customers who should have been called
    const customers = await pool.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        phone_validation_error,
        call_status,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        last_call_date,
        welcome_call_completed,
        created_at,
        partner_code_id
      FROM customers
      WHERE name ILIKE '%akin%' 
         OR name ILIKE '%theo%'
         OR name ILIKE '%dipsy%'
         OR name ILIKE '%ola%'
         OR payment_status IN ('Paid', 'Partner')
      ORDER BY created_at DESC
    `)
    
    console.log(`Found ${customers.rows.length} customers to check\n`)
    
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    for (const customer of customers.rows) {
      console.log(`\n📋 ${customer.name} (ID: ${customer.id})`)
      console.log('-'.repeat(60))
      
      // Check payment status
      console.log(`Payment Status: ${customer.payment_status}`)
      const isPaid = ['Paid', 'Partner'].includes(customer.payment_status)
      console.log(`  ${isPaid ? '✅' : '❌'} ${isPaid ? 'Paid/Partner' : 'NOT Paid/Partner'}`)
      
      // Check phone validation
      console.log(`Phone Validated: ${customer.phone_validated}`)
      if (!customer.phone_validated) {
        console.log(`  ❌ Phone NOT validated`)
        if (customer.phone_validation_error) {
          console.log(`  Error: ${customer.phone_validation_error}`)
        }
      } else {
        console.log(`  ✅ Phone validated`)
      }
      
      // Check call status
      console.log(`Call Status: ${customer.call_status || 'null'}`)
      const isBlocked = ['disabled', 'paused'].includes(customer.call_status)
      if (isBlocked) {
        console.log(`  ❌ Call status is blocking: ${customer.call_status}`)
      } else {
        console.log(`  ✅ Call status OK`)
      }
      
      // Check welcome call
      console.log(`Welcome Call Completed: ${customer.welcome_call_completed}`)
      if (!customer.welcome_call_completed) {
        const createdAgo = now.getTime() - new Date(customer.created_at).getTime()
        const minutesAgo = Math.floor(createdAgo / 60000)
        console.log(`  ⚠️  Welcome call NOT completed`)
        console.log(`  Created ${minutesAgo} minutes ago`)
        if (minutesAgo > 20) {
          console.log(`  ✅ Should be eligible for welcome call`)
        } else {
          console.log(`  ⏸️  Too soon (needs 20 min after creation)`)
        }
      } else {
        console.log(`  ✅ Welcome call completed`)
      }
      
      // Check daily call scheduling
      if (customer.welcome_call_completed) {
        console.log(`Call Time: ${customer.call_time_hour}:${customer.call_time_minute || '00'}`)
        if (!customer.call_time_hour) {
          console.log(`  ❌ Call time NOT set!`)
        } else {
          console.log(`  ✅ Call time set`)
        }
        
        console.log(`Next Call Scheduled: ${customer.next_call_scheduled_at || 'NOT SET'}`)
        if (customer.next_call_scheduled_at) {
          const scheduled = new Date(customer.next_call_scheduled_at)
          const timeUntil = scheduled.getTime() - now.getTime()
          const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60))
          const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
          
          if (timeUntil < 0) {
            const hoursAgo = Math.abs(hoursUntil)
            console.log(`  ⚠️  Scheduled ${hoursAgo} hours AGO (MISSED!)`)
          } else if (timeUntil <= twentyMinutesFromNow.getTime() - now.getTime()) {
            console.log(`  ✅ Scheduled in ${hoursUntil}h ${minutesUntil}m (WITHIN WINDOW)`)
          } else {
            console.log(`  ⏸️  Scheduled in ${hoursUntil}h ${minutesUntil}m (too far in future)`)
          }
        } else {
          console.log(`  ❌ Next call NOT scheduled!`)
        }
        
        console.log(`Last Call Date: ${customer.last_call_date || 'Never'}`)
        if (customer.last_call_date) {
          const lastCall = new Date(customer.last_call_date)
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const lastCallDate = new Date(lastCall.getFullYear(), lastCall.getMonth(), lastCall.getDate())
          if (lastCallDate.getTime() === today.getTime()) {
            console.log(`  ✅ Already called today (prevents duplicate)`)
          } else {
            console.log(`  ✅ Not called today (should be eligible)`)
          }
        }
      }
      
      // Check if customer would be found by query
      console.log(`\nQuery Eligibility Check:`)
      let eligible = true
      let reasons = []
      
      if (!isPaid) {
        eligible = false
        reasons.push('Not Paid/Partner')
      }
      if (!customer.phone_validated) {
        eligible = false
        reasons.push('Phone not validated')
      }
      if (isBlocked) {
        eligible = false
        reasons.push(`Call status: ${customer.call_status}`)
      }
      
      if (!customer.welcome_call_completed) {
        const createdAgo = now.getTime() - new Date(customer.created_at).getTime()
        if (createdAgo < 20 * 60 * 1000) {
          eligible = false
          reasons.push('Welcome call: too soon (< 20 min)')
        }
      } else {
        if (!customer.next_call_scheduled_at) {
          eligible = false
          reasons.push('Next call not scheduled')
        } else {
          const scheduled = new Date(customer.next_call_scheduled_at)
          if (scheduled < fourHoursAgo || scheduled > twentyMinutesFromNow) {
            eligible = false
            reasons.push('Scheduled time outside window')
          }
          if (customer.last_call_date) {
            const lastCall = new Date(customer.last_call_date)
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const lastCallDate = new Date(lastCall.getFullYear(), lastCall.getMonth(), lastCall.getDate())
            if (lastCallDate.getTime() === today.getTime()) {
              eligible = false
              reasons.push('Already called today')
            }
          }
        }
      }
      
      if (eligible) {
        console.log(`  ✅ Would be found by query`)
      } else {
        console.log(`  ❌ Would NOT be found by query`)
        console.log(`  Reasons: ${reasons.join(', ')}`)
      }
    }
    
    await pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  }
}

checkSpecificCustomers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


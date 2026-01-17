/**
 * Diagnostic script to check why calls aren't happening
 * Run: node scripts/check-call-scheduling.js
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkCallScheduling() {
  try {
    console.log('🔍 Checking call scheduling status...\n')

    // 1. Check paid customers
    const paidCustomers = await pool.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        call_status,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        last_call_date,
        welcome_call_completed,
        created_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
      ORDER BY id
    `)

    console.log(`📊 Total Paid/Partner Customers: ${paidCustomers.rows.length}\n`)

    if (paidCustomers.rows.length === 0) {
      console.log('❌ No paid customers found!')
      return
    }

    // 2. Check each customer's status
    const now = new Date()
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)

    console.log(`⏰ Current Time: ${now.toISOString()}`)
    console.log(`⏰ Window End: ${twentyMinutesFromNow.toISOString()}\n`)

    for (const customer of paidCustomers.rows) {
      console.log(`\n👤 Customer: ${customer.name} (ID: ${customer.id})`)
      console.log(`   Email: ${customer.email}`)
      console.log(`   Phone: ${customer.phone}`)
      console.log(`   Payment: ${customer.payment_status}`)
      console.log(`   Phone Validated: ${customer.phone_validated ? '✅' : '❌'}`)
      console.log(`   Call Status: ${customer.call_status || 'null'}`)
      console.log(`   Call Time: ${customer.call_time_hour}:${customer.call_time_minute || '00'} ${customer.timezone}`)
      console.log(`   Welcome Call Completed: ${customer.welcome_call_completed ? '✅' : '❌'}`)
      console.log(`   Last Call Date: ${customer.last_call_date || 'Never'}`)
      
      if (customer.next_call_scheduled_at) {
        const scheduledTime = new Date(customer.next_call_scheduled_at)
        const isInWindow = scheduledTime >= now && scheduledTime <= twentyMinutesFromNow
        const isPast = scheduledTime < now
        
        console.log(`   Next Call Scheduled: ${scheduledTime.toISOString()}`)
        console.log(`   Status: ${isPast ? '⚠️ PAST' : isInWindow ? '✅ IN WINDOW' : '⏳ FUTURE'}`)
        
        if (isPast) {
          console.log(`   ⚠️ WARNING: Scheduled time is in the past!`)
        }
      } else {
        console.log(`   Next Call Scheduled: ❌ NOT SET`)
      }

      // Check if customer would be found by getCustomersDueForCalls
      const wouldBeFound = 
        customer.phone_validated &&
        !['disabled', 'paused'].includes(customer.call_status) &&
        (
          (!customer.welcome_call_completed && new Date(customer.created_at) < new Date(now.getTime() - 20 * 60 * 1000)) ||
          (customer.welcome_call_completed &&
           customer.next_call_scheduled_at &&
           new Date(customer.next_call_scheduled_at) >= now &&
           new Date(customer.next_call_scheduled_at) <= twentyMinutesFromNow &&
           (!customer.last_call_date || new Date(customer.last_call_date).toISOString().split('T')[0] < now.toISOString().split('T')[0]))
        )

      console.log(`   Would Be Found by Cron: ${wouldBeFound ? '✅ YES' : '❌ NO'}`)
    }

    // 3. Check call queue
    const queueItems = await pool.query(`
      SELECT 
        id, customer_id, call_type, status, scheduled_for, attempts, max_attempts, created_at
      FROM call_queue
      WHERE status IN ('pending', 'processing', 'retrying')
      ORDER BY scheduled_for ASC
      LIMIT 20
    `)

    console.log(`\n\n📋 Call Queue Status:`)
    console.log(`   Pending/Processing: ${queueItems.rows.length}`)
    
    if (queueItems.rows.length > 0) {
      console.log(`\n   Queue Items:`)
      for (const item of queueItems.rows) {
        console.log(`   - ID: ${item.id}, Customer: ${item.customer_id}, Type: ${item.call_type}, Status: ${item.status}, Scheduled: ${new Date(item.scheduled_for).toISOString()}, Attempts: ${item.attempts}/${item.max_attempts}`)
      }
    }

    // 4. Check recent call logs
    const recentCalls = await pool.query(`
      SELECT 
        id, customer_id, call_type, status, duration_seconds, created_at
      FROM call_logs
      ORDER BY created_at DESC
      LIMIT 10
    `)

    console.log(`\n\n📞 Recent Calls (Last 10):`)
    if (recentCalls.rows.length === 0) {
      console.log(`   ❌ No calls found in logs`)
    } else {
      for (const call of recentCalls.rows) {
        console.log(`   - ${new Date(call.created_at).toLocaleString()}: Customer ${call.customer_id}, Type: ${call.call_type}, Status: ${call.status}, Duration: ${call.duration_seconds || 'N/A'}s`)
      }
    }

    // 5. Summary
    console.log(`\n\n📊 SUMMARY:`)
    const readyCustomers = paidCustomers.rows.filter(c => 
      c.phone_validated &&
      !['disabled', 'paused'].includes(c.call_status) &&
      c.next_call_scheduled_at &&
      new Date(c.next_call_scheduled_at) >= now &&
      new Date(c.next_call_scheduled_at) <= twentyMinutesFromNow &&
      (!c.last_call_date || new Date(c.last_call_date).toISOString().split('T')[0] < now.toISOString().split('T')[0])
    )
    console.log(`   Customers Ready for Calls (in next 20 min): ${readyCustomers.length}`)
    console.log(`   Customers with Issues: ${paidCustomers.rows.length - readyCustomers.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkCallScheduling()


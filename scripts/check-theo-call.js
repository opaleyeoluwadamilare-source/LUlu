/**
 * Check why Theo's call didn't go through
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkTheoCall() {
  try {
    console.log('🔍 Checking Theo (customer ID 7) call status...\n')
    
    // 1. Check Theo's customer record
    const customer = await pool.query(`
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
        total_calls_made,
        created_at,
        updated_at
      FROM customers
      WHERE id = 7
    `)
    
    if (customer.rows.length === 0) {
      console.log('❌ Theo not found in database!')
      return
    }
    
    const theo = customer.rows[0]
    console.log('📋 Theo\'s Status:')
    console.log(`   Name: ${theo.name}`)
    console.log(`   Email: ${theo.email}`)
    console.log(`   Phone: ${theo.phone}`)
    console.log(`   Payment Status: ${theo.payment_status}`)
    console.log(`   Phone Validated: ${theo.phone_validated}`)
    console.log(`   Call Status: ${theo.call_status || 'null'}`)
    console.log(`   Call Time: ${theo.call_time_hour}:${theo.call_time_minute || '00'}`)
    console.log(`   Timezone: ${theo.timezone}`)
    console.log(`   Next Call Scheduled: ${theo.next_call_scheduled_at || 'NOT SET'}`)
    console.log(`   Last Call Date: ${theo.last_call_date || 'Never'}`)
    console.log(`   Welcome Call Completed: ${theo.welcome_call_completed}`)
    console.log(`   Total Calls Made: ${theo.total_calls_made}`)
    console.log('')
    
    // 2. Check call queue for Theo
    const queue = await pool.query(`
      SELECT 
        id, customer_id, call_type, status, scheduled_for, 
        attempts, max_attempts, error_message, created_at, updated_at
      FROM call_queue
      WHERE customer_id = 7
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    console.log(`📞 Call Queue Entries for Theo: ${queue.rows.length}`)
    if (queue.rows.length > 0) {
      queue.rows.forEach((item, i) => {
        console.log(`\n   Entry ${i + 1}:`)
        console.log(`   - ID: ${item.id}`)
        console.log(`   - Type: ${item.call_type}`)
        console.log(`   - Status: ${item.status}`)
        console.log(`   - Scheduled For: ${item.scheduled_for}`)
        console.log(`   - Attempts: ${item.attempts}/${item.max_attempts}`)
        if (item.error_message) {
          console.log(`   - Error: ${item.error_message}`)
        }
        console.log(`   - Created: ${item.created_at}`)
        console.log(`   - Updated: ${item.updated_at}`)
      })
    } else {
      console.log('   ❌ No queue entries found!')
    }
    console.log('')
    
    // 3. Check call logs for Theo
    const logs = await pool.query(`
      SELECT 
        id, call_type, status, vapi_call_id, duration_seconds,
        transcript, error_message, created_at
      FROM call_logs
      WHERE customer_id = 7
      ORDER BY created_at DESC
      LIMIT 5
    `)
    
    console.log(`📝 Recent Call Logs for Theo: ${logs.rows.length}`)
    if (logs.rows.length > 0) {
      logs.rows.forEach((log, i) => {
        console.log(`\n   Log ${i + 1}:`)
        console.log(`   - Type: ${log.call_type}`)
        console.log(`   - Status: ${log.status}`)
        console.log(`   - VAPI Call ID: ${log.vapi_call_id || 'none'}`)
        console.log(`   - Duration: ${log.duration_seconds || 0}s`)
        if (log.error_message) {
          console.log(`   - Error: ${log.error_message}`)
        }
        console.log(`   - Created: ${log.created_at}`)
      })
    } else {
      console.log('   ❌ No call logs found!')
    }
    console.log('')
    
    // 4. Check if call should be processed now
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    console.log(`⏰ Time Check:`)
    console.log(`   Current Time: ${now.toISOString()}`)
    console.log(`   Window Start: ${fifteenMinutesAgo.toISOString()}`)
    console.log(`   Window End: ${twentyMinutesFromNow.toISOString()}`)
    console.log('')
    
    const pendingQueue = await pool.query(`
      SELECT *
      FROM call_queue
      WHERE customer_id = 7
        AND status IN ('pending', 'retrying')
        AND scheduled_for BETWEEN $1 AND $2
        AND attempts < max_attempts
    `, [fifteenMinutesAgo, twentyMinutesFromNow])
    
    console.log(`🔍 Would be processed by cron: ${pendingQueue.rows.length > 0 ? '✅ YES' : '❌ NO'}`)
    if (pendingQueue.rows.length > 0) {
      pendingQueue.rows.forEach(item => {
        console.log(`   - Queue ID ${item.id}: ${item.call_type} call scheduled for ${item.scheduled_for}`)
      })
    } else {
      console.log('   ❌ No pending calls in the processing window!')
    }
    console.log('')
    
    // 5. Identify issues
    console.log('🚨 Issues Found:')
    let issues = []
    
    if (!['Paid', 'Partner'].includes(theo.payment_status)) {
      issues.push(`❌ Payment status is "${theo.payment_status}" (needs to be "Paid" or "Partner")`)
    }
    
    if (!theo.phone_validated) {
      issues.push('❌ Phone not validated')
    }
    
    if (theo.call_status === 'paused' || theo.call_status === 'disabled') {
      issues.push(`❌ Call status is "${theo.call_status}" (calls are blocked)`)
    }
    
    if (queue.rows.length === 0) {
      issues.push('❌ No call in queue (call was not queued)')
    }
    
    const pendingCalls = queue.rows.filter(q => q.status === 'pending' || q.status === 'retrying')
    if (pendingCalls.length === 0 && queue.rows.length > 0) {
      issues.push('❌ All queue entries are completed/failed (no pending calls)')
    }
    
    const inWindow = queue.rows.filter(q => {
      const scheduled = new Date(q.scheduled_for)
      return scheduled >= fifteenMinutesAgo && scheduled <= twentyMinutesFromNow && 
             (q.status === 'pending' || q.status === 'retrying')
    })
    if (inWindow.length === 0 && pendingCalls.length > 0) {
      issues.push('❌ Pending calls exist but are outside the processing window')
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No obvious issues found')
    } else {
      issues.forEach(issue => console.log(`   ${issue}`))
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

checkTheoCall()


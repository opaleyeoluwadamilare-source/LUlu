/**
 * Debug script to check what's in the call queue and why calls aren't processing
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function debugCallQueue() {
  console.log('🔍 Debugging Call Queue')
  console.log('='.repeat(60))
  console.log('')
  
  try {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    console.log(`Current time: ${now.toISOString()}`)
    console.log(`Queue window: ${fiveMinutesAgo.toISOString()} to ${twentyMinutesFromNow.toISOString()}`)
    console.log('')
    
    // Check all queue items
    console.log('1️⃣  All Queue Items:')
    const allQueue = await pool.query(`
      SELECT 
        cq.*,
        c.name,
        c.phone,
        c.phone_validated,
        c.welcome_call_completed,
        c.payment_status
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      ORDER BY cq.created_at DESC
      LIMIT 20
    `)
    
    console.log(`   Found ${allQueue.rows.length} queue items`)
    console.log('')
    
    if (allQueue.rows.length > 0) {
      allQueue.rows.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} (ID: ${item.customer_id})`)
        console.log(`      Type: ${item.call_type}`)
        console.log(`      Status: ${item.status}`)
        console.log(`      Scheduled: ${item.scheduled_for}`)
        console.log(`      Attempts: ${item.attempts}/${item.max_attempts}`)
        console.log(`      Created: ${item.created_at}`)
        console.log(`      Updated: ${item.updated_at}`)
        
        const scheduled = new Date(item.scheduled_for)
        const timeDiff = scheduled.getTime() - now.getTime()
        const minutesDiff = Math.round(timeDiff / 60000)
        
        if (timeDiff < 0) {
          console.log(`      ⚠️  Scheduled ${Math.abs(minutesDiff)} minutes AGO`)
        } else {
          console.log(`      ⏸️  Scheduled in ${minutesDiff} minutes`)
        }
        
        // Check if it's in the processing window
        if (scheduled >= fiveMinutesAgo && scheduled <= twentyMinutesFromNow) {
          console.log(`      ✅ Within processing window`)
        } else {
          console.log(`      ❌ Outside processing window`)
        }
        
        // Check customer eligibility
        if (!['Paid', 'Partner'].includes(item.payment_status)) {
          console.log(`      ❌ Payment status: ${item.payment_status}`)
        }
        if (!item.phone_validated) {
          console.log(`      ❌ Phone not validated`)
        }
        if (item.call_type === 'welcome' && item.welcome_call_completed) {
          console.log(`      ❌ Welcome call already completed`)
        }
        
        if (item.error_message) {
          console.log(`      ❌ Error: ${item.error_message}`)
        }
        
        console.log('')
      })
    }
    
    // Check pending items that should be processed
    console.log('2️⃣  Pending Items in Processing Window:')
    const pendingItems = await pool.query(`
      SELECT 
        cq.*,
        c.name,
        c.phone,
        c.phone_validated,
        c.welcome_call_completed,
        c.payment_status,
        c.last_call_date
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying')
        AND cq.scheduled_for BETWEEN $1 AND $2
        AND cq.attempts < cq.max_attempts
      ORDER BY cq.scheduled_for ASC
    `, [fiveMinutesAgo, twentyMinutesFromNow])
    
    console.log(`   Found ${pendingItems.rows.length} items that should be processed`)
    console.log('')
    
    if (pendingItems.rows.length > 0) {
      pendingItems.rows.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} (ID: ${item.customer_id})`)
        console.log(`      Type: ${item.call_type}`)
        console.log(`      Status: ${item.status}`)
        console.log(`      Scheduled: ${item.scheduled_for}`)
        console.log(`      Phone: ${item.phone}`)
        console.log(`      Phone Validated: ${item.phone_validated}`)
        console.log(`      Payment: ${item.payment_status}`)
        console.log(`      Welcome Completed: ${item.welcome_call_completed}`)
        console.log(`      Last Call Date: ${item.last_call_date || 'Never'}`)
        console.log('')
      })
    } else {
      console.log('   ⚠️  No items found in processing window')
      console.log('   This could mean:')
      console.log('   - Calls are scheduled outside the window')
      console.log('   - Calls have already been processed')
      console.log('   - Calls failed and exceeded max attempts')
      console.log('')
    }
    
    // Check processing items (stuck?)
    console.log('3️⃣  Items Stuck in Processing:')
    const processingItems = await pool.query(`
      SELECT 
        cq.*,
        c.name
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status = 'processing'
      ORDER BY cq.updated_at DESC
    `)
    
    console.log(`   Found ${processingItems.rows.length} items stuck in processing`)
    if (processingItems.rows.length > 0) {
      processingItems.rows.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} (ID: ${item.customer_id})`)
        console.log(`      Updated: ${item.updated_at}`)
        const updated = new Date(item.updated_at)
        const minutesAgo = Math.round((now.getTime() - updated.getTime()) / 60000)
        console.log(`      ⚠️  Stuck for ${minutesAgo} minutes`)
        console.log('')
      })
    }
    console.log('')
    
    // Check failed items
    console.log('4️⃣  Failed Items:')
    const failedItems = await pool.query(`
      SELECT 
        cq.*,
        c.name
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status = 'failed'
      ORDER BY cq.updated_at DESC
      LIMIT 10
    `)
    
    console.log(`   Found ${failedItems.rows.length} failed items`)
    if (failedItems.rows.length > 0) {
      failedItems.rows.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} (ID: ${item.customer_id})`)
        console.log(`      Error: ${item.error_message}`)
        console.log(`      Attempts: ${item.attempts}/${item.max_attempts}`)
        console.log('')
      })
    }
    console.log('')
    
    await pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  }
}

debugCallQueue()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


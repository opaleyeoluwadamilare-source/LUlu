/**
 * Comprehensive diagnostic - checks EVERYTHING in the call system
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function fullDiagnostic() {
  console.log('🔍 FULL CALL SYSTEM DIAGNOSTIC')
  console.log('='.repeat(60))
  console.log('')
  
  try {
    // 1. Check environment variables
    console.log('1️⃣  Environment Variables:')
    console.log(`   VAPI_API_KEY: ${process.env.VAPI_API_KEY ? '✅ Set' : '❌ MISSING'}`)
    console.log(`   VAPI_LULU_ASSISTANT_ID: ${process.env.VAPI_LULU_ASSISTANT_ID ? '✅ Set' : '❌ MISSING'}`)
    console.log(`   VAPI_PHONE_NUMBER_ID: ${process.env.VAPI_PHONE_NUMBER_ID ? '✅ Set' : '❌ MISSING'}`)
    console.log(`   DATABASE_URL: ${process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL ? '✅ Set' : '❌ MISSING'}`)
    console.log('')
    
    // 2. Check customers who should be called
    console.log('2️⃣  Customers Who Should Be Called:')
    const eligibleCustomers = await pool.query(`
      SELECT 
        id, name, phone, email,
        payment_status,
        phone_validated,
        welcome_call_completed,
        call_time_hour,
        call_time_minute,
        next_call_scheduled_at,
        last_call_date,
        call_status
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
    `)
    
    console.log(`   Found ${eligibleCustomers.rows.length} eligible customers`)
    console.log('')
    
    eligibleCustomers.rows.forEach(c => {
      console.log(`   ${c.name} (ID: ${c.id})`)
      console.log(`      Phone: ${c.phone}`)
      console.log(`      Welcome Completed: ${c.welcome_call_completed}`)
      console.log(`      Next Call: ${c.next_call_scheduled_at || 'NOT SET'}`)
      console.log(`      Last Call: ${c.last_call_date || 'Never'}`)
      console.log('')
    })
    
    // 3. Check call queue - ALL statuses
    console.log('3️⃣  Call Queue Status:')
    const queueStats = await pool.query(`
      SELECT 
        status,
        call_type,
        COUNT(*) as count
      FROM call_queue
      GROUP BY status, call_type
      ORDER BY status, call_type
    `)
    
    console.log('   Queue Statistics:')
    queueStats.rows.forEach(stat => {
      console.log(`      ${stat.status} (${stat.call_type}): ${stat.count}`)
    })
    console.log('')
    
    // 4. Check recent call logs
    console.log('4️⃣  Recent Call Logs:')
    const recentLogs = await pool.query(`
      SELECT 
        cl.*,
        c.name
      FROM call_logs cl
      JOIN customers c ON cl.customer_id = c.id
      ORDER BY cl.created_at DESC
      LIMIT 10
    `)
    
    console.log(`   Found ${recentLogs.rows.length} recent call logs`)
    if (recentLogs.rows.length > 0) {
      recentLogs.rows.forEach(log => {
        console.log(`   ${log.name} (${log.call_type})`)
        console.log(`      Status: ${log.status}`)
        console.log(`      VAPI Call ID: ${log.vapi_call_id || 'NONE'}`)
        console.log(`      Duration: ${log.duration_seconds || 0}s`)
        console.log(`      Created: ${log.created_at}`)
        if (log.error_message) {
          console.log(`      ❌ Error: ${log.error_message}`)
        }
        console.log('')
      })
    } else {
      console.log('   ⚠️  NO CALL LOGS FOUND - Calls are not being made!')
      console.log('')
    }
    
    // 5. Check pending calls that should be processed NOW
    console.log('5️⃣  Pending Calls Ready for Processing:')
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    const pendingCalls = await pool.query(`
      SELECT 
        cq.*,
        c.name,
        c.phone,
        c.phone_validated,
        c.welcome_call_completed,
        c.payment_status
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying')
        AND cq.scheduled_for BETWEEN $1 AND $2
        AND cq.attempts < cq.max_attempts
      ORDER BY cq.scheduled_for ASC
    `, [fourHoursAgo, twentyMinutesFromNow])
    
    console.log(`   Found ${pendingCalls.rows.length} calls ready to process`)
    if (pendingCalls.rows.length > 0) {
      pendingCalls.rows.forEach(call => {
        console.log(`   ${call.name} (ID: ${call.customer_id})`)
        console.log(`      Type: ${call.call_type}`)
        console.log(`      Scheduled: ${call.scheduled_for}`)
        console.log(`      Status: ${call.status}`)
        console.log(`      Attempts: ${call.attempts}/${call.max_attempts}`)
        console.log('')
      })
    } else {
      console.log('   ⚠️  NO CALLS READY TO PROCESS')
      console.log('')
    }
    
    // 6. Check for stuck processing calls
    console.log('6️⃣  Stuck Processing Calls:')
    const stuckCalls = await pool.query(`
      SELECT 
        cq.*,
        c.name
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status = 'processing'
        AND cq.updated_at < NOW() - INTERVAL '10 minutes'
    `)
    
    console.log(`   Found ${stuckCalls.rows.length} calls stuck in processing`)
    if (stuckCalls.rows.length > 0) {
      stuckCalls.rows.forEach(call => {
        const stuckFor = Math.round((now.getTime() - new Date(call.updated_at).getTime()) / 60000)
        console.log(`   ${call.name} - Stuck for ${stuckFor} minutes`)
        console.log('')
      })
    }
    console.log('')
    
    // 7. Test VAPI connection (if possible)
    console.log('7️⃣  VAPI Configuration Check:')
    const vapiKey = process.env.VAPI_API_KEY
    const assistantId = process.env.VAPI_LULU_ASSISTANT_ID
    const phoneId = process.env.VAPI_PHONE_NUMBER_ID
    
    if (vapiKey && assistantId && phoneId) {
      console.log('   ✅ All VAPI credentials present')
      console.log(`   Assistant ID: ${assistantId}`)
      console.log(`   Phone ID: ${phoneId}`)
      console.log(`   API Key: ${vapiKey.substring(0, 10)}...`)
    } else {
      console.log('   ❌ Missing VAPI credentials!')
      if (!vapiKey) console.log('      - VAPI_API_KEY missing')
      if (!assistantId) console.log('      - VAPI_LULU_ASSISTANT_ID missing')
      if (!phoneId) console.log('      - VAPI_PHONE_NUMBER_ID missing')
    }
    console.log('')
    
    // 8. Summary and recommendations
    console.log('='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log('')
    
    const issues = []
    if (!vapiKey || !assistantId || !phoneId) {
      issues.push('Missing VAPI credentials')
    }
    if (recentLogs.rows.length === 0) {
      issues.push('No call logs - calls are not being made')
    }
    if (pendingCalls.rows.length === 0 && eligibleCustomers.rows.length > 0) {
      issues.push('No calls in queue despite eligible customers')
    }
    if (stuckCalls.rows.length > 0) {
      issues.push(`${stuckCalls.rows.length} calls stuck in processing`)
    }
    
    if (issues.length === 0) {
      console.log('✅ System appears healthy')
      console.log('   - All credentials present')
      console.log('   - Calls are being logged')
      console.log('   - Queue is processing')
    } else {
      console.log('❌ Issues Found:')
      issues.forEach(issue => console.log(`   - ${issue}`))
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

fullDiagnostic()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


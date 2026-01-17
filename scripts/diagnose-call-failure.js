/**
 * Comprehensive diagnostic to find why calls aren't happening
 * Even though cron says "succeeded"
 */

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.EXTERNAL_DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : undefined
})

async function diagnose() {
  console.log('🔍 Comprehensive Call Failure Diagnostic\n')
  console.log('='.repeat(60))
  
  const client = await pool.connect()
  
  try {
    // 1. Check recent call logs
    console.log('\n📞 Step 1: Recent Call Logs\n')
    const callLogs = await client.query(`
      SELECT 
        cl.*,
        c.name,
        c.phone,
        c.payment_status
      FROM call_logs cl
      JOIN customers c ON cl.customer_id = c.id
      ORDER BY cl.created_at DESC
      LIMIT 10
    `)
    
    if (callLogs.rows.length === 0) {
      console.log('❌ NO CALL LOGS FOUND')
      console.log('   This means calls are NOT being initiated at all!')
      console.log('   Even though cron says "succeeded", no calls are reaching Vapi.')
    } else {
      console.log(`Found ${callLogs.rows.length} recent call logs:\n`)
      callLogs.rows.forEach(log => {
        console.log(`📞 ${log.name} (ID: ${log.customer_id})`)
        console.log(`   Status: ${log.status}`)
        console.log(`   Type: ${log.call_type}`)
        console.log(`   Vapi Call ID: ${log.vapi_call_id || 'NONE'}`)
        console.log(`   Error: ${log.error_message || 'None'}`)
        console.log(`   Created: ${log.created_at}`)
        console.log('')
      })
    }
    
    // 2. Check call queue
    console.log('\n📋 Step 2: Call Queue Status\n')
    const queue = await client.query(`
      SELECT 
        cq.*,
        c.name,
        c.phone
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'processing', 'failed', 'retrying')
      ORDER BY cq.created_at DESC
      LIMIT 10
    `)
    
    if (queue.rows.length === 0) {
      console.log('✅ Queue is empty (all processed or no calls queued)')
    } else {
      console.log(`Found ${queue.rows.length} items in queue:\n`)
      queue.rows.forEach(item => {
        console.log(`📋 ${item.name} (ID: ${item.customer_id})`)
        console.log(`   Status: ${item.status}`)
        console.log(`   Type: ${item.call_type}`)
        console.log(`   Scheduled: ${item.scheduled_for}`)
        console.log(`   Attempts: ${item.attempts}/${item.max_attempts}`)
        console.log(`   Error: ${item.error_message || 'None'}`)
        console.log('')
      })
    }
    
    // 3. Check customers who should be getting calls
    console.log('\n👥 Step 3: Customers Who Should Get Calls\n')
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    const dueCustomers = await client.query(`
      SELECT 
        id, name, phone, 
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        next_call_scheduled_at,
        last_call_date,
        call_time_hour,
        call_time_minute,
        timezone
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND (
          (welcome_call_completed = false AND created_at < NOW() - INTERVAL '20 minutes')
          OR
          (welcome_call_completed = true 
           AND (
             (next_call_scheduled_at IS NOT NULL
              AND next_call_scheduled_at BETWEEN $1 AND $2
              AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
             OR
             (next_call_scheduled_at IS NULL
              AND call_time_hour IS NOT NULL
              AND timezone IS NOT NULL
              AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
           )
          )
        )
      ORDER BY id
    `, [fourHoursAgo, oneHourFromNow])
    
    console.log(`Found ${dueCustomers.rows.length} customers due for calls:\n`)
    if (dueCustomers.rows.length === 0) {
      console.log('❌ NO CUSTOMERS FOUND')
      console.log('   This is why calls aren\'t happening!')
      console.log('   The cron query is not finding any customers.')
    } else {
      dueCustomers.rows.forEach(customer => {
        console.log(`👤 ${customer.name} (ID: ${customer.id})`)
        console.log(`   Phone: ${customer.phone}`)
        console.log(`   Payment: ${customer.payment_status}`)
        console.log(`   Next call: ${customer.next_call_scheduled_at || 'NULL (will calculate)'}`)
        console.log(`   Last call: ${customer.last_call_date || 'Never'}`)
        console.log('')
      })
    }
    
    // 4. Check environment variables (from code perspective)
    console.log('\n🔑 Step 4: Environment Variables Check\n')
    const envVars = {
      'VAPI_API_KEY': process.env.VAPI_API_KEY ? '✅ Set' : '❌ MISSING',
      'VAPI_LULU_ASSISTANT_ID': process.env.VAPI_LULU_ASSISTANT_ID ? '✅ Set' : '⚠️  Not set (will use inline)',
      'VAPI_PHONE_NUMBER_ID': process.env.VAPI_PHONE_NUMBER_ID ? '✅ Set' : '⚠️  Not set (will use default)',
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? '✅ Set' : '❌ MISSING',
      'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL ? '✅ Set' : '⚠️  Not set'
    }
    
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    
    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(60))
    console.log('📊 DIAGNOSIS SUMMARY\n')
    
    if (callLogs.rows.length === 0) {
      console.log('❌ ROOT CAUSE: No calls are being initiated')
      console.log('\n   Possible reasons:')
      console.log('   1. makeVapiCall() is failing silently')
      console.log('   2. VAPI_API_KEY is invalid (but test showed it works)')
      console.log('   3. OPENAI_API_KEY is missing')
      console.log('   4. Function is timing out before calls are made')
      console.log('   5. Error in makeVapiCall() is being caught and not logged')
    } else if (callLogs.rows.some(log => log.status === 'failed')) {
      console.log('⚠️  ROOT CAUSE: Calls are being initiated but failing')
      console.log('\n   Check the error messages above')
      console.log('   Common issues:')
      console.log('   - Invalid phone number format')
      console.log('   - Vapi account credits exhausted')
      console.log('   - Phone number not verified in Vapi')
    } else if (dueCustomers.rows.length === 0) {
      console.log('❌ ROOT CAUSE: No customers found by cron query')
      console.log('\n   This means:')
      console.log('   - Customers don\'t have next_call_scheduled_at set')
      console.log('   - Or next_call_scheduled_at is outside the time window')
      console.log('   - Or last_call_date = today (already called)')
    } else {
      console.log('✅ System appears to be working')
      console.log('\n   If calls still aren\'t happening:')
      console.log('   1. Check Vapi dashboard for call attempts')
      console.log('   2. Check Vercel logs for errors')
      console.log('   3. Verify phone numbers are in E.164 format')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

diagnose()


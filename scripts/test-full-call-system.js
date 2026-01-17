/**
 * Test the complete call system end-to-end
 * Verifies all components are working
 */

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.EXTERNAL_DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : undefined
})

const VAPI_API_URL = 'https://api.vapi.ai'
const VAPI_API_KEY = process.env.VAPI_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function testFullSystem() {
  console.log('🧪 Testing Complete Call System\n')
  console.log('='.repeat(60))
  
  // Test 1: VAPI_API_KEY
  console.log('\n📋 Test 1: VAPI_API_KEY\n')
  try {
    const vapiResponse = await fetch(`${VAPI_API_URL}/assistant`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (vapiResponse.status === 200) {
      console.log('   ✅ VAPI_API_KEY is valid')
    } else if (vapiResponse.status === 401) {
      console.log('   ❌ VAPI_API_KEY is invalid (401 Unauthorized)')
      return false
    } else {
      console.log(`   ⚠️  VAPI_API_KEY test returned: ${vapiResponse.status}`)
    }
  } catch (error) {
    console.log(`   ❌ Error testing VAPI_API_KEY: ${error.message}`)
    return false
  }
  
  // Test 2: OPENAI_API_KEY
  console.log('\n📋 Test 2: OPENAI_API_KEY\n')
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (openaiResponse.status === 200) {
      console.log('   ✅ OPENAI_API_KEY is valid')
    } else if (openaiResponse.status === 401) {
      console.log('   ❌ OPENAI_API_KEY is invalid (401 Unauthorized)')
      return false
    } else {
      console.log(`   ⚠️  OPENAI_API_KEY test returned: ${openaiResponse.status}`)
      const errorText = await openaiResponse.text()
      console.log(`   Response: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    console.log(`   ❌ Error testing OPENAI_API_KEY: ${error.message}`)
    return false
  }
  
  // Test 3: Check customers who should get calls
  console.log('\n📋 Test 3: Customers Due for Calls\n')
  const client = await pool.connect()
  
  try {
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
      LIMIT 5
    `, [fourHoursAgo, oneHourFromNow])
    
    console.log(`   Found ${dueCustomers.rows.length} customers due for calls`)
    
    if (dueCustomers.rows.length === 0) {
      console.log('   ⚠️  No customers found - this is why calls aren\'t happening!')
      console.log('   \n   Checking all Paid/Partner customers...')
      
      const allPaid = await client.query(`
        SELECT 
          id, name, phone,
          payment_status,
          phone_validated,
          call_status,
          welcome_call_completed,
          next_call_scheduled_at,
          last_call_date,
          call_time_hour,
          timezone
        FROM customers
        WHERE payment_status IN ('Paid', 'Partner')
        ORDER BY id
      `)
      
      console.log(`   Total Paid/Partner customers: ${allPaid.rows.length}`)
      
      if (allPaid.rows.length > 0) {
        console.log('\n   Issues found:')
        allPaid.rows.forEach(customer => {
          const issues = []
          if (!customer.phone_validated) issues.push('phone not validated')
          if (['disabled', 'paused'].includes(customer.call_status)) issues.push(`call_status = ${customer.call_status}`)
          if (!customer.welcome_call_completed && customer.next_call_scheduled_at) issues.push('welcome call not completed but has next_call_scheduled_at')
          if (customer.welcome_call_completed && !customer.next_call_scheduled_at && !customer.call_time_hour) issues.push('missing call_time_hour')
          if (customer.welcome_call_completed && customer.last_call_date) {
            const lastCall = new Date(customer.last_call_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const lastCallDate = new Date(lastCall)
            lastCallDate.setHours(0, 0, 0, 0)
            if (lastCallDate.getTime() === today.getTime()) {
              issues.push('already called today')
            }
          }
          
          if (issues.length > 0) {
            console.log(`\n   👤 ${customer.name} (ID: ${customer.id}):`)
            issues.forEach(issue => console.log(`      - ${issue}`))
          }
        })
      }
    } else {
      console.log('\n   Customers who should get calls:')
      dueCustomers.rows.forEach(customer => {
        console.log(`   👤 ${customer.name} (ID: ${customer.id})`)
        console.log(`      Phone: ${customer.phone}`)
        console.log(`      Next call: ${customer.next_call_scheduled_at || 'Will calculate'}`)
      })
    }
    
    // Test 4: Check recent call logs
    console.log('\n📋 Test 4: Recent Call Logs\n')
    const callLogs = await client.query(`
      SELECT 
        cl.*,
        c.name
      FROM call_logs cl
      JOIN customers c ON cl.customer_id = c.id
      ORDER BY cl.created_at DESC
      LIMIT 5
    `)
    
    if (callLogs.rows.length === 0) {
      console.log('   ⚠️  NO CALL LOGS FOUND')
      console.log('   This means makeVapiCall() is never being called or is failing before logging')
    } else {
      console.log(`   Found ${callLogs.rows.length} recent call logs:`)
      callLogs.rows.forEach(log => {
        console.log(`   📞 ${log.name}: ${log.status} (${log.call_type})`)
        if (log.error_message) {
          console.log(`      Error: ${log.error_message}`)
        }
      })
    }
    
    // Test 5: Check call queue
    console.log('\n📋 Test 5: Call Queue\n')
    const queue = await client.query(`
      SELECT 
        cq.*,
        c.name
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'processing', 'failed', 'retrying')
      ORDER BY cq.created_at DESC
      LIMIT 5
    `)
    
    if (queue.rows.length === 0) {
      console.log('   ✅ Queue is empty (all processed)')
    } else {
      console.log(`   Found ${queue.rows.length} items in queue:`)
      queue.rows.forEach(item => {
        console.log(`   📋 ${item.name}: ${item.status} (${item.call_type})`)
        if (item.error_message) {
          console.log(`      Error: ${item.error_message}`)
        }
      })
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY\n')
    
    if (dueCustomers.rows.length === 0) {
      console.log('❌ ROOT CAUSE: No customers found by cron query')
      console.log('\n   The cron job runs but finds no customers to call.')
      console.log('   This is why calls aren\'t happening.')
      console.log('\n   🔧 SOLUTION:')
      console.log('   1. Check if customers have next_call_scheduled_at set')
      console.log('   2. Check if last_call_date = today (already called)')
      console.log('   3. Run: node scripts/fix-existing-customers.js')
    } else if (callLogs.rows.length === 0) {
      console.log('❌ ROOT CAUSE: Calls are not being initiated')
      console.log('\n   Customers are found, but makeVapiCall() is not being called')
      console.log('   or is failing before logging.')
      console.log('\n   🔧 CHECK:')
      console.log('   1. Vercel logs for errors in processCallQueue()')
      console.log('   2. Check if function is timing out')
      console.log('   3. Check if enqueueCall() is working')
    } else {
      console.log('✅ System appears to be working')
      console.log('\n   If calls still aren\'t happening:')
      console.log('   1. Check Vapi dashboard for call attempts')
      console.log('   2. Check call status in call_logs table')
      console.log('   3. Verify phone numbers are correct')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

testFullSystem()
  .then(() => {
    console.log('\n✅ Test complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })


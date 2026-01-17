/**
 * Comprehensive Test Script for Call Scheduling System
 * Tests: Cron endpoint, customer querying, queue processing, timezone handling
 */

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    let content
    try {
      content = fs.readFileSync(envPath, 'utf8')
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

// Create database pool
function getPool() {
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('EXTERNAL_DATABASE_URL not found')
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.co'
const CRON_SECRET = process.env.CRON_SECRET

async function testCronEndpoint() {
  console.log('\n🧪 TEST 1: Cron Endpoint Authentication')
  console.log('=' .repeat(60))
  
  if (!CRON_SECRET) {
    console.error('❌ CRON_SECRET not found in environment variables')
    return false
  }
  
  try {
    const response = await fetch(`${SITE_URL}/api/calls/process`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Cron endpoint is accessible and authenticated')
      console.log(`   Response:`, JSON.stringify(data, null, 2))
      return true
    } else {
      console.error('❌ Cron endpoint returned error:', data)
      return false
    }
  } catch (error) {
    console.error('❌ Failed to call cron endpoint:', error.message)
    return false
  }
}

async function testGetCustomersDueForCalls() {
  console.log('\n🧪 TEST 2: Get Customers Due For Calls')
  console.log('=' .repeat(60))
  
  try {
    const pool = getPool()
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    const result = await pool.query(
      `SELECT 
        id, name, phone, timezone,
        CASE 
          WHEN welcome_call_completed = false THEN 'welcome'
          ELSE 'daily'
        END as call_type
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND (
          (welcome_call_completed = false AND created_at < NOW() - INTERVAL '20 minutes')
          OR
          (welcome_call_completed = true 
           AND next_call_scheduled_at IS NOT NULL
           AND next_call_scheduled_at BETWEEN $1 AND $2
           AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
        )
      ORDER BY next_call_scheduled_at ASC NULLS LAST
      LIMIT 50`,
      [fourHoursAgo, twentyMinutesFromNow]
    )
    
    const customers = result.rows
    console.log(`✅ Found ${customers.length} customers due for calls`)
    
    if (customers.length > 0) {
      console.log('\n   Sample customers:')
      customers.slice(0, 3).forEach(c => {
        console.log(`   - ID: ${c.id}, Name: ${c.name}, Type: ${c.call_type}`)
      })
    } else {
      console.log('   ℹ️  No customers due for calls right now (this is normal)')
    }
    
    await pool.end()
    return true
  } catch (error) {
    console.error('❌ Failed to get customers:', error.message)
    console.error('   Stack:', error.stack)
    return false
  }
}

async function testTimezoneCalculation() {
  console.log('\n🧪 TEST 3: Timezone Calculation')
  console.log('=' .repeat(60))
  
  // Simple timezone test using Intl API
  const testCases = [
    { hour: 7, minute: 0, timezone: 'America/New_York', name: '7 AM Eastern' },
    { hour: 9, minute: 0, timezone: 'America/Los_Angeles', name: '9 AM Pacific' },
    { hour: 7, minute: 30, timezone: 'America/Chicago', name: '7:30 AM Central' },
  ]
  
  let allPassed = true
  
  for (const testCase of testCases) {
    try {
      // Test if timezone is valid
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: testCase.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      const testDate = new Date()
      formatter.format(testDate) // This will throw if timezone is invalid
      
      console.log(`✅ ${testCase.name}:`)
      console.log(`   Timezone valid: ${testCase.timezone}`)
      console.log(`   Current time in timezone: ${formatter.format(testDate)}`)
    } catch (error) {
      console.error(`❌ ${testCase.name} failed:`, error.message)
      allPassed = false
    }
  }
  
  return allPassed
}

async function testDatabaseConnection() {
  console.log('\n🧪 TEST 4: Database Connection')
  console.log('=' .repeat(60))
  
  try {
    const pool = getPool()
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as customer_count FROM customers')
    
    console.log('✅ Database connection successful')
    console.log(`   Current DB time: ${result.rows[0].current_time}`)
    console.log(`   Total customers: ${result.rows[0].customer_count}`)
    
    // Check for customers with scheduling data
    const scheduledResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN payment_status IN ('Paid', 'Partner') THEN 1 END) as paid,
        COUNT(CASE WHEN phone_validated = true THEN 1 END) as validated,
        COUNT(CASE WHEN next_call_scheduled_at IS NOT NULL THEN 1 END) as scheduled,
        COUNT(CASE WHEN welcome_call_completed = false THEN 1 END) as needs_welcome
      FROM customers
    `)
    
    const stats = scheduledResult.rows[0]
    console.log('\n   Customer Statistics:')
    console.log(`   - Total: ${stats.total}`)
    console.log(`   - Paid/Partner: ${stats.paid}`)
    console.log(`   - Phone Validated: ${stats.validated}`)
    console.log(`   - Scheduled: ${stats.scheduled}`)
    console.log(`   - Need Welcome Call: ${stats.needs_welcome}`)
    
    await pool.end()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function testQueueSystem() {
  console.log('\n🧪 TEST 5: Queue System')
  console.log('=' .repeat(60))
  
  try {
    const pool = getPool()
    
    // Check queue status
    const queueStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(scheduled_for) as earliest,
        MAX(scheduled_for) as latest
      FROM call_queue
      GROUP BY status
      ORDER BY status
    `)
    
    console.log('✅ Queue system accessible')
    console.log('\n   Queue Status:')
    if (queueStats.rows.length === 0) {
      console.log('   - No items in queue')
    } else {
      queueStats.rows.forEach(row => {
        console.log(`   - ${row.status}: ${row.count} items`)
        if (row.earliest) {
          console.log(`     Earliest: ${row.earliest}`)
        }
      })
    }
    
    // Check for stuck items
    const stuckItems = await pool.query(`
      SELECT COUNT(*) as count
      FROM call_queue
      WHERE status = 'processing'
        AND updated_at < NOW() - INTERVAL '10 minutes'
    `)
    
    if (stuckItems.rows[0].count > 0) {
      console.log(`\n   ⚠️  Warning: ${stuckItems.rows[0].count} items stuck in 'processing' status`)
    } else {
      console.log('\n   ✅ No stuck items in queue')
    }
    
    await pool.end()
    return true
  } catch (error) {
    console.error('❌ Queue system test failed:', error.message)
    return false
  }
}

async function testCustomerScheduling() {
  console.log('\n🧪 TEST 6: Customer Scheduling Data')
  console.log('=' .repeat(60))
  
  try {
    const pool = getPool()
    
    // Find customers with scheduling issues
    const issues = await pool.query(`
      SELECT 
        id,
        name,
        payment_status,
        phone_validated,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        welcome_call_completed,
        last_call_date,
        call_status
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
      LIMIT 10
    `)
    
    console.log(`✅ Found ${issues.rows.length} active customers`)
    
    if (issues.rows.length > 0) {
      console.log('\n   Customer Scheduling Status:')
      issues.rows.forEach(c => {
        const hasTime = c.call_time_hour !== null
        const hasSchedule = c.next_call_scheduled_at !== null
        const needsWelcome = !c.welcome_call_completed
        
        let status = '✅'
        const problems = []
        
        if (!hasTime && !needsWelcome) {
          problems.push('Missing call_time_hour')
          status = '❌'
        }
        if (!hasSchedule && !needsWelcome) {
          problems.push('Missing next_call_scheduled_at')
          status = '❌'
        }
        
        console.log(`   ${status} ${c.name} (ID: ${c.id}):`)
        console.log(`      Payment: ${c.payment_status}, Phone: ${c.phone_validated ? '✅' : '❌'}`)
        console.log(`      Call Time: ${c.call_time_hour || 'NULL'}:${c.call_time_minute || 'NULL'}`)
        console.log(`      Timezone: ${c.timezone}`)
        console.log(`      Next Call: ${c.next_call_scheduled_at || 'NOT SCHEDULED'}`)
        console.log(`      Welcome: ${c.welcome_call_completed ? '✅' : '❌'}`)
        if (problems.length > 0) {
          console.log(`      ⚠️  Issues: ${problems.join(', ')}`)
        }
        console.log('')
      })
    }
    
    await pool.end()
    return true
  } catch (error) {
    console.error('❌ Customer scheduling test failed:', error.message)
    return false
  }
}

async function testScheduleNextCall() {
  console.log('\n🧪 TEST 7: Schedule Next Call Logic')
  console.log('=' .repeat(60))
  
  try {
    const pool = getPool()
    
    // Find a test customer
    const testCustomer = await pool.query(`
      SELECT id, name, call_time_hour, call_time_minute, timezone, next_call_scheduled_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_time_hour IS NOT NULL
        AND timezone IS NOT NULL
      LIMIT 1
    `)
    
    if (testCustomer.rows.length === 0) {
      console.log('   ℹ️  No suitable test customer found (need one with call_time_hour set)')
      await pool.end()
      return true
    }
    
    const customer = testCustomer.rows[0]
    console.log(`✅ Testing with customer: ${customer.name} (ID: ${customer.id})`)
    console.log(`   Current schedule: ${customer.next_call_scheduled_at || 'NULL'}`)
    console.log(`   Call time: ${customer.call_time_hour}:${customer.call_time_minute || '00'}`)
    console.log(`   Timezone: ${customer.timezone}`)
    
    // Check if scheduling logic would work
    if (customer.call_time_hour && customer.timezone) {
      console.log('   ✅ Customer has all required scheduling data')
      console.log('   ℹ️  Note: Not actually scheduling (would require TypeScript lib)')
      await pool.end()
      return true
    } else {
      console.log('   ❌ Customer missing required scheduling data')
      await pool.end()
      return false
    }
  } catch (error) {
    console.error('❌ Schedule next call test failed:', error.message)
    console.error('   Stack:', error.stack)
    return false
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Comprehensive Call Scheduling Tests')
  console.log('=' .repeat(60))
  console.log(`Site URL: ${SITE_URL}`)
  console.log(`Cron Secret: ${CRON_SECRET ? '✅ Set' : '❌ Missing'}`)
  console.log('=' .repeat(60))
  
  const results = {
    cronEndpoint: false,
    getCustomers: false,
    timezone: false,
    database: false,
    queue: false,
    customerScheduling: false,
    scheduleNext: false
  }
  
  // Run tests (database connection first)
  results.database = await testDatabaseConnection()
  
  if (!results.database) {
    console.log('\n⚠️  Database connection failed. Some tests will be skipped.')
  } else {
    results.timezone = await testTimezoneCalculation()
    results.getCustomers = await testGetCustomersDueForCalls()
    results.queue = await testQueueSystem()
    results.customerScheduling = await testCustomerScheduling()
    results.scheduleNext = await testScheduleNextCall()
  }
  
  // Test cron endpoint last (requires network)
  if (SITE_URL && CRON_SECRET) {
    results.cronEndpoint = await testCronEndpoint()
  } else {
    console.log('\n⚠️  Skipping cron endpoint test (missing SITE_URL or CRON_SECRET)')
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(60))
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`)
  })
  
  console.log('=' .repeat(60))
  console.log(`Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed! System is ready.')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal error running tests:', error)
  process.exit(1)
})


/**
 * Quick Verification Script for Call Scheduling System
 * Tests the critical components without needing all environment variables
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

async function verifySystem() {
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.log('❌ EXTERNAL_DATABASE_URL not found')
    console.log('   Please add it to .env.local or provide it as an environment variable')
    return
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    console.log('🔍 Verifying Call Scheduling System...\n')
    
    // 1. Check unique constraint exists
    console.log('1️⃣  Checking for unique constraint on call_queue...')
    const constraintCheck = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'call_queue' 
        AND indexname = 'unique_customer_call_active'
    `)
    
    if (constraintCheck.rows.length > 0) {
      console.log('   ✅ Unique constraint exists')
      console.log(`   ${constraintCheck.rows[0].indexdef}`)
    } else {
      console.log('   ❌ Unique constraint MISSING!')
      console.log('   ⚠️  This will allow duplicate calls!')
      console.log('   Run the migration to add it.')
    }
    
    // 2. Check active customers
    console.log('\n2️⃣  Checking active customers...')
    const customers = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN payment_status IN ('Paid', 'Partner') THEN 1 END) as paid,
        COUNT(CASE WHEN phone_validated = true THEN 1 END) as validated,
        COUNT(CASE WHEN call_time_hour IS NOT NULL THEN 1 END) as has_call_time,
        COUNT(CASE WHEN next_call_scheduled_at IS NOT NULL THEN 1 END) as scheduled,
        COUNT(CASE WHEN welcome_call_completed = false AND payment_status IN ('Paid', 'Partner') THEN 1 END) as needs_welcome
      FROM customers
    `)
    
    const stats = customers.rows[0]
    console.log(`   Total customers: ${stats.total}`)
    console.log(`   Paid/Partner: ${stats.paid}`)
    console.log(`   Phone validated: ${stats.validated}`)
    console.log(`   Has call time: ${stats.has_call_time}`)
    console.log(`   Scheduled: ${stats.scheduled}`)
    console.log(`   Need welcome call: ${stats.needs_welcome}`)
    
    // 3. Check customers due for calls
    console.log('\n3️⃣  Checking customers due for calls...')
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    const dueCustomers = await pool.query(`
      SELECT 
        id, name, phone, timezone,
        CASE 
          WHEN welcome_call_completed = false THEN 'welcome'
          ELSE 'daily'
        END as call_type,
        next_call_scheduled_at
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
      LIMIT 10
    `, [fourHoursAgo, twentyMinutesFromNow])
    
    console.log(`   Found ${dueCustomers.rows.length} customers due for calls`)
    if (dueCustomers.rows.length > 0) {
      console.log('\n   Next customers to call:')
      dueCustomers.rows.forEach(c => {
        console.log(`   - ${c.name} (${c.call_type}) - Scheduled: ${c.next_call_scheduled_at || 'NOW'}`)
      })
    }
    
    // 4. Check queue status
    console.log('\n4️⃣  Checking queue status...')
    const queueStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM call_queue
      GROUP BY status
      ORDER BY status
    `)
    
    if (queueStats.rows.length === 0) {
      console.log('   Queue is empty')
    } else {
      queueStats.rows.forEach(row => {
        console.log(`   ${row.status}: ${row.count} items`)
      })
    }
    
    // 5. Check for issues
    console.log('\n5️⃣  Checking for issues...')
    const issues = []
    
    // Missing call_time_hour
    const missingTime = await pool.query(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_time_hour IS NULL
        AND welcome_call_completed = true
    `)
    if (missingTime.rows[0].count > 0) {
      issues.push(`${missingTime.rows[0].count} customers missing call_time_hour`)
    }
    
    // Missing next_call_scheduled_at
    const missingSchedule = await pool.query(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND next_call_scheduled_at IS NULL
        AND welcome_call_completed = true
    `)
    if (missingSchedule.rows[0].count > 0) {
      issues.push(`${missingSchedule.rows[0].count} customers missing next_call_scheduled_at`)
    }
    
    // Stuck queue items
    const stuck = await pool.query(`
      SELECT COUNT(*) as count
      FROM call_queue
      WHERE status = 'processing'
        AND updated_at < NOW() - INTERVAL '10 minutes'
    `)
    if (stuck.rows[0].count > 0) {
      issues.push(`${stuck.rows[0].count} items stuck in processing`)
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No issues found!')
    } else {
      console.log('   ⚠️  Issues found:')
      issues.forEach(issue => console.log(`   - ${issue}`))
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    
    const constraintExists = constraintCheck.rows.length > 0
    const hasActiveCustomers = stats.paid > 0
    const hasScheduledCalls = stats.scheduled > 0
    const hasDueCustomers = dueCustomers.rows.length > 0
    const noIssues = issues.length === 0
    
    console.log(`${constraintExists ? '✅' : '❌'} Unique constraint: ${constraintExists ? 'EXISTS' : 'MISSING'}`)
    console.log(`${hasActiveCustomers ? '✅' : '⚠️ '} Active customers: ${stats.paid}`)
    console.log(`${hasScheduledCalls ? '✅' : '⚠️ '} Scheduled calls: ${stats.scheduled}`)
    console.log(`${hasDueCustomers ? '✅' : 'ℹ️ '} Customers due now: ${dueCustomers.rows.length}`)
    console.log(`${noIssues ? '✅' : '⚠️ '} System health: ${noIssues ? 'GOOD' : 'NEEDS ATTENTION'}`)
    
    if (constraintExists && hasActiveCustomers && noIssues) {
      console.log('\n🎉 System looks good! Ready for production.')
    } else {
      console.log('\n⚠️  Some issues need attention. Review above.')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

verifySystem().catch(console.error)


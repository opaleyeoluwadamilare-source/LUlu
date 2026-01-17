/**
 * Diagnostic: Why did Akin (customer 17) get multiple calls?
 * And why aren't other customers getting their daily calls?
 */

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.EXTERNAL_DATABASE_URL?.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : undefined
})

async function diagnose() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 DIAGNOSING: Why Akin got multiple calls & why others didn\'t\n')
    console.log('='.repeat(80))
    
    // 1. Check Akin's customer record
    console.log('\n📋 STEP 1: Akin (Customer 17) Customer Record\n')
    const akin = await client.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time_hour,
        call_time_minute,
        timezone,
        total_calls_made,
        created_at
      FROM customers
      WHERE id = 17
    `)
    
    if (akin.rows.length === 0) {
      console.log('❌ Customer 17 not found!')
      return
    }
    
    const a = akin.rows[0]
    console.log(`Name: ${a.name}`)
    console.log(`Email: ${a.email}`)
    console.log(`Phone: ${a.phone}`)
    console.log(`Payment Status: ${a.payment_status}`)
    console.log(`Phone Validated: ${a.phone_validated}`)
    console.log(`Call Status: ${a.call_status}`)
    console.log(`Welcome Call Completed: ${a.welcome_call_completed}`)
    console.log(`Last Call Date: ${a.last_call_date || 'NULL'}`)
    console.log(`Next Call Scheduled At: ${a.next_call_scheduled_at || 'NULL'}`)
    console.log(`Call Time: ${a.call_time_hour || 'NULL'}:${(a.call_time_minute || 0).toString().padStart(2, '0')}`)
    console.log(`Timezone: ${a.timezone || 'NULL'}`)
    console.log(`Total Calls Made: ${a.total_calls_made || 0}`)
    console.log(`Created At: ${a.created_at}`)
    
    // 2. Check Akin's call logs
    console.log('\n📞 STEP 2: Akin\'s Call Logs (All Calls)\n')
    const akinLogs = await client.query(`
      SELECT 
        id,
        call_type,
        vapi_call_id,
        status,
        duration_seconds,
        transcript IS NOT NULL as has_transcript,
        created_at,
        updated_at
      FROM call_logs
      WHERE customer_id = 17
      ORDER BY created_at DESC
    `)
    
    console.log(`Total call logs: ${akinLogs.rows.length}\n`)
    akinLogs.rows.forEach((log, i) => {
      console.log(`Call ${i + 1}:`)
      console.log(`  Type: ${log.call_type}`)
      console.log(`  Status: ${log.status}`)
      console.log(`  Vapi Call ID: ${log.vapi_call_id || 'NULL'}`)
      console.log(`  Duration: ${log.duration_seconds || 0}s`)
      console.log(`  Has Transcript: ${log.has_transcript}`)
      console.log(`  Created: ${log.created_at}`)
      console.log(`  Updated: ${log.updated_at || 'NULL'}`)
      console.log('')
    })
    
    // 3. Check Akin's call queue entries
    console.log('\n📋 STEP 3: Akin\'s Call Queue Entries\n')
    const akinQueue = await client.query(`
      SELECT 
        id,
        call_type,
        scheduled_for,
        status,
        attempts,
        vapi_call_id,
        created_at,
        processed_at
      FROM call_queue
      WHERE customer_id = 17
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    console.log(`Total queue entries: ${akinQueue.rows.length}\n`)
    if (akinQueue.rows.length === 0) {
      console.log('  No queue entries found')
    } else {
      akinQueue.rows.forEach((q, i) => {
        console.log(`Queue Entry ${i + 1}:`)
        console.log(`  Type: ${q.call_type}`)
        console.log(`  Scheduled For: ${q.scheduled_for}`)
        console.log(`  Status: ${q.status}`)
        console.log(`  Attempts: ${q.attempts}`)
        console.log(`  Vapi Call ID: ${q.vapi_call_id || 'NULL'}`)
        console.log(`  Created: ${q.created_at}`)
        console.log(`  Processed: ${q.processed_at || 'NULL'}`)
        console.log('')
      })
    }
    
    // 4. Check why other customers aren't getting calls
    console.log('\n👥 STEP 4: Other Customers Who Should Get Calls Today\n')
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    const otherCustomers = await client.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time_hour,
        call_time_minute,
        timezone,
        CASE 
          WHEN welcome_call_completed = false THEN 'welcome'
          ELSE 'daily'
        END as call_type
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND id != 17
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
      ORDER BY next_call_scheduled_at ASC NULLS LAST
    `, [fourHoursAgo, oneHourFromNow])
    
    console.log(`Other customers due for calls: ${otherCustomers.rows.length}\n`)
    if (otherCustomers.rows.length === 0) {
      console.log('  ❌ NO OTHER CUSTOMERS FOUND!')
      console.log('  This explains why only Akin got calls.\n')
    } else {
      otherCustomers.rows.forEach((c, i) => {
        console.log(`Customer ${i + 1}: ${c.name} (ID: ${c.id})`)
        console.log(`  Type: ${c.call_type}`)
        console.log(`  Next Scheduled: ${c.next_call_scheduled_at || 'NULL (will calculate)'}`)
        console.log(`  Last Call Date: ${c.last_call_date || 'NULL'}`)
        console.log(`  Call Time: ${c.call_time_hour || 'NULL'}:${(c.call_time_minute || 0).toString().padStart(2, '0')}`)
        console.log(`  Timezone: ${c.timezone || 'NULL'}`)
        console.log('')
      })
    }
    
    // 5. Check call queue for pending calls
    console.log('\n📋 STEP 5: Pending Calls in Queue\n')
    const pendingQueue = await client.query(`
      SELECT 
        cq.id,
        cq.customer_id,
        c.name,
        cq.call_type,
        cq.scheduled_for,
        cq.status,
        cq.attempts,
        cq.created_at
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying')
      ORDER BY cq.scheduled_for ASC
      LIMIT 20
    `)
    
    console.log(`Pending queue entries: ${pendingQueue.rows.length}\n`)
    if (pendingQueue.rows.length === 0) {
      console.log('  No pending calls in queue')
    } else {
      pendingQueue.rows.forEach((q, i) => {
        console.log(`Queue ${i + 1}: ${q.name} (ID: ${q.customer_id})`)
        console.log(`  Type: ${q.call_type}`)
        console.log(`  Scheduled: ${q.scheduled_for}`)
        console.log(`  Status: ${q.status}`)
        console.log(`  Attempts: ${q.attempts}`)
        console.log(`  Created: ${q.created_at}`)
        console.log('')
      })
    }
    
    // 6. Check all customers to see their status
    console.log('\n👥 STEP 6: All Paid/Partner Customers Status\n')
    const allCustomers = await client.query(`
      SELECT 
        id, name,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time_hour,
        timezone
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
      ORDER BY id
    `)
    
    console.log(`Total paid/partner customers: ${allCustomers.rows.length}\n`)
    allCustomers.rows.forEach((c) => {
      const status = []
      if (c.call_status === 'disabled' || c.call_status === 'paused') {
        status.push(`⚠️ ${c.call_status}`)
      }
      if (c.last_call_date) {
        const lastCall = new Date(c.last_call_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        lastCall.setHours(0, 0, 0, 0)
        if (lastCall.getTime() === today.getTime()) {
          status.push('✅ Called today')
        } else {
          status.push(`📅 Last: ${c.last_call_date}`)
        }
      } else {
        status.push('❌ Never called')
      }
      if (!c.next_call_scheduled_at && c.welcome_call_completed) {
        status.push('⚠️ No next call scheduled')
      }
      
      console.log(`${c.id}. ${c.name}: ${status.join(', ')}`)
    })
    
    // 7. Root cause analysis
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 ROOT CAUSE ANALYSIS\n')
    
    // Check if Akin's last_call_date is preventing other calls
    if (a.last_call_date) {
      const lastCallDate = new Date(a.last_call_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      lastCallDate.setHours(0, 0, 0, 0)
      
      if (lastCallDate.getTime() === today.getTime()) {
        console.log('✅ Akin\'s last_call_date is set to today - this is correct')
      } else {
        console.log(`⚠️ Akin's last_call_date is ${a.last_call_date} (not today)`)
      }
    } else {
      console.log('⚠️ Akin\'s last_call_date is NULL - this might allow duplicate calls')
    }
    
    // Check if other customers have next_call_scheduled_at set
    const customersWithoutSchedule = await client.query(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND welcome_call_completed = true
        AND next_call_scheduled_at IS NULL
        AND call_time_hour IS NOT NULL
        AND timezone IS NOT NULL
        AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)
        AND id != 17
    `)
    
    console.log(`\nOther customers missing next_call_scheduled_at: ${customersWithoutSchedule.rows[0].count}`)
    if (customersWithoutSchedule.rows[0].count > 0) {
      console.log('  ⚠️ These customers should get calls but next_call_scheduled_at is NULL')
      console.log('  The system should calculate it on the fly, but might be missing them')
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('\n📊 SUMMARY\n')
    console.log(`Akin's calls: ${akinLogs.rows.length} total`)
    console.log(`  - Welcome: ${akinLogs.rows.filter(l => l.call_type === 'welcome').length}`)
    console.log(`  - Daily: ${akinLogs.rows.filter(l => l.call_type === 'daily').length}`)
    console.log(`\nOther customers due: ${otherCustomers.rows.length}`)
    console.log(`Pending queue: ${pendingQueue.rows.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    client.release()
    await pool.end()
  }
}

diagnose()
  .then(() => {
    console.log('\n✅ Diagnosis complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Diagnosis failed:', error)
    process.exit(1)
  })


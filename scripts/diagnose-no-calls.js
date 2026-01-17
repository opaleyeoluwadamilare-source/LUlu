/**
 * Diagnostic script to find why calls aren't happening
 * Checks all conditions that could prevent calls from being made
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.EXTERNAL_DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : undefined
})

async function diagnoseNoCalls() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 DIAGNOSING WHY CALLS AREN\'T HAPPENING\n')
    console.log('=' .repeat(60))
    
    // 1. Check all Paid/Partner customers
    console.log('\n📊 STEP 1: Checking all Paid/Partner customers...\n')
    const allPaid = await client.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        last_call_date,
        created_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
      ORDER BY id
    `)
    
    console.log(`Found ${allPaid.rows.length} Paid/Partner customers:\n`)
    
    for (const customer of allPaid.rows) {
      console.log(`\n👤 ${customer.name} (ID: ${customer.id})`)
      console.log(`   Email: ${customer.email}`)
      console.log(`   Phone: ${customer.phone}`)
      console.log(`   Payment: ${customer.payment_status}`)
      
      // Check each condition
      const issues = []
      const checks = []
      
      // Check 1: phone_validated
      if (!customer.phone_validated) {
        issues.push('❌ phone_validated = false')
      } else {
        checks.push('✅ phone_validated = true')
      }
      
      // Check 2: call_status
      if (['disabled', 'paused'].includes(customer.call_status)) {
        issues.push(`❌ call_status = "${customer.call_status}"`)
      } else {
        checks.push(`✅ call_status = "${customer.call_status || 'null (ok)'}"`)
      }
      
      // Check 3: welcome_call_completed
      if (!customer.welcome_call_completed) {
        console.log(`   ⚠️  Welcome call not completed yet`)
        console.log(`      Created: ${customer.created_at}`)
        const created = new Date(customer.created_at)
        const now = new Date()
        const minutesAgo = Math.floor((now - created) / 1000 / 60)
        console.log(`      Minutes since signup: ${minutesAgo}`)
        if (minutesAgo < 20) {
          console.log(`      ℹ️  Will be eligible for welcome call in ${20 - minutesAgo} minutes`)
        } else {
          issues.push('❌ Welcome call overdue (created > 20 min ago but not completed)')
        }
      } else {
        checks.push('✅ welcome_call_completed = true')
        
        // Check 4: next_call_scheduled_at for daily calls
        if (!customer.next_call_scheduled_at) {
          issues.push('❌ next_call_scheduled_at IS NULL (CRITICAL - no call scheduled!)')
        } else {
          const scheduled = new Date(customer.next_call_scheduled_at)
          const now = new Date()
          const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
          const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
          
          console.log(`   📅 next_call_scheduled_at: ${scheduled.toISOString()}`)
          console.log(`      (${scheduled.toLocaleString()})`)
          
          if (scheduled < fourHoursAgo) {
            issues.push(`❌ next_call_scheduled_at is too far in the past (${Math.floor((now - scheduled) / 1000 / 60)} minutes ago)`)
            issues.push(`   ⚠️  Outside 4-hour window - cron won't find it`)
          } else if (scheduled > twentyMinutesFromNow) {
            issues.push(`❌ next_call_scheduled_at is too far in the future (${Math.floor((scheduled - now) / 1000 / 60)} minutes from now)`)
            issues.push(`   ⚠️  Outside 20-minute window - cron won't find it`)
          } else {
            checks.push(`✅ next_call_scheduled_at is within cron window`)
          }
        }
        
        // Check 5: last_call_date
        if (customer.last_call_date) {
          const lastCall = new Date(customer.last_call_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const lastCallDate = new Date(lastCall)
          lastCallDate.setHours(0, 0, 0, 0)
          
          if (lastCallDate.getTime() === today.getTime()) {
            issues.push(`❌ last_call_date = today (${customer.last_call_date}) - already called today!`)
          } else {
            checks.push(`✅ last_call_date = ${customer.last_call_date} (not today)`)
          }
        } else {
          checks.push('✅ last_call_date IS NULL (ok - no calls yet)')
        }
        
        // Check 6: call_time_hour
        if (!customer.call_time_hour) {
          issues.push('❌ call_time_hour IS NULL - cannot schedule calls')
        } else {
          checks.push(`✅ call_time_hour = ${customer.call_time_hour}`)
        }
        
        // Check 7: timezone
        if (!customer.timezone) {
          issues.push('❌ timezone IS NULL - cannot schedule calls')
        } else {
          checks.push(`✅ timezone = ${customer.timezone}`)
        }
      }
      
      // Print checks
      if (checks.length > 0) {
        console.log(`\n   ✅ Checks passed:`)
        checks.forEach(check => console.log(`      ${check}`))
      }
      
      // Print issues
      if (issues.length > 0) {
        console.log(`\n   ❌ Issues found:`)
        issues.forEach(issue => console.log(`      ${issue}`))
      } else if (customer.welcome_call_completed) {
        console.log(`\n   ✅ All checks passed - SHOULD be getting calls!`)
      }
    }
    
    // 2. Check what getCustomersDueForCalls would return
    console.log('\n\n' + '='.repeat(60))
    console.log('📞 STEP 2: Testing getCustomersDueForCalls query...\n')
    
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    console.log(`Current time: ${now.toISOString()}`)
    console.log(`Looking for calls between: ${fourHoursAgo.toISOString()} and ${twentyMinutesFromNow.toISOString()}\n`)
    
    const dueCustomers = await client.query(`
      SELECT 
        id, name, phone, timezone,
        CASE 
          WHEN welcome_call_completed = false THEN 'welcome'
          ELSE 'daily'
        END as call_type,
        CASE
          WHEN welcome_call_completed = false THEN created_at + INTERVAL '20 minutes'
          ELSE next_call_scheduled_at
        END as scheduled_for
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
      ORDER BY scheduled_for ASC NULLS LAST
      LIMIT 50
    `, [fourHoursAgo, twentyMinutesFromNow])
    
    console.log(`Found ${dueCustomers.rows.length} customers due for calls:\n`)
    
    if (dueCustomers.rows.length === 0) {
      console.log('❌ NO CUSTOMERS FOUND - This is why calls aren\'t happening!')
      console.log('\nPossible reasons:')
      console.log('1. All customers have next_call_scheduled_at outside the time window')
      console.log('2. All customers have last_call_date = today (already called)')
      console.log('3. All customers have phone_validated = false')
      console.log('4. All customers have call_status = disabled/paused')
      console.log('5. All welcome calls are less than 20 minutes old')
    } else {
      dueCustomers.rows.forEach(customer => {
        console.log(`✅ ${customer.name} (ID: ${customer.id})`)
        console.log(`   Type: ${customer.call_type}`)
        console.log(`   Scheduled: ${new Date(customer.scheduled_for).toISOString()}`)
      })
    }
    
    // 3. Check call queue
    console.log('\n\n' + '='.repeat(60))
    console.log('📋 STEP 3: Checking call queue...\n')
    
    const queueItems = await client.query(`
      SELECT 
        cq.*,
        c.name,
        c.phone
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying', 'processing')
      ORDER BY cq.scheduled_for ASC
      LIMIT 20
    `)
    
    console.log(`Found ${queueItems.rows.length} items in queue:\n`)
    
    if (queueItems.rows.length === 0) {
      console.log('⚠️  Queue is empty - no calls queued')
    } else {
      queueItems.rows.forEach(item => {
        console.log(`📞 ${item.name} (ID: ${item.customer_id})`)
        console.log(`   Status: ${item.status}`)
        console.log(`   Type: ${item.call_type}`)
        console.log(`   Scheduled: ${new Date(item.scheduled_for).toISOString()}`)
        console.log(`   Attempts: ${item.attempts}/${item.max_attempts}`)
      })
    }
    
    // 4. Summary
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 SUMMARY\n')
    console.log(`Total Paid/Partner customers: ${allPaid.rows.length}`)
    console.log(`Customers due for calls: ${dueCustomers.rows.length}`)
    console.log(`Items in queue: ${queueItems.rows.length}`)
    
    if (dueCustomers.rows.length === 0 && queueItems.rows.length === 0) {
      console.log('\n❌ ROOT CAUSE: No customers are being found by the cron query!')
      console.log('\n🔧 RECOMMENDED FIXES:')
      console.log('1. Check if next_call_scheduled_at is NULL for customers')
      console.log('2. Check if next_call_scheduled_at is outside the time window')
      console.log('3. Run: node scripts/fix-existing-customers.js')
      console.log('4. Manually trigger calls via admin dashboard')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

diagnoseNoCalls()


/**
 * Fix missed calls by recalculating next_call_scheduled_at for today
 * and cleaning up stuck queue items
 * Run: node scripts/fix-missed-calls.js
 */

/**
 * Fix missed calls by recalculating next_call_scheduled_at
 * and cleaning up stuck queue items
 * Run: node scripts/fix-missed-calls.js
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Helper function to calculate next call time
// If call time was within last 4 hours, schedule for today (now or soon)
// Otherwise, schedule for next occurrence
function calculateNextCallTimeUTC(callTimeHour, callTimeMinute, timezone) {
  const now = new Date()
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  
  // Get current time in customer's timezone
  const customerFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  const customerParts = customerFormatter.formatToParts(now)
  const getPart = (type) => parseInt(customerParts.find(p => p.type === type)?.value || '0')
  
  const year = getPart('year')
  const month = getPart('month') - 1
  const day = getPart('day')
  const currentHour = getPart('hour')
  const currentMinute = getPart('minute')
  
  // Calculate today's call time in customer timezone
  const todayCallTime = new Date(year, month, day, callTimeHour, callTimeMinute, 0)
  
  // Convert today's call time to UTC for comparison
  const todayCallTimeUTC = new Date(todayCallTime.toLocaleString('en-US', { timeZone: 'UTC' }))
  const customerTodayCallUTC = new Date(
    customerFormatter.format(todayCallTime).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/, (_, m, d, y, h, min) => {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`
    })
  )
  
  // Better approach: Calculate UTC time directly
  // Get timezone offset for today
  const testNoonUTC = new Date(Date.UTC(year, month, day, 12, 0, 0))
  const testNoonCustomer = customerFormatter.formatToParts(testNoonUTC)
  const testNoonCustomerHour = parseInt(testNoonCustomer.find(p => p.type === 'hour')?.value || '0')
  const offsetHours = testNoonCustomerHour - 12
  
  // Calculate today's call time in UTC
  let todayCallUTC = new Date(Date.UTC(year, month, day, callTimeHour - offsetHours, callTimeMinute, 0))
  
  // Handle hour overflow/underflow for today
  if (todayCallUTC.getUTCHours() < 0 || todayCallUTC.getUTCHours() >= 24) {
    const adjustedDate = new Date(todayCallUTC)
    if (adjustedDate.getUTCHours() < 0) {
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() - 1)
      adjustedDate.setUTCHours(adjustedDate.getUTCHours() + 24)
    } else {
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1)
      adjustedDate.setUTCHours(adjustedDate.getUTCHours() - 24)
    }
    todayCallUTC = adjustedDate
  }
  
  // Check if today's call time was within the last 4 hours
  const callTimeWasRecent = todayCallUTC >= fourHoursAgo && todayCallUTC <= now
  
  if (callTimeWasRecent) {
    // Call time was recent (within last 4 hours) - schedule for now or very soon
    // Schedule for 5 minutes from now to give system time to process
    return new Date(now.getTime() + 5 * 60 * 1000)
  }
  
  // Call time hasn't happened yet today OR was more than 4 hours ago
  // Schedule for next occurrence (today if not passed, tomorrow if passed)
  const hasPassed = currentHour > callTimeHour || 
                   (currentHour === callTimeHour && currentMinute >= callTimeMinute)
  
  const targetDate = new Date(year, month, day + (hasPassed ? 1 : 0))
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()
  const targetDay = targetDate.getDate()
  
  // Calculate UTC offset for target date
  const targetNoonUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0))
  const targetNoonCustomer = customerFormatter.formatToParts(targetNoonUTC)
  const targetNoonCustomerHour = parseInt(targetNoonCustomer.find(p => p.type === 'hour')?.value || '0')
  const targetOffsetHours = targetNoonCustomerHour - 12
  
  // Create UTC date for target
  let utcHour = callTimeHour - targetOffsetHours
  let utcDay = targetDay
  let utcMonth = targetMonth
  let utcYear = targetYear
  
  // Handle hour overflow/underflow
  if (utcHour < 0) {
    utcHour += 24
    utcDay--
    if (utcDay < 1) {
      utcMonth--
      if (utcMonth < 0) {
        utcMonth = 11
        utcYear--
      }
      utcDay = new Date(utcYear, utcMonth + 1, 0).getDate()
    }
  } else if (utcHour >= 24) {
    utcHour -= 24
    utcDay++
    const daysInMonth = new Date(utcYear, utcMonth + 1, 0).getDate()
    if (utcDay > daysInMonth) {
      utcDay = 1
      utcMonth++
      if (utcMonth > 11) {
        utcMonth = 0
        utcYear++
      }
    }
  }
  
  return new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, callTimeMinute, 0))
}

async function fixMissedCalls() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔍 Finding paid customers with missed calls...\n')
    
    // Find paid customers who should have been called today
    // This includes:
    // 1. Customers with next_call_scheduled_at in the past
    // 2. Customers with last_call_date before today (should get today's call)
    // 3. Customers with next_call_scheduled_at set for tomorrow but should be called today
    const customers = await client.query(`
      SELECT 
        id, name, email, phone,
        call_time_hour, call_time_minute, timezone,
        next_call_scheduled_at,
        last_call_date,
        welcome_call_completed
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND welcome_call_completed = true
        AND (
          next_call_scheduled_at IS NULL
          OR next_call_scheduled_at < NOW()
          OR (last_call_date IS NULL OR last_call_date < CURRENT_DATE)
        )
      ORDER BY id
    `)
    
    console.log(`Found ${customers.rows.length} customers to fix\n`)
    
    let fixed = 0
    for (const customer of customers.rows) {
      if (!customer.call_time_hour || !customer.timezone) {
        console.log(`⚠️ Skipping customer ${customer.id} (${customer.name}): missing call_time_hour or timezone`)
        continue
      }
      
      try {
        // Recalculate next call time
        const nextCallTime = calculateNextCallTimeUTC(
          customer.call_time_hour,
          customer.call_time_minute || 0,
          customer.timezone
        )
        
        // Update next_call_scheduled_at
        await client.query(
          `UPDATE customers 
           SET next_call_scheduled_at = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [nextCallTime, customer.id]
        )
        
        console.log(`✅ Fixed customer ${customer.id} (${customer.name})`)
        console.log(`   Next call scheduled: ${nextCallTime.toISOString()}`)
        fixed++
      } catch (error) {
        console.error(`❌ Error fixing customer ${customer.id}:`, error.message)
      }
    }
    
    // Clean up stuck queue items (older than 1 hour)
    console.log(`\n🧹 Cleaning up stuck queue items...`)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const cleanupResult = await client.query(
      `UPDATE call_queue 
       SET status = 'failed',
           error_message = 'Stuck queue item - cleaned up by fix script'
       WHERE status IN ('pending', 'processing')
         AND scheduled_for < $1
       RETURNING id`,
      [oneHourAgo]
    )
    
    console.log(`✅ Cleaned up ${cleanupResult.rows.length} stuck queue items`)
    
    await client.query('COMMIT')
    console.log(`\n✅ Fixed ${fixed} customers and cleaned up queue`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

fixMissedCalls().catch(console.error)


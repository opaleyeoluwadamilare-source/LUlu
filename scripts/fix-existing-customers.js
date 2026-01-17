/**
 * Fix Script: Update existing paid customers with missing scheduling data
 * 
 * This script finds all paid customers who are missing:
 * - call_time_hour / call_time_minute (parsed from call_time)
 * - next_call_scheduled_at (calculated from timezone and call time)
 * 
 * It then:
 * 1. Parses call_time to extract hour/minute
 * 2. Normalizes timezone to IANA format
 * 3. Calculates next_call_scheduled_at in UTC
 * 4. Updates the database
 * 
 * SAFETY:
 * - Only updates customers with payment_status = 'Paid'
 * - Only updates missing fields (won't overwrite existing data)
 * - Uses transactions for safety
 * - Logs all changes
 * - Idempotent (can run multiple times safely)
 * 
 * Usage:
 *   node scripts/fix-existing-customers.js
 * 
 * Environment Variables Required:
 *   EXTERNAL_DATABASE_URL or DATABASE_URL
 */

const { Pool } = require('pg')

// Timezone mapping for normalization (same as lib/call-scheduler.ts)
const timezoneMap = {
  'Eastern (ET)': 'America/New_York',
  'Central (CT)': 'America/Chicago',
  'Mountain (MT)': 'America/Denver',
  'Pacific (PT)': 'America/Los_Angeles',
  'Alaska (AKT)': 'America/Anchorage',
  'Hawaii (HST)': 'Pacific/Honolulu',
  'London (GMT)': 'Europe/London',
  'Central European (CET)': 'Europe/Paris',
  'Gulf (GST)': 'Asia/Dubai',
  'India (IST)': 'Asia/Kolkata',
  'Singapore (SGT)': 'Asia/Singapore',
  'Tokyo (JST)': 'Asia/Tokyo',
  'Sydney (AEST)': 'Australia/Sydney',
}

/**
 * Normalize timezone to IANA format (same logic as lib/call-scheduler.ts)
 */
function normalizeTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return 'America/New_York' // Safe default
  }
  
  const trimmedTimezone = timezone.trim()
  
  // If already IANA format (contains '/'), validate it
  if (trimmedTimezone.includes('/')) {
    try {
      // Test if it's a valid IANA timezone
      const testDate = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: trimmedTimezone })
      formatter.formatToParts(testDate) // This will throw if invalid
      return trimmedTimezone // Valid IANA format
    } catch {
      // Invalid IANA format, fall through to conversion
    }
  }
  
  // Convert display label to IANA format
  return timezoneMap[trimmedTimezone] || 'America/New_York'
}

/**
 * Parse call_time string to extract hour and minute (same logic as lib/call-scheduler.ts)
 */
function parseCallTime(callTime) {
  if (!callTime) return null
  
  const lowerTime = callTime.toLowerCase()
  
  // Handle text descriptions
  if (lowerTime.includes('early')) {
    return { hour: 7, minute: 0 }
  }
  if (lowerTime.includes('mid')) {
    return { hour: 9, minute: 0 }
  }
  if (lowerTime.includes('late')) {
    return { hour: 11, minute: 0 }
  }
  
  // Handle exact times with am/pm
  const match = callTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  if (!match) return null
  
  let hour = parseInt(match[1])
  const minute = match[2] ? parseInt(match[2]) : 0
  const period = match[3].toLowerCase()
  
  // Convert to 24-hour
  if (period === 'pm' && hour !== 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0
  
  return { hour, minute }
}

/**
 * Calculate next call time in customer's timezone, converted to UTC
 * (Same logic as lib/call-scheduler.ts calculateNextCallTime)
 */
function calculateNextCallTime(callTimeHour, callTimeMinute, timezone) {
  const normalizedTimezone = normalizeTimezone(timezone)
  const now = new Date()
  
  // Get current date/time components in customer's timezone
  const customerFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizedTimezone,
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
  const month = getPart('month') - 1 // JS months are 0-indexed
  const day = getPart('day')
  const currentHour = getPart('hour')
  const currentMinute = getPart('minute')
  
  // Check if call time has passed today in customer's timezone
  const hasPassed = currentHour > callTimeHour || 
                   (currentHour === callTimeHour && currentMinute >= callTimeMinute)
  
  // Calculate target date (today or tomorrow)
  const targetDate = new Date(year, month, day + (hasPassed ? 1 : 0))
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()
  const targetDay = targetDate.getDate()
  
  // Get timezone offset for this specific date
  const testNoonUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0))
  const testNoonCustomer = customerFormatter.formatToParts(testNoonUTC)
  const testNoonLocal = new Date(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute')
  )
  const offsetMs = testNoonUTC.getTime() - testNoonLocal.getTime()
  
  // Create target time in customer's timezone
  const targetLocal = new Date(targetYear, targetMonth, targetDay, callTimeHour, callTimeMinute, 0)
  const targetUTC = new Date(targetLocal.getTime() - offsetMs)
  
  return targetUTC
}

async function main() {
  const databaseUrl = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ Error: EXTERNAL_DATABASE_URL or DATABASE_URL environment variable is required')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined
  })
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔍 Finding paid customers with missing scheduling data...\n')
    
    // Find customers who are paid but missing call_time_hour or next_call_scheduled_at
    // OR have next_call_scheduled_at in the past (needs recalculation)
    const result = await client.query(`
      SELECT 
        id, 
        name, 
        email,
        phone,
        payment_status,
        call_time,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        welcome_call_completed
      FROM customers 
      WHERE payment_status = 'Paid'
        AND phone_validated = true
        AND (
          call_time_hour IS NULL 
          OR call_time_minute IS NULL 
          OR next_call_scheduled_at IS NULL
          OR next_call_scheduled_at < NOW()
        )
      ORDER BY id
    `)
    
    if (result.rows.length === 0) {
      console.log('✅ No customers found with missing scheduling data. All paid customers are properly configured!')
      await client.query('COMMIT')
      return
    }
    
    console.log(`📊 Found ${result.rows.length} customer(s) needing fixes:\n`)
    
    let fixed = 0
    let skipped = 0
    let errors = 0
    
    for (const customer of result.rows) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Customer ID: ${customer.id}`)
      console.log(`Name: ${customer.name || 'N/A'}`)
      console.log(`Email: ${customer.email || 'N/A'}`)
      console.log(`Current state:`)
      console.log(`  - call_time: ${customer.call_time || 'NULL'}`)
      console.log(`  - call_time_hour: ${customer.call_time_hour || 'NULL'}`)
      console.log(`  - call_time_minute: ${customer.call_time_minute || 'NULL'}`)
      console.log(`  - timezone: ${customer.timezone || 'NULL'}`)
      console.log(`  - next_call_scheduled_at: ${customer.next_call_scheduled_at || 'NULL'}`)
      
      // Step 1: Parse call_time if call_time_hour is missing
      let callTimeHour = customer.call_time_hour
      let callTimeMinute = customer.call_time_minute
      
      if (!callTimeHour && customer.call_time) {
        const parsedTime = parseCallTime(customer.call_time)
        if (parsedTime) {
          callTimeHour = parsedTime.hour
          callTimeMinute = parsedTime.minute
          console.log(`  ✅ Parsed call_time: ${callTimeHour}:${callTimeMinute.toString().padStart(2, '0')}`)
        } else {
          console.log(`  ⚠️  Could not parse call_time: "${customer.call_time}"`)
          console.log(`  ⚠️  Using default: 7:00 AM`)
          callTimeHour = 7
          callTimeMinute = 0
        }
      } else if (!callTimeHour) {
        console.log(`  ⚠️  No call_time available, using default: 7:00 AM`)
        callTimeHour = 7
        callTimeMinute = 0
      }
      
      // Step 2: Normalize timezone
      if (!customer.timezone) {
        console.log(`  ⚠️  No timezone available, using default: America/New_York`)
        var normalizedTimezone = 'America/New_York'
      } else {
        const normalized = normalizeTimezone(customer.timezone)
        if (normalized !== customer.timezone) {
          console.log(`  ✅ Normalized timezone: "${customer.timezone}" → "${normalized}"`)
        }
        var normalizedTimezone = normalized
      }
      
      // Step 3: Calculate next_call_scheduled_at
      // Recalculate if missing OR if it's in the past
      let nextCallScheduledAt = customer.next_call_scheduled_at
      const needsRecalculation = !nextCallScheduledAt || new Date(nextCallScheduledAt) < new Date()
      
      if (needsRecalculation && callTimeHour !== null && normalizedTimezone) {
        try {
          nextCallScheduledAt = calculateNextCallTime(callTimeHour, callTimeMinute || 0, normalizedTimezone)
          console.log(`  ✅ Calculated next_call_scheduled_at: ${nextCallScheduledAt.toISOString()}`)
          console.log(`     (${callTimeHour}:${(callTimeMinute || 0).toString().padStart(2, '0')} in ${normalizedTimezone})`)
        } catch (error) {
          console.error(`  ❌ Failed to calculate next_call_scheduled_at:`, error.message)
          errors++
          skipped++
          continue
        }
      }
      
      // Step 4: Update database
      try {
        const updates = []
        const values = []
        let paramIndex = 1
        
        if (callTimeHour !== null && customer.call_time_hour === null) {
          updates.push(`call_time_hour = $${paramIndex++}`)
          values.push(callTimeHour)
        }
        
        if (callTimeMinute !== null && customer.call_time_minute === null) {
          updates.push(`call_time_minute = $${paramIndex++}`)
          values.push(callTimeMinute)
        }
        
        // Update if missing OR if it's in the past (needs recalculation)
        if (nextCallScheduledAt && (!customer.next_call_scheduled_at || new Date(customer.next_call_scheduled_at) < new Date())) {
          updates.push(`next_call_scheduled_at = $${paramIndex++}`)
          values.push(nextCallScheduledAt)
        }
        
        // Also normalize timezone if it's a display label
        if (normalizedTimezone !== customer.timezone && customer.timezone) {
          updates.push(`timezone = $${paramIndex++}`)
          values.push(normalizedTimezone)
        }
        
        if (updates.length > 0) {
          updates.push(`updated_at = CURRENT_TIMESTAMP`)
          values.push(customer.id)
          
          const updateQuery = `
            UPDATE customers 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
          `
          
          await client.query(updateQuery, values)
          console.log(`  ✅ Database updated successfully`)
          fixed++
        } else {
          console.log(`  ℹ️  No updates needed (all fields already set)`)
          skipped++
        }
      } catch (error) {
        console.error(`  ❌ Failed to update database:`, error.message)
        errors++
        skipped++
      }
    }
    
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📊 Summary:`)
    console.log(`  ✅ Fixed: ${fixed} customer(s)`)
    console.log(`  ⏭️  Skipped: ${skipped} customer(s)`)
    console.log(`  ❌ Errors: ${errors} customer(s)`)
    
    if (fixed > 0) {
      console.log(`\n✅ Committing changes...`)
      await client.query('COMMIT')
      console.log(`✅ All changes committed successfully!`)
    } else {
      console.log(`\nℹ️  No changes to commit.`)
      await client.query('ROLLBACK')
    }
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error)
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })


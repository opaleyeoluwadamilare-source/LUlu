import { getPool } from './db'

/**
 * Parse call_time string and extract hour/minute
 * Handles formats: 
 * - Exact times: "7am", "7:00am", "7:30am", "9pm"
 * - Text descriptions: "early", "mid-morning", "late"
 */
export function parseCallTime(callTime: string): { hour: number; minute: number } | null {
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
 * Normalize timezone to IANA format with safe fallback
 * Handles both IANA format (e.g., "America/New_York") and display labels (e.g., "Eastern (ET)")
 * This ensures backward compatibility with existing customer data
 */
export function normalizeTimezone(timezone: string): string {
  if (!timezone || typeof timezone !== 'string') {
    return 'America/New_York' // Safe default
  }
  
  const trimmedTimezone = timezone.trim()
  
  // If already IANA format (contains '/'), validate it
  if (trimmedTimezone.includes('/')) {
    try {
      // Test if it's a valid IANA timezone by trying to use it
      const testFormatter = new Intl.DateTimeFormat('en-US', { timeZone: trimmedTimezone })
      testFormatter.formatToParts(new Date()) // This will throw if invalid
      return trimmedTimezone // Valid IANA format
    } catch {
      // Invalid IANA format, fall through to conversion
    }
  }
  
  // Convert display label to IANA format (backward compatibility for existing customers)
  const timezoneMap: Record<string, string> = {
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
  
  // Return mapped timezone or safe default
  return timezoneMap[trimmedTimezone] || 'America/New_York'
}

/**
 * Calculate next call time in customer's timezone, converted to UTC for scheduling
 * FIXED: Production-ready timezone conversion using Intl API
 * ENHANCED: Now handles both IANA format and display labels for backward compatibility
 */
export function calculateNextCallTime(
  callTimeHour: number,
  callTimeMinute: number,
  timezone: string
): Date {
  // CRITICAL: Normalize timezone first to ensure it's valid IANA format
  // This handles both new data (IANA format) and old data (display labels)
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
  const getPart = (type: string) => parseInt(customerParts.find(p => p.type === type)?.value || '0')
  
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
  
  // Method: Get timezone offset for this specific date
  // Create a test date at noon UTC on target date to calculate offset
  const testNoonUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0))
  const testNoonCustomer = customerFormatter.formatToParts(testNoonUTC)
  const testNoonCustomerHour = parseInt(testNoonCustomer.find(p => p.type === 'hour')?.value || '0')
  
  // Calculate offset: if noon UTC is 8am in customer timezone, offset is -4 hours
  const offsetHours = testNoonCustomerHour - 12
  
  // Create UTC date: target customer time minus offset
  let utcHour = callTimeHour - offsetHours
  let utcDay = targetDay
  let utcMonth = targetMonth
  let utcYear = targetYear
  
  // Handle hour overflow/underflow (timezone boundaries)
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
  
  // Return UTC date that represents the target time in customer's timezone
  return new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, callTimeMinute, 0))
}

/**
 * Get all customers who need calls right now (within next 5 minutes)
 */
export async function getCustomersDueForCalls(): Promise<Array<{
  id: number
  name: string
  phone: string
  timezone: string
  callType: 'welcome' | 'daily'
  scheduledFor: Date
}>> {
  const pool = getPool()
  const now = new Date()
  // CRITICAL FIX: Look back to start of today (UTC) to catch calls scheduled earlier today
  // This handles cases where cron was down, delayed, or calls were scheduled hours ago
  // But we only look back to today (not previous days) to prevent processing stale calls
  // EXPANDED: Look forward 1 hour instead of 20 minutes to catch more calls
  // This ensures we don't miss calls that are scheduled slightly in the future
  // IMPORTANT: Use UTC start of day to match database TIMESTAMP comparisons
  const startOfTodayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ))
  // Look forward 1 hour for upcoming calls, and back to start of today for missed calls
  // This ensures we catch calls scheduled earlier today that were missed
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
  
  // Get customers with scheduled calls due
  // SAFEGUARDS:
  // 1. last_call_date < CURRENT_DATE - prevents calling people already called today
  // 2. enqueueCall uses ON CONFLICT DO NOTHING (if unique constraint exists)
  // 3. Double-checked in processCallQueue before actually making the call
  // CRITICAL FIX: Also include customers with NULL next_call_scheduled_at who should get daily calls
  // This handles cases where scheduleNextCall() wasn't called or failed
  const result = await pool.query(
    `SELECT 
      id, name, phone, timezone,
      call_time_hour,
      call_time_minute,
      CASE 
        WHEN welcome_call_completed = false THEN 'welcome'
        ELSE 'daily'
      END as call_type,
      CASE
        WHEN welcome_call_completed = false THEN 
          COALESCE(next_call_scheduled_at, created_at + INTERVAL '20 minutes')
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
         AND (
           -- Case 1: Has next_call_scheduled_at within window (start of today UTC, 1 hour forward)
           (next_call_scheduled_at IS NOT NULL
            AND next_call_scheduled_at BETWEEN $1 AND $2
            AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
           OR
           -- Case 2: Missing next_call_scheduled_at but has call_time data (FALLBACK)
           -- We'll calculate the scheduled time in JavaScript for these customers
           (next_call_scheduled_at IS NULL
            AND call_time_hour IS NOT NULL
            AND timezone IS NOT NULL
            AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
         )
        )
      )
    ORDER BY scheduled_for ASC NULLS LAST
    LIMIT 50`,
    [startOfTodayUTC, oneHourFromNow]
  )
  
  // Convert scheduled_for to Date objects and calculate for customers with NULL next_call_scheduled_at
  return result.rows.map(row => {
    // CRITICAL: Ensure callType is always set (map from SQL's call_type to TypeScript's callType)
    const callType: 'welcome' | 'daily' = row.call_type || 
      (row.welcome_call_completed === false ? 'welcome' : 'daily')
    
    if (!callType) {
      console.warn(`⚠️ Customer ${row.id} has no call_type, skipping`)
      return null
    }
    
    let scheduledFor: Date
    
    if (row.scheduled_for) {
      // Has scheduled time from database
      scheduledFor = new Date(row.scheduled_for)
    } else if (row.call_time_hour !== null && row.timezone) {
      // FALLBACK: Calculate next call time for customers missing next_call_scheduled_at
      // This handles cases where scheduleNextCall() wasn't called
      scheduledFor = calculateNextCallTime(
        row.call_time_hour,
        row.call_time_minute || 0,
        row.timezone
      )
      
      // Also schedule it in the database for next time
      scheduleNextCall(row.id).catch(error => {
        console.warn(`Failed to schedule next call for customer ${row.id}:`, error.message)
      })
    } else {
      // Can't calculate - skip this customer
      console.warn(`⚠️ Customer ${row.id} missing call_time_hour or timezone, skipping`)
      return null
    }
    
    // CRITICAL FIX: Trust the SQL query - it already filters by time window
    // The SQL query uses: next_call_scheduled_at BETWEEN startOfTodayUTC AND oneHourFromNow
    // This already includes:
    // - All calls scheduled for today (even if in the past)
    // - All calls scheduled within the next hour
    // No need for additional JavaScript filtering - it was causing valid calls to be excluded
    
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      timezone: row.timezone,
      callType, // Explicitly set to ensure it's never null
      scheduledFor
    }
  }).filter((row): row is NonNullable<typeof row> => row !== null)
}

/**
 * Update customer's next call schedule after a call
 * ENHANCED: Now parses call_time if call_time_hour is missing (backward compatibility)
 */
export async function scheduleNextCall(customerId: number): Promise<void> {
  const pool = getPool()
  const customer = await pool.query(
    'SELECT call_time_hour, call_time_minute, call_time, timezone FROM customers WHERE id = $1',
    [customerId]
  )
  
  if (customer.rows.length === 0) {
    console.warn(`⚠️ Customer ${customerId} not found when scheduling next call`)
    return
  }
  
  let { call_time_hour, call_time_minute, call_time, timezone } = customer.rows[0]
  
  // ENHANCED: Parse call_time if call_time_hour is missing (for existing customers)
  if (!call_time_hour && call_time) {
    const parsedTime = parseCallTime(call_time)
    if (parsedTime) {
      call_time_hour = parsedTime.hour
      call_time_minute = parsedTime.minute
      
      // Store parsed values in database
      await pool.query(
        `UPDATE customers 
         SET call_time_hour = $1, call_time_minute = $2
         WHERE id = $3`,
        [call_time_hour, call_time_minute, customerId]
      )
      console.log(`✅ Parsed call_time for customer ${customerId}: ${call_time_hour}:${call_time_minute.toString().padStart(2, '0')}`)
    } else {
      console.warn(`⚠️ Could not parse call_time for customer ${customerId}: "${call_time}". Using default 7:00 AM.`)
      call_time_hour = 7
      call_time_minute = 0
    }
  }
  
  if (!call_time_hour || !timezone) {
    console.warn(`⚠️ Cannot schedule next call for customer ${customerId}: missing call_time_hour (${call_time_hour}) or timezone (${timezone})`)
    return
  }
  
  const nextCallTime = calculateNextCallTime(call_time_hour, call_time_minute || 0, timezone)
  
  await pool.query(
    `UPDATE customers 
     SET next_call_scheduled_at = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [nextCallTime, customerId]
  )
  
  console.log(`✅ Scheduled next call for customer ${customerId}: ${nextCallTime.toISOString()}`)
}


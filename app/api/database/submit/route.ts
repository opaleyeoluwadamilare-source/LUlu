import { NextRequest, NextResponse } from 'next/server'
import { getPool, initDatabase } from '@/lib/db'
import { parseCallTime } from '@/lib/call-scheduler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      email,
      phone,
      timezone,
      timeRange,
      callTime,
      goals,
      biggestInsecurity,
      delusionLevel,
      plan,
      // New fields
      userStory,
      luluResponse,
      extractedInsecurity,
      extractedGoal,
      extractedBlocker
    } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Initialize database if needed
    let pool
    try {
      await initDatabase()
      pool = getPool()
    } catch (error: any) {
      console.error('Database initialization error:', error.message)
      // If database connection fails, return error but don't crash
      // The frontend will still proceed to Stripe
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          message: error.message,
          continueToStripe: true // Signal to frontend to continue
        },
        { status: 503 } // Service Unavailable
      )
    }

    // CONSOLIDATED: extracted_goal and extracted_insecurity are the source of truth
    // Populate legacy fields for backward compatibility
    const finalGoal = extractedGoal || (Array.isArray(goals) ? goals.join(', ') : goals || '')
    const finalInsecurity = extractedInsecurity || biggestInsecurity || ''
    
    // Always sync legacy fields from extracted fields for backward compatibility
    const goalsString = finalGoal // Use extracted_goal as source of truth

    // CRITICAL FIX: Store IANA timezone format (e.g., "America/New_York"), not display label
    // Frontend sends IANA format, so use it directly
    const timezoneIANA = timezone || 'America/New_York'
    
    // Get timezone label for display in call_time string
    const TIMEZONE_OPTIONS = [
      { value: "America/New_York", label: "Eastern (ET)" },
      { value: "America/Chicago", label: "Central (CT)" },
      { value: "America/Denver", label: "Mountain (MT)" },
      { value: "America/Los_Angeles", label: "Pacific (PT)" },
      { value: "America/Anchorage", label: "Alaska (AKT)" },
      { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
      { value: "Europe/London", label: "London (GMT)" },
      { value: "Europe/Paris", label: "Central European (CET)" },
      { value: "Asia/Dubai", label: "Gulf (GST)" },
      { value: "Asia/Kolkata", label: "India (IST)" },
      { value: "Asia/Singapore", label: "Singapore (SGT)" },
      { value: "Asia/Tokyo", label: "Tokyo (JST)" },
      { value: "Australia/Sydney", label: "Sydney (AEST)" },
    ]
    const timezoneLabel = TIMEZONE_OPTIONS.find(t => t.value === timezoneIANA)?.label || 'Eastern (ET)'
    const formattedCallTime = callTime || `${timeRange} ${timezoneLabel}`

    // CRITICAL FIX: Parse call_time to extract hour and minute for scheduling
    const parsedTime = parseCallTime(formattedCallTime)
    const callTimeHour = parsedTime?.hour || null
    const callTimeMinute = parsedTime?.minute || null

    // Insert or update customer record
    const result = await pool.query(
      `INSERT INTO customers (
        name, email, phone, timezone, call_time, call_time_hour, call_time_minute, goals, 
        biggest_insecurity, delusion_level, plan, payment_status,
        user_story, lulu_response, extracted_insecurity, extracted_goal, extracted_blocker
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (email) 
      DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        timezone = EXCLUDED.timezone,
        call_time = EXCLUDED.call_time,
        call_time_hour = COALESCE(EXCLUDED.call_time_hour, customers.call_time_hour),
        call_time_minute = COALESCE(EXCLUDED.call_time_minute, customers.call_time_minute),
        -- Sync legacy fields from extracted fields (backward compatibility)
        goals = COALESCE(EXCLUDED.extracted_goal, EXCLUDED.goals, customers.goals),
        biggest_insecurity = COALESCE(EXCLUDED.extracted_insecurity, EXCLUDED.biggest_insecurity, customers.biggest_insecurity),
        -- Always update extracted fields (source of truth)
        extracted_goal = COALESCE(EXCLUDED.extracted_goal, customers.extracted_goal),
        extracted_insecurity = COALESCE(EXCLUDED.extracted_insecurity, customers.extracted_insecurity),
        extracted_blocker = COALESCE(EXCLUDED.extracted_blocker, customers.extracted_blocker),
        -- Other fields
        delusion_level = EXCLUDED.delusion_level,
        plan = EXCLUDED.plan,
        user_story = EXCLUDED.user_story,
        lulu_response = EXCLUDED.lulu_response,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [
        name,
        email,
        phone,
        timezoneIANA, // Store IANA format (e.g., "America/New_York")
        formattedCallTime,
        callTimeHour, // Parsed hour (e.g., 7)
        callTimeMinute, // Parsed minute (e.g., 0)
        goalsString, // Populated from extracted_goal
        finalInsecurity, // Populated from extracted_insecurity
        delusionLevel || 'Standard', // Default if not provided
        plan || '',
        'Pending',
        userStory || '',
        luluResponse || '',
        extractedInsecurity || '', // Source of truth
        extractedGoal || '', // Source of truth
        extractedBlocker || ''
      ]
    )

    const recordId = result.rows[0].id

    return NextResponse.json({
      success: true,
      recordId: recordId.toString(),
    })
  } catch (error: any) {
    console.error('Error submitting to database:', error)
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') {
      // Unique constraint violation (duplicate email)
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    )
  }
}


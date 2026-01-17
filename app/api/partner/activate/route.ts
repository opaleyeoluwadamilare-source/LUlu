import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { parseCallTime, calculateNextCallTime } from '@/lib/call-scheduler'
import { enqueueCall } from '@/lib/call-queue'
import { validateAndStorePhone } from '@/lib/phone-validation'

export async function POST(request: NextRequest) {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    const body = await request.json()
    const {
      code,
      name,
      email,
      phone,
      timezone,
      callTime,
      userStory,
      extractedGoal,
      extractedInsecurity,
      extractedBlocker,
      previewData
    } = body
    
    // Validate required fields
    if (!code || !name || !email || !phone || !timezone || !callTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    await client.query('BEGIN')
    
    const normalizedCode = code.trim().toUpperCase()
    
    // STEP 1: Lock and validate code (atomic check with row-level lock)
    const codeCheck = await client.query(
      `SELECT id, is_active, is_used, expires_at
       FROM partner_codes
       WHERE UPPER(code) = $1
       FOR UPDATE`,  // Row-level lock prevents race conditions
      [normalizedCode]
    )
    
    if (codeCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Invalid partner code' },
        { status: 400 }
      )
    }
    
    const codeData = codeCheck.rows[0]
    const now = new Date()
    
    // Validate code is still usable
    if (!codeData.is_active || codeData.is_used) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'This code has already been used or is inactive' },
        { status: 400 }
      )
    }
    
    if (codeData.expires_at && new Date(codeData.expires_at) < now) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'This code has expired' },
        { status: 400 }
      )
    }
    
    // STEP 2: Parse call time
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
    const timezoneLabel = TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label || 'Eastern (ET)'
    const formattedCallTime = `${callTime} ${timezoneLabel}`
    const parsedTime = parseCallTime(formattedCallTime)
    const callTimeHour = parsedTime?.hour || null
    const callTimeMinute = parsedTime?.minute || null
    
    // STEP 3: Create customer with Partner status
    const customerResult = await client.query(
      `INSERT INTO customers (
        name, email, phone, timezone, call_time, call_time_hour, call_time_minute,
        payment_status, partner_code_id,
        user_story, lulu_response, extracted_goal, extracted_insecurity, extracted_blocker,
        goals, biggest_insecurity, delusion_level, plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (email) 
      DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        timezone = EXCLUDED.timezone,
        call_time = EXCLUDED.call_time,
        call_time_hour = COALESCE(EXCLUDED.call_time_hour, customers.call_time_hour),
        call_time_minute = COALESCE(EXCLUDED.call_time_minute, customers.call_time_minute),
        payment_status = 'Partner',
        partner_code_id = EXCLUDED.partner_code_id,
        user_story = EXCLUDED.user_story,
        lulu_response = EXCLUDED.lulu_response,
        extracted_goal = COALESCE(EXCLUDED.extracted_goal, customers.extracted_goal),
        extracted_insecurity = COALESCE(EXCLUDED.extracted_insecurity, customers.extracted_insecurity),
        extracted_blocker = COALESCE(EXCLUDED.extracted_blocker, customers.extracted_blocker),
        goals = COALESCE(EXCLUDED.extracted_goal, customers.goals),
        biggest_insecurity = COALESCE(EXCLUDED.extracted_insecurity, customers.biggest_insecurity),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [
        name, email, phone, timezone, formattedCallTime, callTimeHour, callTimeMinute,
        'Partner',  // payment_status
        codeData.id,  // partner_code_id
        userStory || '',
        `${previewData?.validation || ''} ${previewData?.affirmation || ''} ${previewData?.accountability || ''}`,
        extractedGoal || '',
        extractedInsecurity || '',
        extractedBlocker || '',
        extractedGoal || '',  // goals (legacy)
        extractedInsecurity || '',  // biggest_insecurity (legacy)
        'Standard',  // delusion_level
        'partner'  // plan
      ]
    )
    
    const customerId = customerResult.rows[0].id
    
    // STEP 4: Mark code as used (atomic - within same transaction)
    await client.query(
      `UPDATE partner_codes 
       SET is_used = true, 
           used_by_customer_id = $1
       WHERE id = $2`,
      [customerId, codeData.id]
    )
    
    await client.query('COMMIT')
    
    // STEP 5: Validate phone (outside transaction - non-blocking)
    try {
      await validateAndStorePhone(customerId, phone)
    } catch (phoneError) {
      console.error('Phone validation failed for partner:', phoneError)
      // Don't fail activation - phone can be validated later
    }
    
    // STEP 6: Schedule welcome call
    try {
      const nextCallTime = calculateNextCallTime(
        callTimeHour || 7,
        callTimeMinute || 0,
        timezone
      )
      
      const updateClient = await pool.connect()
      try {
        await updateClient.query(
          `UPDATE customers 
           SET next_call_scheduled_at = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [nextCallTime, customerId]
        )
      } finally {
        updateClient.release()
      }
      
      // Enqueue welcome call (20 minutes from now)
      const welcomeCallTime = new Date(Date.now() + 20 * 60 * 1000)
      await enqueueCall(customerId, 'welcome', welcomeCallTime)
    } catch (scheduleError) {
      console.error('Failed to schedule welcome call for partner:', scheduleError)
      // Don't fail activation - can be scheduled manually
    }
    
    return NextResponse.json({
      success: true,
      customerId: customerId.toString(),
      message: 'Partner account activated successfully'
    })
    
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error activating partner account:', error)
    
    // Handle specific errors
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to activate partner account' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}


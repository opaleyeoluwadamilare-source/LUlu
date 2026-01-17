import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { parseCallTime, calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * Admin API: Create new customer
 */
async function checkAuth(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  const secretAuth = secret === ADMIN_SECRET
  return cookieAuth || secretAuth
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, timezone, call_time, payment_status } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    const pool = getPool()

    // Parse call time
    let callTimeHour = null
    let callTimeMinute = null
    if (call_time) {
      const parsed = parseCallTime(call_time)
      if (parsed) {
        callTimeHour = parsed.hour
        callTimeMinute = parsed.minute
      }
    }

    // Normalize timezone
    const timezoneIANA = timezone || 'America/New_York'

    // Calculate next call time if we have hour and timezone
    let nextCallScheduledAt = null
    if (callTimeHour !== null && timezoneIANA) {
      nextCallScheduledAt = calculateNextCallTime(callTimeHour, callTimeMinute || 0, timezoneIANA)
    }

    // Insert customer
    const result = await pool.query(
      `INSERT INTO customers (
        name, email, phone, timezone, call_time, 
        call_time_hour, call_time_minute, payment_status,
        phone_validated, next_call_scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        email,
        phone,
        timezoneIANA,
        call_time || null,
        callTimeHour,
        callTimeMinute,
        payment_status || 'Pending',
        false, // phone_validated
        nextCallScheduledAt
      ]
    )

    const customer = result.rows[0]

    // Auto-trigger welcome call if paid and phone validated
    if (['Paid', 'Partner'].includes(payment_status) && customer.phone_validated) {
      try {
        const { enqueueCall } = await import('@/lib/call-queue')
        await enqueueCall(customer.id, 'welcome', new Date())
      } catch (error: any) {
        console.error('Error triggering welcome call:', error)
        // Don't fail the request if call trigger fails
      }
    }

    return NextResponse.json({ success: true, customer })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    
    // Handle duplicate email
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


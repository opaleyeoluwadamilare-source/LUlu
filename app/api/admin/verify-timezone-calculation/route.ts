import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * Admin endpoint to verify timezone calculations
 * Shows what time each customer's call_time_hour converts to in UTC and their local timezone
 * 
 * Usage: GET /api/admin/verify-timezone-calculation?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    const secretAuth = secret === ADMIN_SECRET

    if (!cookieAuth && !secretAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    
    // Get all paid/partner customers with call times
    const customers = await pool.query(`
      SELECT 
        id, name, email,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        payment_status
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND call_time_hour IS NOT NULL
        AND timezone IS NOT NULL
      ORDER BY id
    `)
    
    const now = new Date()
    const results = customers.rows.map(c => {
      // Calculate what the next call time should be
      const calculatedTime = calculateNextCallTime(
        c.call_time_hour,
        c.call_time_minute || 0,
        c.timezone
      )
      
      // Convert calculated UTC time back to customer's timezone for display
      const customerFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: c.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      })
      
      const calculatedLocal = customerFormatter.format(calculatedTime)
      const storedLocal = c.next_call_scheduled_at 
        ? customerFormatter.format(new Date(c.next_call_scheduled_at))
        : 'Not set'
      
      // Show what 7 AM EST converts to
      const test7AM = calculateNextCallTime(7, 0, 'America/New_York')
      const test7AMLocal = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(test7AM)
      
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        callTime: `${c.call_time_hour}:${String(c.call_time_minute || 0).padStart(2, '0')}`,
        timezone: c.timezone,
        calculatedUTC: calculatedTime.toISOString(),
        calculatedLocal: calculatedLocal,
        storedUTC: c.next_call_scheduled_at,
        storedLocal: storedLocal,
        matches: c.next_call_scheduled_at 
          ? Math.abs(new Date(c.next_call_scheduled_at).getTime() - calculatedTime.getTime()) < 60000 // Within 1 minute
          : false,
        test7AMEST: {
          utc: test7AM.toISOString(),
          local: test7AMLocal
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      currentTime: {
        utc: now.toISOString(),
        est: new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        }).format(now)
      },
      customers: results,
      note: "calculatedUTC is what calculateNextCallTime() returns. calculatedLocal shows what time that UTC represents in the customer's timezone."
    })
  } catch (error: any) {
    console.error('Error verifying timezone calculation:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


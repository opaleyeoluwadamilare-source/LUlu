import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

async function checkAuth(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  const secretAuth = secret === ADMIN_SECRET
  return cookieAuth || secretAuth
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()

    // Queue health
    const queueHealth = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE scheduled_for < NOW() - INTERVAL '1 hour') as overdue
      FROM call_queue
      WHERE status IN ('pending', 'processing', 'failed')`
    )

    // Recent errors
    const recentErrors = await pool.query(
      `SELECT 
        customer_id, call_type, error_message, created_at
      FROM call_queue
      WHERE status = 'failed' AND error_message IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10`
    )

    // Customers with issues
    const customersWithIssues = await pool.query(
      `SELECT 
        id, name, email, payment_status, phone_validated,
        call_time_hour, call_time_minute, next_call_scheduled_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND (
          phone_validated = false
          OR call_time_hour IS NULL
          OR call_time_minute IS NULL
          OR next_call_scheduled_at IS NULL
          OR next_call_scheduled_at < NOW()
        )
      LIMIT 20`
    )

    // Database connection test
    let dbHealthy = true
    try {
      await pool.query('SELECT 1')
    } catch {
      dbHealthy = false
    }

    return NextResponse.json({
      queueHealth: queueHealth.rows[0],
      recentErrors: recentErrors.rows.map(e => ({
        customerId: e.customer_id,
        callType: e.call_type,
        errorMessage: e.error_message,
        createdAt: new Date(e.created_at).toISOString()
      })),
      customersWithIssues: customersWithIssues.rows.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        paymentStatus: c.payment_status,
        phoneValidated: c.phone_validated,
        hasCallTime: c.call_time_hour !== null && c.call_time_minute !== null,
        hasScheduledTime: c.next_call_scheduled_at !== null,
        isScheduledPast: c.next_call_scheduled_at ? new Date(c.next_call_scheduled_at) < new Date() : false
      })),
      database: {
        healthy: dbHealthy,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching system health:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


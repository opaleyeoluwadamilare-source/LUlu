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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }
    const pool = getPool()

    // Get call logs
    const callLogs = await pool.query(
      `SELECT 
        id, call_type, status, vapi_call_id, duration_seconds,
        transcript, error_message, metadata, created_at
      FROM call_logs
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [customerId]
    )

    // Get queue items
    const queueItems = await pool.query(
      `SELECT 
        id, call_type, status, scheduled_for, attempts, max_attempts,
        error_message, vapi_call_id, created_at, updated_at
      FROM call_queue
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
      [customerId]
    )

    return NextResponse.json({
      callLogs: callLogs.rows.map(log => ({
        ...log,
        created_at: new Date(log.created_at).toISOString()
      })),
      queueItems: queueItems.rows.map(item => ({
        ...item,
        scheduled_for: item.scheduled_for ? new Date(item.scheduled_for).toISOString() : null,
        created_at: new Date(item.created_at).toISOString(),
        updated_at: new Date(item.updated_at).toISOString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching call history:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


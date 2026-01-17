import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { processCallQueue } from '@/lib/call-queue'
import { cookies } from 'next/headers'

/**
 * MANUALLY PROCESS PENDING QUEUE ITEMS
 * 
 * This endpoint processes ALL pending queue items from today, regardless of scheduled time.
 * Use this to force-process calls that are stuck in the queue.
 * 
 * Usage: GET /api/admin/process-pending-queue?secret=xxx
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

    // Process the queue
    const results = await processCallQueue()

    // Get queue status after processing
    const pool = getPool()
    const queueStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM call_queue
      GROUP BY status
    `)

    return NextResponse.json({
      success: true,
      message: 'Queue processed',
      results,
      queueStatus: queueStatus.rows
    })
  } catch (error: any) {
    console.error('Error processing queue:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


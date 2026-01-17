import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { scheduleNextCall } from '@/lib/call-scheduler'
import { cookies } from 'next/headers'

/**
 * FIX STALE QUEUE ITEMS
 * 
 * Updates queue items with stale scheduled_for times (before today) to use current customer schedule.
 * 
 * Usage: GET /api/admin/fix-stale-queue-items?secret=xxx
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
    const now = new Date()
    const startOfTodayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ))

    // Find queue items with stale scheduled_for (before today)
    const staleItems = await pool.query(`
      SELECT cq.*, c.next_call_scheduled_at, c.welcome_call_completed
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying')
        AND cq.scheduled_for < $1
    `, [startOfTodayUTC])

    const fixes: any[] = []

    for (const item of staleItems.rows) {
      try {
        let newScheduledFor: Date

        if (item.call_type === 'welcome' && !item.welcome_call_completed) {
          // Welcome call - schedule for 5 minutes from now
          newScheduledFor = new Date(now.getTime() + 5 * 60 * 1000)
        } else if (item.next_call_scheduled_at) {
          // Use customer's next_call_scheduled_at
          newScheduledFor = new Date(item.next_call_scheduled_at)
        } else {
          // Recalculate schedule
          await scheduleNextCall(item.customer_id)
          const updated = await pool.query(
            `SELECT next_call_scheduled_at FROM customers WHERE id = $1`,
            [item.customer_id]
          )
          if (updated.rows[0]?.next_call_scheduled_at) {
            newScheduledFor = new Date(updated.rows[0].next_call_scheduled_at)
          } else {
            // Fallback: schedule for now
            newScheduledFor = now
          }
        }

        // Update queue item
        await pool.query(
          `UPDATE call_queue 
           SET scheduled_for = $1, updated_at = NOW()
           WHERE id = $2`,
          [newScheduledFor, item.id]
        )

        fixes.push({
          queueId: item.id,
          customerId: item.customer_id,
          oldScheduledFor: item.scheduled_for,
          newScheduledFor: newScheduledFor.toISOString()
        })
      } catch (error: any) {
        fixes.push({
          queueId: item.id,
          customerId: item.customer_id,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixes.length} stale queue items`,
      fixes
    })
  } catch (error: any) {
    console.error('Error fixing stale queue items:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


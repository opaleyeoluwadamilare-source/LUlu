import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { scheduleNextCall } from '@/lib/call-scheduler'

/**
 * Admin endpoint to fix Akin's scheduling issue
 * - Resets next_call_scheduled_at to null
 * - Clears stale queue items
 * - Schedules welcome call properly
 * 
 * Usage: GET /api/admin/fix-akin-scheduling?secret=xxx
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
    
    // 1. Clear stale next_call_scheduled_at (set to NULL so it recalculates)
    await pool.query(`
      UPDATE customers 
      SET next_call_scheduled_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 17
    `)
    
    // 2. Clear stale queue items (older than today)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    
    await pool.query(`
      UPDATE call_queue
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = 17
        AND scheduled_for < $1
        AND status IN ('pending', 'retrying')
    `, [startOfToday])
    
    // 3. Since welcome_call_completed = false, schedule welcome call
    // The welcome call should be scheduled for 20 minutes after created_at
    // But since it's been days, we'll schedule it for now
    const welcomeCallTime = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    
    await pool.query(`
      UPDATE customers
      SET next_call_scheduled_at = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 17
        AND welcome_call_completed = false
    `, [welcomeCallTime])
    
    // 4. Enqueue the welcome call
    const { enqueueCall } = await import('@/lib/call-queue')
    await enqueueCall(17, 'welcome', welcomeCallTime)
    
    // 5. Get updated customer data
    const customer = await pool.query(`
      SELECT 
        id, name, email,
        welcome_call_completed,
        next_call_scheduled_at,
        last_call_date,
        call_time_hour,
        timezone
      FROM customers
      WHERE id = 17
    `)
    
    return NextResponse.json({
      success: true,
      message: "Akin's scheduling fixed",
      customer: customer.rows[0],
      actions: [
        "Cleared stale next_call_scheduled_at",
        "Cleared stale queue items",
        "Scheduled welcome call for 5 minutes from now"
      ]
    })
  } catch (error: any) {
    console.error('Error fixing Akin scheduling:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


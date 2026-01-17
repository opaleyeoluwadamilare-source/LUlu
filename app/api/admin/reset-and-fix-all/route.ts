import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { scheduleNextCall } from '@/lib/call-scheduler'
import { enqueueCall } from '@/lib/call-queue'

/**
 * NUCLEAR OPTION: Reset and fix everything for all customers
 * This will:
 * 1. Recalculate all schedules
 * 2. Clear stale queue items
 * 3. Enqueue calls for customers who should get calls today
 * 
 * Usage: GET /api/admin/reset-and-fix-all?secret=xxx
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
    
    const results: any = {
      schedulesRecalculated: [],
      queueCleared: [],
      callsEnqueued: [],
      errors: []
    }
    
    // 1. Get all paid/partner customers
    const customers = await pool.query(`
      SELECT 
        id, name, email,
        welcome_call_completed,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        last_call_date,
        payment_status,
        phone_validated,
        call_status
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
    `)
    
    for (const customer of customers.rows) {
      try {
        // Recalculate schedule if they've completed welcome call
        if (customer.welcome_call_completed && customer.call_time_hour && customer.timezone) {
          await scheduleNextCall(customer.id)
          
          // Get updated schedule
          const updated = await pool.query(
            'SELECT next_call_scheduled_at FROM customers WHERE id = $1',
            [customer.id]
          )
          
          results.schedulesRecalculated.push({
            id: customer.id,
            name: customer.name,
            newSchedule: updated.rows[0]?.next_call_scheduled_at
          })
          
          // Check if call should happen today
          const scheduled = updated.rows[0]?.next_call_scheduled_at
          if (scheduled) {
            const scheduledDate = new Date(scheduled)
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            const scheduledDay = new Date(scheduledDate)
            scheduledDay.setHours(0, 0, 0, 0)
            
            // If scheduled for today and not already called today, enqueue it
            if (scheduledDay.getTime() === today.getTime()) {
              const lastCallDate = customer.last_call_date 
                ? new Date(customer.last_call_date).toISOString().split('T')[0]
                : null
              const todayStr = today.toISOString().split('T')[0]
              
              if (lastCallDate !== todayStr) {
                await enqueueCall(customer.id, 'daily', scheduledDate)
                results.callsEnqueued.push({
                  id: customer.id,
                  name: customer.name,
                  scheduledFor: scheduledDate.toISOString()
                })
              }
            }
          }
        } else if (!customer.welcome_call_completed) {
          // Welcome call - schedule for 5 minutes from now
          const welcomeTime = new Date(now.getTime() + 5 * 60 * 1000)
          await pool.query(
            'UPDATE customers SET next_call_scheduled_at = $1 WHERE id = $2',
            [welcomeTime, customer.id]
          )
          await enqueueCall(customer.id, 'welcome', welcomeTime)
          results.callsEnqueued.push({
            id: customer.id,
            name: customer.name,
            callType: 'welcome',
            scheduledFor: welcomeTime.toISOString()
          })
        }
      } catch (error: any) {
        results.errors.push({
          customerId: customer.id,
          name: customer.name,
          error: error.message
        })
      }
    }
    
    // 2. Clear stale queue items (older than today)
    const queueClear = await pool.query(`
      UPDATE call_queue
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE scheduled_for < $1
        AND status IN ('pending', 'retrying')
      RETURNING id, customer_id, scheduled_for
    `, [startOfTodayUTC])
    
    results.queueCleared = queueClear.rows.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      oldScheduledFor: r.scheduled_for
    }))
    
    return NextResponse.json({
      success: true,
      message: 'Reset and fix completed',
      results,
      summary: {
        customersProcessed: customers.rows.length,
        schedulesRecalculated: results.schedulesRecalculated.length,
        callsEnqueued: results.callsEnqueued.length,
        queueItemsCleared: results.queueCleared.length,
        errors: results.errors.length
      },
      nextSteps: [
        'Wait for next cron run (within 15 minutes)',
        'Check comprehensive-diagnostic endpoint to verify',
        'Check Vercel logs for call processing'
      ]
    })
  } catch (error: any) {
    console.error('Reset and fix error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


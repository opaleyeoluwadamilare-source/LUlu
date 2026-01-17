import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { scheduleNextCall, calculateNextCallTime, normalizeTimezone } from '@/lib/call-scheduler'
import { enqueueCall } from '@/lib/call-queue'

/**
 * COMPREHENSIVE FIX - Fixes ALL issues preventing calls
 * 
 * This endpoint:
 * 1. Recalculates all schedules
 * 2. Fixes missing call_time data
 * 3. Clears stale queue items
 * 4. Enqueues calls for customers who should get them NOW
 * 
 * Usage: GET /api/admin/fix-all-issues?secret=xxx
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
    
    const fixes: any[] = []
    const errors: any[] = []
    
    // 1. Get all paid/partner customers
    const customers = await pool.query(`
      SELECT 
        id, name, email,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time_hour,
        call_time_minute,
        call_time,
        timezone,
        created_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
    `)
    
    // 2. Fix each customer
    for (const customer of customers.rows) {
      const customerFixes: any[] = []
      
      try {
        // Fix 1: Welcome calls - schedule if needed
        if (!customer.welcome_call_completed) {
          const createdAgo = now.getTime() - new Date(customer.created_at).getTime()
          if (createdAgo >= 20 * 60 * 1000) {
            // Schedule welcome call for 5 minutes from now
            const welcomeCallTime = new Date(now.getTime() + 5 * 60 * 1000)
            await pool.query(
              `UPDATE customers SET next_call_scheduled_at = $1 WHERE id = $2`,
              [welcomeCallTime, customer.id]
            )
            await enqueueCall(customer.id, 'welcome', welcomeCallTime)
            customerFixes.push('Scheduled welcome call')
          }
        }
        
        // Fix 2: Daily calls - recalculate schedule
        if (customer.welcome_call_completed) {
          // Check if last_call_date is blocking
          const lastCallDate = customer.last_call_date 
            ? new Date(customer.last_call_date).toISOString().split('T')[0]
            : null
          const today = now.toISOString().split('T')[0]
          
          // Only fix if not called today
          if (lastCallDate !== today) {
            if (customer.call_time_hour && customer.timezone) {
              // CRITICAL FIX: Check if call time has passed TODAY
              // If schedule is for tomorrow but call time passed today, schedule for today instead
              
              // Calculate what TODAY's call time would be (not tomorrow's)
              // We need to manually calculate today's time since calculateNextCallTime returns tomorrow if passed
              const normalizedTimezone = normalizeTimezone(customer.timezone)
              
              // Get current time in customer's timezone
              const customerFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: normalizedTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
              
              const customerParts = customerFormatter.formatToParts(now)
              const getPart = (type: string) => parseInt(customerParts.find(p => p.type === type)?.value || '0')
              
              const year = getPart('year')
              const month = getPart('month') - 1
              const day = getPart('day')
              const currentHour = getPart('hour')
              const currentMinute = getPart('minute')
              
              // Check if call time has passed today
              const callTimePassedToday = currentHour > customer.call_time_hour || 
                (currentHour === customer.call_time_hour && currentMinute >= (customer.call_time_minute || 0))
              
              if (customer.next_call_scheduled_at) {
                const scheduled = new Date(customer.next_call_scheduled_at)
                const scheduledIsToday = scheduled >= startOfTodayUTC && scheduled < new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000)
                const scheduledIsTomorrow = scheduled >= new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000)
                
                // If schedule is for tomorrow but call time passed today, fix it
                if (scheduledIsTomorrow && callTimePassedToday) {
                  // Calculate today's call time in UTC
                  const todayCallTime = calculateNextCallTime(
                    customer.call_time_hour,
                    customer.call_time_minute || 0,
                    customer.timezone
                  )
                  
                  // But if it returns tomorrow, calculate today's time manually
                  let todayCallTimeUTC: Date
                  if (todayCallTime >= new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000)) {
                    // calculateNextCallTime returned tomorrow, so calculate today manually
                    const testNoonUTC = new Date(Date.UTC(year, month, day, 12, 0, 0))
                    const testNoonCustomer = customerFormatter.formatToParts(testNoonUTC)
                    const testNoonCustomerHour = parseInt(testNoonCustomer.find(p => p.type === 'hour')?.value || '0')
                    const offsetHours = testNoonCustomerHour - 12
                    let utcHour = customer.call_time_hour - offsetHours
                    let utcDay = day
                    let utcMonth = month
                    let utcYear = year
                    
                    if (utcHour < 0) {
                      utcHour += 24
                      utcDay--
                    } else if (utcHour >= 24) {
                      utcHour -= 24
                      utcDay++
                    }
                    
                    todayCallTimeUTC = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, customer.call_time_minute || 0, 0))
                  } else {
                    todayCallTimeUTC = todayCallTime
                  }
                  
                  // Update schedule to today and enqueue
                  await pool.query(
                    `UPDATE customers SET next_call_scheduled_at = $1, updated_at = NOW() WHERE id = $2`,
                    [todayCallTimeUTC, customer.id]
                  )
                  await enqueueCall(customer.id, 'daily', todayCallTimeUTC)
                  customerFixes.push('Fixed schedule from tomorrow to today (missed call)')
                } else if (scheduled < startOfTodayUTC) {
                  // Stale schedule (before today) - recalculate
                  await scheduleNextCall(customer.id)
                  customerFixes.push('Recalculated stale schedule')
                } else if (scheduledIsToday && scheduled <= now) {
                  // Schedule is for today but in the past - enqueue it
                  await enqueueCall(customer.id, 'daily', scheduled)
                  customerFixes.push('Enqueued missed call from today')
                }
              } else {
                // No schedule - calculate and set
                await scheduleNextCall(customer.id)
                customerFixes.push('Calculated and set missing schedule')
                
                // Get the newly calculated schedule
                const updated = await pool.query(
                  `SELECT next_call_scheduled_at FROM customers WHERE id = $1`,
                  [customer.id]
                )
                const newScheduled = updated.rows[0]?.next_call_scheduled_at ? new Date(updated.rows[0].next_call_scheduled_at) : null
                
                // If calculated time is for today and in the past, enqueue it
                if (newScheduled && newScheduled >= startOfTodayUTC && newScheduled < new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000) && newScheduled <= now) {
                  await enqueueCall(customer.id, 'daily', newScheduled)
                  customerFixes.push('Enqueued missed call from today')
                }
              }
            } else {
              customerFixes.push('ERROR: Missing call_time_hour or timezone - cannot calculate')
              errors.push({
                customerId: customer.id,
                name: customer.name,
                error: 'Missing call_time_hour or timezone'
              })
            }
          }
        }
        
        if (customerFixes.length > 0) {
          fixes.push({
            customerId: customer.id,
            name: customer.name,
            fixes: customerFixes
          })
        }
      } catch (error: any) {
        errors.push({
          customerId: customer.id,
          name: customer.name,
          error: error.message
        })
      }
    }
    
    // 3. Clear stale queue items (older than today)
    const staleQueueCleared = await pool.query(`
      UPDATE call_queue
      SET status = 'completed'
      WHERE scheduled_for < $1
        AND status IN ('pending', 'retrying')
    `, [startOfTodayUTC])
    
    // 4. Get updated status
    const updatedCustomers = await pool.query(`
      SELECT 
        id, name,
        welcome_call_completed,
        next_call_scheduled_at,
        last_call_date,
        call_time_hour,
        timezone
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
    `)
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixes.length} customer(s), cleared ${staleQueueCleared.rowCount} stale queue items`,
      fixes,
      errors,
      staleQueueCleared: staleQueueCleared.rowCount,
      updatedCustomers: updatedCustomers.rows.map((c: any) => ({
        id: c.id,
        name: c.name,
        next_call_scheduled_at: c.next_call_scheduled_at,
        last_call_date: c.last_call_date,
        call_time_hour: c.call_time_hour,
        timezone: c.timezone
      }))
    })
  } catch (error: any) {
    console.error('Error fixing all issues:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


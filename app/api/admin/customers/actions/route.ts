import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * Admin API: Customer actions (pause, resume, fix scheduling, etc.)
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

    const { action, customerId } = await request.json()
    
    // Validate customerId
    if (!customerId || typeof customerId !== 'number' || isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }
    
    const pool = getPool()

    switch (action) {
      case 'pause':
        // Pause customer calls
        await pool.query(
          `UPDATE customers 
           SET call_status = 'paused', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [customerId]
        )
        return NextResponse.json({ success: true, message: 'Customer paused' })

      case 'resume':
        // Resume customer calls
        await pool.query(
          `UPDATE customers 
           SET call_status = 'active', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [customerId]
        )
        return NextResponse.json({ success: true, message: 'Customer resumed' })

      case 'stop':
        // Stop customer calls permanently
        await pool.query(
          `UPDATE customers 
           SET call_status = 'disabled', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [customerId]
        )
        return NextResponse.json({ success: true, message: 'Customer stopped' })

      case 'fix_scheduling':
        // Fix scheduling for a customer
        const customer = await pool.query(
          'SELECT call_time_hour, call_time_minute, timezone, call_time, welcome_call_completed FROM customers WHERE id = $1',
          [customerId]
        )

        if (customer.rows.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        const { call_time_hour, call_time_minute, timezone, call_time, welcome_call_completed } = customer.rows[0]
        
        // If welcome call not completed, schedule welcome call instead
        if (!welcome_call_completed) {
          // Schedule welcome call for 20 minutes from now
          const welcomeCallTime = new Date(Date.now() + 20 * 60 * 1000)
          await pool.query(
            'UPDATE customers SET next_call_scheduled_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [welcomeCallTime, customerId]
          )
          
          // Also enqueue the welcome call
          const { enqueueCall } = await import('@/lib/call-queue')
          await enqueueCall(customerId, 'welcome', welcomeCallTime)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Welcome call scheduled for 20 minutes from now' 
          })
        }
        
        // For daily calls, parse call_time if needed
        let hour = call_time_hour
        let minute = call_time_minute || 0

        if (!hour && call_time) {
          const { parseCallTime } = await import('@/lib/call-scheduler')
          const parsed = parseCallTime(call_time)
          if (parsed) {
            hour = parsed.hour
            minute = parsed.minute
            await pool.query(
              'UPDATE customers SET call_time_hour = $1, call_time_minute = $2 WHERE id = $3',
              [hour, minute, customerId]
            )
          }
        }

        if (hour && timezone) {
          const nextCallTime = calculateNextCallTime(hour, minute, timezone)
          await pool.query(
            'UPDATE customers SET next_call_scheduled_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [nextCallTime, customerId]
          )
          return NextResponse.json({ 
            success: true, 
            message: `Scheduling fixed. Next call scheduled for ${nextCallTime.toISOString()}` 
          })
        } else {
          return NextResponse.json({ 
            error: 'Cannot fix scheduling: missing call time or timezone' 
          }, { status: 400 })
        }

      case 'validate_phone':
        // Manually validate phone and trigger welcome call if paid
        const phoneCustomer = await pool.query(
          'SELECT payment_status, welcome_call_completed FROM customers WHERE id = $1',
          [customerId]
        )

        await pool.query(
          `UPDATE customers 
           SET phone_validated = true, phone_validation_error = NULL, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [customerId]
        )

        // Trigger welcome call if customer is paid and welcome call not completed
        if (phoneCustomer.rows.length > 0 && 
            ['Paid', 'Partner'].includes(phoneCustomer.rows[0].payment_status) && 
            !phoneCustomer.rows[0].welcome_call_completed) {
          try {
            const { enqueueCall } = await import('@/lib/call-queue')
            await enqueueCall(customerId, 'welcome', new Date())
          } catch (error: any) {
            console.error('Error triggering welcome call:', error)
          }
        }

        return NextResponse.json({ success: true, message: 'Phone validated' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error performing action:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { getCustomersDueForCalls } from '@/lib/call-scheduler'
import { calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * COMPREHENSIVE DIAGNOSTIC: Shows EXACTLY why calls aren't happening
 * This is the definitive diagnostic tool
 * 
 * Usage: GET /api/admin/comprehensive-diagnostic?secret=xxx
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
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    // 1. Get all paid/partner customers
    const allCustomers = await pool.query(`
      SELECT 
        id, name, email, phone,
        payment_status,
        phone_validated,
        call_status,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time_hour,
        call_time_minute,
        timezone,
        created_at
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
      ORDER BY id
    `)
    
    // 2. Test getCustomersDueForCalls() function
    let customersDue: any[] = []
    let getCustomersError: string | null = null
    try {
      customersDue = await getCustomersDueForCalls()
    } catch (error: any) {
      getCustomersError = error.message
    }
    
    // 3. Check queue
    const queue = await pool.query(`
      SELECT 
        cq.id,
        cq.customer_id,
        c.name,
        cq.call_type,
        cq.scheduled_for,
        cq.status,
        cq.attempts,
        cq.created_at
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.status IN ('pending', 'retrying', 'processing')
      ORDER BY cq.scheduled_for ASC
      LIMIT 20
    `)
    
    // 4. Analyze each customer
    const analysis = allCustomers.rows.map((c: any) => {
      const issues: string[] = []
      const fixes: string[] = []
      
      // Basic eligibility
      if (!['Paid', 'Partner'].includes(c.payment_status)) {
        issues.push(`Payment status: ${c.payment_status} (not Paid/Partner)`)
      }
      if (!c.phone_validated) {
        issues.push('Phone not validated')
        fixes.push(`Visit: /api/admin/fix-phone-validation?customerId=${c.id}&secret=${ADMIN_SECRET}`)
      }
      if (['disabled', 'paused'].includes(c.call_status)) {
        issues.push(`Call status: ${c.call_status}`)
      }
      
      // Check if in getCustomersDueForCalls results
      const inDueList = customersDue.find(d => d.id === c.id)
      
      // Check scheduling
      if (c.welcome_call_completed) {
        // Daily call
        if (c.last_call_date) {
          const lastCallDate = new Date(c.last_call_date)
          lastCallDate.setHours(0, 0, 0, 0)
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          if (lastCallDate.getTime() === today.getTime()) {
            issues.push('Already called today')
          }
        }
        
        if (c.next_call_scheduled_at) {
          const scheduled = new Date(c.next_call_scheduled_at)
          if (scheduled < startOfTodayUTC) {
            issues.push(`next_call_scheduled_at is before today: ${scheduled.toISOString()}`)
            fixes.push(`Visit: /api/admin/recalculate-all-schedules?secret=${ADMIN_SECRET}`)
          } else if (scheduled > oneHourFromNow) {
            issues.push(`next_call_scheduled_at is too far in future: ${scheduled.toISOString()}`)
          } else {
            // Should be eligible
            if (!inDueList) {
              issues.push('Should be eligible but not in getCustomersDueForCalls() results')
            }
          }
        } else {
          if (c.call_time_hour && c.timezone) {
            // Should calculate on the fly
            if (!inDueList) {
              issues.push('Has call_time data but not in getCustomersDueForCalls() results')
            }
          } else {
            issues.push('Missing next_call_scheduled_at AND missing call_time_hour/timezone')
            fixes.push(`Set call_time_hour and timezone, then visit: /api/admin/recalculate-all-schedules?secret=${ADMIN_SECRET}`)
          }
        }
      } else {
        // Welcome call
        const created = new Date(c.created_at)
        const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000)
        if (created > twentyMinutesAgo) {
          issues.push(`Welcome call: too soon (created ${Math.round((now.getTime() - created.getTime()) / 1000 / 60)} min ago, need 20 min)`)
        } else {
          // Should be eligible
          if (!inDueList) {
            issues.push('Welcome call should be eligible but not in getCustomersDueForCalls() results')
          }
        }
      }
      
      // Calculate what the next call time should be
      let calculatedNextCall: string | null = null
      if (c.welcome_call_completed && c.call_time_hour && c.timezone) {
        try {
          const calculated = calculateNextCallTime(
            c.call_time_hour,
            c.call_time_minute || 0,
            c.timezone
          )
          calculatedNextCall = calculated.toISOString()
          
          // Convert to local time for display
          const localFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: c.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
          })
          const localTime = localFormatter.format(calculated)
          
          if (c.next_call_scheduled_at) {
            const stored = new Date(c.next_call_scheduled_at)
            const diff = Math.abs(stored.getTime() - calculated.getTime())
            if (diff > 60000) { // More than 1 minute difference
              issues.push(`Stored time (${new Date(c.next_call_scheduled_at).toISOString()}) doesn't match calculated time (${calculated.toISOString()})`)
              fixes.push(`Visit: /api/admin/recalculate-all-schedules?secret=${ADMIN_SECRET}`)
            }
          }
        } catch (error: any) {
          issues.push(`Error calculating next call time: ${error.message}`)
        }
      }
      
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        payment_status: c.payment_status,
        phone_validated: c.phone_validated,
        call_status: c.call_status,
        welcome_call_completed: c.welcome_call_completed,
        last_call_date: c.last_call_date,
        next_call_scheduled_at: c.next_call_scheduled_at,
        call_time_hour: c.call_time_hour,
        call_time_minute: c.call_time_minute,
        timezone: c.timezone,
        inDueList: !!inDueList,
        issues,
        fixes,
        calculatedNextCall,
        shouldGetCall: issues.length === 0 && inDueList
      }
    })
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      timeWindow: {
        startOfTodayUTC: startOfTodayUTC.toISOString(),
        oneHourFromNow: oneHourFromNow.toISOString(),
        now: now.toISOString()
      },
      getCustomersDueForCalls: {
        error: getCustomersError,
        count: customersDue.length,
        customers: customersDue.map(c => ({
          id: c.id,
          name: c.name,
          callType: c.callType,
          scheduledFor: c.scheduledFor.toISOString()
        }))
      },
      queue: {
        count: queue.rows.length,
        items: queue.rows
      },
      customers: analysis,
      summary: {
        total: analysis.length,
        eligible: analysis.filter(a => a.shouldGetCall).length,
        hasIssues: analysis.filter(a => a.issues.length > 0).length,
        inDueList: analysis.filter(a => a.inDueList).length
      },
      recommendations: analysis
        .filter(a => a.issues.length > 0)
        .map(a => ({
          customer: a.name,
          issues: a.issues,
          fixes: a.fixes
        }))
    })
  } catch (error: any) {
    console.error('Comprehensive diagnostic error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


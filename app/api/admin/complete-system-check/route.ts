import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { getCustomersDueForCalls } from '@/lib/call-scheduler'
import { calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * COMPREHENSIVE SYSTEM CHECK - Identifies ALL issues preventing calls
 * 
 * Usage: GET /api/admin/complete-system-check?secret=xxx
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
      timestamp: now.toISOString(),
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
      timeWindow: {
        start: startOfTodayUTC.toISOString(),
        end: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
      },
      issues: [],
      customers: [],
      queueStatus: null,
      recommendations: []
    }
    
    // 1. Get ALL paid/partner customers
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
    
    // 2. Check what getCustomersDueForCalls() actually returns
    let customersDue: any[] = []
    try {
      customersDue = await getCustomersDueForCalls()
    } catch (error: any) {
      results.issues.push({
        severity: 'critical',
        issue: 'getCustomersDueForCalls() failed',
        error: error.message
      })
    }
    
    // 3. Check queue
    const queueStatus = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM call_queue
      GROUP BY status
    `)
    
    results.queueStatus = queueStatus.rows
    
    // 4. Analyze each customer
    for (const customer of allCustomers.rows) {
      const analysis: any = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        issues: [],
        shouldGetCall: false,
        callType: null,
        scheduledTime: null,
        scheduledTimeLocal: null,
        whyNotEligible: []
      }
      
      // Check basic eligibility
      if (!['Paid', 'Partner'].includes(customer.payment_status)) {
        analysis.whyNotEligible.push(`Payment status: ${customer.payment_status}`)
        results.customers.push(analysis)
        continue
      }
      
      if (!customer.phone_validated) {
        analysis.whyNotEligible.push('Phone not validated')
        analysis.issues.push({ type: 'phone_not_validated', fixable: true })
        results.customers.push(analysis)
        continue
      }
      
      if (['disabled', 'paused'].includes(customer.call_status)) {
        analysis.whyNotEligible.push(`Call status: ${customer.call_status}`)
        results.customers.push(analysis)
        continue
      }
      
      // Check welcome call
      if (!customer.welcome_call_completed) {
        const createdAgo = now.getTime() - new Date(customer.created_at).getTime()
        if (createdAgo >= 20 * 60 * 1000) {
          analysis.shouldGetCall = true
          analysis.callType = 'welcome'
          analysis.scheduledTime = new Date(new Date(customer.created_at).getTime() + 20 * 60 * 1000).toISOString()
        } else {
          analysis.whyNotEligible.push(`Welcome call: too soon (${Math.round(createdAgo / 1000 / 60)} min ago, need 20 min)`)
        }
        results.customers.push(analysis)
        continue
      }
      
      // Check daily call
      const lastCallDate = customer.last_call_date 
        ? new Date(customer.last_call_date).toISOString().split('T')[0]
        : null
      const today = now.toISOString().split('T')[0]
      
      if (lastCallDate === today) {
        analysis.whyNotEligible.push('Already called today')
        results.customers.push(analysis)
        continue
      }
      
      // Check if scheduled time is set
      if (customer.next_call_scheduled_at) {
        const scheduled = new Date(customer.next_call_scheduled_at)
        const scheduledLocal = new Intl.DateTimeFormat('en-US', {
          timeZone: customer.timezone || 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        }).format(scheduled)
        
        analysis.scheduledTime = scheduled.toISOString()
        analysis.scheduledTimeLocal = scheduledLocal
        
        // Check if within window
        if (scheduled >= startOfTodayUTC && scheduled <= new Date(now.getTime() + 60 * 60 * 1000)) {
          analysis.shouldGetCall = true
          analysis.callType = 'daily'
        } else {
          if (scheduled < startOfTodayUTC) {
            analysis.whyNotEligible.push(`Scheduled time is before today: ${scheduledLocal}`)
            analysis.issues.push({ 
              type: 'stale_schedule', 
              fixable: true,
              message: 'next_call_scheduled_at is before today - needs recalculation'
            })
          } else {
            analysis.whyNotEligible.push(`Scheduled time is too far in future: ${scheduledLocal}`)
          }
        }
      } else {
        // No schedule set - check if we can calculate
        if (customer.call_time_hour && customer.timezone) {
          const calculated = calculateNextCallTime(
            customer.call_time_hour,
            customer.call_time_minute || 0,
            customer.timezone
          )
          const calculatedLocal = new Intl.DateTimeFormat('en-US', {
            timeZone: customer.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
          }).format(calculated)
          
          analysis.scheduledTime = calculated.toISOString()
          analysis.scheduledTimeLocal = calculatedLocal
          analysis.shouldGetCall = true
          analysis.callType = 'daily'
          analysis.issues.push({
            type: 'missing_schedule',
            fixable: true,
            message: 'next_call_scheduled_at is NULL - should be calculated and stored'
          })
        } else {
          analysis.whyNotEligible.push('Missing next_call_scheduled_at AND missing call_time_hour/timezone')
          analysis.issues.push({
            type: 'missing_data',
            fixable: true,
            message: 'Need to set call_time_hour and timezone'
          })
        }
      }
      
      results.customers.push(analysis)
    }
    
    // 5. Check what getCustomersDueForCalls found
    results.customersDueForCalls = customersDue.map(c => ({
      id: c.id,
      name: c.name,
      callType: c.callType,
      scheduledFor: c.scheduledFor.toISOString(),
      scheduledForLocal: new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(c.scheduledFor)
    }))
    
    // 6. Generate recommendations
    const customersWhoShouldGetCalls = results.customers.filter((c: any) => c.shouldGetCall)
    const customersWithIssues = results.customers.filter((c: any) => c.issues.length > 0)
    
    if (customersWhoShouldGetCalls.length > 0 && customersDue.length === 0) {
      results.issues.push({
        severity: 'critical',
        issue: 'Customers should get calls but getCustomersDueForCalls() returned empty',
        affectedCustomers: customersWhoShouldGetCalls.map((c: any) => c.id)
      })
      results.recommendations.push('CRITICAL: Fix getCustomersDueForCalls() query or time window')
    }
    
    if (customersWithIssues.length > 0) {
      results.recommendations.push(`Fix ${customersWithIssues.length} customer(s) with issues (stale schedules, missing data)`)
    }
    
    if (customersWhoShouldGetCalls.length === 0) {
      results.recommendations.push('No customers are currently eligible for calls. Check whyNotEligible for each customer.')
    }
    
    // 7. Summary
    results.summary = {
      totalCustomers: allCustomers.rows.length,
      shouldGetCalls: customersWhoShouldGetCalls.length,
      foundByQuery: customersDue.length,
      hasIssues: customersWithIssues.length,
      queuePending: queueStatus.rows.find((r: any) => r.status === 'pending')?.count || 0
    }
    
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error in complete system check:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


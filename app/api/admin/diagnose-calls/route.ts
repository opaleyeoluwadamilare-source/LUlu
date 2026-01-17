import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

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
    
    const results: any = {
      akin: null,
      akinLogs: [],
      akinQueue: [],
      otherCustomers: [],
      pendingQueue: [],
      allCustomers: [],
      analysis: {}
    }
    
    // 1. Check Akin's customer record
    const akin = await pool.query(`
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
        total_calls_made,
        created_at
      FROM customers
      WHERE id = 17
    `)
    
    if (akin.rows.length > 0) {
      results.akin = akin.rows[0]
    }
    
    // 2. Check Akin's call logs
    // Note: updated_at might not exist in older databases, so we only select created_at
    const akinLogs = await pool.query(`
      SELECT 
        id,
        call_type,
        vapi_call_id,
        status,
        duration_seconds,
        transcript IS NOT NULL as has_transcript,
        created_at
      FROM call_logs
      WHERE customer_id = 17
      ORDER BY created_at DESC
    `)
    results.akinLogs = akinLogs.rows
    
    // 3. Check Akin's call queue entries
    // Note: processed_at might not exist in older databases, so we don't select it
    const akinQueue = await pool.query(`
      SELECT 
        id,
        call_type,
        scheduled_for,
        status,
        attempts,
        vapi_call_id,
        created_at
      FROM call_queue
      WHERE customer_id = 17
      ORDER BY created_at DESC
      LIMIT 10
    `)
    results.akinQueue = akinQueue.rows
    
    // 4. Check why other customers aren't getting calls
    const now = new Date()
    // IMPORTANT: Use UTC start of day to match database TIMESTAMP comparisons
    const startOfTodayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ))
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    const otherCustomers = await pool.query(`
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
        CASE 
          WHEN welcome_call_completed = false THEN 'welcome'
          ELSE 'daily'
        END as call_type
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND id != 17
        AND (
          (welcome_call_completed = false AND created_at < NOW() - INTERVAL '20 minutes')
          OR
          (welcome_call_completed = true 
           AND (
             (next_call_scheduled_at IS NOT NULL
              AND next_call_scheduled_at BETWEEN $1 AND $2
              AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
             OR
             (next_call_scheduled_at IS NULL
              AND call_time_hour IS NOT NULL
              AND timezone IS NOT NULL
              AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE))
           )
          )
        )
      ORDER BY next_call_scheduled_at ASC NULLS LAST
    `, [startOfTodayUTC, oneHourFromNow])
    results.otherCustomers = otherCustomers.rows
    
    // 5. Check pending queue
    const pendingQueue = await pool.query(`
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
      WHERE cq.status IN ('pending', 'retrying')
      ORDER BY cq.scheduled_for ASC
      LIMIT 20
    `)
    results.pendingQueue = pendingQueue.rows
    
    // 6. Check all customers with detailed eligibility analysis
    const allCustomers = await pool.query(`
      SELECT 
        id, name,
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
        AND phone_validated = true
      ORDER BY id
    `)
    
    // Add eligibility analysis for each customer
    // Reuse variables defined earlier (lines 89-91)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    results.allCustomers = allCustomers.rows.map((c: any) => {
      const eligibility: any = {
        eligible: false,
        reasons: [],
        missingFields: []
      }
      
      // Check basic requirements
      if (!['Paid', 'Partner'].includes(c.payment_status)) {
        eligibility.reasons.push(`Payment status is "${c.payment_status}" (not Paid/Partner)`)
      }
      if (!c.phone_validated) {
        eligibility.reasons.push('Phone not validated')
      }
      if (['disabled', 'paused'].includes(c.call_status)) {
        eligibility.reasons.push(`Call status is "${c.call_status}"`)
      }
      
      // If basic requirements not met, skip further checks
      if (eligibility.reasons.length > 0) {
        return { ...c, eligibility }
      }
      
      // Check welcome call eligibility
      if (!c.welcome_call_completed) {
        const createdAgo = now.getTime() - new Date(c.created_at).getTime()
        if (createdAgo >= 20 * 60 * 1000) {
          eligibility.eligible = true
          eligibility.callType = 'welcome'
        } else {
          eligibility.reasons.push(`Welcome call: too soon (${Math.round(createdAgo / 1000 / 60)} min ago, need 20 min)`)
        }
        return { ...c, eligibility }
      }
      
      // Check daily call eligibility
      const lastCallDate = c.last_call_date ? new Date(c.last_call_date) : null
      if (lastCallDate) {
        lastCallDate.setHours(0, 0, 0, 0)
        if (lastCallDate.getTime() === today.getTime()) {
          eligibility.reasons.push('Already called today')
          return { ...c, eligibility }
        }
      }
      
      // Check if next_call_scheduled_at is set
      if (c.next_call_scheduled_at) {
        const scheduled = new Date(c.next_call_scheduled_at)
        if (scheduled >= startOfTodayUTC && scheduled <= oneHourFromNow) {
          eligibility.eligible = true
          eligibility.callType = 'daily'
          eligibility.reason = `Scheduled for ${scheduled.toISOString()}`
        } else {
          if (scheduled < startOfTodayUTC) {
            eligibility.reasons.push(`Scheduled time is before today UTC (${scheduled.toISOString()}, window starts ${startOfTodayUTC.toISOString()})`)
          } else {
            eligibility.reasons.push(`Scheduled time is too far in future (${scheduled.toISOString()}, window ends ${oneHourFromNow.toISOString()})`)
          }
        }
      } else {
        // Fallback: check if call_time data exists
        if (c.call_time_hour !== null && c.timezone) {
          eligibility.eligible = true
          eligibility.callType = 'daily'
          eligibility.reason = 'Has call_time data, will calculate on the fly'
        } else {
          eligibility.reasons.push('Missing next_call_scheduled_at')
          if (!c.call_time_hour) eligibility.missingFields.push('call_time_hour')
          if (!c.timezone) eligibility.missingFields.push('timezone')
        }
      }
      
      return { ...c, eligibility }
    })
    
    // 7. Analysis
    if (results.akin) {
      const a = results.akin
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (a.last_call_date) {
        const lastCallDate = new Date(a.last_call_date)
        lastCallDate.setHours(0, 0, 0, 0)
        results.analysis.akinLastCallDate = {
          value: a.last_call_date,
          isToday: lastCallDate.getTime() === today.getTime()
        }
      } else {
        results.analysis.akinLastCallDate = {
          value: null,
          isToday: false,
          warning: 'NULL - might allow duplicate calls'
        }
      }
      
      results.analysis.akinCallCounts = {
        total: results.akinLogs.length,
        welcome: results.akinLogs.filter((l: any) => l.call_type === 'welcome').length,
        daily: results.akinLogs.filter((l: any) => l.call_type === 'daily').length
      }
    }
    
    const customersWithoutSchedule = await pool.query(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
        AND welcome_call_completed = true
        AND next_call_scheduled_at IS NULL
        AND call_time_hour IS NOT NULL
        AND timezone IS NOT NULL
        AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)
        AND id != 17
    `)
    results.analysis.customersWithoutSchedule = customersWithoutSchedule.rows[0].count
    
    // Count eligible vs ineligible customers
    const eligibleCount = results.allCustomers.filter((c: any) => c.eligibility?.eligible).length
    const ineligibleCount = results.allCustomers.length - eligibleCount
    results.analysis.summary = {
      totalCustomers: results.allCustomers.length,
      eligible: eligibleCount,
      ineligible: ineligibleCount,
      eligibleCustomers: results.allCustomers
        .filter((c: any) => c.eligibility?.eligible)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          callType: c.eligibility.callType,
          reason: c.eligibility.reason
        })),
      ineligibleReasons: results.allCustomers
        .filter((c: any) => !c.eligibility?.eligible)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          reasons: c.eligibility?.reasons || ['Unknown'],
          missingFields: c.eligibility?.missingFields || []
        }))
    }
    
    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { enqueueCall } from '@/lib/call-queue'
import { makeVapiCall } from '@/lib/vapi'

/**
 * ADMIN ENDPOINT: Force a call to happen RIGHT NOW (for testing)
 * This bypasses all scheduling logic and makes the call immediately
 * 
 * Usage: GET /api/admin/force-call-now?secret=xxx&customerId=5
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const customerId = searchParams.get('customerId')
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    const secretAuth = secret === ADMIN_SECRET

    if (!cookieAuth && !secretAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId parameter required' }, { status: 400 })
    }

    const pool = getPool()
    
    // Get customer data
    const customer = await pool.query(`
      SELECT 
        id, name, email, phone, timezone,
        call_time_hour, call_time_minute,
        goals, extracted_goal,
        biggest_insecurity, extracted_insecurity,
        delusion_level,
        welcome_call_completed,
        payment_status,
        phone_validated
      FROM customers
      WHERE id = $1
    `, [customerId])
    
    if (customer.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    const c = customer.rows[0]
    
    if (!c.phone_validated) {
      return NextResponse.json({ error: 'Phone not validated' }, { status: 400 })
    }
    
    // Determine call type
    const callType = c.welcome_call_completed ? 'daily' : 'welcome'
    
    // Make the call IMMEDIATELY (bypass queue)
    const result = await makeVapiCall({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone,
      timezone: c.timezone || 'America/New_York',
      goals: c.extracted_goal || c.goals || '',
      biggestInsecurity: c.extracted_insecurity || c.biggest_insecurity || '',
      delusionLevel: c.delusion_level || 'Standard',
      isWelcomeCall: callType === 'welcome'
    })
    
    if (result.success) {
      // Update customer record
      if (callType === 'welcome') {
        await pool.query(`
          UPDATE customers
          SET welcome_call_completed = true,
              last_call_id = $1,
              total_calls_made = COALESCE(total_calls_made, 0) + 1,
              updated_at = NOW()
          WHERE id = $2
        `, [result.callId, c.id])
      } else {
        await pool.query(`
          UPDATE customers
          SET last_call_date = CURRENT_DATE,
              last_call_id = $1,
              total_calls_made = COALESCE(total_calls_made, 0) + 1,
              updated_at = NOW()
          WHERE id = $2
        `, [result.callId, c.id])
      }
      
      // Schedule next call
      const { scheduleNextCall } = await import('@/lib/call-scheduler')
      await scheduleNextCall(c.id)
    }
    
    return NextResponse.json({
      success: result.success,
      callType,
      callId: result.callId,
      error: result.error,
      message: result.success 
        ? `Call initiated successfully. Call ID: ${result.callId}`
        : `Call failed: ${result.error}`
    })
  } catch (error: any) {
    console.error('Error forcing call:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


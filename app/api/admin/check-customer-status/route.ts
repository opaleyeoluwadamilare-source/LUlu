import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * ADMIN ENDPOINT: Check customer's call status
 * Shows exact database values for debugging
 * 
 * Usage: GET /api/admin/check-customer-status?secret=xxx&customerId=7
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const customerIdParam = searchParams.get('customerId')
    
    // Security check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!customerIdParam) {
      return NextResponse.json(
        { error: 'Missing customerId parameter' },
        { status: 400 }
      )
    }
    
    const customerId = parseInt(customerIdParam)
    const pool = getPool()
    
    // Get customer details
    const customer = await pool.query(
      `SELECT 
        id, name, email, phone,
        payment_status, phone_validated,
        welcome_call_completed,
        last_call_date,
        call_status,
        total_calls_made,
        call_time,
        timezone,
        created_at,
        updated_at
      FROM customers 
      WHERE id = $1`,
      [customerId]
    )
    
    if (customer.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    // Get call logs
    const callLogs = await pool.query(
      `SELECT 
        id, call_type, status,
        vapi_call_id,
        duration_seconds,
        error_message,
        created_at
      FROM call_logs 
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10`,
      [customerId]
    )
    
    // Get queue status
    const queue = await pool.query(
      `SELECT 
        id, call_type, status,
        attempts,
        scheduled_for,
        error_message,
        created_at,
        updated_at
      FROM call_queue 
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10`,
      [customerId]
    )
    
    const customerData = customer.rows[0]
    const today = new Date().toISOString().split('T')[0]
    const lastCallDate = customerData.last_call_date 
      ? new Date(customerData.last_call_date).toISOString().split('T')[0]
      : null
    
    return NextResponse.json({
      success: true,
      customer: {
        id: customerData.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        payment_status: customerData.payment_status,
        phone_validated: customerData.phone_validated,
        
        // CRITICAL FLAGS
        welcome_call_completed: customerData.welcome_call_completed,
        last_call_date: customerData.last_call_date,
        
        call_status: customerData.call_status,
        total_calls_made: customerData.total_calls_made,
        call_time: customerData.call_time,
        timezone: customerData.timezone,
        created_at: customerData.created_at,
        updated_at: customerData.updated_at
      },
      analysis: {
        welcomeCallCompleted: customerData.welcome_call_completed,
        calledToday: lastCallDate === today,
        shouldGetWelcomeCall: !customerData.welcome_call_completed,
        shouldGetDailyCall: customerData.welcome_call_completed && lastCallDate !== today,
        totalCallsMade: customerData.total_calls_made || 0,
        callLogsCount: callLogs.rows.length,
        queueItemsCount: queue.rows.length
      },
      callLogs: callLogs.rows,
      queue: queue.rows
    })
    
  } catch (error: any) {
    console.error('❌ Error checking customer status:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

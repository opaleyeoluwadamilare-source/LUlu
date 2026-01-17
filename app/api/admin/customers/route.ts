import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * Admin API: Get all customers (JSON)
 * Used by the React admin dashboard
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

    const result = await pool.query(`
      SELECT 
        id, name, email, phone,
        payment_status, phone_validated, phone_validation_error,
        welcome_call_completed, call_status, last_call_date,
        next_call_scheduled_at, call_time, call_time_hour, call_time_minute,
        timezone, total_calls_made, created_at, updated_at,
        stripe_customer_id, stripe_subscription_id,
        extracted_goal, extracted_insecurity, extracted_blocker,
        user_story, lulu_response, last_call_transcript, last_call_duration
      FROM customers 
      ORDER BY created_at DESC
    `)

    const customers = result.rows.map(customer => ({
      ...customer,
      next_call_scheduled_at: customer.next_call_scheduled_at ? new Date(customer.next_call_scheduled_at).toISOString() : null,
      last_call_date: customer.last_call_date ? new Date(customer.last_call_date).toISOString().split('T')[0] : null,
      created_at: new Date(customer.created_at).toISOString(),
      updated_at: new Date(customer.updated_at).toISOString(),
      hasSchedulingIssue: ['Paid', 'Partner'].includes(customer.payment_status) && 
        customer.welcome_call_completed && ( // Only check scheduling issues for customers who completed welcome call
        customer.call_time_hour === null || 
        customer.call_time_minute === null ||
        !customer.next_call_scheduled_at ||
        new Date(customer.next_call_scheduled_at) < now
      ),
      isBlocked: ['Paid', 'Partner'].includes(customer.payment_status) && customer.phone_validated === false
    }))

    // Calculate stats
    const stats = {
      total: customers.length,
      paid: customers.filter(c => ['Paid', 'Partner'].includes(c.payment_status)).length,
      pending: customers.filter(c => c.payment_status === 'Pending').length,
      phoneValidated: customers.filter(c => c.phone_validated).length,
      blocked: customers.filter(c => c.isBlocked).length,
      readyForCalls: customers.filter(c => 
        ['Paid', 'Partner'].includes(c.payment_status) && 
        c.phone_validated && 
        c.call_time_hour !== null && 
        c.call_time_minute !== null &&
        c.next_call_scheduled_at && 
        new Date(c.next_call_scheduled_at) >= now
      ).length,
      schedulingIssues: customers.filter(c => c.hasSchedulingIssue).length
    }

    return NextResponse.json({ customers, stats })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


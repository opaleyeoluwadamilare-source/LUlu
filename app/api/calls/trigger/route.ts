import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { enqueueCall } from '@/lib/call-queue'
import { calculateNextCallTime, parseCallTime } from '@/lib/call-scheduler'
import { processCallQueue } from '@/lib/call-queue'

export async function POST(request: NextRequest) {
  try {
    const { customerId, isWelcomeCall } = await request.json()
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId required' },
        { status: 400 }
      )
    }
    
    const pool = getPool()
    const customer = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    )
    
    if (customer.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const c = customer.rows[0]
    
    // Validate payment
    if (!['Paid', 'Partner'].includes(c.payment_status)) {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 403 }
      )
    }
    
    // Validate phone
    if (!c.phone_validated) {
      return NextResponse.json(
        { error: 'Phone number not validated' },
        { status: 400 }
      )
    }
    
    // Check if already called today (for daily calls)
    if (!isWelcomeCall && c.last_call_date) {
      const today = new Date().toISOString().split('T')[0]
      if (c.last_call_date.toISOString().split('T')[0] === today) {
        return NextResponse.json({
          skipped: true,
          message: 'Already called today'
        })
      }
    }
    
    // Parse and store call time if not already done
    if (!c.call_time_hour && c.call_time) {
      const parsed = parseCallTime(c.call_time)
      if (parsed) {
        await pool.query(
          `UPDATE customers 
           SET call_time_hour = $1, call_time_minute = $2
           WHERE id = $3`,
          [parsed.hour, parsed.minute, customerId]
        )
      }
    }
    
    // Calculate scheduled time
    const scheduledFor = isWelcomeCall 
      ? new Date() // Welcome call immediately
      : calculateNextCallTime(
          c.call_time_hour || 9,
          c.call_time_minute || 0,
          c.timezone || 'America/New_York'
        )
    
    // Add to queue
    await enqueueCall(
      customerId,
      isWelcomeCall ? 'welcome' : 'daily',
      scheduledFor
    )
    
    // Process immediately (don't wait for cron)
    const result = await processCallQueue()
    
    return NextResponse.json({
      success: true,
      queued: true,
      scheduledFor: scheduledFor.toISOString(),
      ...result
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


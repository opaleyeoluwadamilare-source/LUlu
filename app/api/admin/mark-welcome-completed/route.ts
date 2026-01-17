import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * ADMIN ENDPOINT: Manually mark welcome call as completed
 * Use this to prevent duplicate calls for customers who already received it
 * 
 * Usage: GET /api/admin/mark-welcome-completed?secret=xxx&customerId=7
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
    
    // Get current status
    const before = await pool.query(
      `SELECT id, name, email, welcome_call_completed, total_calls_made 
       FROM customers WHERE id = $1`,
      [customerId]
    )
    
    if (before.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const customer = before.rows[0]
    
    // Update welcome_call_completed to true
    const result = await pool.query(
      `UPDATE customers 
       SET welcome_call_completed = true,
           call_status = 'completed',
           total_calls_made = GREATEST(COALESCE(total_calls_made, 0), 1),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, welcome_call_completed, total_calls_made`,
      [customerId]
    )
    
    // Also clear any pending welcome call queue entries
    const queueResult = await pool.query(
      `UPDATE call_queue 
       SET status = 'completed',
           updated_at = NOW()
       WHERE customer_id = $1 
         AND call_type = 'welcome'
         AND status IN ('pending', 'retrying')
       RETURNING id`,
      [customerId]
    )
    
    const updated = result.rows[0]
    
    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        name: updated.name
      },
      before: {
        welcome_call_completed: customer.welcome_call_completed,
        total_calls_made: customer.total_calls_made
      },
      after: {
        welcome_call_completed: updated.welcome_call_completed,
        total_calls_made: updated.total_calls_made
      },
      queueEntriesCleared: queueResult.rows.length,
      message: `✅ Manually marked welcome call as completed for ${customer.name}. Cleared ${queueResult.rows.length} pending queue entries.`
    })
    
  } catch (error: any) {
    console.error('❌ Error marking welcome call completed:', error)
    
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

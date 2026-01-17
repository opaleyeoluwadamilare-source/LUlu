import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * EMERGENCY ENDPOINT: Fix Theo's duplicate call issue
 * Sets welcome_call_completed = true and clears queue
 */
export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    console.log('🚨 EMERGENCY FIX: Fixing Theo (customer_id 7)...')
    
    // Step 1: Set welcome_call_completed = true
    const updateCustomer = await pool.query(
      `UPDATE customers 
       SET welcome_call_completed = true,
           call_status = 'completed',
           total_calls_made = 4,
           updated_at = NOW()
       WHERE id = 7
       RETURNING id, name, welcome_call_completed, total_calls_made, call_status`,
      []
    )
    
    // Step 2: Clear pending queue entries
    const updateQueue = await pool.query(
      `UPDATE call_queue 
       SET status = 'completed',
           updated_at = NOW()
       WHERE customer_id = 7 
         AND call_type = 'welcome'
         AND status IN ('pending', 'retrying')
       RETURNING id`,
      []
    )
    
    // Step 3: Verify
    const verify = await pool.query(
      `SELECT id, name, welcome_call_completed, call_status, total_calls_made 
       FROM customers WHERE id = 7`,
      []
    )
    
    const queueCheck = await pool.query(
      `SELECT id, status FROM call_queue 
       WHERE customer_id = 7 AND status IN ('pending', 'retrying')`,
      []
    )
    
    console.log('✅ Theo fixed successfully')
    
    return NextResponse.json({
      success: true,
      message: '✅ Theo fixed! No more duplicate calls will happen.',
      customer: verify.rows[0],
      queueEntriesCleared: updateQueue.rows.length,
      remainingPendingQueue: queueCheck.rows.length,
      details: {
        customerUpdated: updateCustomer.rows.length > 0,
        welcome_call_completed: verify.rows[0]?.welcome_call_completed,
        total_calls_made: verify.rows[0]?.total_calls_made,
        pendingQueueCleared: updateQueue.rows.length
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error fixing Theo:', error)
    
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

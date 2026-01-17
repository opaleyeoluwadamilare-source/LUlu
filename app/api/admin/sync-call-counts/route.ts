import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * Admin endpoint to sync total_calls_made from call_logs
 * This repairs discrepancies where call_logs has calls but total_calls_made is wrong
 * 
 * Usage: GET /api/admin/sync-call-counts?secret=xxx
 * Or: GET /api/admin/sync-call-counts (with admin cookie)
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
    
    // Get actual call counts from call_logs for each customer
    const actualCounts = await pool.query(`
      SELECT 
        customer_id,
        COUNT(*) as actual_call_count
      FROM call_logs
      WHERE status IN ('completed', 'no_answer')
      GROUP BY customer_id
    `)
    
    const updates: Array<{ customerId: number; oldCount: number; newCount: number }> = []
    
    // Update each customer's total_calls_made to match actual count
    for (const row of actualCounts.rows) {
      const customerId = row.customer_id
      const actualCount = parseInt(row.actual_call_count)
      
      // Get current total_calls_made
      const current = await pool.query(
        `SELECT total_calls_made FROM customers WHERE id = $1`,
        [customerId]
      )
      
      const currentCount = current.rows[0]?.total_calls_made || 0
      
      // Only update if there's a discrepancy
      if (currentCount !== actualCount) {
        await pool.query(
          `UPDATE customers 
           SET total_calls_made = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [actualCount, customerId]
        )
        
        updates.push({
          customerId,
          oldCount: currentCount,
          newCount: actualCount
        })
      }
    }
    
    // Also check for customers with calls but total_calls_made = 0
    const zeroCountCustomers = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.total_calls_made,
        COUNT(cl.id) as actual_count
      FROM customers c
      LEFT JOIN call_logs cl ON c.id = cl.customer_id AND cl.status IN ('completed', 'no_answer')
      WHERE c.total_calls_made = 0 OR c.total_calls_made IS NULL
      GROUP BY c.id, c.name, c.total_calls_made
      HAVING COUNT(cl.id) > 0
    `)
    
    for (const row of zeroCountCustomers.rows) {
      const customerId = row.id
      const actualCount = parseInt(row.actual_count)
      
      await pool.query(
        `UPDATE customers 
         SET total_calls_made = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [actualCount, customerId]
      )
      
      updates.push({
        customerId,
        oldCount: 0,
        newCount: actualCount
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${updates.length} customer(s)`,
      updates,
      summary: {
        totalCustomersWithCalls: actualCounts.rows.length,
        customersUpdated: updates.length
      }
    })
  } catch (error: any) {
    console.error('Error syncing call counts:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


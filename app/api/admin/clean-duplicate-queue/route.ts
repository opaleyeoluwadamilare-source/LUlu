import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * ADMIN ENDPOINT: Clean duplicate queue entries
 * Removes duplicate pending/retrying calls for same customer
 * 
 * Usage: GET /api/admin/clean-duplicate-queue?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // Security check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('🧹 Admin triggered: Cleaning duplicate queue entries...')
    
    const pool = getPool()
    
    // Step 1: Find duplicates
    const duplicates = await pool.query(`
      SELECT customer_id, call_type, COUNT(*) as count
      FROM call_queue 
      WHERE status IN ('pending', 'retrying', 'processing')
      GROUP BY customer_id, call_type
      HAVING COUNT(*) > 1
    `)
    
    console.log(`Found ${duplicates.rows.length} customers with duplicate queue entries`)
    
    // Step 2: Delete duplicates (keep oldest entry for each customer/call_type)
    const deleteResult = await pool.query(`
      DELETE FROM call_queue
      WHERE id NOT IN (
        SELECT DISTINCT ON (customer_id, call_type)
          id
        FROM call_queue
        WHERE status IN ('pending', 'retrying', 'processing')
        ORDER BY customer_id, call_type, created_at ASC
      )
      AND status IN ('pending', 'retrying', 'processing')
      RETURNING id, customer_id, call_type
    `)
    
    const deletedCount = deleteResult.rows.length
    console.log(`✅ Deleted ${deletedCount} duplicate queue entries`)
    
    // Step 3: Get remaining queue status
    const remaining = await pool.query(`
      SELECT customer_id, call_type, status, COUNT(*) as count
      FROM call_queue 
      WHERE status IN ('pending', 'retrying', 'processing')
      GROUP BY customer_id, call_type, status
      ORDER BY customer_id
    `)
    
    return NextResponse.json({
      success: true,
      duplicatesFound: duplicates.rows.length,
      deleted: deletedCount,
      deletedEntries: deleteResult.rows,
      remainingQueue: remaining.rows,
      message: `Cleaned ${deletedCount} duplicate queue entries`
    })
    
  } catch (error: any) {
    console.error('❌ Error cleaning duplicate queue:', error)
    
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

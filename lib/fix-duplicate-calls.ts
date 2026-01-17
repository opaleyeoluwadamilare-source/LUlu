/**
 * Database migration to fix duplicate calls issue
 * Run this ONCE to add unique constraint
 */

import { getPool } from './db'

export async function fixDuplicateCallsIssue() {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔧 Fixing duplicate calls issue...')
    
    // Step 1: Clean up existing duplicates in call_queue
    console.log('  1. Cleaning up existing duplicate queue entries...')
    await client.query(`
      DELETE FROM call_queue
      WHERE id NOT IN (
        SELECT DISTINCT ON (customer_id, call_type, status)
          id
        FROM call_queue
        WHERE status IN ('pending', 'retrying', 'processing')
        ORDER BY customer_id, call_type, status, created_at ASC
      )
      AND status IN ('pending', 'retrying', 'processing')
    `)
    
    // Step 2: Add unique constraint (partial - only on pending/processing calls)
    console.log('  2. Adding unique constraint to prevent future duplicates...')
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_call_active
      ON call_queue (customer_id, call_type)
      WHERE status IN ('pending', 'retrying', 'processing')
    `)
    
    // Step 3: Add index for faster lookups
    console.log('  3. Adding performance index...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_queue_status_scheduled
      ON call_queue (status, scheduled_for)
      WHERE status IN ('pending', 'retrying')
    `)
    
    await client.query('COMMIT')
    console.log('✅ Duplicate calls fix applied successfully!')
    
    return {
      success: true,
      message: 'Duplicate calls issue fixed'
    }
    
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('❌ Error applying duplicate calls fix:', error)
    throw error
  } finally {
    client.release()
  }
}

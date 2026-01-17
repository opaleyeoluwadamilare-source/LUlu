/**
 * Fix Theo's call - update queue entry to be scheduled for now and process it
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function fixTheoCall() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔧 Fixing Theo\'s call...\n')
    
    // Update the pending queue entry to be scheduled for now
    const now = new Date()
    const result = await client.query(`
      UPDATE call_queue
      SET scheduled_for = $1,
          status = 'pending',
          updated_at = NOW()
      WHERE customer_id = 7
        AND call_type = 'daily'
        AND status = 'pending'
      RETURNING id, scheduled_for
    `, [now])
    
    if (result.rows.length === 0) {
      console.log('⚠️ No pending queue entry found. Creating new one...')
      await client.query(`
        INSERT INTO call_queue (customer_id, call_type, scheduled_for, status)
        VALUES (7, 'daily', $1, 'pending')
        ON CONFLICT DO NOTHING
      `, [now])
      console.log('✅ Created new queue entry')
    } else {
      console.log(`✅ Updated queue entry ${result.rows[0].id}`)
      console.log(`   New scheduled time: ${result.rows[0].scheduled_for}`)
    }
    
    await client.query('COMMIT')
    console.log('\n✅ Queue entry updated!')
    console.log('📞 The call will be processed by the next cron run (within 15 minutes)')
    console.log('   Or you can manually trigger: https://bedelulu.co/api/calls/process')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

fixTheoCall()


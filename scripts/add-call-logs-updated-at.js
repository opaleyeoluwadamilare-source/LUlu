/**
 * Migration: Add updated_at column to call_logs table
 * This fixes the webhook handler that tries to update updated_at
 */

require('dotenv').config()
const { Pool } = require('pg')

async function addUpdatedAtColumn() {
  const pool = new Pool({
    connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.EXTERNAL_DATABASE_URL?.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : undefined
  })

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    
    console.log('🔄 Adding updated_at column to call_logs table...')
    
    // Add updated_at column if it doesn't exist
    await client.query(`
      ALTER TABLE call_logs 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    
    // Set updated_at = created_at for existing rows where updated_at is NULL
    await client.query(`
      UPDATE call_logs 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `)
    
    // Create index on vapi_call_id for performance (idempotency checks)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_logs_vapi_call_id 
      ON call_logs(vapi_call_id)
      WHERE vapi_call_id IS NOT NULL
    `)
    
    await client.query('COMMIT')
    
    console.log('✅ Migration completed successfully!')
    console.log('   - Added updated_at column to call_logs')
    console.log('   - Backfilled existing rows')
    console.log('   - Created index on vapi_call_id')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  addUpdatedAtColumn()
    .then(() => {
      console.log('\n✅ Migration complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { addUpdatedAtColumn }


require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function runMigration() {
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ No database URL found')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Running partner code schema migration...\n')
    
    // Create partner_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_used BOOLEAN DEFAULT false,
        used_by_customer_id INTEGER REFERENCES customers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        created_by VARCHAR(255),
        notes TEXT
      )
    `)
    console.log('✅ Created partner_codes table')
    
    // Add partner_code_id to customers table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS partner_code_id INTEGER REFERENCES partner_codes(id)
    `)
    console.log('✅ Added partner_code_id column to customers table')
    
    // Indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_codes_code 
      ON partner_codes(UPPER(code))
    `)
    console.log('✅ Created index on partner_codes.code')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_codes_active 
      ON partner_codes(is_active, is_used, expires_at)
    `)
    console.log('✅ Created index on partner_codes status fields')
    
    // Update existing index to include 'Partner'
    await client.query(`
      DROP INDEX IF EXISTS idx_customers_call_schedule
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_call_schedule 
      ON customers(next_call_scheduled_at, payment_status, call_status)
      WHERE payment_status IN ('Paid', 'Partner')
    `)
    console.log('✅ Updated call schedule index to include Partner status')
    
    await client.query('COMMIT')
    console.log('\n✅ Partner code schema migration completed successfully!\n')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error running migration:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()


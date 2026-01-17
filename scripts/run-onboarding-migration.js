// Script to add onboarding schema
// Run with: node scripts/run-onboarding-migration.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function main() {
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ No database URL found')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔄 Connecting to database...')
    const client = await pool.connect()
    
    try {
      console.log('🔄 Running migration...')
      await client.query('BEGIN')
      
      await client.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS user_story TEXT,
        ADD COLUMN IF NOT EXISTS lulu_response TEXT,
        ADD COLUMN IF NOT EXISTS extracted_insecurity TEXT,
        ADD COLUMN IF NOT EXISTS extracted_goal TEXT,
        ADD COLUMN IF NOT EXISTS extracted_blocker TEXT
      `)
      
      await client.query('COMMIT')
      console.log('✅ Onboarding schema added successfully')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await pool.end()
  }
}

main()

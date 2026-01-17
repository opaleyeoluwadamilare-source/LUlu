// Direct database migration script
// Run with: node scripts/run-vapi-migration.js

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split(/\r?\n/).forEach(line => {
      // Skip comments and empty lines
      line = line.trim()
      if (!line || line.startsWith('#')) return
      
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

async function runMigration() {
  // Debug: show what we loaded
  console.log('🔍 Checking environment variables...')
  console.log('EXTERNAL_DATABASE_URL:', process.env.EXTERNAL_DATABASE_URL ? 'Found' : 'Not found')
  
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ EXTERNAL_DATABASE_URL or DATABASE_URL not found')
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')))
    
    // Try reading directly from file as fallback
    const envPath = path.join(__dirname, '..', '.env.local')
    console.log('📁 Reading from:', envPath)
    // Try UTF-8 first, then UTF-16 if that fails
    let content
    try {
      content = fs.readFileSync(envPath, 'utf8')
      // Check if it looks like UTF-16 (has null bytes)
      if (content.includes('\x00')) {
        content = fs.readFileSync(envPath, 'utf16le')
      }
    } catch (e) {
      // Try UTF-16
      content = fs.readFileSync(envPath, 'utf16le')
    }
    const lines = content.split(/\r?\n/)
    console.log('📄 Total lines:', lines.length)
    console.log('📄 First 3 lines:', lines.slice(0, 3))
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.includes('EXTERNAL_DATABASE_URL')) {
        console.log('🔍 Found line with EXTERNAL_DATABASE_URL:', trimmed.substring(0, 50))
        const dbUrl = trimmed.split('=').slice(1).join('=').trim()
        console.log('🔑 Found EXTERNAL_DATABASE_URL, length:', dbUrl.length)
        if (dbUrl) {
          console.log('✅ Using database URL from file')
          return runMigrationWithUrl(dbUrl)
        }
      }
    }
    console.error('❌ Could not find EXTERNAL_DATABASE_URL in file')
    
    process.exit(1)
  }
  
  return runMigrationWithUrl(connectionString)
}

async function runMigrationWithUrl(connectionString) {

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  const client = await pool.connect()

  try {
    console.log('🔄 Starting Vapi schema migration...')
    await client.query('BEGIN')

    // Add Vapi columns to existing customers table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS last_call_date DATE,
      ADD COLUMN IF NOT EXISTS call_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS total_calls_made INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_call_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_call_transcript TEXT,
      ADD COLUMN IF NOT EXISTS last_call_duration INTEGER,
      ADD COLUMN IF NOT EXISTS phone_validated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS phone_validation_error TEXT,
      ADD COLUMN IF NOT EXISTS call_time_hour INTEGER,
      ADD COLUMN IF NOT EXISTS call_time_minute INTEGER,
      ADD COLUMN IF NOT EXISTS next_call_scheduled_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS welcome_call_completed BOOLEAN DEFAULT false
    `)
    console.log('✅ Added Vapi columns to customers table')

    // Call queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_queue (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        call_type VARCHAR(20) NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        vapi_call_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Created call_queue table')

    // Call logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        call_type VARCHAR(20) NOT NULL,
        vapi_call_id VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        duration_seconds INTEGER,
        transcript TEXT,
        error_message TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Created call_logs table')

    // Simple context table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_context (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        context_data JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id)
      )
    `)
    console.log('✅ Created customer_context table')

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_queue_scheduled 
      ON call_queue(scheduled_for, status) 
      WHERE status IN ('pending', 'retrying')
    `)
    console.log('✅ Created call_queue index')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_logs_customer 
      ON call_logs(customer_id, created_at DESC)
    `)
    console.log('✅ Created call_logs index')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_call_schedule 
      ON customers(next_call_scheduled_at, payment_status, call_status)
      WHERE payment_status = 'Paid'
    `)
    console.log('✅ Created customers call_schedule index')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_context_customer 
      ON customer_context(customer_id)
    `)
    console.log('✅ Created customer_context index')

    await client.query('COMMIT')
    console.log('\n🎉 Vapi schema migration completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})


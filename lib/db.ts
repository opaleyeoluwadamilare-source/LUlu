import { Pool, PoolClient } from 'pg'

// Create a connection pool with retry logic
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    // Use external database URL for Render PostgreSQL (works from anywhere)
    // Fallback to internal URL if external is not set
    const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('EXTERNAL_DATABASE_URL or DATABASE_URL environment variable is not set')
    }

    // Render PostgreSQL requires SSL
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Render PostgreSQL
      },
      // Connection pool settings for reliability
      max: 10, // Maximum number of clients in pool
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 10000, // Timeout after 10s when connecting
    })

    // Handle pool errors gracefully
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err)
      // Don't crash - pool will retry connections
    })
  }

  return pool
}

/**
 * Execute query with automatic retry on connection errors
 * Production-ready with exponential backoff
 */
export async function queryWithRetry(
  queryText: string,
  params: any[] = [],
  retries: number = 3
): Promise<any> {
  const pool = getPool()
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(queryText, params)
    } catch (error: any) {
      // Retry on connection errors
      const isConnectionError = 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.toLowerCase().includes('connection') ||
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('network')
      
      if (isConnectionError && attempt < retries) {
        const delay = attempt * 1000 // Exponential: 1s, 2s, 3s
        console.warn(`Database query failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`, {
          error: error.message,
          query: queryText.substring(0, 100) // Log first 100 chars
        })
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Not a connection error or max retries reached
      throw error
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw new Error('Query failed after retries')
}

// Initialize database schema
export async function initDatabase() {
  const pool = getPool()
  
  try {
    // Create customers table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50) NOT NULL,
        timezone VARCHAR(100),
        call_time VARCHAR(100),
        goals TEXT,
        biggest_insecurity TEXT,
        delusion_level VARCHAR(100),
        plan VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'Pending',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index on email for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)
    `)

    // Create index on payment_status
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_payment_status ON customers(payment_status)
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Vapi schema migration - adds all tables and columns for call system
export async function addVapiSchema() {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
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
    
    // Call queue table for reliable call processing
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `)
    
    // Call logs table for tracking all calls
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add updated_at column if table already exists (migration for existing databases)
    await client.query(`
      ALTER TABLE call_logs 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    
    // Add updated_at column to call_queue if it doesn't exist (migration for existing databases)
    await client.query(`
      ALTER TABLE call_queue 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    
    // Add processed_at column to call_queue if it doesn't exist (migration for existing databases)
    await client.query(`
      ALTER TABLE call_queue 
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP
    `)
    
    // Simple context table for conversation context
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_context (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        context_data JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id)
      )
    `)
    
    // CRITICAL: Unique constraint to prevent duplicate calls
    // This ensures ON CONFLICT DO NOTHING in enqueueCall actually works
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_call_active
      ON call_queue (customer_id, call_type)
      WHERE status IN ('pending', 'retrying', 'processing')
    `)
    
    // Performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_queue_scheduled 
      ON call_queue(scheduled_for, status) 
      WHERE status IN ('pending', 'retrying')
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_logs_customer 
      ON call_logs(customer_id, created_at DESC)
    `)
    
    // Index on vapi_call_id for fast webhook idempotency checks
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_logs_vapi_call_id 
      ON call_logs(vapi_call_id)
      WHERE vapi_call_id IS NOT NULL
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_call_schedule 
      ON customers(next_call_scheduled_at, payment_status, call_status)
      WHERE payment_status = 'Paid'
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_context_customer 
      ON customer_context(customer_id)
    `)
    
    await client.query('COMMIT')
    console.log('✅ Vapi schema added successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error adding Vapi schema:', error)
    throw error
  } finally {
    client.release()
  }
}

// Onboarding schema migration - adds columns for new conversational flow
export async function addOnboardingSchema() {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Add new columns to existing customers table
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
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error adding Onboarding schema:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Partner code schema migration - adds partner code system
 * Creates partner_codes table and adds partner_code_id to customers
 */
export async function addPartnerCodeSchema() {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
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
    
    // Add partner_code_id to customers table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS partner_code_id INTEGER REFERENCES partner_codes(id)
    `)
    
    // Indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_codes_code 
      ON partner_codes(UPPER(code))
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_codes_active 
      ON partner_codes(is_active, is_used, expires_at)
    `)
    
    // Update existing index to include 'Partner'
    await client.query(`
      DROP INDEX IF EXISTS idx_customers_call_schedule
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_call_schedule 
      ON customers(next_call_scheduled_at, payment_status, call_status)
      WHERE payment_status IN ('Paid', 'Partner')
    `)
    
    await client.query('COMMIT')
    console.log('✅ Partner code schema added successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error adding partner code schema:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Cleanup migration - consolidates redundant fields
 * Makes extracted_goal and extracted_insecurity the source of truth
 * Backfills legacy fields for backward compatibility
 */
export async function consolidateRedundantFields() {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Consolidating redundant fields...')
    
    // Step 1: Backfill extracted_goal from goals where extracted_goal is empty
    const goalBackfill = await client.query(`
      UPDATE customers 
      SET extracted_goal = goals
      WHERE (extracted_goal IS NULL OR extracted_goal = '')
        AND (goals IS NOT NULL AND goals != '')
    `)
    console.log(`  ✅ Backfilled ${goalBackfill.rowCount} extracted_goal values from goals`)
    
    // Step 2: Backfill extracted_insecurity from biggest_insecurity where extracted_insecurity is empty
    const insecurityBackfill = await client.query(`
      UPDATE customers 
      SET extracted_insecurity = biggest_insecurity
      WHERE (extracted_insecurity IS NULL OR extracted_insecurity = '')
        AND (biggest_insecurity IS NOT NULL AND biggest_insecurity != '')
    `)
    console.log(`  ✅ Backfilled ${insecurityBackfill.rowCount} extracted_insecurity values from biggest_insecurity`)
    
    // Step 3: Sync legacy fields from extracted fields (for backward compatibility)
    // This ensures legacy fields are always in sync with source of truth
    const goalSync = await client.query(`
      UPDATE customers 
      SET goals = extracted_goal
      WHERE extracted_goal IS NOT NULL 
        AND extracted_goal != ''
        AND (goals IS NULL OR goals = '' OR goals != extracted_goal)
    `)
    console.log(`  ✅ Synced ${goalSync.rowCount} goals fields from extracted_goal`)
    
    const insecuritySync = await client.query(`
      UPDATE customers 
      SET biggest_insecurity = extracted_insecurity
      WHERE extracted_insecurity IS NOT NULL 
        AND extracted_insecurity != ''
        AND (biggest_insecurity IS NULL OR biggest_insecurity = '' OR biggest_insecurity != extracted_insecurity)
    `)
    console.log(`  ✅ Synced ${insecuritySync.rowCount} biggest_insecurity fields from extracted_insecurity`)
    
    await client.query('COMMIT')
    console.log('✅ Field consolidation completed successfully')
    
    return {
      goalBackfill: goalBackfill.rowCount,
      insecurityBackfill: insecurityBackfill.rowCount,
      goalSync: goalSync.rowCount,
      insecuritySync: insecuritySync.rowCount
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error consolidating fields:', error)
    throw error
  } finally {
    client.release()
  }
}

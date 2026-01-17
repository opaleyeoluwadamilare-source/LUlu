/**
 * Migration script to add unique constraint to call_queue table
 * This prevents duplicate calls by ensuring ON CONFLICT DO NOTHING works
 * 
 * Run: node scripts/add-unique-constraint-migration.js
 */

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    let content
    try {
      content = fs.readFileSync(envPath, 'utf8')
      if (content.includes('\x00')) {
        content = fs.readFileSync(envPath, 'utf16le')
      }
    } catch (e) {
      content = fs.readFileSync(envPath, 'utf16le')
    }
    content.split(/\r?\n/).forEach(line => {
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
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ EXTERNAL_DATABASE_URL not found')
    console.error('   Please add it to .env.local')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔧 Adding unique constraint to call_queue table...\n')
    
    // Step 1: Check if constraint already exists
    console.log('1️⃣  Checking if constraint already exists...')
    const existing = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'call_queue' 
        AND indexname = 'unique_customer_call_active'
    `)
    
    if (existing.rows.length > 0) {
      console.log('   ✅ Unique constraint already exists!')
      console.log('   No migration needed.')
      await client.query('COMMIT')
      return { success: true, message: 'Constraint already exists' }
    }
    
    // Step 2: Clean up existing duplicates
    console.log('\n2️⃣  Cleaning up existing duplicate queue entries...')
    const duplicatesBefore = await client.query(`
      SELECT customer_id, call_type, COUNT(*) as count
      FROM call_queue
      WHERE status IN ('pending', 'retrying', 'processing')
      GROUP BY customer_id, call_type
      HAVING COUNT(*) > 1
    `)
    
    if (duplicatesBefore.rows.length > 0) {
      console.log(`   Found ${duplicatesBefore.rows.length} sets of duplicates`)
      console.log('   Removing duplicates (keeping oldest entry)...')
      
      await client.query(`
        DELETE FROM call_queue
        WHERE id NOT IN (
          SELECT DISTINCT ON (customer_id, call_type)
            id
          FROM call_queue
          WHERE status IN ('pending', 'retrying', 'processing')
          ORDER BY customer_id, call_type, created_at ASC
        )
        AND status IN ('pending', 'retrying', 'processing')
      `)
      
      const duplicatesAfter = await client.query(`
        SELECT customer_id, call_type, COUNT(*) as count
        FROM call_queue
        WHERE status IN ('pending', 'retrying', 'processing')
        GROUP BY customer_id, call_type
        HAVING COUNT(*) > 1
      `)
      
      console.log(`   ✅ Cleaned up duplicates. Remaining: ${duplicatesAfter.rows.length}`)
    } else {
      console.log('   ✅ No duplicates found')
    }
    
    // Step 3: Add unique constraint
    console.log('\n3️⃣  Adding unique constraint...')
    await client.query(`
      CREATE UNIQUE INDEX unique_customer_call_active
      ON call_queue (customer_id, call_type)
      WHERE status IN ('pending', 'retrying', 'processing')
    `)
    
    console.log('   ✅ Unique constraint added successfully!')
    
    // Step 4: Verify constraint exists
    console.log('\n4️⃣  Verifying constraint...')
    const verify = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'call_queue' 
        AND indexname = 'unique_customer_call_active'
    `)
    
    if (verify.rows.length > 0) {
      console.log('   ✅ Constraint verified!')
      console.log(`   ${verify.rows[0].indexdef}`)
    } else {
      throw new Error('Constraint was not created')
    }
    
    await client.query('COMMIT')
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration completed successfully!')
    console.log('='.repeat(60))
    console.log('\nThe unique constraint is now active and will prevent duplicate calls.')
    
    return {
      success: true,
      message: 'Unique constraint added successfully'
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(result => {
    if (result.success) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


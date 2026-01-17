/**
 * Migration Script: Convert timezone display labels to IANA format
 * 
 * This script updates existing customer records that have display labels
 * (e.g., "Eastern (ET)") in the timezone column to IANA format (e.g., "America/New_York").
 * 
 * SAFETY:
 * - Only updates non-IANA format timezones
 * - Idempotent (can run multiple times safely)
 * - Uses transactions for safety
 * - Logs all changes
 * 
 * Usage:
 *   node scripts/migrate-timezones.js
 * 
 * Environment Variables Required:
 *   EXTERNAL_DATABASE_URL or DATABASE_URL
 */

const { Pool } = require('pg')

const timezoneMap = {
  'Eastern (ET)': 'America/New_York',
  'Central (CT)': 'America/Chicago',
  'Mountain (MT)': 'America/Denver',
  'Pacific (PT)': 'America/Los_Angeles',
  'Alaska (AKT)': 'America/Anchorage',
  'Hawaii (HST)': 'Pacific/Honolulu',
  'London (GMT)': 'Europe/London',
  'Central European (CET)': 'Europe/Paris',
  'Gulf (GST)': 'Asia/Dubai',
  'India (IST)': 'Asia/Kolkata',
  'Singapore (SGT)': 'Asia/Singapore',
  'Tokyo (JST)': 'Asia/Tokyo',
  'Sydney (AEST)': 'Australia/Sydney',
}

async function migrateTimezones() {
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ Error: EXTERNAL_DATABASE_URL or DATABASE_URL environment variable is not set')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Required for Render PostgreSQL
    },
  })
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔍 Finding customers with display label timezones...')
    
    // Get all customers with display labels (not IANA format)
    // IANA timezones follow pattern: Continent/City (e.g., America/New_York)
    const result = await client.query(`
      SELECT id, name, email, timezone 
      FROM customers 
      WHERE timezone IS NOT NULL
        AND timezone NOT LIKE 'America/%' 
        AND timezone NOT LIKE 'Europe/%' 
        AND timezone NOT LIKE 'Asia/%' 
        AND timezone NOT LIKE 'Pacific/%' 
        AND timezone NOT LIKE 'Australia/%'
        AND timezone NOT LIKE 'Atlantic/%'
        AND timezone NOT LIKE 'Indian/%'
        AND timezone NOT LIKE 'Arctic/%'
        AND timezone NOT LIKE 'Antarctica/%'
        AND timezone NOT LIKE 'Africa/%'
      ORDER BY id
    `)
    
    if (result.rows.length === 0) {
      console.log('✅ No customers found with display label timezones. All timezones are already in IANA format.')
      await client.query('COMMIT')
      return
    }
    
    console.log(`📊 Found ${result.rows.length} customers to migrate\n`)
    
    let migrated = 0
    let skipped = 0
    let errors = 0
    
    for (const row of result.rows) {
      const oldTimezone = row.timezone.trim()
      const newTimezone = timezoneMap[oldTimezone]
      
      if (!newTimezone) {
        console.log(`⚠️  Skipping customer ${row.id} (${row.email}): Unknown timezone "${oldTimezone}"`)
        skipped++
        continue
      }
      
      try {
        await client.query(
          'UPDATE customers SET timezone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newTimezone, row.id]
        )
        
        console.log(`✅ Migrated customer ${row.id} (${row.email || row.name}): "${oldTimezone}" → "${newTimezone}"`)
        migrated++
      } catch (error) {
        console.error(`❌ Error migrating customer ${row.id}:`, error.message)
        errors++
      }
    }
    
    await client.query('COMMIT')
    
    console.log('\n📈 Migration Summary:')
    console.log(`   ✅ Migrated: ${migrated}`)
    console.log(`   ⚠️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log('\n✅ Migration complete!')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
migrateTimezones()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error)
    process.exit(1)
  })


// Script to consolidate redundant database fields
// Run with: node scripts/run-consolidation-migration.js

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
      console.log('🔄 Running consolidation migration...')
      await client.query('BEGIN')
      
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
      console.log('✅ Consolidation migration completed successfully')
      
      console.log('\n📊 Summary:')
      console.log(`  - Backfilled ${goalBackfill.rowCount} extracted_goal values`)
      console.log(`  - Backfilled ${insecurityBackfill.rowCount} extracted_insecurity values`)
      console.log(`  - Synced ${goalSync.rowCount} goals fields`)
      console.log(`  - Synced ${insecuritySync.rowCount} biggest_insecurity fields`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Consolidation migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()


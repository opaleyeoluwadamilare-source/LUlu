require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars (no I, O, 0, 1)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function createPartnerCode() {
  const code = process.argv[2] || generateRandomCode()
  const expiresAt = process.argv[3] || null // Optional: YYYY-MM-DD format
  
  const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ No database URL found')
    console.error('   Make sure EXTERNAL_DATABASE_URL or DATABASE_URL is set in .env.local')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const result = await pool.query(
      `INSERT INTO partner_codes (code, expires_at, created_by, notes)
       VALUES ($1, $2, 'admin', 'Single-use partner code')
       RETURNING id, code, created_at, expires_at`,
      [code.toUpperCase(), expiresAt]
    )
    
    console.log('\n✅ Partner code created successfully!\n')
    console.log(`   Code: ${result.rows[0].code}`)
    console.log(`   ID: ${result.rows[0].id}`)
    console.log(`   Created: ${result.rows[0].created_at}`)
    if (result.rows[0].expires_at) {
      console.log(`   Expires: ${result.rows[0].expires_at}`)
    } else {
      console.log(`   Expires: Never`)
    }
    console.log(`\n📋 Share this code: ${result.rows[0].code}`)
    console.log(`\n⚠️  This code can only be used ONCE. After activation, it will be marked as used.\n`)
  } catch (error) {
    if (error.code === '23505') {
      console.error('❌ Code already exists. Try a different code.')
      console.error(`   Suggested: ${generateRandomCode()}`)
    } else if (error.code === '42P01') {
      console.error('❌ partner_codes table does not exist.')
      console.error('   Run the database migration first:')
      console.error('   node scripts/run-partner-code-migration.js')
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createPartnerCode()


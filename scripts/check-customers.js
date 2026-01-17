/**
 * Quick script to check the status of all customers
 */

const { Pool } = require('pg')

const databaseUrl = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Error: EXTERNAL_DATABASE_URL or DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined
})

async function main() {
  try {
    console.log('🔍 Checking all customers in database...\n')
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        email,
        phone,
        payment_status,
        phone_validated,
        call_time,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        welcome_call_completed,
        last_call_date,
        created_at
      FROM customers 
      ORDER BY id
    `)
    
    if (result.rows.length === 0) {
      console.log('📭 No customers found in database.')
      return
    }
    
    console.log(`📊 Found ${result.rows.length} customer(s):\n`)
    
    for (const customer of result.rows) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`ID: ${customer.id}`)
      console.log(`Name: ${customer.name || 'N/A'}`)
      console.log(`Email: ${customer.email || 'N/A'}`)
      console.log(`Phone: ${customer.phone || 'N/A'}`)
      console.log(`Payment Status: ${customer.payment_status || 'NULL'}`)
      console.log(`Phone Validated: ${customer.phone_validated || false}`)
      console.log(`Call Time: ${customer.call_time || 'NULL'}`)
      console.log(`Call Time Hour: ${customer.call_time_hour !== null ? customer.call_time_hour : 'NULL'}`)
      console.log(`Call Time Minute: ${customer.call_time_minute !== null ? customer.call_time_minute : 'NULL'}`)
      console.log(`Timezone: ${customer.timezone || 'NULL'}`)
      console.log(`Next Call Scheduled: ${customer.next_call_scheduled_at ? customer.next_call_scheduled_at.toISOString() : 'NULL'}`)
      console.log(`Welcome Call Completed: ${customer.welcome_call_completed || false}`)
      console.log(`Last Call Date: ${customer.last_call_date || 'NULL'}`)
      console.log(`Created At: ${customer.created_at ? customer.created_at.toISOString() : 'NULL'}`)
      console.log('')
    }
    
    // Summary
    const paid = result.rows.filter(c => c.payment_status === 'Paid')
    const withPhone = result.rows.filter(c => c.phone_validated === true)
    const withCallTime = result.rows.filter(c => c.call_time_hour !== null)
    const withScheduled = result.rows.filter(c => c.next_call_scheduled_at !== null)
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📊 Summary:`)
    console.log(`  Total customers: ${result.rows.length}`)
    console.log(`  Paid: ${paid.length}`)
    console.log(`  Phone validated: ${withPhone.length}`)
    console.log(`  Has call_time_hour: ${withCallTime.length}`)
    console.log(`  Has next_call_scheduled_at: ${withScheduled.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })


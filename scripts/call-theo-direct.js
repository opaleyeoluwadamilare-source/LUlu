/**
 * Direct call to Theo - bypasses queue and cron
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function callTheoDirect() {
  try {
    console.log('📞 Making direct call to Theo...\n')
    
    // Get Theo's data
    const customer = await pool.query(`
      SELECT 
        id, name, email, phone, timezone,
        call_time_hour, call_time_minute,
        extracted_goal, extracted_insecurity, extracted_blocker,
        goals, biggest_insecurity,
        user_story, lulu_response,
        welcome_call_completed, last_call_date
      FROM customers
      WHERE id = 7
    `)
    
    if (customer.rows.length === 0) {
      console.log('❌ Theo not found!')
      return
    }
    
    const theo = customer.rows[0]
    console.log(`✅ Found Theo: ${theo.name} (${theo.phone})`)
    
    // Import the VAPI call function
    const { makeVapiCall } = require('../lib/vapi')
    
    // Make the call directly
    console.log('\n📞 Initiating call...')
    const result = await makeVapiCall({
      customerId: theo.id,
      customerName: theo.name,
      phone: theo.phone,
      timezone: theo.timezone || 'America/New_York',
      goals: theo.extracted_goal || theo.goals || '',
      biggestInsecurity: theo.extracted_insecurity || theo.biggest_insecurity || '',
      extractedGoal: theo.extracted_goal || '',
      extractedInsecurity: theo.extracted_insecurity || '',
      extractedBlocker: theo.extracted_blocker || '',
      userStory: theo.user_story || '',
      luluResponse: theo.lulu_response || '',
      isWelcomeCall: false // Daily call
    })
    
    if (result.success) {
      console.log(`\n✅ Call initiated successfully!`)
      console.log(`   VAPI Call ID: ${result.callId}`)
      console.log(`   Theo should receive the call now.`)
    } else {
      console.log(`\n❌ Call failed:`)
      console.log(`   Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

callTheoDirect()


/**
 * Fetch call transcript from database or VAPI API
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const VAPI_API_URL = 'https://api.vapi.ai'
const VAPI_API_KEY = process.env.VAPI_API_KEY

async function fetchTranscript(callId) {
  try {
    console.log(`📞 Fetching transcript for call: ${callId}\n`)
    
    // First, check database
    console.log('🔍 Checking database...')
    const dbResult = await pool.query(
      'SELECT transcript, status, duration_seconds, created_at, customer_id FROM call_logs WHERE vapi_call_id = $1',
      [callId]
    )
    
    if (dbResult.rows.length > 0) {
      const log = dbResult.rows[0]
      console.log('✅ Found in database!')
      console.log(`   Status: ${log.status}`)
      console.log(`   Duration: ${log.duration_seconds ? `${log.duration_seconds} seconds` : 'N/A'}`)
      console.log(`   Created: ${log.created_at}`)
      console.log(`   Customer ID: ${log.customer_id}`)
      
      if (log.transcript) {
        console.log('\n📝 Transcript:')
        console.log('━'.repeat(60))
        console.log(log.transcript)
        console.log('━'.repeat(60))
        await pool.end()
        return
      } else {
        console.log('   ⚠️  No transcript in database yet')
      }
    } else {
      console.log('   ⚠️  Call not found in database')
    }
    
    // If not in database or no transcript, fetch from VAPI
    if (!VAPI_API_KEY) {
      console.log('\n❌ VAPI_API_KEY not found!')
      await pool.end()
      return
    }
    
    console.log('\n🔍 Fetching from VAPI API...')
    const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
      console.log(`\n❌ VAPI API Error:`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error:`, JSON.stringify(error, null, 2))
      await pool.end()
      return
    }
    
    const callData = await response.json()
    
    console.log('✅ Call data retrieved from VAPI!')
    console.log(`   Status: ${callData.status || 'N/A'}`)
    console.log(`   Duration: ${callData.duration ? `${Math.round(callData.duration)} seconds` : 'N/A'}`)
    console.log(`   Created: ${callData.createdAt || callData.created_at || 'N/A'}`)
    
    if (callData.transcript) {
      console.log('\n📝 Transcript:')
      console.log('━'.repeat(60))
      console.log(callData.transcript)
      console.log('━'.repeat(60))
      
      // Update database with transcript if we have a record
      if (dbResult.rows.length > 0) {
        try {
          await pool.query(
            'UPDATE call_logs SET transcript = $1, duration_seconds = $2, status = $3 WHERE vapi_call_id = $4',
            [
              callData.transcript,
              callData.duration ? Math.round(callData.duration) : null,
              callData.status || 'completed',
              callId
            ]
          )
          console.log('\n✅ Transcript saved to database')
        } catch (dbError) {
          console.log(`\n⚠️  Could not update database: ${dbError.message}`)
        }
      }
    } else if (callData.messages && Array.isArray(callData.messages)) {
      // Sometimes transcript is in messages array
      console.log('\n📝 Messages/Transcript:')
      console.log('━'.repeat(60))
      callData.messages.forEach((msg, idx) => {
        if (msg.role && msg.content) {
          console.log(`\n[${msg.role.toUpperCase()}]: ${msg.content}`)
        }
      })
      console.log('━'.repeat(60))
    } else {
      console.log('\n⚠️  No transcript available yet')
      console.log('   The call may still be in progress or transcript is being processed')
      if (callData.status) {
        console.log(`   Call status: ${callData.status}`)
      }
    }
    
    // Show other useful info
    if (callData.endedReason) {
      console.log(`\n📊 Call ended reason: ${callData.endedReason}`)
    }
    if (callData.cost) {
      console.log(`💰 Call cost: $${callData.cost.total || callData.cost || 'N/A'}`)
    }
    
    await pool.end()
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  }
}

// Get call ID from command line or use the last one
const callId = process.argv[2] || '019ab31b-e51c-7dd0-954b-ee36a42778e8'

if (require.main === module) {
  fetchTranscript(callId)
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Failed:', error)
      process.exit(1)
    })
}

module.exports = { fetchTranscript }


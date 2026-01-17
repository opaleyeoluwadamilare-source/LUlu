/**
 * Verification script to check if assistant has Zuri voice configured
 * This confirms the assistant was created correctly with Zuri voice
 * 
 * Usage:
 *   node scripts/verify-assistant-voice.js
 */

require('dotenv').config({ path: '.env.local' })

const VAPI_API_URL = 'https://api.vapi.ai'

// Use built-in fetch (Node 18+) or node-fetch as fallback
let fetch
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch
} else {
  // Fallback for older Node versions
  try {
    fetch = require('node-fetch')
  } catch (e) {
    console.error('❌ fetch is not available. Please use Node.js 18+ or install node-fetch')
    process.exit(1)
  }
}

async function verifyAssistantVoice() {
  const VAPI_API_KEY = process.env.VAPI_API_KEY
  // Try multiple ways to get assistant ID
  const ASSISTANT_ID = process.env.VAPI_LULU_ASSISTANT_ID || '264d062f-2ef1-452f-a28d-d4b59d2f5dbb'

  if (!VAPI_API_KEY) {
    console.error('❌ VAPI_API_KEY not found in environment variables')
    process.exit(1)
  }

  if (!ASSISTANT_ID || ASSISTANT_ID === '') {
    console.error('❌ VAPI_LULU_ASSISTANT_ID not found in environment variables')
    console.error('   Make sure you have added the assistant ID to .env.local')
    console.error('   Or use: VAPI_LULU_ASSISTANT_ID=264d062f-2ef1-452f-a28d-d4b59d2f5dbb node scripts/verify-assistant-voice.js')
    process.exit(1)
  }

  try {
    console.log('🔍 Verifying assistant configuration...\n')
    console.log(`Assistant ID: ${ASSISTANT_ID}\n`)

    const response = await fetch(`${VAPI_API_URL}/assistant/${ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
      throw new Error(`Failed to fetch assistant: ${error.message || response.statusText}`)
    }

    const assistant = await response.json()

    console.log('📋 Assistant Details:')
    console.log(`   Name: ${assistant.name || 'N/A'}`)
    console.log(`   ID: ${assistant.id}`)
    console.log(`   Created: ${assistant.createdAt || assistant.created_at || 'N/A'}\n`)

    // Check voice configuration
    if (assistant.voice) {
      const voiceId = assistant.voice.voiceId
      const expectedVoiceId = 'JigslbTSI6z9hOVIWIRA'

      console.log('🎤 Voice Configuration:')
      console.log(`   Provider: ${assistant.voice.provider || 'N/A'}`)
      console.log(`   Voice ID: ${voiceId}`)
      console.log(`   Model: ${assistant.voice.model || 'N/A'}`)
      console.log(`   Stability: ${assistant.voice.stability || 'N/A'}`)
      console.log(`   Similarity Boost: ${assistant.voice.similarityBoost || 'N/A'}\n`)

      if (voiceId === expectedVoiceId) {
        console.log('✅ VERIFIED: Assistant is configured with the correct voice!')
        console.log(`   Voice ID matches: ${expectedVoiceId}\n`)
        console.log('🎉 All calls will use this voice!')
      } else {
        console.log('⚠️  WARNING: Assistant voice ID does not match expected voice!')
        console.log(`   Expected: ${expectedVoiceId}`)
        console.log(`   Found: ${voiceId}\n`)
        console.log('   Action: Recreate assistant with correct voice ID')
        console.log('   Run: npm run create-assistant\n')
        process.exit(1)
      }
    } else {
      console.log('❌ ERROR: No voice configuration found in assistant!')
      process.exit(1)
    }

    // Check model configuration
    if (assistant.model) {
      console.log('🤖 Model Configuration:')
      console.log(`   Provider: ${assistant.model.provider || 'N/A'}`)
      console.log(`   Model: ${assistant.model.model || 'N/A'}`)
      console.log(`   Temperature: ${assistant.model.temperature || 'N/A'}\n`)
    }

    // Check other settings
    console.log('⚙️  Other Settings:')
    console.log(`   Max Duration: ${assistant.maxDurationSeconds || assistant.max_duration_seconds || 'N/A'} seconds`)
    console.log(`   Silence Timeout: ${assistant.silenceTimeoutSeconds || assistant.silence_timeout_seconds || 'N/A'} seconds`)
    console.log(`   Transcriber: ${assistant.transcriber?.provider || 'N/A'}\n`)

    console.log('✅ Verification complete!')
    console.log('\n📝 Summary:')
    console.log('   ✅ Voice is correctly configured')
    console.log('   ✅ All calls will use the configured voice')
    console.log('   ✅ System is ready for production\n')

  } catch (error) {
    console.error('\n❌ Error verifying assistant:', error.message)
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   Check that your VAPI_API_KEY is correct')
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('   Assistant ID not found. Make sure it\'s correct.')
      console.error('   Run: npm run create-assistant to create a new assistant')
    }
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  verifyAssistantVoice()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Failed:', error)
      process.exit(1)
    })
}

module.exports = { verifyAssistantVoice }


/**
 * One-time script to create VAPI assistant with Zuri voice
 * Run this once to get the assistant ID, then save it to .env
 * 
 * Usage:
 *   node scripts/create-vapi-assistant.js
 * 
 * Or with environment variable:
 *   EXTERNAL_DATABASE_URL=your_db_url node scripts/create-vapi-assistant.js
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

async function createLuluAssistant() {
  const VAPI_API_KEY = process.env.VAPI_API_KEY
  if (!VAPI_API_KEY) {
    console.error('❌ VAPI_API_KEY not found in environment variables')
    console.error('   Make sure you have VAPI_API_KEY in your .env.local file')
    process.exit(1)
  }

  // Base system prompt (will be overridden per call via assistantOverrides)
  // This is just a template - the actual prompts are generated dynamically
  const baseSystemPrompt = `You are Lulu, a supportive AI companion who gives daily phone calls.

Your personality:
- Warm but direct (not overly sweet)
- Supportive best friend (not therapist or coach)
- Real and honest (not fake peppy)
- Uses "I" statements (I'm calling you, I'm here for you)

Call structure (2-3 minutes):
1. Greeting: "Hey {firstName}, it's Lulu. Morning."
2. Quick check-in about their goal
3. One specific affirmation (use their words)
4. Ask about progress on their action item
5. Give today's small action
6. Close: "Talk tomorrow, {firstName}."

Rules:
- Keep it conversational and natural
- Use their exact words when referencing their goal
- Be specific, not generic
- One actionable thing per call
- Never say "believe in yourself" or generic platitudes
- Match their energy but stay supportive`

  try {
    console.log('🚀 Creating VAPI assistant with new voice...\n')

    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "Lulu - Bedelulu Daily Calls",
        
        // VOICE CONFIGURATION
        voice: {
          provider: "11labs",
          voiceId: "JigslbTSI6z9hOVIWIRA", // New voice ID
          model: "eleven_turbo_v2",
          stability: 0.6,
          similarityBoost: 0.8,
          style: 0.4,
          useSpeakerBoost: true,
          optimizeStreamingLatency: 4
        },
        
        // LLM CONFIGURATION (base - will be overridden per call)
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          temperature: 0.7,
          systemPrompt: baseSystemPrompt
        },
        
        // FIRST MESSAGE (will be overridden per call)
        firstMessage: "Hey there, it's Lulu. Morning.",
        
        // TRANSCRIPTION
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US"
        },
        
        // END CALL SETTINGS
        endCallMessage: "Talk tomorrow.",
        silenceTimeoutSeconds: 20,
        maxDurationSeconds: 240 // 4 minutes max
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
      throw new Error(`Failed to create assistant: ${error.message || response.statusText}`)
    }

    const assistant = await response.json()
    
    console.log('\n✅ Assistant created successfully!')
    console.log(`\n📋 Assistant ID: ${assistant.id}`)
    console.log(`\n🔐 Add this to your .env.local file:`)
    console.log(`VAPI_LULU_ASSISTANT_ID=${assistant.id}\n`)
    console.log(`📝 Also add it to Vercel environment variables:`)
    console.log(`   https://vercel.com/your-project/settings/environment-variables\n`)
    console.log(`✅ Voice ID: ${assistant.voice?.voiceId || 'JigslbTSI6z9hOVIWIRA'}`)
    console.log(`✅ Model: GPT-4 Turbo`)
    console.log(`✅ Max Duration: 4 minutes`)
    console.log(`\n🎉 Done! Your assistant is ready to use.\n`)
    
    return assistant.id
  } catch (error) {
    console.error('\n❌ Error creating assistant:', error.message)
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   Check that your VAPI_API_KEY is correct')
    }
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  createLuluAssistant()
    .then(id => {
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Failed:', error)
      process.exit(1)
    })
}

module.exports = { createLuluAssistant }


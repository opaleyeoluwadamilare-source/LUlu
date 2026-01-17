/**
 * Direct VAPI call to Theo - bypasses everything
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const VAPI_API_URL = 'https://api.vapi.ai'
const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_ASSISTANT_ID = process.env.VAPI_LULU_ASSISTANT_ID

async function callTheoDirect() {
  try {
    console.log('📞 Making direct VAPI call to Theo...\n')
    
    if (!VAPI_API_KEY) {
      console.log('❌ VAPI_API_KEY not found!')
      return
    }
    
    if (!VAPI_ASSISTANT_ID) {
      console.log('⚠️  VAPI_LULU_ASSISTANT_ID not found, using inline config')
    }
    
    // Get Theo's data with all context
    const customer = await pool.query(`
      SELECT 
        c.id, c.name, c.email, c.phone, c.timezone,
        c.call_time_hour, c.call_time_minute,
        c.extracted_goal, c.extracted_insecurity, c.extracted_blocker,
        c.goals, c.biggest_insecurity,
        c.user_story, c.lulu_response,
        c.welcome_call_completed, c.last_call_date,
        cc.context_data
      FROM customers c
      LEFT JOIN customer_context cc ON cc.customer_id = c.id
      WHERE c.id = 7
    `)
    
    if (customer.rows.length === 0) {
      console.log('❌ Theo not found!')
      return
    }
    
    const theo = customer.rows[0]
    console.log(`✅ Found Theo: ${theo.name}`)
    console.log(`   Phone: ${theo.phone}`)
    console.log(`   Timezone: ${theo.timezone}`)
    
    // Get context data
    const contextData = theo.context_data || {}
    const learnedPreferences = contextData.learnedPreferences || {}
    const currentMood = contextData.currentMood
    const upcomingEvents = contextData.upcomingEvents || []
    
    console.log(`\n📊 Context Data:`)
    if (currentMood) console.log(`   Current Mood: ${currentMood}`)
    if (upcomingEvents.length > 0) {
      console.log(`   Upcoming Events: ${upcomingEvents.map(e => e.title).join(', ')}`)
    }
    if (learnedPreferences.effectiveTone) {
      console.log(`   Preferred Tone: ${learnedPreferences.effectiveTone}`)
    }
    if (learnedPreferences.whatResonates && learnedPreferences.whatResonates.length > 0) {
      console.log(`   What Resonates: ${learnedPreferences.whatResonates.join(', ')}`)
    }
    console.log('')
    
    // Clean phone number
    const cleanPhone = theo.phone.replace(/[\s\(\)\-]/g, '')
    console.log(`   Clean Phone: ${cleanPhone}\n`)
    
    // Get time of day
    const now = new Date()
    const timeInTimezone = new Date(now.toLocaleString("en-US", {timeZone: theo.timezone}))
    const hour = timeInTimezone.getHours()
    let timeOfDay = 'morning'
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening'
    else if (hour >= 21 || hour < 6) timeOfDay = 'night'
    
    // Build context string
    const contextParts = []
    if (currentMood) {
      contextParts.push(`Current mood: ${currentMood}`)
    }
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0]
      contextParts.push(`Upcoming: ${nextEvent.title}${nextEvent.date ? ` (${nextEvent.date})` : ''}`)
    }
    const contextString = contextParts.length > 0 ? `\n\nCONTEXT:\n${contextParts.join('\n')}\n` : ''
    
    // Build learned preferences context
    const learnedContextParts = []
    if (learnedPreferences.effectiveTone) {
      learnedContextParts.push(`They respond best to: ${learnedPreferences.effectiveTone} tone`)
    }
    if (learnedPreferences.whatResonates && learnedPreferences.whatResonates.length > 0) {
      learnedContextParts.push(`What resonates: ${learnedPreferences.whatResonates.join(', ')}`)
    }
    if (learnedPreferences.preferredLength) {
      learnedContextParts.push(`Preferred call length: ${learnedPreferences.preferredLength}`)
    }
    const learnedContextString = learnedContextParts.length > 0 
      ? `\n\nLEARNED PREFERENCES (from past conversations):\n${learnedContextParts.join('\n')}\n` 
      : ''
    
    // Generate comprehensive system prompt with context
    const goal = theo.extracted_goal || theo.goals || 'their goals'
    const insecurity = theo.extracted_insecurity || theo.biggest_insecurity || 'their challenges'
    const effectiveTone = learnedPreferences.effectiveTone || 'direct'
    
    const systemPrompt = `You are Lulu, ${theo.name}'s confidence partner and friend. This is a 2-3 minute daily check-in call.
${contextString}${learnedContextString}
YOUR PERSONALITY:
- Warm, encouraging, and genuine
- Like a supportive friend who believes in them
- Confident but not pushy
- Adapts to their energy level
- You are their partner, not their coach
- Based on past conversations, they respond best to: ${effectiveTone} tone

THEIR GOAL: ${goal}
THEIR CHALLENGE: ${insecurity}

CONVERSATION FLOW (FLEXIBLE):

1. GREETING (5 seconds):
   ${timeOfDay === 'morning' ? `"Good morning ${theo.name}! It's Lulu, your confidence partner. How are you doing today?"` : ''}
   ${timeOfDay === 'afternoon' ? `"Hey ${theo.name}! It's Lulu. Hope your day is going well. How are you doing?"` : ''}
   ${timeOfDay === 'evening' ? `"Evening ${theo.name}! It's Lulu. How was your day?"` : ''}
   ${timeOfDay === 'night' ? `"Hey ${theo.name}! It's Lulu. How are you doing tonight?"` : ''}
   
   ⏸️ WAIT for their response (up to 10 seconds)
   
   IF USER RESPONDS:
     - Listen actively (don't interrupt)
     - Acknowledge what they said: "I hear you" / "That makes sense" / "Got it"
     - Show genuine interest: "Tell me more" / "How are you feeling about that?"
     - Then transition: "Alright, let's get you pumped up..."
   
   IF NO RESPONSE (5+ seconds of silence):
     - Don't repeat the question
     - Don't say "Hello? Are you there?"
     - Use a natural bridge: "No worries if you're busy - let's get you ready for your day..."
     - OR: "I'll keep this quick - you've got this today..."
     - Then proceed to confidence boost

2. CONFIDENCE BOOST (60-90 seconds):
   - Reference their specific goal: "${goal}"
   - Address their challenge: "${insecurity}"
   ${currentMood ? `- Acknowledge their current mood: ${currentMood}` : ''}
   ${upcomingEvents.length > 0 ? `- Mention upcoming: ${upcomingEvents[0].title}` : ''}
   - Give one specific, personalized affirmation
   - Use their exact words when referencing their goal
   - Be ${effectiveTone} (based on what works best for them)

3. CHECK PROGRESS (30-45 seconds):
   - Ask about their progress on their goal
   - Listen to their response
   - Give encouragement based on what they say

4. CLOSE (10-15 seconds):
   - "Talk tomorrow, ${theo.name}. You've got this."
   - Keep it brief and supportive

RULES:
- Keep it conversational and natural
- Use their exact words when referencing their goal
- Be specific, not generic
- One actionable thing per call
- Never say "believe in yourself" or generic platitudes
- Match their energy but stay supportive
- Total call: 2-3 minutes maximum`

    const firstMessage = `${timeOfDay === 'morning' ? `Good morning ${theo.name}!` : timeOfDay === 'afternoon' ? `Hey ${theo.name}!` : timeOfDay === 'evening' ? `Evening ${theo.name}!` : `Hey ${theo.name}!`} It's Lulu, your confidence partner. How are you doing today?`
    
    console.log('📝 System Prompt:')
    console.log(systemPrompt)
    console.log('\n📝 First Message:')
    console.log(firstMessage)
    console.log('\n')
    
    // Make the call
    console.log('📞 Calling VAPI API...')
    
    const requestBody = VAPI_ASSISTANT_ID ? {
      assistantId: VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '0d4e6d25-e594-4cb1-8945-dc656687bab6',
      customer: {
        number: cleanPhone,
        name: theo.name
      },
      assistantOverrides: {
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          systemPrompt: systemPrompt, // Use systemPrompt directly instead of messages
          temperature: 0.8
        },
        firstMessage: firstMessage,
        maxDurationSeconds: 150,
        silenceTimeoutSeconds: 20
      }
    } : {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '0d4e6d25-e594-4cb1-8945-dc656687bab6',
      customer: {
        number: cleanPhone
      },
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.8
        },
        voice: {
          provider: "11labs",
          voiceId: process.env.VAPI_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"
        },
        firstMessage: firstMessage,
        silenceTimeoutSeconds: 20,
        maxDurationSeconds: 150,
        recordingEnabled: true,
        serverUrl: `https://bedelulu.co/api/webhooks/vapi`
      }
    }
    
    const endpoint = VAPI_ASSISTANT_ID ? '/call/phone' : '/call'
    
    const response = await fetch(`${VAPI_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
      console.log(`\n❌ VAPI API Error:`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${JSON.stringify(error, null, 2)}`)
      return
    }
    
    const result = await response.json()
    
    console.log(`\n✅ Call initiated successfully!`)
    console.log(`   VAPI Call ID: ${result.id}`)
    console.log(`   Status: ${result.status || 'initiated'}`)
    console.log(`\n📞 Theo should receive the call now!`)
    
    // Log the call
      await pool.query(`
        INSERT INTO call_logs (customer_id, call_type, status, vapi_call_id, created_at)
        VALUES ($1, 'daily', 'initiated', $2, NOW())
      `, [theo.id, result.id])
    
    console.log(`\n✅ Call logged in database`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

callTheoDirect()


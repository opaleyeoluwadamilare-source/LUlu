/**
 * Direct VAPI call to TJ with specific context
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

async function callTJDirect() {
  try {
    console.log('📞 Making direct VAPI call to TJ (Ola/Dipsey)...\n')
    
    if (!VAPI_API_KEY) {
      console.log('❌ VAPI_API_KEY not found!')
      return
    }
    
    if (!VAPI_ASSISTANT_ID) {
      console.log('⚠️  VAPI_LULU_ASSISTANT_ID not found, using inline config')
    }
    
    // Check if phone number provided as argument
    const phoneArg = process.argv[2]
    
    let tj
    if (phoneArg) {
      // Use provided phone number
      console.log('📱 Using provided phone number')
      tj = {
        id: null,
        name: 'TJ',
        phone: phoneArg,
        timezone: 'America/New_York', // Default timezone
        extracted_goal: 'Building confidence',
        extracted_insecurity: 'Fear of speaking in front of crowds',
        context_data: null
      }
    } else {
      // Find TJ (Ola/Dipsey) in database
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
        WHERE c.id = 5 OR LOWER(c.name) LIKE '%ola%' OR LOWER(c.name) LIKE '%dipsey%' OR LOWER(c.name) LIKE '%tj%'
        LIMIT 1
      `)
      
      if (customer.rows.length === 0) {
        console.log('❌ TJ (Ola/Dipsey) not found in database!')
        console.log('   Usage: node scripts/call-tj-direct-vapi.js <phone_number>')
        console.log('   Example: node scripts/call-tj-direct-vapi.js +1234567890')
        console.log('\n   Available customers:')
        const allCustomers = await pool.query('SELECT id, name, email FROM customers LIMIT 10')
        allCustomers.rows.forEach(c => console.log(`     - ${c.name} (ID: ${c.id})`))
        return
      }
      
      tj = customer.rows[0]
      console.log(`   Found as: ${tj.name} (ID: ${tj.id})`)
    }
    console.log(`✅ Found TJ (Ola/Dipsey): ${tj.name}`)
    console.log(`   Phone: ${tj.phone}`)
    console.log(`   Timezone: ${tj.timezone}`)
    
    // Get context data
    const contextData = tj.context_data || {}
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
    console.log('')
    
    // Clean phone number
    const cleanPhone = tj.phone.replace(/[\s\(\)\-]/g, '')
    console.log(`   Clean Phone: ${cleanPhone}\n`)
    
    // Get time of day
    const now = new Date()
    const timeInTimezone = new Date(now.toLocaleString("en-US", {timeZone: tj.timezone}))
    const hour = timeInTimezone.getHours()
    let timeOfDay = 'morning'
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening'
    else if (hour >= 21 || hour < 6) timeOfDay = 'night'
    
    // Build comprehensive system prompt with all the specific context
    const goal = tj.extracted_goal || tj.goals || 'their goals'
    const insecurity = tj.extracted_insecurity || tj.biggest_insecurity || 'their challenges'
    const effectiveTone = learnedPreferences.effectiveTone || 'direct'
    
    // Calculate last Friday (assuming today is after last Friday)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 5 = Friday
    const daysSinceFriday = (dayOfWeek + 2) % 7 // Days since last Friday
    const lastFriday = new Date(today)
    lastFriday.setDate(today.getDate() - daysSinceFriday)
    const lastFridayStr = lastFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    
    const systemPrompt = `You are Lulu, ${tj.name}'s (also known as TJ or Dipsey) confidence partner and friend. This is a 2-3 minute daily check-in call.

SPECIFIC CONTEXT ABOUT ${tj.name.toUpperCase()} (TJ/DIPSEY):
- Their main challenge: Fear of speaking in front of crowds
- They organized a fellowship program at their school through their initiative called "I life Jesus"
- The event was held last Friday evening (${lastFridayStr})
- Today is likely Sunday, and they may have gone to church
- They might be at work right now (consider this when calling)
- You can call them ${tj.name}, TJ, or Dipsey - they'll know it's you

YOUR PERSONALITY:
- Warm, encouraging, and genuine
- Like a supportive friend who believes in them
- Confident but not pushy
- Adapts to their energy level
- You are their partner, not their coach
- Based on past conversations, they respond best to: ${effectiveTone} tone

THEIR GOAL: ${goal}
THEIR CHALLENGE: ${insecurity} (specifically: fear of speaking in front of crowds)

CONVERSATION FLOW (FLEXIBLE):

1. GREETING (5 seconds):
   ${timeOfDay === 'morning' ? `"Good morning ${tj.name}! It's Lulu, your confidence partner. How are you doing today?"` : ''}
   ${timeOfDay === 'afternoon' ? `"Hey ${tj.name}! It's Lulu. Hope your day is going well. How are you doing?"` : ''}
   ${timeOfDay === 'evening' ? `"Evening ${tj.name}! It's Lulu. How was your day?"` : ''}
   ${timeOfDay === 'night' ? `"Hey ${tj.name}! It's Lulu. How are you doing tonight?"` : ''}
   
   ⏸️ WAIT for their response (up to 10 seconds)
   
   IF USER RESPONDS:
     - Listen actively (don't interrupt)
     - Acknowledge what they said: "I hear you" / "That makes sense" / "Got it"
     - Show genuine interest: "Tell me more" / "How are you feeling about that?"
   
   IF NO RESPONSE (5+ seconds of silence):
     - Don't repeat the question
     - Don't say "Hello? Are you there?"
     - Use a natural bridge: "No worries if you're busy - let's get you ready for your day..."
     - OR: "I'll keep this quick - you've got this today..."

2. CHECK ON FELLOWSHIP EVENT (60-90 seconds):
   - Ask genuinely about the fellowship program they held last Friday evening
   - Reference their initiative "I life Jesus"
   - Ask how it went: "I wanted to check in - how did the fellowship program go last Friday? The one you organized through I life Jesus?"
   - Listen actively to their response
   - If they mention it went well: Celebrate with them! "That's amazing! I'm so proud of you for organizing that."
   - If they mention challenges: Be supportive and encouraging
   - Acknowledge their courage in organizing and leading despite their fear of speaking in front of crowds
   - This is important: They overcame their fear to organize this event - that's huge!

3. CHECK ON CHURCH (30-45 seconds):
   - Ask about church today: "How was church today? Did you have a good time?"
   - Be genuine and interested
   - Listen to their response
   - If they mention it was good: "That's wonderful! I'm glad you had a good time."
   - If they mention challenges: Be supportive

4. ADDRESS THEIR FEAR (30-45 seconds):
   - Reference their fear of speaking in front of crowds
   - Acknowledge that organizing the fellowship program was a big step
   - Give encouragement about their courage
   - Be specific and personal

5. CLOSE (10-15 seconds):
   - "Talk tomorrow, ${tj.name}. You've got this."
   - Keep it brief and supportive

RULES:
- Keep it conversational and natural
- Be genuinely interested in their fellowship program and church experience
- Acknowledge their courage in organizing the event despite their fear
- Be specific, not generic
- Never say "believe in yourself" or generic platitudes
- Match their energy but stay supportive
- If they're at work, be brief and respectful of their time
- Total call: 2-3 minutes maximum`

    // Determine first message based on time of day and context
    let firstMessage
    if (timeOfDay === 'afternoon' && hour >= 14) {
      // Likely after church, might be at work
      firstMessage = `Hey ${tj.name}! It's Lulu, your confidence partner. How are you doing? I wanted to check in on you.`
    } else if (timeOfDay === 'evening') {
      firstMessage = `Evening ${tj.name}! It's Lulu. How was your day?`
    } else {
      firstMessage = `${timeOfDay === 'morning' ? `Good morning ${tj.name}!` : `Hey ${tj.name}!`} It's Lulu, your confidence partner. How are you doing today?`
    }
    
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
        name: tj.name
      },
      assistantOverrides: {
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          systemPrompt: systemPrompt, // Use systemPrompt directly instead of messages
          temperature: 0.8
        },
        firstMessage: firstMessage,
        maxDurationSeconds: 180,
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
        maxDurationSeconds: 180,
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
      console.log('\n❌ VAPI API Error:')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error:`, JSON.stringify(error, null, 2))
      return
    }
    
    const callData = await response.json()
    
    console.log('\n✅ Call initiated successfully!')
    console.log(`   VAPI Call ID: ${callData.id}`)
    console.log(`   Status: ${callData.status || 'queued'}`)
    console.log(`\n📞 ${tj.name} should receive the call now!`)
    
    // Log the call in database (if customer ID exists)
    if (tj.id) {
      try {
        // Insert call log (vapi_call_id doesn't have unique constraint, so we just insert)
        // If duplicate exists, it will be handled by the webhook when call completes
        await pool.query(`
          INSERT INTO call_logs (customer_id, vapi_call_id, call_type, status, created_at)
          VALUES ($1, $2, 'daily', 'initiated', NOW())
        `, [tj.id, callData.id])
        console.log('\n✅ Call logged in database')
      } catch (dbError) {
        console.log(`\n⚠️  Could not log call in database: ${dbError.message}`)
        console.log(`   Error details:`, dbError)
      }
    } else {
      console.log('\n⚠️  Call not logged (TJ not in database)')
    }
    
    await pool.end()
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  callTJDirect()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Failed:', error)
      process.exit(1)
    })
}

module.exports = { callTJDirect }


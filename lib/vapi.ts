import { getPool } from './db'
import { getContextForPrompt } from './context-tracker'
import { logOperation, trackCallMetrics } from './monitoring'

interface VapiCallConfig {
  customerId: number
  customerName: string
  phone: string
  timezone: string
  goals: string
  biggestInsecurity: string
  delusionLevel: string
  isWelcomeCall: boolean
}

export interface VapiCallResult {
  success: boolean
  callId: string | null
  error: string | null
}

const VAPI_API_URL = 'https://api.vapi.ai'
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 5000, 15000] // Exponential backoff in ms

/**
 * Make Vapi API call with retry logic and graceful error handling
 * NEW: Supports Assistant ID method (with Zuri voice) with fallback to inline config
 */
export async function makeVapiCall(
  config: VapiCallConfig,
  retryCount: number = 0
): Promise<VapiCallResult> {
  const startTime = Date.now()
  
  // Validate required environment variables
  if (!process.env.VAPI_API_KEY) {
    logOperation('error', 'VAPI_API_KEY not configured', {
      customerId: config.customerId,
      callType: config.isWelcomeCall ? 'welcome' : 'daily'
    })
    return {
      success: false,
      callId: null,
      error: 'VAPI_API_KEY not configured - calls cannot be made'
    }
  }
  
  if (!process.env.OPENAI_API_KEY) {
    logOperation('error', 'OpenAI API key not configured', {
      customerId: config.customerId,
      callType: config.isWelcomeCall ? 'welcome' : 'daily'
    })
    return {
      success: false,
      callId: null,
      error: 'OpenAI API key not configured'
    }
  }
  
  try {
    // Generate system prompt and first message using existing logic (preserves all features)
    const systemPrompt = await generateSystemPrompt(config)
    const firstMessage = getFirstMessage(config)
    const maxDuration = config.isWelcomeCall ? 60 : 150
    
    logOperation('info', `Initiating Vapi call`, {
      customerId: config.customerId,
      callType: config.isWelcomeCall ? 'welcome' : 'daily',
      retryCount,
      method: process.env.VAPI_LULU_ASSISTANT_ID ? 'assistant-id' : 'inline'
    })
    
    // Clean phone number: remove spaces, parentheses, dashes
    const cleanPhone = config.phone.replace(/[\s\(\)\-]/g, '')
    
    // NEW METHOD: Use Assistant ID if available (with Zuri voice)
    if (process.env.VAPI_LULU_ASSISTANT_ID) {
      return await makeCallWithAssistantId(
        process.env.VAPI_LULU_ASSISTANT_ID,
        cleanPhone,
        config.customerName,
        systemPrompt,
        firstMessage,
        maxDuration,
        config,
        retryCount,
        startTime
      )
    }
    
    // FALLBACK: Old method (inline configuration) - preserves backward compatibility
    return await makeCallWithInlineConfig(
      cleanPhone,
      systemPrompt,
      firstMessage,
      maxDuration,
      config,
      retryCount,
      startTime
    )
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    // Network errors - retry
    if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.code === 'ECONNRESET')) {
      logOperation('warn', `Network error, retrying`, {
        customerId: config.customerId,
        error: error.message,
        retryCount: retryCount + 1,
        duration
      })
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
      return makeVapiCall(config, retryCount + 1)
    }
    
    logOperation('error', `Vapi call failed (network error)`, {
      customerId: config.customerId,
      error: error.message,
      duration
    })
    
    return {
      success: false,
      callId: null,
      error: error.message || 'Network error'
    }
  }
}

/**
 * NEW: Make call using Assistant ID with dynamic overrides
 * This preserves all existing prompt generation and personalization
 */
async function makeCallWithAssistantId(
  assistantId: string,
  phone: string,
  customerName: string,
  systemPrompt: string,
  firstMessage: string,
  maxDuration: number,
  config: VapiCallConfig,
  retryCount: number,
  startTime: number
): Promise<VapiCallResult> {
  try {
    const response = await fetch(`${VAPI_API_URL}/call/phone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: assistantId,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '0d4e6d25-e594-4cb1-8945-dc656687bab6',
        customer: {
          number: phone,
          name: customerName
        },
        // CRITICAL: Override system prompt and first message per call
        // This preserves all existing prompt generation logic (context, learned preferences, etc.)
        // When overriding model config, Vapi requires provider, model, and systemPrompt to be specified
        assistantOverrides: {
          model: {
            provider: "openai", // REQUIRED: Must specify provider when overriding model
            model: "gpt-4-turbo", // Match assistant base configuration for consistency
            systemPrompt: systemPrompt, // Override system prompt per call (dynamic, personalized)
            temperature: 0.8 // Match assistant base configuration for consistent behavior
          },
          firstMessage: firstMessage, // Your existing getFirstMessage() output
          maxDurationSeconds: maxDuration,
          silenceTimeoutSeconds: 20
        }
        // Note: serverUrl is configured on the assistant itself, not in the call request
      }),
      signal: AbortSignal.timeout(15000) // 15s timeout (balanced: fast enough for cron, slow enough for legitimate delays)
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let error: any
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      
      // Log detailed error for debugging
      console.error(`❌ Vapi API error for customer ${config.customerId}:`, {
        status: response.status,
        statusText: response.statusText,
        error: error.message || error,
        phone: phone, // Use phone parameter (already cleaned)
        method: 'assistant-id',
        retryCount
      })
      
      // Retry on 5xx errors or rate limits
      if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
        logOperation('warn', `Vapi API error, retrying`, {
          customerId: config.customerId,
          status: response.status,
          error: error.message || error,
          retryCount: retryCount + 1,
          method: 'assistant-id'
        })
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
        return makeCallWithAssistantId(
          assistantId,
          phone,
          customerName,
          systemPrompt,
          firstMessage,
          maxDuration,
          config,
          retryCount + 1,
          startTime
        )
      }
      
      logOperation('error', `Vapi API error (non-retryable)`, {
        customerId: config.customerId,
        status: response.status,
        error: error.message || error,
        phone: phone, // Use phone parameter (already cleaned)
        method: 'assistant-id'
      })
      
      return {
        success: false,
        callId: null,
        error: error.message || error || `HTTP ${response.status}`
      }
    }
    
    const result = await response.json()
    const duration = Date.now() - startTime
    
    logOperation('info', `Vapi call initiated successfully (assistant-id)`, {
      customerId: config.customerId,
      callId: result.id || result.callId,
      duration
    })
    
    return {
      success: true,
      callId: result.id || result.callId,
      error: null
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    // Network errors - retry
    if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.code === 'ECONNRESET')) {
      logOperation('warn', `Network error, retrying`, {
        customerId: config.customerId,
        error: error.message,
        retryCount: retryCount + 1,
        duration,
        method: 'assistant-id'
      })
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
      return makeCallWithAssistantId(
        assistantId,
        phone,
        customerName,
        systemPrompt,
        firstMessage,
        maxDuration,
        config,
        retryCount + 1,
        startTime
      )
    }
    
    logOperation('error', `Vapi call failed (network error)`, {
      customerId: config.customerId,
      error: error.message,
      duration,
      method: 'assistant-id'
    })
    
    return {
      success: false,
      callId: null,
      error: error.message || 'Network error'
    }
  }
}

/**
 * FALLBACK: Old method (inline configuration)
 * Kept for backward compatibility if assistant ID not configured
 */
async function makeCallWithInlineConfig(
  phone: string,
  systemPrompt: string,
  firstMessage: string,
  maxDuration: number,
  config: VapiCallConfig,
  retryCount: number,
  startTime: number
): Promise<VapiCallResult> {
  try {
    const response = await fetch(`${VAPI_API_URL}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '0d4e6d25-e594-4cb1-8945-dc656687bab6',
        customer: {
          number: phone
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
          maxDurationSeconds: maxDuration,
          recordingEnabled: true,
          serverUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/vapi`
        }
      }),
      signal: AbortSignal.timeout(15000) // 15s timeout (balanced: fast enough for cron, slow enough for legitimate delays)
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown Vapi error' }))
      
      // Retry on 5xx errors or rate limits
      if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
        logOperation('warn', `Vapi API error, retrying`, {
          customerId: config.customerId,
          status: response.status,
          error: error.message,
          retryCount: retryCount + 1,
          method: 'inline'
        })
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
        return makeCallWithInlineConfig(
          phone,
          systemPrompt,
          firstMessage,
          maxDuration,
          config,
          retryCount + 1,
          startTime
        )
      }
      
      logOperation('error', `Vapi API error (non-retryable)`, {
        customerId: config.customerId,
        status: response.status,
        error: error.message,
        method: 'inline'
      })
      
      return {
        success: false,
        callId: null,
        error: error.message || `HTTP ${response.status}`
      }
    }
    
    const result = await response.json()
    const duration = Date.now() - startTime
    
    logOperation('info', `Vapi call initiated successfully (inline)`, {
      customerId: config.customerId,
      callId: result.id || result.callId,
      duration
    })
    
    return {
      success: true,
      callId: result.id || result.callId,
      error: null
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    // Network errors - retry
    if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.code === 'ECONNRESET')) {
      logOperation('warn', `Network error, retrying`, {
        customerId: config.customerId,
        error: error.message,
        retryCount: retryCount + 1,
        duration,
        method: 'inline'
      })
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
      return makeCallWithInlineConfig(
        phone,
        systemPrompt,
        firstMessage,
        maxDuration,
        config,
        retryCount + 1,
        startTime
      )
    }
    
    logOperation('error', `Vapi call failed (network error)`, {
      customerId: config.customerId,
      error: error.message,
      duration,
      method: 'inline'
    })
    
    return {
      success: false,
      callId: null,
      error: error.message || 'Network error'
    }
  }
}

/**
 * Generate system prompt with natural conversation flow and silence handling
 * Enhanced with learned preferences for adaptive personalization
 */
async function generateSystemPrompt(config: VapiCallConfig): Promise<string> {
  const contextString = await getContextForPrompt(config.customerId).catch(() => '')
  const timeOfDay = getTimeOfDay(config.timezone)
  
  // Get learned preferences from context (if available)
  let learnedPreferences: any = null
  try {
    const pool = getPool()
    const result = await pool.query(
      'SELECT context_data FROM customer_context WHERE customer_id = $1',
      [config.customerId]
    )
    if (result.rows.length > 0 && result.rows[0].context_data?.learnedPreferences) {
      learnedPreferences = result.rows[0].context_data.learnedPreferences
    }
  } catch (error) {
    // Fail silently - use defaults
  }
  
  // Determine effective tone (learned preference overrides delusion level if available)
  const effectiveTone = learnedPreferences?.effectiveTone || 
    (config.delusionLevel === 'gentle' ? 'gentle' : 
     config.delusionLevel === 'medium' ? 'direct' : 'direct')
  
  // Build learned preferences context
  const learnedContext: string[] = []
  if (learnedPreferences?.whatResonates && learnedPreferences.whatResonates.length > 0) {
    learnedContext.push(`They respond best to: ${learnedPreferences.whatResonates.join(', ')}`)
  }
  if (learnedPreferences?.preferredLength) {
    learnedContext.push(`Preferred call length: ${learnedPreferences.preferredLength}`)
  }
  if (learnedPreferences?.needsAdjustment) {
    learnedContext.push(`Note: Recent calls showed low engagement - adapt approach`)
  }
  const learnedContextString = learnedContext.length > 0 
    ? `\n\nLEARNED PREFERENCES (from past conversations):\n${learnedContext.join('\n')}\n` 
    : ''
  
  if (config.isWelcomeCall) {
    return `You are Lulu, ${config.customerName}'s confidence partner. Welcome call (45 seconds max):

1. Greet warmly: "Hey ${config.customerName}! I'm Lulu, your confidence partner. Welcome to your daily calls!"
2. Explain schedule: "Starting tomorrow, I'll call you every day at your chosen time to give you a quick confidence boost."
3. Set expectations: "These are quick 2-3 minute calls. I'll pump you up, then you're off to crush your day."
4. Close: "See you tomorrow! You've got this."

Keep it warm, friendly, under 45 seconds. No questions - just welcome and set expectations.`
  }
  
  // Build goal-specific question based on their onboarding data
  const goalQuestion = config.goals && config.goals.length > 0 
    ? `How's ${config.goals.toLowerCase()} going?` 
    : "How are things going with your goals?"
  
  const actionQuestion = config.goals && config.goals.length > 0
    ? `Did you make any progress on ${config.goals.toLowerCase()}?`
    : "Did you make any progress today?"

  return `You are Lulu, ${config.customerName}'s confidence partner and friend. This is a 2-3 minute daily check-in call.
${learnedContextString}
YOUR PERSONALITY:
- Warm, encouraging, and genuine
- Like a supportive friend who believes in them
- Confident but not pushy
- Adapts to their energy level
- You are their partner, not their coach
${learnedPreferences?.effectiveTone ? `- Based on past conversations, they respond best to: ${effectiveTone} tone` : ''}

THEIR PROFILE:
- Goal: ${config.goals || 'Building confidence'}
- Challenge: ${config.biggestInsecurity || 'Building confidence'}
${contextString ? `- Context: ${contextString}` : ''}

CONVERSATION FLOW (CONVERSATIONAL - ASK QUESTIONS, WAIT FOR RESPONSES):

1. GREETING & CHECK-IN (20-30 seconds):
   ${timeOfDay === 'morning' ? `"Good morning ${config.customerName}! It's Lulu, your confidence partner. How are you doing today?"` : ''}
   ${timeOfDay === 'afternoon' ? `"Hey ${config.customerName}! It's Lulu. Hope your day is going well. How are you doing?"` : ''}
   ${timeOfDay === 'evening' ? `"Evening ${config.customerName}! It's Lulu. How was your day?"` : ''}
   ${timeOfDay === 'night' ? `"Hey ${config.customerName}! It's Lulu. How are you doing tonight?"` : ''}
   
   ⏸️ WAIT for their response (up to 10 seconds)
   
   IF USER RESPONDS:
     - Listen actively (don't interrupt)
     - Acknowledge briefly: "I hear you" / "That makes sense" / "Got it"
     - If they mention something specific → reference it naturally
     - Then move to next question
   
   IF NO RESPONSE (5+ seconds of silence):
     - Don't repeat the question
     - Don't say "Hello? Are you there?"
     - Give a brief, warm bridge: "No worries if you're busy - I'll keep this quick..."
     - Then move to next question

2. CHECK ON THEIR GOAL (30-45 seconds):
   ${config.goals && config.goals.length > 0 
     ? `- Ask: "${goalQuestion}"`
     : `- Ask: "How are things going with what you're working on?"`}
   
   ⏸️ WAIT for their response (up to 10 seconds)
   
   IF USER RESPONDS:
     - Listen to what they say
     - Acknowledge their response: "That's great" / "I understand" / "That makes sense"
     - Give ONE brief, specific affirmation based on what they said OR their goal
     - Use their exact words when referencing their goal
     - Keep it personal, not generic
   
   IF NO RESPONSE (5+ seconds of silence):
     - Give ONE brief, specific affirmation about their goal: "${config.goals || "what you're working on"}"
     - Keep it encouraging but brief
     - Don't lecture or talk too long

3. GIVE AFFIRMATION (20-30 seconds):
   - Based on what they said (if they responded) OR their goal/challenge (if they didn't)
   - Give ONE specific affirmation using their exact words
   ${config.delusionLevel === 'gentle' ? 
     '- GENTLE tone: Warm, patient. "I know this feels hard, but you\'re doing so well. Take it one step at a time."' : 
   config.delusionLevel === 'medium' ? 
     '- MEDIUM tone: Direct, confident. "You\'re ready for this. You know what you\'re doing."' : 
     '- FULL tone: Bold, energetic. "You\'re about to DOMINATE this! You\'re unstoppable!"'}
   - Keep it brief (2-3 sentences max)
   - Don't talk for more than 20-30 seconds

4. CHECK PROGRESS (20-30 seconds):
   ${config.goals && config.goals.length > 0
     ? `- Ask: "${actionQuestion}"`
     : `- Ask: "Did you make any progress today?"`}
   
   ⏸️ WAIT for their response (up to 10 seconds)
   
   IF USER RESPONDS:
     - Listen and react naturally
     - If they made progress: Celebrate! "That's amazing! I'm so proud of you."
     - If they didn't: Encourage without judgment: "That's okay. Tomorrow's a new day."
     - Keep it brief
   
   IF NO RESPONSE (5+ seconds of silence):
     - Give brief encouragement: "You've got this. One step at a time."
     - Don't lecture

5. CLOSE (10-15 seconds):
   - Brief, warm close
   ${config.delusionLevel === 'gentle' ? 
     '→ GENTLE: "You\'re going to do great. I believe in you. Talk tomorrow, ${config.customerName}!"' : 
   config.delusionLevel === 'medium' ? 
     '→ MEDIUM: "You\'re ready. Go make it happen. Talk tomorrow, ${config.customerName}!"' : 
     '→ FULL: "You\'re a BEAST! Go out there and DOMINATE! Talk tomorrow, ${config.customerName}!"'}
   - End call naturally after close

CRITICAL RULES FOR NATURAL CONVERSATION:
- ASK QUESTIONS, then WAIT for responses (don't just talk)
- After each question, pause and wait up to 10 seconds
- If they respond: React to what they said, then ask next question
- If they don't respond: Give brief encouragement, then move on
- Keep each section SHORT (20-45 seconds max)
- Don't talk for long stretches without pausing
- This is a CONVERSATION, not a monologue
- Follow their lead - if they're talkative, engage more; if quiet, keep it brief

SILENCE HANDLING:
- After asking a question, wait up to 10 seconds for response
- If 5+ seconds of silence after a question: Give brief response, then move on
- Don't say "Hello? Are you there?" or repeat questions
- Don't fill silence with long speeches
- If they interrupt → stop immediately and listen

ADAPTATION FOR NEW VS EXPERIENCED USERS:
- NEW USERS (first few calls): They might be shy or not know what to say
  → Ask simpler questions
  → Give more encouragement
  → Don't push if they're quiet
  → Keep it shorter (2 minutes max)
  
- EXPERIENCED USERS (many calls): They're comfortable talking
  → Can ask more specific questions
  → Can reference past conversations
  → Can engage more deeply
  → Can use full 2-3 minutes

TONE (match their delusion level):
- ${config.delusionLevel === 'gentle' ? 
    'GENTLE: Warm, patient, understanding. "I believe in you" / "You\'ve got this, one step at a time" / "It\'s okay to feel nervous - you\'re doing great"' : 
  config.delusionLevel === 'medium' ? 
    'MEDIUM: Confident, direct, assertive. "You\'re ready for this" / "Walk in there and own it" / "You know what you\'re doing"' : 
    'FULL: Bold, energetic, unstoppable. "You\'re a BEAST!" / "Nothing can stop you!" / "You\'re going to DOMINATE this"'}
- Always warm and genuine (adjust intensity to their level)
- Never robotic or scripted-sounding

TIMING:
- Total call: 2-3 minutes (hard cap: 3 minutes)
- If they're engaged and talking: use full time, ask follow-ups
- If they're quiet: keep it shorter (1.5-2 minutes)
- Don't rush, but respect their time
${learnedPreferences?.preferredLength ? `- Note: They prefer ${learnedPreferences.preferredLength} calls based on past conversations` : ''}

REMEMBER:
- This is THEIR call - follow their lead
- ASK, WAIT, REACT - don't just talk
- Natural conversation with pauses, not a script
- If something feels forced, don't do it
- Your job is to check in and encourage, not interrogate
- Silence is okay - give brief response and move on`
}

/**
 * Get first message for the call
 */
function getFirstMessage(config: VapiCallConfig): string {
  if (config.isWelcomeCall) {
    return `Hey ${config.customerName}! I'm Lulu, your confidence partner. Welcome to your daily calls! Starting tomorrow, I'll call you every day to give you a quick confidence boost. These calls are short - just 2-3 minutes. I'll pump you up, then you're off to crush your day. See you tomorrow!`
  }
  
  // Daily call - time-aware greeting
  const timeOfDay = getTimeOfDay(config.timezone)
  
  if (timeOfDay === 'morning') {
    return `Good morning ${config.customerName}! It's Lulu, your confidence partner. How are you doing today?`
  } else if (timeOfDay === 'afternoon') {
    return `Hey ${config.customerName}! It's Lulu. Hope your day is going well. How are you doing?`
  } else if (timeOfDay === 'evening') {
    return `Evening ${config.customerName}! It's Lulu. How was your day?`
  } else {
    return `Hey ${config.customerName}! It's Lulu. How are you doing tonight?`
  }
}

/**
 * Get time of day based on customer's timezone
 */
function getTimeOfDay(timezone: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    })
    
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12')
    
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  } catch (error) {
    // Fallback to generic greeting
    return 'morning'
  }
}

/**
 * Log call attempt to database
 */
export async function logCallAttempt(
  customerId: number,
  callType: 'welcome' | 'daily',
  result: VapiCallResult
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `INSERT INTO call_logs (customer_id, call_type, vapi_call_id, status, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      customerId,
      callType,
      result.callId,
      result.success ? 'initiated' : 'failed',
      result.error
    ]
  )
}


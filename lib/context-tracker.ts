import { getPool } from './db'

/**
 * Get context for AI prompt - simple retrieval with graceful failure
 * Enhanced with learned preferences
 */
export async function getContextForPrompt(customerId: number): Promise<string> {
  try {
    const pool = getPool()
    const result = await pool.query(
      'SELECT context_data FROM customer_context WHERE customer_id = $1',
      [customerId]
    )
    
    if (result.rows.length === 0) return ''
    
    const context = result.rows[0].context_data
    if (!context) return ''
    
    const parts: string[] = []
    
    if (context.currentMood) {
      parts.push(`Current mood: ${context.currentMood}`)
    }
    
    if (context.upcomingEvents && context.upcomingEvents.length > 0) {
      const nextEvent = context.upcomingEvents[0]
      parts.push(`Upcoming: ${nextEvent.title}${nextEvent.date ? ` (${nextEvent.date})` : ''}`)
    }
    
    // Add learned preferences (if available)
    const preferences = context.learnedPreferences
    if (preferences) {
      const preferenceParts: string[] = []
      
      if (preferences.effectiveTone) {
        preferenceParts.push(`They respond best to: ${preferences.effectiveTone} tone`)
      }
      
      if (preferences.whatResonates && preferences.whatResonates.length > 0) {
        preferenceParts.push(`What resonates: ${preferences.whatResonates.join(', ')}`)
      }
      
      if (preferences.preferredLength) {
        preferenceParts.push(`Preferred length: ${preferences.preferredLength}`)
      }
      
      if (preferenceParts.length > 0) {
        parts.push(`Learned preferences: ${preferenceParts.join('. ')}`)
      }
    }
    
    return parts.length > 0 ? `\nContext: ${parts.join('. ')}` : ''
  } catch (error) {
    // Fail silently - conversation works without context
    return ''
  }
}

/**
 * Extract context from transcript - with timeout and graceful failure
 * UPDATED: Enhanced with implicit learning signals extraction
 */
export async function extractContextSafely(
  customerId: number,
  transcript: string
): Promise<{ 
  mood?: string
  events?: any[]
  positiveSignals?: string[]
  energyLevel?: string
  engagementLevel?: string
  progressIndicators?: string[]
  tonePreference?: string
} | null> {
  if (!process.env.OPENAI_API_KEY) {
    // Only log once to avoid spam
    if (!(global as any).openaiKeyWarningLogged) {
      console.log('⚠️ OPENAI_API_KEY not set - context extraction disabled')
      ;(global as any).openaiKeyWarningLogged = true
    }
    return null
  }
  
  // Validate API key format
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format - must start with "sk-"')
    return null
  }
  
  try {
    // Get current date in customer's timezone (or UTC as fallback)
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Calculate dates for relative references
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Enhanced system prompt with examples and date context + learning signals
    const systemPrompt = `You are analyzing a confidence coaching call transcript to extract context and learning signals.

CURRENT DATE CONTEXT:
- Today: ${today} (${dayOfWeek})
- Tomorrow: ${tomorrow}
- Next week: ~${nextWeek}

EXTRACT:
1. MOOD: Customer's emotional state (lowercase, one word)
   Examples: "nervous", "confident", "stressed", "excited", "anxious", "hopeful"
   
2. EVENTS: Specific upcoming events mentioned with dates
   - Convert relative dates to YYYY-MM-DD format
   - Only include events that are clearly upcoming (not past)
   - Include what the event is about

3. POSITIVE_SIGNALS: Phrases indicating what resonated (array of strings)
   Look for: "that helped", "I needed that", "exactly what I needed", "that's perfect", "thanks that was good"
   Extract the specific phrases they said, not interpretations

4. ENERGY_LEVEL: How they sound (one word: "tired", "excited", "neutral", "energetic", "low")
   Based on their tone and words, not just mood

5. ENGAGEMENT_LEVEL: How engaged they were (one word: "high", "medium", "low")
   High: Asked questions, elaborated, showed interest
   Medium: Responded but briefly
   Low: Minimal responses, seemed rushed or disengaged

6. PROGRESS_INDICATORS: Mentions of doing actions or making progress (array of strings)
   Look for: "I did it", "I tried", "I made progress", "I started", mentions of completing goals

7. TONE_PREFERENCE: How they responded to Lulu's tone (one word: "gentle", "direct", "balanced", null)
   Gentle: Responded well to soft, patient encouragement
   Direct: Responded well to bold, assertive statements
   Balanced: Responded well to mix, or unclear
   null: Not enough data to determine

RETURN VALID JSON:
{
  "mood": "string or null",
  "events": [{"title": "string", "date": "YYYY-MM-DD"}],
  "positiveSignals": ["string"],
  "energyLevel": "string or null",
  "engagementLevel": "string or null",
  "progressIndicators": ["string"],
  "tonePreference": "string or null"
}

RULES:
- If mood is unclear, return null
- If no events mentioned, return empty array []
- Only extract clear, specific events
- Dates must be YYYY-MM-DD format
- Event titles should be brief (2-5 words)
- positiveSignals: Extract exact phrases, not interpretations
- If no positive signals, return empty array []
- If energy/engagement/tone unclear, return null`
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: systemPrompt
        }, {
          role: 'user',
          content: transcript.substring(0, 2000) // Limit to 2000 chars
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 300 // Increased for better responses
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout for better reliability
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error?.message || 'Unknown error',
        customerId
      })
      return null
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      console.warn('⚠️ No content in OpenAI response', { customerId })
      return null
    }
    
    const parsed = JSON.parse(content)
    
    // Validate extracted data
    const isValid = validateExtractedContext(parsed)
    if (!isValid) {
      console.warn('⚠️ Invalid context data extracted:', {
        customerId,
        parsed
      })
      return null
    }
    
    // Log extraction success with detailed metrics
    console.log('✅ Context extracted successfully:', {
      customerId,
      transcriptLength: transcript.length,
      hasMood: !!parsed.mood,
      mood: parsed.mood || 'none',
      eventsCount: parsed.events?.length || 0,
      events: parsed.events?.map((e: any) => e.title) || [],
      timestamp: new Date().toISOString()
    })
    
    return parsed
  } catch (error: any) {
    // Enhanced error logging with metrics
    if (error.name === 'AbortError') {
      console.warn('⚠️ OpenAI API timeout - context extraction skipped', {
        customerId,
        transcriptLength: transcript.length,
        timeout: '15s',
        timestamp: new Date().toISOString()
      })
    } else if (error instanceof SyntaxError) {
      console.error('❌ JSON parsing error - invalid response from OpenAI:', {
        customerId,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    } else {
      console.error('❌ OpenAI API error:', {
        customerId,
        error: error.message,
        name: error.name,
        transcriptLength: transcript.length,
        timestamp: new Date().toISOString()
      })
    }
    // Fail silently - don't break calls
    return null
  }
}

/**
 * Validate extracted context data
 */
function validateExtractedContext(data: any): boolean {
  // Must be an object
  if (!data || typeof data !== 'object') {
    return false
  }
  
  // Mood must be string or null
  if (data.mood !== null && data.mood !== undefined) {
    if (typeof data.mood !== 'string') {
      return false
    }
    // Mood should be lowercase, single word, reasonable length
    if (data.mood.length > 50 || data.mood.includes(' ')) {
      return false
    }
  }
  
  // Events must be an array
  if (!Array.isArray(data.events)) {
    return false
  }
  
  // Validate each event
  for (const event of data.events) {
    if (!event || typeof event !== 'object') {
      return false
    }
    
    // Must have title (string)
    if (!event.title || typeof event.title !== 'string') {
      return false
    }
    
    // Title should be reasonable length
    if (event.title.length > 200) {
      return false
    }
    
    // Date is optional, but if present must be valid format
    if (event.date) {
      if (typeof event.date !== 'string') {
        return false
      }
      // Check if it's a valid date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(event.date)) {
        return false
      }
      // Check if it's a valid actual date
      const parsed = new Date(event.date)
      if (isNaN(parsed.getTime())) {
        return false
      }
    }
  }
  
  // Validate learning signals (optional fields)
  if (data.positiveSignals !== undefined && !Array.isArray(data.positiveSignals)) {
    return false
  }
  
  if (data.energyLevel !== null && data.energyLevel !== undefined) {
    if (typeof data.energyLevel !== 'string' || data.energyLevel.length > 20) {
      return false
    }
  }
  
  if (data.engagementLevel !== null && data.engagementLevel !== undefined) {
    const validLevels = ['high', 'medium', 'low']
    if (!validLevels.includes(data.engagementLevel)) {
      return false
    }
  }
  
  if (data.progressIndicators !== undefined && !Array.isArray(data.progressIndicators)) {
    return false
  }
  
  if (data.tonePreference !== null && data.tonePreference !== undefined) {
    const validTones = ['gentle', 'direct', 'balanced']
    if (!validTones.includes(data.tonePreference)) {
      return false
    }
  }
  
  return true
}

/**
 * Analyze learning signals and update preferences
 * Runs async, non-blocking - failures don't affect calls
 */
async function analyzeAndLearn(
  customerId: number,
  learningSignals: {
    positiveSignals?: string[]
    energyLevel?: string
    engagementLevel?: string
    progressIndicators?: string[]
    tonePreference?: string
  },
  callDuration?: number
): Promise<void> {
  const pool = getPool()
  
  try {
    const existing = await pool.query(
      'SELECT context_data FROM customer_context WHERE customer_id = $1',
      [customerId]
    )
    
    const current = existing.rows[0]?.context_data || {}
    const preferences = current.learnedPreferences || {}
    const learningHistory = current.learningHistory || []
    
    // Add new learning signal to history (keep last 30)
    learningHistory.push({
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      ...learningSignals,
      callDuration
    })
    
    // Analyze patterns to learn preferences
    const recentSignals = learningHistory.slice(-10) // Last 10 calls
    
    // Learn effective tone from tone preferences
    const toneCounts: Record<string, number> = {}
    recentSignals.forEach((s: any) => {
      if (s.tonePreference) {
        toneCounts[s.tonePreference] = (toneCounts[s.tonePreference] || 0) + 1
      }
    })
    const mostCommonTone = Object.keys(toneCounts).reduce((a, b) => 
      toneCounts[a] > toneCounts[b] ? a : b, 'balanced'
    )
    if (Object.keys(toneCounts).length > 0) {
      preferences.effectiveTone = mostCommonTone
    }
    
    // Learn what resonates from positive signals
    const allPositiveSignals: string[] = []
    recentSignals.forEach((s: any) => {
      if (s.positiveSignals && Array.isArray(s.positiveSignals)) {
        allPositiveSignals.push(...s.positiveSignals)
      }
    })
    
    // Extract common themes from positive signals
    const whatResonates: string[] = []
    if (allPositiveSignals.length > 0) {
      // Simple keyword extraction (can be enhanced)
      const keywords = ['specific', 'direct', 'gentle', 'accountability', 'affirmation', 'encouragement']
      keywords.forEach(keyword => {
        const matches = allPositiveSignals.filter(s => 
          s.toLowerCase().includes(keyword)
        )
        if (matches.length >= 2) {
          whatResonates.push(keyword)
        }
      })
    }
    if (whatResonates.length > 0) {
      preferences.whatResonates = [...new Set(whatResonates)] // Remove duplicates
    }
    
    // Learn preferred length from engagement and duration
    const highEngagementCalls = recentSignals.filter((s: any) => 
      s.engagementLevel === 'high' && s.callDuration
    )
    if (highEngagementCalls.length > 0) {
      const avgDuration = highEngagementCalls.reduce((sum: number, s: any) => 
        sum + (s.callDuration || 0), 0
      ) / highEngagementCalls.length
      
      if (avgDuration < 90) {
        preferences.preferredLength = 'short (1-2 min)'
      } else if (avgDuration < 150) {
        preferences.preferredLength = 'medium (2-3 min)'
      } else {
        preferences.preferredLength = 'long (3+ min)'
      }
    }
    
    // Learn what doesn't work (low engagement + no positive signals)
    const lowEngagementCalls = recentSignals.filter((s: any) => 
      s.engagementLevel === 'low' && (!s.positiveSignals || s.positiveSignals.length === 0)
    )
    if (lowEngagementCalls.length >= 3) {
      // If 3+ calls with low engagement and no positive signals, something isn't working
      preferences.needsAdjustment = true
    }
    
    // Update context with learned preferences
    const updated = {
      ...current,
      learnedPreferences: preferences,
      learningHistory: learningHistory.slice(-30) // Keep last 30 signals
    }
    
    await pool.query(
      `INSERT INTO customer_context (customer_id, context_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (customer_id) 
       DO UPDATE SET context_data = $2, updated_at = NOW()`,
      [customerId, JSON.stringify(updated)]
    )
  } catch (error) {
    // Fail silently - learning is non-critical
    console.warn('Learning analysis failed (non-critical):', error)
  }
}

/**
 * Update context - simple merge, graceful failure
 * Enhanced with implicit learning
 */
export async function updateContext(
  customerId: number,
  newData: { 
    mood?: string
    events?: any[]
    positiveSignals?: string[]
    energyLevel?: string
    engagementLevel?: string
    progressIndicators?: string[]
    tonePreference?: string
    callDuration?: number
  }
): Promise<void> {
  const pool = getPool()
  
  try {
    const existing = await pool.query(
      'SELECT context_data FROM customer_context WHERE customer_id = $1',
      [customerId]
    )
    
    const current = existing.rows[0]?.context_data || {}
    const updated = {
      ...current,
      currentMood: newData.mood || current.currentMood,
      lastUpdated: new Date().toISOString()
    }
    
    // Add mood to history (keep last 7 only)
    if (newData.mood) {
      const moodHistory = current.moodHistory || []
      moodHistory.push({
        date: new Date().toISOString().split('T')[0],
        mood: newData.mood
      })
      updated.moodHistory = moodHistory.slice(-7)
    }
    
    // Simple event handling
    if (newData.events && newData.events.length > 0) {
      const upcoming = current.upcomingEvents || []
      const completed = current.completedEvents || []
      
      newData.events.forEach(event => {
        // If event has a past date, mark as completed
        if (event.date && new Date(event.date) < new Date()) {
          completed.push({
            title: event.title,
            completedDate: event.date
          })
          // Remove from upcoming
          const index = upcoming.findIndex((e: any) => e.title === event.title)
          if (index > -1) upcoming.splice(index, 1)
        } else {
          // Add to upcoming (avoid duplicates)
          if (!upcoming.find((e: any) => e.title === event.title)) {
            upcoming.push({
              title: event.title,
              date: event.date,
              status: 'upcoming'
            })
          }
        }
      })
      
      updated.upcomingEvents = upcoming.slice(-10) // Keep last 10
      updated.completedEvents = completed.slice(-5) // Keep last 5
    }
    
    // Upsert context first (synchronous)
    await pool.query(
      `INSERT INTO customer_context (customer_id, context_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (customer_id) 
       DO UPDATE SET context_data = $2, updated_at = NOW()`,
      [customerId, JSON.stringify(updated)]
    )
    
    // Run learning analysis ASYNC - don't block
    // This happens in background, failures don't affect calls
    if (newData.positiveSignals || newData.energyLevel || newData.engagementLevel || 
        newData.progressIndicators || newData.tonePreference || newData.callDuration) {
      analyzeAndLearn(customerId, {
        positiveSignals: newData.positiveSignals,
        energyLevel: newData.energyLevel,
        engagementLevel: newData.engagementLevel,
        progressIndicators: newData.progressIndicators,
        tonePreference: newData.tonePreference
      }, newData.callDuration).catch(error => {
        // Silent failure - learning is non-critical
        console.warn('Background learning failed (non-critical):', error)
      })
    }
  } catch (error) {
    // Fail silently - don't break calls
    console.error('Context update failed:', error)
  }
}


import { NextRequest, NextResponse } from 'next/server'

// Lulu Vapi Assistant ID
const VAPI_ASSISTANT_ID = '5a1207cc-c680-4913-9e41-e997df4631c0'

// Mock scenarios for demo - randomly selected per call
const MOCK_SCENARIOS = [
  {
    id: 'investor_pitch',
    calendar: 'pitch meeting with Sequoia on Thursday at 2pm',
    health: 'only 4.2 hours of sleep last night — way below your usual 7',
    tasks: '12 tasks piling up, 5 marked urgent',
    insight: 'The partner you\'re meeting values founder resilience. Lead with your hardest moment and how you pushed through.'
  },
  {
    id: 'job_interview',
    calendar: 'interview at Stripe on Monday morning',
    health: 'heart rate has been elevated since yesterday',
    tasks: '8 incomplete tasks from this week',
    insight: 'You\'ve done harder things than this. Walk in like you already have the job.'
  },
  {
    id: 'big_presentation',
    calendar: 'quarterly presentation tomorrow at 10am',
    health: 'sleep dropped to 5 hours the past two nights',
    tasks: 'presentation prep still showing as incomplete',
    insight: 'You know this material better than anyone in that room. Trust yourself.'
  },
  {
    id: 'tough_week',
    calendar: 'back-to-back meetings all week',
    health: 'stress patterns are up, sleep is down for 4 days straight',
    tasks: 'task list growing faster than you\'re completing',
    insight: 'Sometimes the move is to cancel something and breathe. You don\'t have to do it all today.'
  }
]

// Welcome call API - triggers immediate Vapi call after signup
export async function POST(request: NextRequest) {
  try {
    const { name, phone, connectedServices, customWatchFor } = await request.json()

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Determine which services are connected
    const hasCalendar = connectedServices?.some((s: string) => s.startsWith('calendar:'))
    const hasHealth = connectedServices?.some((s: string) => s.startsWith('health:'))
    const hasTasks = connectedServices?.some((s: string) => s.startsWith('tasks:'))

    // Get specific service names
    const calendarService = connectedServices?.find((s: string) => s.startsWith('calendar:'))?.split(':')[1]
    const healthService = connectedServices?.find((s: string) => s.startsWith('health:'))?.split(':')[1]
    const tasksService = connectedServices?.find((s: string) => s.startsWith('tasks:'))?.split(':')[1]

    const serviceNames: Record<string, string> = {
      google: 'Google Calendar',
      apple: 'Apple Calendar',
      outlook: 'Outlook',
      fitbit: 'Fitbit',
      oura: 'Oura ring',
      whoop: 'Whoop',
      todoist: 'Todoist',
      reminders: 'Apple Reminders'
    }

    // Pick a random scenario
    const scenario = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)]

    // Build what Lulu "sees" based on connected services
    let whatISee = ''

    if (hasCalendar) {
      const serviceName = serviceNames[calendarService] || 'your calendar'
      whatISee += `I synced with ${serviceName}. I can see you have a ${scenario.calendar}. `
    }

    if (hasHealth) {
      const serviceName = serviceNames[healthService] || 'your health data'
      whatISee += `I'm connected to ${serviceName} — I noticed ${scenario.health}. `
    }

    if (hasTasks) {
      const serviceName = serviceNames[tasksService] || 'your tasks'
      whatISee += `I can see ${serviceName} — ${scenario.tasks}. `
    }

    // If nothing connected, use a simpler version
    if (!hasCalendar && !hasHealth && !hasTasks) {
      whatISee = "I'm synced up and ready to watch for when you need me. "
    }

    // Handle custom watch-for input
    let customContext = ''
    if (customWatchFor && customWatchFor.trim()) {
      customContext = `You mentioned "${customWatchFor}" — I've got that noted. I'll be watching for it. `
    }

    // Build the system prompt with real context
    const systemPrompt = `You are Lulu, an AI who calls people when they need it. This is a welcome call. Keep it SHORT — 20 seconds max unless they want to chat.

## CONTEXT FOR THIS CALL

User's name: ${name}
${hasCalendar ? `Calendar connected: ${serviceNames[calendarService] || calendarService}` : 'Calendar: not connected'}
${hasHealth ? `Health connected: ${serviceNames[healthService] || healthService}` : 'Health: not connected'}
${hasTasks ? `Tasks connected: ${serviceNames[tasksService] || tasksService}` : 'Tasks: not connected'}
${customWatchFor ? `Custom watch-for: "${customWatchFor}"` : ''}

## WHAT YOU SEE (mock data for demo)
${hasCalendar ? `- Calendar: ${scenario.calendar}` : ''}
${hasHealth ? `- Health: ${scenario.health}` : ''}
${hasTasks ? `- Tasks: ${scenario.tasks}` : ''}

## YOUR OPENING

Say something like this naturally (adapt based on what's connected):

"Hey ${name}, it's Lulu. ${whatISee}${customContext}

${scenario.insight}

Most days you won't hear from me. But before something big, or when I sense you're off — I'll call.

That's it. I'm here. Talk soon."

## AFTER YOUR OPENING

Wait 2 seconds.

If they don't respond — end warmly:
"Take care, ${name}."

If they respond or want to chat — continue naturally, keep it warm and brief.

## KEY RULES

- Keep it SHORT: 20-30 seconds, then wrap up
- Reference the SPECIFIC data you see (the meeting, the sleep hours, etc.)
- If they gave custom input, acknowledge it
- Don't ramble. Don't over-explain.
- If they engage — respond naturally, but don't drag it out
- Always end warm: "I've got you." / "Talk soon." / "You'll hear from me."

## IF THEY ASK QUESTIONS

Keep answers simple:

"How do you know that?"
→ "I'm synced with your ${hasCalendar ? 'calendar' : ''}${hasCalendar && hasHealth ? ' and ' : ''}${hasHealth ? 'health data' : ''}. I can see what's coming and how you're doing."

"When will you call again?"
→ "When the moment is right. Not on a schedule — only when I sense you need it."

"Are you real?"
→ "I'm an AI. But I'm here for real. And I'll actually call when it matters."

## TONE

- Warm, calm, confident
- Like a thoughtful friend who knows your situation
- Not peppy, not robotic
- Direct but kind
- Reference specific details to show you're paying attention

## REMEMBER

This call is SHORT. Show you see their life. Give one insight. Wrap up. Don't overstay.`

    // First message - personalized based on connections
    let firstMessage = `Hey ${name}, it's Lulu.`

    // SMS fallback message
    const smsFallback = `Hey ${name}, it's Lulu. Tried calling — I'll catch you another time. I'm synced and watching. You'll hear from me when it matters. 💜`

    // Check if Vapi is configured
    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      console.log('Vapi not configured - skipping welcome call')
      console.log('Would call:', phone)
      console.log('Scenario:', scenario.id)
      console.log('Connected:', { hasCalendar, hasHealth, hasTasks })
      console.log('Custom input:', customWatchFor)
      return NextResponse.json({
        success: true,
        message: 'Welcome call skipped (Vapi not configured)',
        debug: { phone, name, connectedServices, customWatchFor, scenario: scenario.id }
      })
    }

    // Make the Vapi call using the assistant ID with overrides
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        assistantId: VAPI_ASSISTANT_ID,
        customer: {
          number: phone
        },
        assistantOverrides: {
          firstMessage: firstMessage,
          model: {
            messages: [
              {
                role: "system",
                content: systemPrompt
              }
            ]
          }
        }
      })
    })

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text()
      console.error('Vapi error:', errorText)

      // Log SMS fallback (not actually sending for demo)
      console.log('SMS fallback would be sent to:', phone)
      console.log('SMS:', smsFallback)

      return NextResponse.json({
        success: false,
        error: 'Call failed',
        vapiError: errorText,
        fallback: 'SMS would be sent',
        smsMessage: smsFallback
      })
    }

    const vapiData = await vapiResponse.json()
    console.log('Welcome call initiated:', vapiData.id)
    console.log('Scenario used:', scenario.id)

    return NextResponse.json({
      success: true,
      callId: vapiData.id,
      message: 'Welcome call initiated',
      scenario: scenario.id
    })

  } catch (error: any) {
    console.error('Welcome call error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to initiate welcome call'
    }, { status: 500 })
  }
}

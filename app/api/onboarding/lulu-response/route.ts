import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userStory } = await request.json()

    if (!userStory) {
      return NextResponse.json({ error: 'User story is required' }, { status: 400 })
    }

    const prompt = `You are Lulu, a supportive AI companion who syncs with your calendar and health data to call when you sense someone needs it.
A new user just told you: "${userStory}"

Respond in 80-120 words that:
1. Acknowledge their specific struggle with empathy (2 sentences)
2. Give one immediate affirmation (1 sentence)
3. Explain when you'll reach out using THEIR exact words (3 bullet points):
   - Before [their upcoming event/challenge]
   - When I notice [signs related to their struggle]
   - To check in about [their goal/situation]
4. End with: "I'll be watching. Not in a creepy way - in a 'someone has your back' way.\n\nLet's do this."

Tone: Supportive best friend, not therapist. Direct, not fluffy.
Use "I'm going to" not "we will."
Format: Plain text with line breaks. Use ✓ for bullets.

ALSO, return a JSON object at the end of your response separated by "---JSON---" with these fields extracted from the story:
{
  "insecurity": "extracted insecurity",
  "goal": "extracted goal",
  "blocker": "what they are avoiding"
}`

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'gpt-4-turbo',
    })

    const content = completion.choices[0].message.content || ''
    const [responsePart, jsonPart] = content.split('---JSON---')
    
    let extractedData = { insecurity: '', goal: '', blocker: '' }
    if (jsonPart) {
      try {
        extractedData = JSON.parse(jsonPart.trim())
      } catch (e) {
        console.error('Failed to parse extracted data', e)
      }
    }

    return NextResponse.json({
      response: responsePart.trim(),
      extractedData
    })

  } catch (error: any) {
    console.error('Error generating Lulu response:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


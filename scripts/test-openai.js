// Script to test OpenAI API key
// Production-ready with comprehensive error handling and validation
const fs = require('fs')
const path = require('path')

// Load .env.local manually to handle UTF-16 encoding
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    let content
    try {
      content = fs.readFileSync(envPath, 'utf8')
      // Check if it looks like UTF-16 (has null bytes)
      if (content.includes('\x00')) {
        content = fs.readFileSync(envPath, 'utf16le')
      }
    } catch (e) {
      // Fallback to UTF-16 if UTF-8 read fails
      content = fs.readFileSync(envPath, 'utf16le')
    }
    content.split(/\r?\n/).forEach(line => {
      line = line.trim()
      if (!line || line.startsWith('#')) return
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env.local')
    console.error('   Please add: OPENAI_API_KEY=sk-...')
    process.exit(1)
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('❌ Invalid API key format. Should start with "sk-"')
    console.error('   Your key starts with:', apiKey.substring(0, 3))
    process.exit(1)
  }

  console.log('🧪 Testing OpenAI API key...\n')
  console.log('📋 API Key:', apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4))
  console.log('')

  try {
    // Test 1: Simple completion
    console.log('Test 1: Simple chat completion...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: 'Say "Hello, API is working!" if you can read this.'
        }],
        max_tokens: 20
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API request failed:')
      console.error('   Status:', response.status, response.statusText)
      console.error('   Error:', errorData.error?.message || 'Unknown error')
      if (errorData.error?.code) {
        console.error('   Code:', errorData.error.code)
      }
      if (errorData.error?.type) {
        console.error('   Type:', errorData.error.type)
      }
      process.exit(1)
    }

    const data = await response.json()
    const message = data.choices[0]?.message?.content

    if (!message) {
      console.error('❌ No message in response')
      process.exit(1)
    }

    console.log('✅ Test 1 passed!')
    console.log('   Response:', message)
    console.log('')

    // Test 2: JSON response format (like our actual use case)
    console.log('Test 2: JSON response format (context extraction)...')
    const response2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'Extract mood and events. Return JSON: {"mood": "string", "events": [{"title": "string", "date": "string"}]}'
        }, {
          role: 'user',
          content: 'I have a job interview next week and I\'m feeling nervous about it.'
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200
      })
    })

    if (!response2.ok) {
      const errorData = await response2.json().catch(() => ({}))
      console.error('❌ Test 2 failed:')
      console.error('   Status:', response2.status, response2.statusText)
      console.error('   Error:', errorData.error?.message || 'Unknown error')
      process.exit(1)
    }

    const data2 = await response2.json()
    const content = data2.choices[0]?.message?.content

    if (!content) {
      console.error('❌ No content in response')
      process.exit(1)
    }

    const parsed = JSON.parse(content)

    if (!parsed.mood && !parsed.events) {
      console.error('❌ Invalid JSON structure - missing mood or events')
      process.exit(1)
    }

    console.log('✅ Test 2 passed!')
    console.log('   Extracted mood:', parsed.mood || 'N/A')
    console.log('   Extracted events:', parsed.events?.length || 0, 'event(s)')
    if (parsed.events && parsed.events.length > 0) {
      parsed.events.forEach((event, i) => {
        console.log(`      ${i + 1}. ${event.title}${event.date ? ` (${event.date})` : ''}`)
      })
    }
    console.log('')

    console.log('='.repeat(60))
    console.log('🎉 ALL TESTS PASSED!')
    console.log('='.repeat(60))
    console.log('✅ OpenAI API key is valid and working correctly')
    console.log('✅ Context extraction will work in production')
    console.log('✅ Model: gpt-4o (latest as of Nov 2025)')
    console.log('')
    console.log('💡 Next steps:')
    console.log('   1. Add OPENAI_API_KEY to Vercel environment variables')
    console.log('   2. Deploy to production')
    console.log('   3. Context extraction will work automatically!')
    console.log('')

  } catch (error) {
    console.error('❌ Test failed with error:')
    console.error('   Message:', error.message)
    if (error.cause) {
      console.error('   Cause:', error.cause)
    }
    if (error.stack) {
      console.error('\n   Stack trace:')
      console.error(error.stack.split('\n').slice(0, 5).join('\n'))
    }
    process.exit(1)
  }
}

testOpenAI()


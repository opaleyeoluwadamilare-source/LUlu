/**
 * Check assistant configuration to see base system prompt
 */

require('dotenv').config({ path: '.env.local' })

const VAPI_API_URL = 'https://api.vapi.ai'
const VAPI_API_KEY = process.env.VAPI_API_KEY
const ASSISTANT_ID = process.env.VAPI_LULU_ASSISTANT_ID || '5a1207cc-c680-4913-9e41-e997df4631c0'

async function checkAssistant() {
  try {
    console.log('🔍 Checking assistant configuration...\n')
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
      console.log('❌ Error:', JSON.stringify(error, null, 2))
      return
    }
    
    const assistant = await response.json()
    
    console.log('📋 Assistant Configuration:')
    console.log(`   Name: ${assistant.name || 'N/A'}`)
    console.log(`   ID: ${assistant.id}\n`)
    
    console.log('🤖 Model Configuration:')
    if (assistant.model) {
      console.log(`   Provider: ${assistant.model.provider || 'N/A'}`)
      console.log(`   Model: ${assistant.model.model || 'N/A'}`)
      console.log(`   Temperature: ${assistant.model.temperature || 'N/A'}`)
      
      // Check for system prompt in different possible locations
      const systemPrompt = assistant.model.systemPrompt || 
                          assistant.model.messages?.[0]?.content ||
                          assistant.systemPrompt ||
                          'N/A'
      
      console.log('\n📝 Base System Prompt:')
      console.log('━'.repeat(60))
      console.log(systemPrompt)
      console.log('━'.repeat(60))
    }
    
    console.log('\n💬 First Message:')
    console.log(`   ${assistant.firstMessage || 'N/A'}\n`)
    
    console.log('🎤 Voice:')
    if (assistant.voice) {
      console.log(`   Provider: ${assistant.voice.provider || 'N/A'}`)
      console.log(`   Voice ID: ${assistant.voice.voiceId || 'N/A'}\n`)
    }
    
    console.log('⚠️  ISSUE IDENTIFIED:')
    console.log('   The assistant has a BASE system prompt that might be')
    console.log('   conflicting with or overriding the assistantOverrides.')
    console.log('   When using assistantOverrides, VAPI might be MERGING')
    console.log('   the base prompt with the override instead of REPLACING it.\n')
    
    console.log('💡 SOLUTION:')
    console.log('   Option 1: Clear/update the assistant base system prompt')
    console.log('   Option 2: Use systemPrompt in assistantOverrides instead of messages')
    console.log('   Option 3: Use inline config (without assistant ID) for custom prompts\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

checkAssistant()


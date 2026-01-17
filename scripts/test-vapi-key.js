/**
 * Test if the Vapi API key is valid and can make calls
 */

require('dotenv').config()

const VAPI_API_URL = 'https://api.vapi.ai'
const VAPI_API_KEY = process.env.VAPI_API_KEY || '9ca42d5e-7f94-4cc3-9b07-bb94e1183439'

async function testVapiKey() {
  console.log('🔍 Testing Vapi API Key\n')
  console.log('='.repeat(60))
  console.log(`Key format: ${VAPI_API_KEY.substring(0, 20)}...`)
  console.log(`Key length: ${VAPI_API_KEY.length} characters`)
  console.log(`Key type: ${VAPI_API_KEY.startsWith('vapi_') ? 'Private Key (✅ Correct)' : VAPI_API_KEY.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'UUID (⚠️  Likely Public Key)' : 'Unknown format'}`)
  console.log('')
  
  // Test 1: Try to list assistants (requires valid API key)
  console.log('📋 Test 1: Listing assistants...')
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { raw: responseText }
    }
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.status === 401) {
      console.log('   ❌ UNAUTHORIZED - Key is invalid or expired')
      console.log('   Response:', data)
      console.log('\n   🔧 SOLUTION:')
      console.log('   1. Go to: https://dashboard.vapi.ai/settings/api-keys')
      console.log('   2. Find your PRIVATE API key (not public key)')
      console.log('   3. Private keys usually start with "vapi_" or are longer')
      console.log('   4. Copy the PRIVATE key (not the UUID/public key)')
      console.log('   5. Update VAPI_API_KEY in Vercel environment variables')
      return false
    } else if (response.status === 200) {
      console.log('   ✅ SUCCESS - Key is valid!')
      if (Array.isArray(data)) {
        console.log(`   Found ${data.length} assistant(s)`)
      }
      return true
    } else if (response.status === 403) {
      console.log('   ⚠️  FORBIDDEN - Key exists but lacks permissions')
      console.log('   This might be a public key (UUID) instead of private key')
      console.log('\n   🔧 SOLUTION:')
      console.log('   You need the PRIVATE API key, not the public key')
      console.log('   Get it from: https://dashboard.vapi.ai/settings/api-keys')
      return false
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`)
      console.log('   Response:', data)
      return false
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    return false
  }
}

testVapiKey()
  .then(success => {
    if (success) {
      console.log('\n✅ API key test passed!')
      console.log('   Your key should work for making calls.')
    } else {
      console.log('\n❌ API key test failed!')
      console.log('   Calls will not work until you fix the API key.')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })


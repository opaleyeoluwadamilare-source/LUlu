/**
 * Check Vapi configuration and test if calls can actually be made
 */

require('dotenv').config()

async function checkVapiConfig() {
  console.log('🔍 Checking Vapi Configuration\n')
  console.log('='.repeat(60))
  
  const issues = []
  const checks = []
  
  // Check VAPI_API_KEY
  if (!process.env.VAPI_API_KEY) {
    issues.push('❌ VAPI_API_KEY is NOT set in environment variables')
  } else {
    checks.push(`✅ VAPI_API_KEY is set (${process.env.VAPI_API_KEY.substring(0, 10)}...)`)
    
    // Test if it's valid by making a test API call
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 401) {
        issues.push('❌ VAPI_API_KEY is INVALID (401 Unauthorized)')
      } else if (response.status === 200 || response.status === 404) {
        checks.push('✅ VAPI_API_KEY is valid (API accepted the key)')
      } else {
        issues.push(`⚠️  VAPI_API_KEY test returned status ${response.status}`)
      }
    } catch (error) {
      issues.push(`❌ Error testing VAPI_API_KEY: ${error.message}`)
    }
  }
  
  // Check VAPI_LULU_ASSISTANT_ID
  if (!process.env.VAPI_LULU_ASSISTANT_ID) {
    issues.push('⚠️  VAPI_LULU_ASSISTANT_ID is NOT set (will use inline config fallback)')
  } else {
    checks.push(`✅ VAPI_LULU_ASSISTANT_ID is set (${process.env.VAPI_LULU_ASSISTANT_ID})`)
  }
  
  // Check VAPI_PHONE_NUMBER_ID
  if (!process.env.VAPI_PHONE_NUMBER_ID) {
    issues.push('⚠️  VAPI_PHONE_NUMBER_ID is NOT set (will use default)')
  } else {
    checks.push(`✅ VAPI_PHONE_NUMBER_ID is set (${process.env.VAPI_PHONE_NUMBER_ID})`)
  }
  
  // Check VAPI_VOICE_ID (for fallback)
  if (!process.env.VAPI_VOICE_ID) {
    issues.push('⚠️  VAPI_VOICE_ID is NOT set (will use default)')
  } else {
    checks.push(`✅ VAPI_VOICE_ID is set (${process.env.VAPI_VOICE_ID})`)
  }
  
  // Check OPENAI_API_KEY (required for calls)
  if (!process.env.OPENAI_API_KEY) {
    issues.push('❌ OPENAI_API_KEY is NOT set (REQUIRED - calls will fail!)')
  } else {
    checks.push(`✅ OPENAI_API_KEY is set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)`)
  }
  
  // Check NEXT_PUBLIC_SITE_URL (for webhooks)
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    issues.push('⚠️  NEXT_PUBLIC_SITE_URL is NOT set (webhooks might not work)')
  } else {
    checks.push(`✅ NEXT_PUBLIC_SITE_URL is set (${process.env.NEXT_PUBLIC_SITE_URL})`)
  }
  
  console.log('\n✅ Configuration Checks:')
  checks.forEach(check => console.log(`   ${check}`))
  
  if (issues.length > 0) {
    console.log('\n❌ Issues Found:')
    issues.forEach(issue => console.log(`   ${issue}`))
    
    console.log('\n🔧 CRITICAL ISSUES TO FIX:')
    if (issues.some(i => i.includes('VAPI_API_KEY is NOT set'))) {
      console.log('   1. Add VAPI_API_KEY to Vercel environment variables')
      console.log('   2. Get it from: https://dashboard.vapi.ai/settings/api-keys')
    }
    if (issues.some(i => i.includes('OPENAI_API_KEY is NOT set'))) {
      console.log('   1. Add OPENAI_API_KEY to Vercel environment variables')
      console.log('   2. Get it from: https://platform.openai.com/api-keys')
    }
    
    return false
  } else {
    console.log('\n✅ All configuration checks passed!')
    return true
  }
}

checkVapiConfig()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })


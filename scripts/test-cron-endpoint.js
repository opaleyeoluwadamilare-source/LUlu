/**
 * Test the cron endpoint directly with all authentication methods
 * Uses CRON_SECRET provided as argument or environment variable
 */

const CRON_SECRET = process.argv[2] || process.env.CRON_SECRET || '5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.co'

async function testCronEndpoint() {
  console.log('🧪 Testing Cron Endpoint (All Authentication Methods)')
  console.log('='.repeat(60))
  console.log(`URL: ${SITE_URL}/api/calls/process`)
  console.log(`Secret: ${CRON_SECRET.substring(0, 20)}...`)
  console.log('='.repeat(60))
  console.log('')

  const testMethods = [
    {
      name: 'Method 1: Authorization Header (Bearer)',
      fetch: () => fetch(`${SITE_URL}/api/calls/process`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      }),
    },
    {
      name: 'Method 2: Authorization Header (lowercase bearer)',
      fetch: () => fetch(`${SITE_URL}/api/calls/process`, {
        method: 'GET',
        headers: {
          'authorization': `bearer ${CRON_SECRET}`,
        },
      }),
    },
    {
      name: 'Method 3: Query Parameter (secret)',
      fetch: () => fetch(`${SITE_URL}/api/calls/process?secret=${CRON_SECRET}`, {
        method: 'GET',
      }),
    },
    {
      name: 'Method 4: Query Parameter (token)',
      fetch: () => fetch(`${SITE_URL}/api/calls/process?token=${CRON_SECRET}`, {
        method: 'GET',
      }),
    },
    {
      name: 'Method 5: X-API-Key Header',
      fetch: () => fetch(`${SITE_URL}/api/calls/process`, {
        method: 'GET',
        headers: {
          'X-API-Key': CRON_SECRET,
        },
      }),
    },
  ]

  let successCount = 0
  let failCount = 0
  let firstSuccessData = null

  for (const test of testMethods) {
    try {
      console.log(`Testing: ${test.name}`)
      const response = await test.fetch()
      const status = response.status
      const data = await response.json()
      
      if (response.ok) {
        console.log(`   ✅ SUCCESS (${status})`)
        successCount++
        if (!firstSuccessData) {
          firstSuccessData = data
        }
      } else {
        console.log(`   ❌ FAILED (${status})`)
        console.log(`   Error: ${data.error || 'Unknown'}`)
        failCount++
      }
      console.log('')
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`)
      failCount++
      console.log('')
    }
  }

  console.log('='.repeat(60))
  console.log(`Results: ${successCount} passed, ${failCount} failed`)
  console.log('='.repeat(60))
  console.log('')

  if (successCount > 0) {
    console.log('✅ At least one authentication method works!')
    console.log('   The cron endpoint is accessible.')
    console.log('')
    console.log('Response from successful call:')
    console.log(JSON.stringify(firstSuccessData, null, 2))
    console.log('')
    
    // Analyze results
    if (firstSuccessData.queued > 0) {
      console.log(`📞 Queued ${firstSuccessData.queued} customer(s) for calls`)
    }
    if (firstSuccessData.processed > 0) {
      console.log(`⚙️  Processed ${firstSuccessData.processed} call(s) from queue`)
      console.log(`   ✅ Succeeded: ${firstSuccessData.succeeded || 0}`)
      console.log(`   ❌ Failed: ${firstSuccessData.failed || 0}`)
    }
    if (firstSuccessData.executionTimeMs) {
      console.log(`⏱️  Execution time: ${firstSuccessData.executionTimeMs}ms`)
      if (firstSuccessData.executionTimeMs > 7000) {
        console.log('   ⚠️  Warning: Approaching timeout limit (8s)')
      }
    }
    console.log('')
    console.log('🎉 Cron job test successful!')
    return true
  } else {
    console.log('⚠️  All authentication methods failed!')
    console.log('')
    console.log('Possible issues:')
    console.log('  - CRON_SECRET mismatch in Vercel environment variables')
    console.log('  - Deployment not complete (wait 2-3 minutes)')
    console.log('  - Secret has extra spaces or characters')
    console.log('  - Environment variable not set for Production')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Check Vercel Dashboard → Settings → Environment Variables')
    console.log('  2. Verify CRON_SECRET matches exactly (no spaces)')
    console.log('  3. Ensure it\'s set for "Production" environment')
    console.log('  4. Wait for deployment to complete')
    console.log('  5. Check Vercel function logs for debug output')
    return false
  }
}

testCronEndpoint()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

/**
 * Debug script to see exactly why calls are being skipped
 * This will help identify the issue
 */

const CRON_SECRET = process.env.CRON_SECRET || '5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.co'

async function debugScheduling() {
  console.log('🔍 Debugging Call Scheduling')
  console.log('='.repeat(60))
  console.log('')
  
  console.log('Current Time:', new Date().toISOString())
  console.log('')
  
  console.log('Testing cron endpoint with detailed logging...')
  console.log('')
  
  try {
    const response = await fetch(`${SITE_URL}/api/calls/process?secret=${CRON_SECRET}`)
    const data = await response.json()
    
    console.log('Response:', JSON.stringify(data, null, 2))
    console.log('')
    
    if (data.skipped > 0) {
      console.log(`⚠️  ${data.skipped} call(s) were skipped`)
      console.log('')
      console.log('This means:')
      console.log('  - Customers were found in the query')
      console.log('  - But their scheduled time is more than 5 minutes away')
      console.log('  - So they were NOT queued (correct behavior with our fix)')
      console.log('')
      console.log('The issue: If cron only runs every hour, and a call is scheduled')
      console.log('for 7:00 AM, but cron runs at 6:00 AM, it will skip it.')
      console.log('Then if cron doesn\'t run again until 8:00 AM, the call is missed!')
      console.log('')
      console.log('SOLUTION: Cron MUST run every 15-30 minutes to catch all calls!')
      console.log('')
    }
    
    if (data.queued === 0 && data.processed === 0) {
      console.log('❌ No calls queued or processed')
      console.log('')
      console.log('Possible reasons:')
      console.log('  1. Cron is not running frequently enough (needs every 15-30 min)')
      console.log('  2. Calls are scheduled for future times (normal)')
      console.log('  3. Customers don\'t have next_call_scheduled_at set')
      console.log('  4. Customers already called today (last_call_date = today)')
      console.log('  5. Phone not validated (phone_validated = false)')
      console.log('')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  console.log('='.repeat(60))
  console.log('')
  console.log('🔧 IMMEDIATE ACTION REQUIRED:')
  console.log('')
  console.log('1. Check cron-job.org:')
  console.log('   - Is the cron actually running?')
  console.log('   - What frequency is it set to?')
  console.log('   - Check execution history')
  console.log('')
  console.log('2. If cron is running once per day:')
  console.log('   - This is the problem!')
  console.log('   - Change it to run every 15-30 minutes')
  console.log('   - This is CRITICAL for the timing fix to work')
  console.log('')
  console.log('3. Check Vercel logs for:')
  console.log('   - "Skipping customer X: call scheduled for..." messages')
  console.log('   - These show which calls are being skipped and why')
  console.log('')
}

debugScheduling()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


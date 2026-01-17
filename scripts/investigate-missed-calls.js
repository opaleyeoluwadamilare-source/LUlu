/**
 * Investigate why specific customers weren't called
 * Checks admin dashboard, scheduling, and partner status
 */

const CRON_SECRET = process.env.CRON_SECRET || '5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.co'

async function investigateMissedCalls() {
  console.log('🔍 INVESTIGATING MISSED CALLS')
  console.log('='.repeat(60))
  console.log('')
  
  // 1. Test cron endpoint and check response
  console.log('1️⃣  Testing Cron Endpoint...')
  try {
    const response = await fetch(`${SITE_URL}/api/calls/process?secret=${CRON_SECRET}`)
    const data = await response.json()
    
    console.log(`   Status: ${response.status}`)
    console.log(`   Queued: ${data.queued}`)
    console.log(`   Processed: ${data.processed}`)
    console.log(`   Skipped: ${data.skipped}`)
    console.log('')
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    console.log('')
  }
  
  // 2. Check customers via admin endpoint (if accessible)
  console.log('2️⃣  Checking Customer Data...')
  console.log('   (Note: Admin endpoint requires authentication)')
  console.log('   To check manually:')
  console.log('   1. Go to https://bedelulu.co/admin')
  console.log('   2. Login with password')
  console.log('   3. Check customer list for:')
  console.log('      - Akin')
  console.log('      - Other 2 customers')
  console.log('')
  
  // 3. Check specific customer issues
  console.log('3️⃣  Investigating Specific Issues...')
  console.log('')
  console.log('   ❓ Akin - Welcome Call & Daily Call:')
  console.log('      - Check if payment_status = "Partner"')
  console.log('      - Check if phone_validated = true')
  console.log('      - Check if welcome_call_completed = false (for welcome call)')
  console.log('      - Check if next_call_scheduled_at is set (for daily call)')
  console.log('      - Check if call_time_hour and call_time_minute are set')
  console.log('      - Check if call_status is not "disabled" or "paused"')
  console.log('')
  console.log('   ❓ Partner Status Check:')
  console.log('      - Verify partner customers are included in query')
  console.log('      - Check if payment_status IN ("Paid", "Partner")')
  console.log('')
  
  // 4. Check query logic
  console.log('4️⃣  Verifying Query Logic...')
  console.log('')
  console.log('   The query should include:')
  console.log('   ✅ payment_status IN ("Paid", "Partner")')
  console.log('   ✅ phone_validated = true')
  console.log('   ✅ call_status NOT IN ("disabled", "paused")')
  console.log('   ✅ For welcome: welcome_call_completed = false')
  console.log('   ✅ For daily: next_call_scheduled_at BETWEEN (4 hours ago, 20 min from now)')
  console.log('   ✅ For daily: last_call_date < CURRENT_DATE')
  console.log('')
  
  // 5. Common issues checklist
  console.log('5️⃣  Common Issues Checklist:')
  console.log('')
  console.log('   ❌ Phone not validated:')
  console.log('      - phone_validated = false')
  console.log('      - Check phone_validation_error field')
  console.log('')
  console.log('   ❌ Call time not set:')
  console.log('      - call_time_hour = NULL')
  console.log('      - call_time_minute = NULL')
  console.log('      - next_call_scheduled_at = NULL')
  console.log('')
  console.log('   ❌ Call scheduled for wrong time:')
  console.log('      - next_call_scheduled_at is in the future (tomorrow)')
  console.log('      - next_call_scheduled_at is more than 4 hours in the past')
  console.log('')
  console.log('   ❌ Already called today:')
  console.log('      - last_call_date = today')
  console.log('      - This prevents duplicate daily calls')
  console.log('')
  console.log('   ❌ Call status blocking:')
  console.log('      - call_status = "disabled"')
  console.log('      - call_status = "paused"')
  console.log('')
  console.log('   ❌ Partner status issue:')
  console.log('      - payment_status = "Partner" but query might not include it')
  console.log('      - Check if query uses: payment_status IN ("Paid", "Partner")')
  console.log('')
  
  // 6. Action items
  console.log('6️⃣  Action Items:')
  console.log('')
  console.log('   1. Check Admin Dashboard:')
  console.log('      - Go to https://bedelulu.co/admin')
  console.log('      - Find Akin and other customers')
  console.log('      - Check all fields listed above')
  console.log('')
  console.log('   2. Check Database Directly (if possible):')
  console.log('      - Query customers table')
  console.log('      - Check payment_status, phone_validated, call_status')
  console.log('      - Check next_call_scheduled_at times')
  console.log('')
  console.log('   3. Check Vercel Logs:')
  console.log('      - Look for "Skipping customer X" messages')
  console.log('      - Look for "Queued X call" messages')
  console.log('      - Look for any errors')
  console.log('')
  console.log('   4. Manual Test:')
  console.log('      - Use admin dashboard to trigger test call')
  console.log('      - Verify call goes through')
  console.log('')
  
  console.log('='.repeat(60))
}

investigateMissedCalls()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


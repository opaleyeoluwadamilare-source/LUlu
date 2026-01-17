/**
 * Diagnostic script to check why calls aren't happening
 */

const CRON_SECRET = process.env.CRON_SECRET || '5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bedelulu.co'

async function checkWhyNoCalls() {
  console.log('🔍 Diagnosing Why Calls Didn\'t Go Through Today')
  console.log('='.repeat(60))
  console.log('')
  
  console.log('1️⃣  Testing Cron Endpoint...')
  try {
    const response = await fetch(`${SITE_URL}/api/calls/process?secret=${CRON_SECRET}`)
    const data = await response.json()
    
    console.log(`   Status: ${response.status}`)
    console.log(`   Response:`, JSON.stringify(data, null, 2))
    console.log('')
    
    if (data.queued === 0 && data.processed === 0) {
      console.log('   ⚠️  No calls were queued or processed')
      console.log('   This could mean:')
      console.log('   - No customers are due for calls right now')
      console.log('   - Customers are scheduled for future times')
      console.log('   - There\'s an issue with the query')
      console.log('')
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    console.log('')
  }
  
  console.log('2️⃣  Checking Admin Dashboard Data...')
  try {
    // Try to get customer data from admin endpoint (if accessible)
    const adminResponse = await fetch(`${SITE_URL}/api/admin/customers`)
    if (adminResponse.ok) {
      const adminData = await adminResponse.json()
      console.log(`   ✅ Admin endpoint accessible`)
      console.log(`   Total customers: ${adminData.stats?.total || 'N/A'}`)
      console.log(`   Paid customers: ${adminData.stats?.paid || 'N/A'}`)
      console.log(`   Phone validated: ${adminData.stats?.phoneValidated || 'N/A'}`)
      console.log(`   Ready for calls: ${adminData.stats?.readyForCalls || 'N/A'}`)
      console.log(`   Scheduling issues: ${adminData.stats?.schedulingIssues || 'N/A'}`)
      console.log('')
      
      if (adminData.customers) {
        const paidCustomers = adminData.customers.filter(c => 
          ['Paid', 'Partner'].includes(c.payment_status)
        )
        console.log(`   Paid customers: ${paidCustomers.length}`)
        
        const readyCustomers = paidCustomers.filter(c => 
          c.phone_validated && 
          c.call_time_hour !== null && 
          c.next_call_scheduled_at
        )
        console.log(`   Customers with scheduling: ${readyCustomers.length}`)
        
        if (readyCustomers.length > 0) {
          console.log('')
          console.log('   Next scheduled calls:')
          readyCustomers.slice(0, 5).forEach(c => {
            const scheduled = c.next_call_scheduled_at ? new Date(c.next_call_scheduled_at) : null
            const now = new Date()
            const diff = scheduled ? scheduled.getTime() - now.getTime() : null
            const hoursAway = diff ? Math.round(diff / (1000 * 60 * 60)) : null
            
            console.log(`   - ${c.name}: ${scheduled ? scheduled.toISOString() : 'Not scheduled'}`)
            if (hoursAway !== null) {
              if (hoursAway < 0) {
                console.log(`     ⚠️  Was scheduled ${Math.abs(hoursAway)} hours ago (MISSED!)`)
              } else {
                console.log(`     ✅ Scheduled in ${hoursAway} hours`)
              }
            }
          })
        }
      }
    } else {
      console.log(`   ⚠️  Admin endpoint returned ${adminResponse.status}`)
      console.log('   (This is normal if not logged in)')
    }
    console.log('')
  } catch (error) {
    console.log(`   ⚠️  Could not access admin endpoint: ${error.message}`)
    console.log('')
  }
  
  console.log('3️⃣  Possible Issues:')
  console.log('')
  console.log('   ❓ Cron not running?')
  console.log('      - Check cron-job.org execution history')
  console.log('      - Verify cron is set to run every 15-30 minutes')
  console.log('      - Check if cron is enabled/active')
  console.log('')
  console.log('   ❓ Customers not scheduled?')
  console.log('      - Check if customers have next_call_scheduled_at set')
  console.log('      - Verify call_time_hour and call_time_minute are set')
  console.log('      - Check if welcome_call_completed is true for daily calls')
  console.log('')
  console.log('   ❓ Calls scheduled for future?')
  console.log('      - Calls are only queued when time arrives (correct behavior)')
  console.log('      - If scheduled for tomorrow, they won\'t queue until tomorrow')
  console.log('')
  console.log('   ❓ Timezone issues?')
  console.log('      - Verify customer timezones are correct')
  console.log('      - Check if next_call_scheduled_at is in UTC')
  console.log('')
  console.log('   ❓ Phone validation issues?')
  console.log('      - Calls only happen if phone_validated = true')
  console.log('      - Check phone_validation_error field')
  console.log('')
  
  console.log('4️⃣  Next Steps:')
  console.log('')
  console.log('   1. Check cron-job.org:')
  console.log('      - Go to https://cron-job.org')
  console.log('      - View execution history')
  console.log('      - Verify cron is running successfully')
  console.log('')
  console.log('   2. Check Vercel Logs:')
  console.log('      - Go to Vercel Dashboard → Your Project → Logs')
  console.log('      - Filter for /api/calls/process')
  console.log('      - Look for errors or skipped calls')
  console.log('')
  console.log('   3. Check Admin Dashboard:')
  console.log('      - Go to https://bedelulu.co/admin')
  console.log('      - View customer list')
  console.log('      - Check next_call_scheduled_at times')
  console.log('      - Look for scheduling issues')
  console.log('')
  console.log('   4. Manual Test:')
  console.log('      - Use admin dashboard to trigger a test call')
  console.log('      - Verify the call goes through')
  console.log('')
  
  console.log('='.repeat(60))
}

checkWhyNoCalls()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


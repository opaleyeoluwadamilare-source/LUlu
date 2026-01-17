/**
 * Diagnostic script to help troubleshoot cron authentication
 */

const CRON_SECRET = '5e56de398d9082edaabb4f7e1acdc9bfbb723252748f2e8082674a9b31054997'
const SITE_URL = 'https://bedelulu.co'

console.log('🔍 Cron Authentication Diagnostic')
console.log('='.repeat(60))
console.log('')

// Check secret format
console.log('1️⃣  Secret Format Check:')
console.log(`   Length: ${CRON_SECRET.length} characters`)
console.log(`   Has spaces: ${CRON_SECRET.includes(' ')}`)
console.log(`   Has newlines: ${CRON_SECRET.includes('\n')}`)
console.log(`   Starts with: "${CRON_SECRET.substring(0, 10)}..."`)
console.log(`   Ends with: "...${CRON_SECRET.substring(CRON_SECRET.length - 10)}"`)
console.log('')

// Expected header format
const expectedHeader = `Bearer ${CRON_SECRET}`
console.log('2️⃣  Expected Header Format:')
console.log(`   Full header: "Bearer ${CRON_SECRET.substring(0, 20)}...${CRON_SECRET.substring(CRON_SECRET.length - 10)}"`)
console.log(`   Length: ${expectedHeader.length} characters`)
console.log('')

// Test different header formats
console.log('3️⃣  Testing Different Header Formats:')
const formats = [
  { name: 'Standard', header: `Bearer ${CRON_SECRET}` },
  { name: 'With space before Bearer', header: ` Bearer ${CRON_SECRET}` },
  { name: 'With space after Bearer', header: `Bearer  ${CRON_SECRET}` },
  { name: 'Lowercase bearer', header: `bearer ${CRON_SECRET}` },
  { name: 'Uppercase BEARER', header: `BEARER ${CRON_SECRET}` },
]

formats.forEach(format => {
  const trimmed = format.header.trim()
  const matches = trimmed === expectedHeader.trim()
  console.log(`   ${matches ? '✅' : '❌'} ${format.name}: ${matches ? 'MATCHES' : 'DOES NOT MATCH'}`)
  if (!matches) {
    console.log(`      Expected length: ${expectedHeader.trim().length}, Got: ${trimmed.length}`)
  }
})
console.log('')

// Instructions
console.log('4️⃣  Troubleshooting Steps:')
console.log('   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
console.log('   2. Find CRON_SECRET and click to view/edit')
console.log('   3. Copy the EXACT value (watch for spaces at start/end)')
console.log('   4. Compare with the secret above')
console.log('   5. Make sure it\'s set for "Production" environment')
console.log('   6. After updating, redeploy the project')
console.log('')
console.log('5️⃣  Test Command:')
console.log(`   $headers = @{ "Authorization" = "Bearer ${CRON_SECRET}" }`)
console.log(`   Invoke-RestMethod -Uri "${SITE_URL}/api/calls/process" -Method GET -Headers $headers`)
console.log('')


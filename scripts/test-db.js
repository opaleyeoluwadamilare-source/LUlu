// Test database connection via API endpoint
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  try {
    console.log('🔄 Testing database connection via API...\n')
    console.log('📝 Make sure your dev server is running (npm run dev)\n')
    
    const fetch = (await import('node-fetch')).default
    
    // Wait a bit for server to be ready
    console.log('⏳ Waiting for server...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Test initialization endpoint
    const response = await fetch('http://localhost:3000/api/database/init', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ Database initialized successfully!')
      console.log('📊', data.message, '\n')
      console.log('✅ Database is ready to use!')
      process.exit(0)
    } else {
      throw new Error(data.error || data.message || 'Failed to initialize')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\n💡 Make sure:')
    console.error('   1. Your dev server is running (npm run dev)')
    console.error('   2. EXTERNAL_DATABASE_URL is set in .env.local')
    console.error('   3. The database URL is correct\n')
    process.exit(1)
  }
}

testDatabase()


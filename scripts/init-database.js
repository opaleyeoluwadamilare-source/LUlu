// Script to initialize the database schema
// Run with: node scripts/init-database.js
// Make sure DATABASE_URL is set in your .env.local

require('dotenv').config({ path: '.env.local' })
const { getPool, initDatabase } = require('../lib/db')

async function main() {
  try {
    console.log('🔄 Initializing database...')
    await initDatabase()
    console.log('✅ Database initialized successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

main()


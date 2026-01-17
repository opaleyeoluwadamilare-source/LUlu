import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * EMERGENCY: Fix Theo from phone - just tap the URL
 * This will:
 * 1. Set welcome_call_completed = true
 * 2. Clear pending welcome calls from queue
 * 3. Prevent 5th duplicate call
 */
export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    console.log('🚨 EMERGENCY: Fixing Theo from phone...')
    
    // Step 1: Update customer record
    const customerUpdate = await pool.query(
      `UPDATE customers 
       SET welcome_call_completed = true,
           call_status = 'completed',
           total_calls_made = 4,
           updated_at = NOW()
       WHERE id = 7
       RETURNING id, name, welcome_call_completed, total_calls_made`,
      []
    )
    
    // Step 2: Clear queue
    const queueUpdate = await pool.query(
      `UPDATE call_queue 
       SET status = 'completed',
           updated_at = NOW()
       WHERE customer_id = 7 
         AND call_type = 'welcome'
         AND status IN ('pending', 'retrying')
       RETURNING id, call_type, status`,
      []
    )
    
    // Step 3: Verify
    const verification = await pool.query(
      `SELECT 
        welcome_call_completed,
        total_calls_made,
        call_status
       FROM customers 
       WHERE id = 7`,
      []
    )
    
    const fixed = verification.rows[0]?.welcome_call_completed === true
    
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Emergency Fix - Theo</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px; 
      background: ${fixed ? '#0a3d0a' : '#3d0a0a'}; 
      color: white;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { 
      font-size: 2em; 
      margin-bottom: 20px;
      text-align: center;
    }
    .status { 
      padding: 20px; 
      border-radius: 10px; 
      background: rgba(255,255,255,0.1); 
      margin: 20px 0;
      font-size: 1.2em;
    }
    .good { color: #00ff00; }
    .bad { color: #ff0000; }
    .section {
      margin: 15px 0;
      padding: 15px;
      background: rgba(0,0,0,0.3);
      border-radius: 5px;
    }
    .timestamp {
      color: #888;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>${fixed ? '✅' : '❌'} ${fixed ? 'THEO FIXED!' : 'FIX FAILED'}</h1>
  
  <div class="status">
    ${fixed ? 
      '<p class="good">✅ Theo will NOT get another duplicate call</p>' : 
      '<p class="bad">❌ Fix failed - try again or contact support</p>'
    }
  </div>

  <div class="section">
    <h3>Customer Update:</h3>
    <p>Rows updated: ${customerUpdate.rowCount}</p>
    ${customerUpdate.rows.length > 0 ? `
      <p>Name: ${customerUpdate.rows[0].name}</p>
      <p>Welcome completed: ${customerUpdate.rows[0].welcome_call_completed}</p>
      <p>Total calls: ${customerUpdate.rows[0].total_calls_made}</p>
    ` : '<p>No customer updated</p>'}
  </div>

  <div class="section">
    <h3>Queue Cleared:</h3>
    <p>Pending calls removed: ${queueUpdate.rowCount}</p>
    ${queueUpdate.rows.length > 0 ? `
      <p>Cleared: ${queueUpdate.rows.map(r => r.call_type).join(', ')}</p>
    ` : '<p>No pending calls found</p>'}
  </div>

  <div class="section">
    <h3>Verification:</h3>
    ${verification.rows.length > 0 ? `
      <p class="${fixed ? 'good' : 'bad'}">
        welcome_call_completed: ${verification.rows[0].welcome_call_completed}
      </p>
      <p>total_calls_made: ${verification.rows[0].total_calls_made}</p>
      <p>call_status: ${verification.rows[0].call_status}</p>
    ` : '<p class="bad">Could not verify - customer not found</p>'}
  </div>

  <div class="section">
    <p class="timestamp">Fixed at: ${new Date().toISOString()}</p>
  </div>

  ${fixed ? `
    <div class="status">
      <p><strong>What's Next:</strong></p>
      <ol>
        <li>Theo is safe from duplicate calls ✅</li>
        <li>Check Dipsy's status at: <a href="/api/check-dipsy" style="color: #00ffff">/api/check-dipsy</a></li>
        <li>Wait for all fixes to deploy</li>
        <li>Test system before launching to more users</li>
      </ol>
    </div>
  ` : ''}

</body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
    
  } catch (error: any) {
    console.error('❌ Emergency fix failed:', error)
    
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fix Failed</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px; 
      background: #3d0a0a; 
      color: white;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { color: #ff0000; text-align: center; }
    .error {
      padding: 20px;
      background: rgba(255,0,0,0.2);
      border-radius: 10px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>❌ Fix Failed</h1>
  <div class="error">
    <p><strong>Error:</strong> ${error.message}</p>
    <p>Please try again in 1 minute or contact support.</p>
  </div>
</body>
</html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

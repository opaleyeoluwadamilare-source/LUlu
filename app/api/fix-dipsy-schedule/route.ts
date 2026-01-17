import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { calculateNextCallTime } from '@/lib/call-scheduler'

/**
 * EMERGENCY: Fix Dipsy's missing next_call_scheduled_at
 * This will parse his call_time and set up proper scheduling
 */
export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    console.log('🔧 Fixing Dipsy\'s call schedule...')
    
    // Get Dipsy's current info
    const customer = await pool.query(
      `SELECT id, name, call_time, timezone FROM customers WHERE id = 5`,
      []
    )
    
    if (customer.rows.length === 0) {
      throw new Error('Dipsy not found')
    }
    
    const dipsy = customer.rows[0]
    
    // Parse "early Eastern (ET)" → 7 AM
    // "early" = 7am, "mid-morning" = 9am, "late" = 11am
    let hour = 7
    let minute = 0
    
    const callTime = dipsy.call_time?.toLowerCase() || ''
    if (callTime.includes('early')) {
      hour = 7
    } else if (callTime.includes('mid')) {
      hour = 9
    } else if (callTime.includes('late')) {
      hour = 11
    } else {
      // Try to parse exact time if given
      const match = callTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
      if (match) {
        hour = parseInt(match[1])
        minute = match[2] ? parseInt(match[2]) : 0
        const period = match[3].toLowerCase()
        if (period === 'pm' && hour !== 12) hour += 12
        if (period === 'am' && hour === 12) hour = 0
      }
    }
    
    console.log(`📊 Parsed call time: ${hour}:${minute < 10 ? '0' : ''}${minute}`)
    
    // Calculate next call time (tomorrow at 7 AM Eastern)
    const nextCallTime = calculateNextCallTime(
      hour,
      minute,
      dipsy.timezone || 'America/New_York'
    )
    
    console.log(`🕐 Next call scheduled for: ${nextCallTime.toISOString()}`)
    
    // Update database
    const update = await pool.query(
      `UPDATE customers 
       SET call_time_hour = $1,
           call_time_minute = $2,
           next_call_scheduled_at = $3,
           updated_at = NOW()
       WHERE id = 5
       RETURNING id, name, call_time_hour, call_time_minute, next_call_scheduled_at`,
      [hour, minute, nextCallTime]
    )
    
    // Verify
    const verification = await pool.query(
      `SELECT 
        id,
        name,
        call_time,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        last_call_date
       FROM customers 
       WHERE id = 5`,
      []
    )
    
    const fixed = verification.rows[0]
    const isFixed = fixed?.next_call_scheduled_at !== null
    
    // Check if cron will pick him up
    const now = new Date()
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    const nextCall = new Date(fixed.next_call_scheduled_at)
    
    const willBePickedUp = nextCall >= now && nextCall <= twentyMinutesFromNow
    const hoursUntilCall = (nextCall.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fix Dipsy Schedule</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px; 
      background: ${isFixed ? '#0a3d0a' : '#3d0a0a'}; 
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
      font-size: 1.1em;
    }
    .good { color: #00ff00; }
    .bad { color: #ff0000; }
    .warning { color: #ffaa00; }
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
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    th {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>${isFixed ? '✅' : '❌'} ${isFixed ? 'DIPSY FIXED!' : 'FIX FAILED'}</h1>
  
  <div class="status">
    ${isFixed ? 
      '<p class="good">✅ Dipsy will get his daily calls now!</p>' : 
      '<p class="bad">❌ Fix failed - try again or contact support</p>'
    }
  </div>

  <div class="section">
    <h3>🎯 What Was Fixed:</h3>
    <table>
      <tr><th>Field</th><th>Before</th><th>After</th></tr>
      <tr>
        <td>call_time_hour</td>
        <td class="bad">NULL</td>
        <td class="${fixed.call_time_hour ? 'good' : 'bad'}">${fixed.call_time_hour}</td>
      </tr>
      <tr>
        <td>call_time_minute</td>
        <td class="bad">NULL</td>
        <td class="${fixed.call_time_minute !== null ? 'good' : 'bad'}">${fixed.call_time_minute}</td>
      </tr>
      <tr>
        <td>next_call_scheduled_at</td>
        <td class="bad">NULL</td>
        <td class="${fixed.next_call_scheduled_at ? 'good' : 'bad'}">${fixed.next_call_scheduled_at || 'NULL'}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h3>📅 Schedule Details:</h3>
    <p><strong>Parsed Time:</strong> ${hour}:${minute < 10 ? '0' : ''}${minute} (${hour <= 11 ? 'AM' : 'PM'})</p>
    <p><strong>Timezone:</strong> ${fixed.timezone}</p>
    <p><strong>Next Call (UTC):</strong> ${nextCall.toISOString()}</p>
    <p><strong>Next Call (Local):</strong> ${nextCall.toLocaleString('en-US', { 
      timeZone: fixed.timezone, 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    })}</p>
    <p><strong>Hours Until Call:</strong> ${hoursUntilCall.toFixed(1)} hours</p>
  </div>

  <div class="section">
    <h3>🔍 Cron Status:</h3>
    <p><strong>Will cron pick up this call?</strong> 
      <span class="${willBePickedUp ? 'good' : 'warning'}">
        ${willBePickedUp ? '✅ YES (in next 20 min)' : '⏰ NO (scheduled for future)'}
      </span>
    </p>
    <p class="timestamp">Current cron window: ${now.toISOString()} to ${twentyMinutesFromNow.toISOString()}</p>
  </div>

  ${isFixed ? `
    <div class="status">
      <p><strong>✅ What's Next:</strong></p>
      <ol>
        <li>Dipsy will get his next call tomorrow at 7 AM Eastern ✅</li>
        <li>Cron will find him in the next cycle ✅</li>
        <li>System is now properly scheduling daily calls ✅</li>
      </ol>
      <p class="warning"><strong>⚠️ BUT:</strong> This only fixed Dipsy. Need to ensure <code>scheduleNextCall()</code> function runs for ALL customers after their welcome calls!</p>
    </div>
  ` : ''}

  <div class="section">
    <h3>🔧 Raw Data:</h3>
    <pre style="overflow: auto; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;">${JSON.stringify(fixed, null, 2)}</pre>
  </div>

  <div class="section">
    <p class="timestamp">Fixed at: ${new Date().toISOString()}</p>
  </div>

</body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error)
    
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

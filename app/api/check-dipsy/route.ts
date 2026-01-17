import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * URGENT: Check why Dipsy didn't get daily call this morning
 */
export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    console.log('🔍 Checking Dipsy (customer_id 5)...')
    
    // Get Dipsy's full status
    const customer = await pool.query(
      `SELECT 
        id,
        name,
        email,
        phone,
        payment_status,
        phone_validated,
        welcome_call_completed,
        last_call_date,
        next_call_scheduled_at,
        call_time,
        call_time_hour,
        call_time_minute,
        timezone,
        total_calls_made,
        call_status,
        created_at,
        updated_at
      FROM customers 
      WHERE id = 5`,
      []
    )
    
    if (customer.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dipsy not found' 
      })
    }
    
    const dipsy = customer.rows[0]
    
    // Get his call history
    const callHistory = await pool.query(
      `SELECT 
        id,
        call_type,
        status,
        vapi_call_id,
        duration_seconds,
        created_at
      FROM call_logs 
      WHERE customer_id = 5
      ORDER BY created_at DESC`,
      []
    )
    
    // Get his queue status
    const queueStatus = await pool.query(
      `SELECT 
        id,
        call_type,
        status,
        attempts,
        created_at,
        updated_at
      FROM call_queue 
      WHERE customer_id = 5
      ORDER BY created_at DESC`,
      []
    )
    
    // Calculate what should happen
    const now = new Date()
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)
    
    let analysis = {
      shouldGetDailyCall: false,
      reason: ''
    }
    
    if (!dipsy.welcome_call_completed) {
      analysis.reason = '❌ Welcome call not completed - still waiting for welcome call'
    } else if (!dipsy.next_call_scheduled_at) {
      analysis.reason = '❌ next_call_scheduled_at is NULL - no future call scheduled'
    } else {
      const nextCall = new Date(dipsy.next_call_scheduled_at)
      const today = now.toISOString().split('T')[0]
      const lastCallDate = dipsy.last_call_date ? new Date(dipsy.last_call_date).toISOString().split('T')[0] : null
      
      if (lastCallDate === today) {
        analysis.reason = '✅ Already got daily call today'
        analysis.shouldGetDailyCall = false
      } else if (nextCall < now) {
        analysis.reason = `⚠️ next_call_scheduled_at is in the PAST (${nextCall.toISOString()})`
        analysis.shouldGetDailyCall = true
      } else if (nextCall > twentyMinutesFromNow) {
        analysis.reason = `⏰ next_call_scheduled_at is in the FUTURE (${nextCall.toISOString()}) - outside cron window`
        analysis.shouldGetDailyCall = false
      } else {
        analysis.reason = `✅ next_call_scheduled_at is in the WINDOW (${nextCall.toISOString()})`
        analysis.shouldGetDailyCall = true
      }
    }
    
    // Return HTML for easy viewing
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Dipsy Investigation</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #00ff00; }
    h1 { color: #ff00ff; }
    h2 { color: #00ffff; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid #333; background: #0a0a0a; }
    .good { color: #00ff00; }
    .bad { color: #ff0000; }
    .warning { color: #ffaa00; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background: #333; }
    .timestamp { color: #888; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>🔍 Dipsy (Ola) Investigation</h1>
  <p class="timestamp">Checked at: ${now.toISOString()}</p>

  <div class="section">
    <h2>📊 Customer Status</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>ID</td><td>${dipsy.id}</td></tr>
      <tr><td>Name</td><td>${dipsy.name}</td></tr>
      <tr><td>Email</td><td>${dipsy.email}</td></tr>
      <tr><td>Phone</td><td>${dipsy.phone}</td></tr>
      <tr><td>Payment Status</td><td class="${dipsy.payment_status === 'Paid' ? 'good' : 'bad'}">${dipsy.payment_status}</td></tr>
      <tr><td>Phone Validated</td><td class="${dipsy.phone_validated ? 'good' : 'bad'}">${dipsy.phone_validated}</td></tr>
      <tr><td>Welcome Call Completed</td><td class="${dipsy.welcome_call_completed ? 'good' : 'bad'}">${dipsy.welcome_call_completed}</td></tr>
      <tr><td>Last Call Date</td><td>${dipsy.last_call_date || 'NULL'}</td></tr>
      <tr><td>Next Call Scheduled At</td><td class="${dipsy.next_call_scheduled_at ? 'good' : 'bad'}">${dipsy.next_call_scheduled_at || 'NULL'}</td></tr>
      <tr><td>Call Time</td><td>${dipsy.call_time || 'NULL'}</td></tr>
      <tr><td>Call Time Hour</td><td>${dipsy.call_time_hour || 'NULL'}</td></tr>
      <tr><td>Call Time Minute</td><td>${dipsy.call_time_minute || 'NULL'}</td></tr>
      <tr><td>Timezone</td><td>${dipsy.timezone || 'NULL'}</td></tr>
      <tr><td>Total Calls Made</td><td>${dipsy.total_calls_made}</td></tr>
      <tr><td>Call Status</td><td>${dipsy.call_status}</td></tr>
      <tr><td>Created At</td><td class="timestamp">${dipsy.created_at}</td></tr>
      <tr><td>Updated At</td><td class="timestamp">${dipsy.updated_at}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>🎯 Analysis</h2>
    <p><strong>Should Get Daily Call:</strong> <span class="${analysis.shouldGetDailyCall ? 'good' : 'bad'}">${analysis.shouldGetDailyCall ? 'YES' : 'NO'}</span></p>
    <p><strong>Reason:</strong> <span class="${analysis.reason.includes('✅') ? 'good' : analysis.reason.includes('❌') ? 'bad' : 'warning'}">${analysis.reason}</span></p>
    
    <h3>Cron Window:</h3>
    <p>Now: ${now.toISOString()}</p>
    <p>Cron looks for calls between: ${now.toISOString()} and ${twentyMinutesFromNow.toISOString()}</p>
    <p>Dipsy's next_call_scheduled_at: ${dipsy.next_call_scheduled_at || 'NULL'}</p>
  </div>

  <div class="section">
    <h2>📞 Call History (${callHistory.rows.length} calls)</h2>
    <table>
      <tr>
        <th>ID</th>
        <th>Type</th>
        <th>Status</th>
        <th>Vapi Call ID</th>
        <th>Duration</th>
        <th>Created At</th>
      </tr>
      ${callHistory.rows.map(call => `
        <tr>
          <td>${call.id}</td>
          <td>${call.call_type}</td>
          <td class="${call.status === 'completed' ? 'good' : call.status === 'failed' ? 'bad' : 'warning'}">${call.status}</td>
          <td>${call.vapi_call_id || 'NULL'}</td>
          <td>${call.duration_seconds ? `${call.duration_seconds}s` : 'NULL'}</td>
          <td class="timestamp">${call.created_at}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <h2>📋 Queue Status (${queueStatus.rows.length} entries)</h2>
    <table>
      <tr>
        <th>ID</th>
        <th>Type</th>
        <th>Status</th>
        <th>Attempts</th>
        <th>Created At</th>
        <th>Updated At</th>
      </tr>
      ${queueStatus.rows.map(item => `
        <tr>
          <td>${item.id}</td>
          <td>${item.call_type}</td>
          <td class="${item.status === 'completed' ? 'good' : item.status === 'failed' ? 'bad' : 'warning'}">${item.status}</td>
          <td>${item.attempts}</td>
          <td class="timestamp">${item.created_at}</td>
          <td class="timestamp">${item.updated_at}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <h2>💡 Diagnosis</h2>
    ${dipsy.next_call_scheduled_at ? `
      <p class="good">✅ next_call_scheduled_at is SET</p>
      <p>The system knows when to call Dipsy next.</p>
      ${analysis.shouldGetDailyCall ? 
        '<p class="warning">⚠️ He SHOULD be getting a call but isn\'t - check cron logs</p>' : 
        '<p class="good">System is working correctly - call scheduled for future or already happened today</p>'
      }
    ` : `
      <p class="bad">❌ next_call_scheduled_at is NULL</p>
      <p>This is the problem! After welcome call, system should have calculated and set next_call_scheduled_at.</p>
      <p><strong>Fix:</strong> Need to manually set next_call_scheduled_at or ensure scheduleNextCall() function runs.</p>
    `}
  </div>

  <div class="section">
    <h2>🔧 Raw Data (JSON)</h2>
    <pre>${JSON.stringify({
      customer: dipsy,
      callHistory: callHistory.rows,
      queueStatus: queueStatus.rows,
      analysis,
      cronWindow: {
        start: now.toISOString(),
        end: twentyMinutesFromNow.toISOString()
      }
    }, null, 2)}</pre>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
    
  } catch (error: any) {
    console.error('❌ Error checking Dipsy:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

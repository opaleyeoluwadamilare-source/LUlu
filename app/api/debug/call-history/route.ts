import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

/**
 * DEBUG ENDPOINT: View complete call history and logs
 * Shows exactly what calls happened, when, and their status
 * 
 * Usage: /api/debug/call-history?secret=xxx&customerId=5
 * Or: /api/debug/call-history?secret=xxx&email=dispzy73@gmail.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const customerId = searchParams.get('customerId')
    const email = searchParams.get('email')
    
    // Security check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    if (secret !== ADMIN_SECRET) {
      return new Response(
        buildHTML('🔒 Unauthorized', 'Invalid or missing admin secret.'),
        { status: 401, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    const pool = getPool()
    
    // Get customer info
    let customerQuery = ''
    let customerParams: any[] = []
    
    if (customerId) {
      customerQuery = 'WHERE id = $1'
      customerParams = [parseInt(customerId)]
    } else if (email) {
      customerQuery = 'WHERE email = $1'
      customerParams = [email]
    }
    
    const customerResult = await pool.query(
      `SELECT 
        id, name, email, phone, payment_status,
        phone_validated, welcome_call_completed,
        last_call_date, call_status, total_calls_made,
        call_time, call_time_hour, call_time_minute,
        timezone, next_call_scheduled_at,
        created_at, updated_at
      FROM customers 
      ${customerQuery}
      ORDER BY created_at DESC
      LIMIT 10`,
      customerParams
    )
    
    const customers = customerResult.rows
    
    if (customers.length === 0) {
      return new Response(
        buildHTML('❌ Not Found', 'No customers found with those criteria.'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    // Get call logs for these customers
    const customerIds = customers.map(c => c.id)
    
    const callLogsResult = await pool.query(
      `SELECT 
        cl.id,
        cl.customer_id,
        cl.call_type,
        cl.status,
        cl.vapi_call_id,
        cl.duration_seconds,
        cl.error_message,
        cl.created_at,
        c.name as customer_name,
        c.email as customer_email
      FROM call_logs cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE cl.customer_id = ANY($1)
      ORDER BY cl.created_at DESC
      LIMIT 50`,
      [customerIds]
    )
    
    const callLogs = callLogsResult.rows
    
    // Get call queue status
    const queueResult = await pool.query(
      `SELECT 
        cq.id,
        cq.customer_id,
        cq.call_type,
        cq.status,
        cq.attempts,
        cq.error_message,
        cq.scheduled_for,
        cq.created_at,
        cq.updated_at,
        c.name as customer_name,
        c.email as customer_email
      FROM call_queue cq
      JOIN customers c ON cq.customer_id = c.id
      WHERE cq.customer_id = ANY($1)
      ORDER BY cq.created_at DESC
      LIMIT 20`,
      [customerIds]
    )
    
    const queueItems = queueResult.rows
    
    // Build HTML response
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta charset="UTF-8">
        <title>Call History Debug - Admin</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
          }
          h1 {
            color: #2c3e50;
            margin-bottom: 10px;
          }
          h2 {
            color: #34495e;
            margin-top: 40px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
          }
          .timestamp {
            color: #95a5a6;
            font-size: 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #3498db;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 16px;
          }
          .summary-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #3498db;
          }
          .customer-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          .customer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #ecf0f1;
          }
          .customer-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            margin-left: 10px;
          }
          .badge.success {
            background: #d4edda;
            color: #155724;
          }
          .badge.warning {
            background: #fff3cd;
            color: #856404;
          }
          .badge.danger {
            background: #f8d7da;
            color: #721c24;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          .info-item {
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          .info-label {
            font-weight: 600;
            color: #7f8c8d;
            font-size: 13px;
          }
          .info-value {
            color: #2c3e50;
            font-size: 15px;
            margin-top: 5px;
          }
          .call-log-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .call-log-table th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          .call-log-table td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
          }
          .call-log-table tr:hover {
            background: #f8f9fa;
          }
          .status-success {
            color: #27ae60;
            font-weight: 600;
          }
          .status-failed {
            color: #e74c3c;
            font-weight: 600;
          }
          .status-pending {
            color: #f39c12;
            font-weight: 600;
          }
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #95a5a6;
          }
          .alert {
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .alert-success {
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
          }
          .alert-warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
          }
          .alert-danger {
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
          }
          .today-highlight {
            background: #ffffcc !important;
            font-weight: bold;
          }
          code {
            background: #ecf0f1;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📞 Call History & Logs</h1>
          <p class="timestamp">Generated: ${new Date().toLocaleString()} UTC</p>
          <p class="timestamp">Today's Date: ${new Date().toISOString().split('T')[0]}</p>
          
          ${customers.map((customer, index) => {
            const todayStr = new Date().toISOString().split('T')[0]
            const lastCallStr = customer.last_call_date ? new Date(customer.last_call_date).toISOString().split('T')[0] : null
            const calledToday = lastCallStr === todayStr
            
            const customerLogs = callLogs.filter(log => log.customer_id === customer.id)
            const todayLogs = customerLogs.filter(log => {
              const logDate = new Date(log.created_at).toISOString().split('T')[0]
              return logDate === todayStr
            })
            
            const customerQueue = queueItems.filter(q => q.customer_id === customer.id)
            const pendingQueue = customerQueue.filter(q => q.status === 'pending')
            
            return `
              <div class="customer-card">
                <div class="customer-header">
                  <div>
                    <div class="customer-name">
                      ${index + 1}. ${customer.name || 'Unknown'}
                      ${calledToday ? '<span style="color: #27ae60; margin-left: 15px;">✅ CALLED TODAY</span>' : ''}
                    </div>
                    <div style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">
                      ${customer.email}
                    </div>
                  </div>
                  <div>
                    <span class="badge ${customer.payment_status === 'Paid' ? 'success' : 'warning'}">
                      ${customer.payment_status || 'Unknown'}
                    </span>
                    <span class="badge ${customer.phone_validated ? 'success' : 'danger'}">
                      ${customer.phone_validated ? '✅ Phone Valid' : '❌ Phone Invalid'}
                    </span>
                  </div>
                </div>
                
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">🆔 Customer ID</div>
                    <div class="info-value"><code>${customer.id}</code></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">📱 Phone</div>
                    <div class="info-value"><code>${customer.phone || 'Not set'}</code></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">📞 Welcome Call</div>
                    <div class="info-value">${customer.welcome_call_completed ? '✅ Completed' : '❌ Not completed'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">📅 Last Call Date</div>
                    <div class="info-value ${calledToday ? 'today-highlight' : ''}">
                      ${customer.last_call_date ? new Date(customer.last_call_date).toLocaleDateString() : '❌ Never'}
                      ${calledToday ? ' <strong>(TODAY!)</strong>' : ''}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">🔢 Total Calls Made</div>
                    <div class="info-value">${customer.total_calls_made || 0}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">📊 Call Status</div>
                    <div class="info-value">${customer.call_status || 'N/A'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">⏰ Preferred Call Time</div>
                    <div class="info-value">${customer.call_time || 'Not set'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">🌍 Timezone</div>
                    <div class="info-value">${customer.timezone || 'Not set'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">⏭️ Next Call Scheduled</div>
                    <div class="info-value">${customer.next_call_scheduled_at ? new Date(customer.next_call_scheduled_at).toLocaleString() : 'Not scheduled'}</div>
                  </div>
                </div>
                
                ${todayLogs.length > 0 ? `
                  <div class="alert alert-success">
                    ✅ <strong>${todayLogs.length} call${todayLogs.length > 1 ? 's' : ''} made TODAY!</strong>
                  </div>
                ` : calledToday ? `
                  <div class="alert alert-success">
                    ✅ <strong>Customer was called today</strong> (last_call_date updated to today)
                  </div>
                ` : customer.welcome_call_completed ? `
                  <div class="alert alert-warning">
                    ⏳ <strong>No calls made today yet.</strong> Last call was ${customer.last_call_date ? new Date(customer.last_call_date).toLocaleDateString() : 'never'}.
                  </div>
                ` : `
                  <div class="alert alert-warning">
                    ⚠️ <strong>Welcome call not completed yet.</strong>
                  </div>
                `}
                
                ${pendingQueue.length > 0 ? `
                  <div class="alert alert-warning">
                    ⏳ <strong>${pendingQueue.length} call${pendingQueue.length > 1 ? 's' : ''} in queue</strong> (pending processing)
                  </div>
                ` : ''}
                
                <h3 style="margin-top: 30px; color: #34495e;">📋 Call Logs (Last 10)</h3>
                ${customerLogs.length === 0 ? `
                  <div class="empty-state">
                    No call logs found for this customer
                  </div>
                ` : `
                  <table class="call-log-table">
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Call ID</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${customerLogs.slice(0, 10).map(log => {
                        const logDate = new Date(log.created_at).toISOString().split('T')[0]
                        const isToday = logDate === todayStr
                        
                        return `
                          <tr class="${isToday ? 'today-highlight' : ''}">
                            <td>
                              ${new Date(log.created_at).toLocaleString()}
                              ${isToday ? '<br><strong style="color: #27ae60;">TODAY!</strong>' : ''}
                            </td>
                            <td>${log.call_type || 'N/A'}</td>
                            <td class="status-${log.status === 'succeeded' ? 'success' : log.status === 'failed' ? 'failed' : 'pending'}">
                              ${log.status === 'succeeded' ? '✅' : log.status === 'failed' ? '❌' : '⏳'} ${log.status || 'N/A'}
                            </td>
                            <td>${log.duration_seconds ? log.duration_seconds + 's' : 'N/A'}</td>
                            <td><code>${log.vapi_call_id ? log.vapi_call_id.substring(0, 20) + '...' : 'N/A'}</code></td>
                            <td style="color: #e74c3c; font-size: 13px;">${log.error_message || '-'}</td>
                          </tr>
                        `
                      }).join('')}
                    </tbody>
                  </table>
                `}
                
                ${customerQueue.length > 0 ? `
                  <h3 style="margin-top: 30px; color: #34495e;">📥 Call Queue Status</h3>
                  <table class="call-log-table">
                    <thead>
                      <tr>
                        <th>Scheduled For</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Error</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${customerQueue.map(q => `
                        <tr>
                          <td>${q.scheduled_for ? new Date(q.scheduled_for).toLocaleString() : 'ASAP'}</td>
                          <td>${q.call_type || 'N/A'}</td>
                          <td class="status-${q.status === 'completed' ? 'success' : q.status === 'failed' ? 'failed' : 'pending'}">
                            ${q.status === 'completed' ? '✅' : q.status === 'failed' ? '❌' : '⏳'} ${q.status || 'N/A'}
                          </td>
                          <td>${q.attempts || 0}</td>
                          <td style="color: #e74c3c; font-size: 13px;">${q.error_message || '-'}</td>
                          <td>${new Date(q.created_at).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
              </div>
            `
          }).join('')}
          
          <div style="margin-top: 40px; padding: 20px; background: #ecf0f1; border-radius: 8px;">
            <h3 style="margin-top: 0;">💡 How to Read This:</h3>
            <ul>
              <li><strong>Last Call Date:</strong> Shows when the most recent DAILY call was made (not welcome call)</li>
              <li><strong>Total Calls Made:</strong> Count of all successful calls (welcome + daily)</li>
              <li><strong>Call Logs:</strong> History of all call attempts with timestamps</li>
              <li><strong>Call Queue:</strong> Shows queued calls waiting to be processed</li>
              <li><strong>Yellow highlight:</strong> Indicates activity from TODAY</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    })
    
  } catch (error: any) {
    console.error('Call history endpoint error:', error)
    
    return new Response(
      buildHTML('❌ Error', `Failed to fetch call history: ${error.message}<br><pre>${error.stack}</pre>`),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

function buildHTML(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 20px;
          background: #f5f7fa;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          text-align: center;
        }
        h1 {
          color: #e74c3c;
        }
        pre {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          text-align: left;
          overflow-x: auto;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `
}

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * ADMIN ENDPOINT: Manually override phone validation
 * Use when you've verified a phone number is valid but validation failed
 * Also triggers welcome call if not completed yet
 * 
 * Usage: GET /api/admin/fix-phone-validation?customerId=123&secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerIdParam = searchParams.get('customerId')
    const secret = searchParams.get('secret')
    
    // Security check: Accept both cookie authentication and secret param (backward compatibility)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    // Check cookie authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    
    // Check secret param (backward compatibility)
    const secretAuth = secret === ADMIN_SECRET
    
    // Require either cookie or secret authentication
    if (!cookieAuth && !secretAuth) {
      return new Response(
        buildHTML('🔒 Unauthorized', 'Invalid or missing admin authentication. <a href="/admin">Login here</a>', false),
        { status: 401, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    // Validate customer ID
    if (!customerIdParam) {
      return new Response(
        buildHTML('❌ Error', 'Missing customerId parameter.', false),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    const customerId = parseInt(customerIdParam)
    if (isNaN(customerId)) {
      return new Response(
        buildHTML('❌ Error', 'Invalid customerId. Must be a number.', false),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    const pool = getPool()
    
    // Get customer info
    const customerResult = await pool.query(
      `SELECT id, name, email, phone, payment_status, phone_validated, 
              phone_validation_error, welcome_call_completed, call_status,
              call_time_hour, call_time_minute, timezone
       FROM customers 
       WHERE id = $1`,
      [customerId]
    )
    
    if (customerResult.rows.length === 0) {
      return new Response(
        buildHTML('❌ Error', `Customer with ID ${customerId} not found.`, false),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    const customer = customerResult.rows[0]
    
    // Log the action
    console.log('🔧 ADMIN ACTION: Fixing phone validation', {
      customerId,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      previousValidation: customer.phone_validated,
      previousError: customer.phone_validation_error
    })
    
    // Update phone validation to true
    await pool.query(
      `UPDATE customers 
       SET phone_validated = true,
           phone_validation_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [customerId]
    )
    
    let messages = []
    messages.push(`✅ Phone validation set to <strong>TRUE</strong>`)
    messages.push(`✅ Validation error cleared`)
    
    // If customer is paid but hasn't received welcome call, trigger it
    let callTriggered = false
    if (['Paid', 'Partner'].includes(customer.payment_status) && !customer.welcome_call_completed) {
      try {
        // Import trigger function
        const { parseCallTime, calculateNextCallTime } = await import('@/lib/call-scheduler')
        const { enqueueCall } = await import('@/lib/call-queue')
        
        // Parse call time if available
        if (customer.call_time_hour === null && customer.call_time) {
          const parsed = parseCallTime(customer.call_time)
          if (parsed) {
            await pool.query(
              `UPDATE customers 
               SET call_time_hour = $1, call_time_minute = $2
               WHERE id = $3`,
              [parsed.hour, parsed.minute, customerId]
            )
          }
        }
        
        // Enqueue welcome call
        await enqueueCall(customerId, 'welcome', new Date())
        
        messages.push(`✅ Welcome call queued for immediate processing`)
        callTriggered = true
        
      } catch (error: any) {
        console.error('Error triggering welcome call:', error)
        messages.push(`⚠️ Warning: Could not auto-trigger welcome call: ${error.message}`)
        messages.push(`The next cron job (runs every 15 min) will pick it up automatically.`)
      }
    } else if (customer.welcome_call_completed) {
      messages.push(`ℹ️ Welcome call already completed - no action needed`)
    } else if (!['Paid', 'Partner'].includes(customer.payment_status)) {
      messages.push(`ℹ️ Customer hasn't paid yet - call will trigger after payment`)
    }
    
    // Build success HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta charset="UTF-8">
        <title>Phone Validation Fixed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 {
            color: #27ae60;
            margin-bottom: 10px;
          }
          .success-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
          }
          .info-box {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .info-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
          }
          .info-label {
            font-weight: 600;
            color: #7f8c8d;
            display: inline-block;
            min-width: 180px;
          }
          .message {
            padding: 12px;
            margin: 10px 0;
            border-radius: 4px;
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #27ae60;
          }
          .message.warning {
            background: #fff3cd;
            color: #856404;
            border-left-color: #ffc107;
          }
          .message.info {
            background: #d1ecf1;
            color: #0c5460;
            border-left-color: #17a2b8;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            margin-top: 20px;
          }
          .button:hover {
            background: #2980b9;
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
          <div class="success-icon">✅</div>
          <h1 style="text-align: center;">Phone Validation Fixed!</h1>
          
          <div class="info-box">
            <h3 style="margin-top: 0;">Customer Information</h3>
            <div class="info-item">
              <span class="info-label">Customer ID:</span>
              <code>${customer.id}</code>
            </div>
            <div class="info-item">
              <span class="info-label">Name:</span>
              ${customer.name}
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              ${customer.email}
            </div>
            <div class="info-item">
              <span class="info-label">Phone:</span>
              <code>${customer.phone}</code>
            </div>
            <div class="info-item">
              <span class="info-label">Payment Status:</span>
              ${customer.payment_status}
            </div>
          </div>
          
          <h3>✅ Actions Completed:</h3>
          ${messages.map(msg => {
            const isWarning = msg.includes('⚠️')
            const isInfo = msg.includes('ℹ️')
            return `<div class="message ${isWarning ? 'warning' : isInfo ? 'info' : ''}">${msg}</div>`
          }).join('')}
          
          <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
            <h3>📞 What Happens Next:</h3>
            ${callTriggered ? `
              <p><strong>Welcome call is now in the queue!</strong></p>
              <p>The call will be processed by:</p>
              <ul>
                <li>✅ Next cron job run (every 15 minutes)</li>
                <li>✅ Or immediately if cron is running now</li>
              </ul>
              <p>Check call logs in 15-30 minutes to verify it went through.</p>
            ` : customer.welcome_call_completed ? `
              <p>Welcome call already completed. Customer should be receiving daily calls at their scheduled time.</p>
            ` : `
              <p>Customer will receive calls once they pay and complete payment.</p>
            `}
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="/api/admin/phone-validation-status?secret=${secret}" class="button">
              ← Back to Phone Validation Status
            </a>
          </div>
          
          <p style="text-align: center; color: #95a5a6; font-size: 13px; margin-top: 40px;">
            Timestamp: ${new Date().toLocaleString()} UTC
          </p>
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
    console.error('Fix phone validation endpoint error:', error)
    
    return new Response(
      buildHTML('❌ Error', `Failed to fix phone validation: ${error.message}<br><pre>${error.stack}</pre>`, false),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

/**
 * Helper function to build HTML responses
 */
function buildHTML(title: string, message: string, success: boolean = true): string {
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
          color: ${success ? '#27ae60' : '#e74c3c'};
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

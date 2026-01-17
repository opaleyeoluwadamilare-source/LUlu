import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * CHECK WEBHOOK STATUS - Diagnose why system doesn't know if calls were made
 * 
 * This endpoint checks:
 * 1. If webhooks are arriving
 * 2. If last_call_date is being updated
 * 3. If call_logs match customer records
 * 
 * Usage: GET /api/admin/check-webhook-status?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    const secretAuth = secret === ADMIN_SECRET

    if (!cookieAuth && !secretAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Check recent call logs
    const recentLogs = await pool.query(`
      SELECT 
        cl.id,
        cl.customer_id,
        c.name,
        cl.call_type,
        cl.vapi_call_id,
        cl.status,
        cl.duration_seconds,
        cl.transcript IS NOT NULL as has_transcript,
        cl.created_at,
        c.last_call_date,
        c.last_call_id,
        c.total_calls_made
      FROM call_logs cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE cl.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY cl.created_at DESC
      LIMIT 20
    `)
    
    // 2. Check for mismatches
    const mismatches: any[] = []
    
    for (const log of recentLogs.rows) {
      const issues: string[] = []
      
      // Check if last_call_id matches
      if (log.last_call_id !== log.vapi_call_id) {
        issues.push(`last_call_id mismatch: ${log.last_call_id} vs ${log.vapi_call_id}`)
      }
      
      // Check if last_call_date is set for completed calls
      if (log.status === 'completed' && !log.last_call_date) {
        issues.push('Call completed but last_call_date is NULL')
      }
      
      // Check if call was today but last_call_date is not today
      const logDate = new Date(log.created_at).toISOString().split('T')[0]
      if (logDate === today && log.status === 'completed' && log.last_call_date !== today) {
        issues.push(`Call was today but last_call_date is ${log.last_call_date || 'NULL'}`)
      }
      
      if (issues.length > 0) {
        mismatches.push({
          customerId: log.customer_id,
          name: log.name,
          callLogId: log.id,
          vapiCallId: log.vapi_call_id,
          issues
        })
      }
    }
    
    // 3. Check customers who should have been called today
    const customersNotCalled = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.last_call_date,
        c.next_call_scheduled_at,
        COUNT(cl.id) as call_logs_today
      FROM customers c
      LEFT JOIN call_logs cl ON cl.customer_id = c.id 
        AND DATE(cl.created_at) = CURRENT_DATE
        AND cl.status = 'completed'
      WHERE c.payment_status IN ('Paid', 'Partner')
        AND c.phone_validated = true
        AND c.call_status NOT IN ('disabled', 'paused')
        AND c.welcome_call_completed = true
        AND (c.last_call_date IS NULL OR c.last_call_date < CURRENT_DATE)
      GROUP BY c.id, c.name, c.last_call_date, c.next_call_scheduled_at
      HAVING COUNT(cl.id) = 0
    `)
    
    // 4. Check webhook activity (recent call_logs with transcripts)
    // Use created_at instead of updated_at (updated_at might not exist in all databases)
    const webhookActivity = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as webhooks_processed,
        COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as with_transcript,
        COUNT(CASE WHEN duration_seconds IS NOT NULL THEN 1 END) as with_duration
      FROM call_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)
    
    return NextResponse.json({
      success: true,
      summary: {
        recentLogs: recentLogs.rows.length,
        mismatches: mismatches.length,
        customersNotCalledToday: customersNotCalled.rows.length,
        webhookActivity: webhookActivity.rows
      },
      recentLogs: recentLogs.rows.map((log: any) => ({
        id: log.id,
        customerId: log.customer_id,
        name: log.name,
        callType: log.call_type,
        vapiCallId: log.vapi_call_id,
        status: log.status,
        duration: log.duration_seconds,
        hasTranscript: log.has_transcript,
        createdAt: log.created_at,
        lastCallDate: log.last_call_date,
        lastCallId: log.last_call_id,
        totalCallsMade: log.total_calls_made,
        issues: mismatches.find(m => m.callLogId === log.id)?.issues || []
      })),
      mismatches,
      customersNotCalledToday: customersNotCalled.rows,
      webhookActivity: webhookActivity.rows
    })
  } catch (error: any) {
    console.error('Error checking webhook status:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


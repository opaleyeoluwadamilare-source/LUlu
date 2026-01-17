import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

async function checkAuth(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  const secretAuth = secret === ADMIN_SECRET
  return cookieAuth || secretAuth
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Call statistics
    const callStats = await pool.query(
      `SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_calls,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
        COUNT(*) FILTER (WHERE status = 'no_answer') as no_answer_calls,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration,
        SUM(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as total_duration
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'`
    )

    // Daily call trends
    const dailyTrends = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as call_count,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_count
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`
    )

    // Top customers by call count
    const topCustomers = await pool.query(
      `SELECT 
        c.id, c.name, c.email,
        COUNT(cl.id) as call_count,
        AVG(cl.duration_seconds) FILTER (WHERE cl.duration_seconds IS NOT NULL) as avg_duration
      FROM customers c
      LEFT JOIN call_logs cl ON c.id = cl.customer_id
      WHERE cl.created_at >= NOW() - INTERVAL '${days} days' OR cl.created_at IS NULL
      GROUP BY c.id, c.name, c.email
      ORDER BY call_count DESC
      LIMIT 10`
    )

    // Queue statistics
    const queueStats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'retrying') as retrying
      FROM call_queue`
    )

    // Customer growth
    const customerGrowth = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customers
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`
    )

    // Hourly call distribution (for last 7 days)
    const hourlyDistribution = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as call_count,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_count
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${Math.min(days, 7)} days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour`
    )

    // Call duration trends (daily average)
    const durationTrends = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration,
        COUNT(*) FILTER (WHERE duration_seconds IS NOT NULL) as calls_with_duration
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND duration_seconds IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date DESC`
    )

    // Success rate over time (daily)
    const successRateTrends = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_calls,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`
    )

    // Payment status breakdown
    const paymentBreakdown = await pool.query(
      `SELECT 
        payment_status,
        COUNT(*) as count
      FROM customers
      GROUP BY payment_status
      ORDER BY count DESC`
    )

    // Call type distribution (welcome vs daily)
    const callTypeDistribution = await pool.query(
      `SELECT 
        call_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'completed') as successful,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration
      FROM call_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY call_type`
    )

    return NextResponse.json({
      callStats: callStats.rows[0],
      dailyTrends: dailyTrends.rows.map(r => ({
        date: r.date,
        callCount: parseInt(r.call_count),
        successfulCount: parseInt(r.successful_count)
      })),
      topCustomers: topCustomers.rows.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        callCount: parseInt(c.call_count || 0),
        avgDuration: c.avg_duration ? parseFloat(c.avg_duration) : null
      })),
      queueStats: queueStats.rows[0],
      customerGrowth: customerGrowth.rows.map(r => ({
        date: r.date,
        newCustomers: parseInt(r.new_customers)
      })),
      hourlyDistribution: hourlyDistribution.rows.map(r => ({
        hour: parseInt(r.hour),
        callCount: parseInt(r.call_count),
        successfulCount: parseInt(r.successful_count)
      })),
      durationTrends: durationTrends.rows.map(r => ({
        date: r.date,
        avgDuration: r.avg_duration ? parseFloat(r.avg_duration) : null,
        callsWithDuration: parseInt(r.calls_with_duration)
      })),
      successRateTrends: successRateTrends.rows.map(r => ({
        date: r.date,
        totalCalls: parseInt(r.total_calls),
        successfulCalls: parseInt(r.successful_calls),
        successRate: r.success_rate ? parseFloat(r.success_rate) : 0
      })),
      paymentBreakdown: paymentBreakdown.rows.map(r => ({
        status: r.payment_status,
        count: parseInt(r.count)
      })),
      callTypeDistribution: callTypeDistribution.rows.map(r => ({
        type: r.call_type,
        count: parseInt(r.count),
        successful: parseInt(r.successful),
        avgDuration: r.avg_duration ? parseFloat(r.avg_duration) : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


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
    const format = searchParams.get('format') || 'json'

    const customers = await pool.query(
      `SELECT 
        id, name, email, phone, payment_status, phone_validated,
        welcome_call_completed, total_calls_made, last_call_date,
        call_time_hour, call_time_minute, timezone, created_at, updated_at
      FROM customers
      ORDER BY created_at DESC`
    )

    if (format === 'csv') {
      const headers = [
        'ID', 'Name', 'Email', 'Phone', 'Payment Status', 'Phone Validated',
        'Welcome Call Completed', 'Total Calls', 'Last Call Date',
        'Call Time', 'Timezone', 'Created At', 'Updated At'
      ]
      
      const rows = customers.rows.map(c => [
        c.id,
        c.name || '',
        c.email || '',
        c.phone || '',
        c.payment_status || '',
        c.phone_validated ? 'Yes' : 'No',
        c.welcome_call_completed ? 'Yes' : 'No',
        c.total_calls_made || 0,
        c.last_call_date ? new Date(c.last_call_date).toISOString().split('T')[0] : '',
        c.call_time_hour !== null && c.call_time_minute !== null 
          ? `${c.call_time_hour}:${c.call_time_minute.toString().padStart(2, '0')}` 
          : '',
        c.timezone || '',
        new Date(c.created_at).toISOString(),
        new Date(c.updated_at).toISOString()
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // JSON format
    return NextResponse.json({
      customers: customers.rows.map(c => ({
        ...c,
        created_at: new Date(c.created_at).toISOString(),
        updated_at: new Date(c.updated_at).toISOString(),
        last_call_date: c.last_call_date ? new Date(c.last_call_date).toISOString().split('T')[0] : null
      })),
      exportedAt: new Date().toISOString(),
      total: customers.rows.length
    })
  } catch (error: any) {
    console.error('Error exporting customers:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { enqueueCall } from '@/lib/call-queue'

async function checkAuth(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  const secretAuth = secret === ADMIN_SECRET
  return cookieAuth || secretAuth
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }
    const { callType } = await request.json() // 'welcome' or 'daily'
    const pool = getPool()

    // Verify customer exists and is eligible
    const customer = await pool.query(
      'SELECT payment_status, phone_validated, welcome_call_completed FROM customers WHERE id = $1',
      [customerId]
    )

    if (customer.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const c = customer.rows[0]

    if (!['Paid', 'Partner'].includes(c.payment_status)) {
      return NextResponse.json(
        { error: 'Customer must have paid status' },
        { status: 400 }
      )
    }

    if (!c.phone_validated) {
      return NextResponse.json(
        { error: 'Phone must be validated' },
        { status: 400 }
      )
    }

    if (callType === 'welcome' && c.welcome_call_completed) {
      return NextResponse.json(
        { error: 'Welcome call already completed' },
        { status: 400 }
      )
    }

    // Enqueue the call (schedule slightly in the past to ensure queue processor picks it up)
    // Queue processor looks back 4 hours, so scheduling 1 minute ago ensures it's caught
    const scheduledFor = new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
    await enqueueCall(customerId, callType || 'daily', scheduledFor)

    // Process the queue asynchronously (don't block the response)
    // This prevents timeouts and allows the request to return immediately
    const { processCallQueue } = await import('@/lib/call-queue')
    processCallQueue().catch(error => {
      // Log error but don't fail - cron will retry
      console.error('Error processing queue asynchronously:', error)
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `${callType || 'Daily'} call queued and will be processed shortly`,
      queued: true,
      note: 'Call is being processed in the background. Check call logs in a few moments.'
    })
  } catch (error: any) {
    console.error('Error triggering call:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


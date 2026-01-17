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

export async function GET(
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
    const pool = getPool()

    // Get customer context
    const context = await pool.query(
      'SELECT context_data, updated_at FROM customer_context WHERE customer_id = $1',
      [customerId]
    )

    // Get customer onboarding data
    const customer = await pool.query(
      `SELECT 
        user_story, lulu_response, extracted_goal, extracted_insecurity, 
        extracted_blocker, last_call_transcript, last_call_duration
      FROM customers WHERE id = $1`,
      [customerId]
    )

    return NextResponse.json({
      context: context.rows[0]?.context_data || {},
      contextUpdatedAt: context.rows[0]?.updated_at ? new Date(context.rows[0].updated_at).toISOString() : null,
      onboarding: customer.rows[0] ? {
        userStory: customer.rows[0].user_story,
        luluResponse: customer.rows[0].lulu_response,
        extractedGoal: customer.rows[0].extracted_goal,
        extractedInsecurity: customer.rows[0].extracted_insecurity,
        extractedBlocker: customer.rows[0].extracted_blocker,
        lastCallTranscript: customer.rows[0].last_call_transcript,
        lastCallDuration: customer.rows[0].last_call_duration
      } : null
    })
  } catch (error: any) {
    console.error('Error fetching context:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * Admin API: Update or Delete customer
 */
async function checkAuth(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  const secretAuth = secret === ADMIN_SECRET
  return cookieAuth || secretAuth
}

export async function PATCH(
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
    const body = await request.json()
    const pool = getPool()

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const allowedFields = [
      'name', 'email', 'phone', 'timezone', 'call_time', 'call_time_hour', 'call_time_minute',
      'payment_status', 'phone_validated', 'call_status', 'welcome_call_completed'
    ]

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex++}`)
        values.push(value)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(customerId)

    const query = `
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    // Get current customer state before update
    const currentCustomer = await pool.query(
      'SELECT payment_status, phone_validated, welcome_call_completed FROM customers WHERE id = $1',
      [customerId]
    )

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updatedCustomer = result.rows[0]

    // Auto-trigger welcome call if payment_status changed to 'Paid' and phone is validated
    if (currentCustomer.rows.length > 0) {
      const oldStatus = currentCustomer.rows[0].payment_status
      const oldPhoneValidated = currentCustomer.rows[0].phone_validated
      const oldWelcomeCompleted = currentCustomer.rows[0].welcome_call_completed

      const newStatus = body.payment_status || oldStatus
      const newPhoneValidated = body.phone_validated !== undefined ? body.phone_validated : oldPhoneValidated

      if (newStatus === 'Paid' && 
          (oldStatus !== 'Paid' || (oldPhoneValidated !== newPhoneValidated && newPhoneValidated)) &&
          newPhoneValidated && 
          !oldWelcomeCompleted) {
        try {
          const { enqueueCall } = await import('@/lib/call-queue')
          await enqueueCall(customerId, 'welcome', new Date())
        } catch (error: any) {
          console.error('Error triggering welcome call:', error)
          // Don't fail the request if call trigger fails
        }
      }
    }

    return NextResponse.json({ success: true, customer: updatedCustomer })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete related records first (in order to avoid foreign key issues)
    await pool.query('DELETE FROM call_queue WHERE customer_id = $1', [customerId])
    await pool.query('DELETE FROM call_logs WHERE customer_id = $1', [customerId])
    await pool.query('DELETE FROM customer_context WHERE customer_id = $1', [customerId])

    // Delete customer
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [customerId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


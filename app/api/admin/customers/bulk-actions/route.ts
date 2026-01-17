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

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, customerIds } = await request.json()
    const pool = getPool()

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'customerIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all customerIds are valid numbers
    const validIds = customerIds.filter(id => typeof id === 'number' && !isNaN(id))
    if (validIds.length !== customerIds.length) {
      return NextResponse.json(
        { error: 'All customer IDs must be valid numbers' },
        { status: 400 }
      )
    }

    let result
    switch (action) {
      case 'pause':
        result = await pool.query(
          `UPDATE customers 
           SET call_status = 'paused', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ANY($1)`,
          [validIds]
        )
        return NextResponse.json({ 
          success: true, 
          message: `Paused ${result.rowCount} customer(s)` 
        })

      case 'resume':
        result = await pool.query(
          `UPDATE customers 
           SET call_status = 'active', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ANY($1)`,
          [validIds]
        )
        return NextResponse.json({ 
          success: true, 
          message: `Resumed ${result.rowCount} customer(s)` 
        })

      case 'stop':
        result = await pool.query(
          `UPDATE customers 
           SET call_status = 'disabled', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ANY($1)`,
          [validIds]
        )
        return NextResponse.json({ 
          success: true, 
          message: `Stopped ${result.rowCount} customer(s)` 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


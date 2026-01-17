import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
  return cookieAuth || secret === ADMIN_SECRET
}

// PATCH: Update partner code (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isActive } = body
    const { id } = await params
    const codeId = parseInt(id)
    
    if (isNaN(codeId)) {
      return NextResponse.json({ error: 'Invalid code ID' }, { status: 400 })
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      )
    }

    const pool = getPool()
    const result = await pool.query(
      `UPDATE partner_codes 
       SET is_active = $1
       WHERE id = $2
       RETURNING id, code, is_active`,
      [isActive, codeId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Partner code not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      code: {
        id: result.rows[0].id,
        code: result.rows[0].code,
        isActive: result.rows[0].is_active
      }
    })
  } catch (error: any) {
    console.error('Error updating partner code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE: Delete partner code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const codeId = parseInt(id)
    
    if (isNaN(codeId)) {
      return NextResponse.json({ error: 'Invalid code ID' }, { status: 400 })
    }
    const pool = getPool()

    const result = await pool.query(
      'DELETE FROM partner_codes WHERE id = $1 RETURNING id, code',
      [codeId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Partner code not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Partner code deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting partner code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


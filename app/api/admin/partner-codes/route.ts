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

// GET: Fetch all partner codes
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    const result = await pool.query(`
      SELECT 
        pc.id,
        pc.code,
        pc.is_active,
        pc.is_used,
        pc.used_by_customer_id,
        pc.created_at,
        pc.expires_at,
        pc.created_by,
        pc.notes,
        c.name as used_by_name,
        c.email as used_by_email
      FROM partner_codes pc
      LEFT JOIN customers c ON pc.used_by_customer_id = c.id
      ORDER BY pc.created_at DESC
    `)

    const codes = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      isActive: row.is_active,
      isUsed: row.is_used,
      usedByCustomerId: row.used_by_customer_id,
      usedByName: row.used_by_name,
      usedByEmail: row.used_by_email,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      notes: row.notes
    }))

    return NextResponse.json({ codes })
  } catch (error: any) {
    console.error('Error fetching partner codes:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST: Create a new partner code
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, expiresAt, notes } = body

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    const pool = getPool()
    const normalizedCode = code.trim().toUpperCase()

    // Check if code already exists
    const existing = await pool.query(
      'SELECT id FROM partner_codes WHERE UPPER(code) = $1',
      [normalizedCode]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 409 }
      )
    }

    // Create the code
    const result = await pool.query(
      `INSERT INTO partner_codes (code, expires_at, created_by, notes)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, code, created_at, expires_at, is_active, is_used`,
      [normalizedCode, expiresAt || null, notes || null]
    )

    const newCode = result.rows[0]

    return NextResponse.json({
      success: true,
      code: {
        id: newCode.id,
        code: newCode.code,
        isActive: newCode.is_active,
        isUsed: newCode.is_used,
        createdAt: newCode.created_at,
        expiresAt: newCode.expires_at
      }
    })
  } catch (error: any) {
    console.error('Error creating partner code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { valid: false, message: 'Code is required' },
        { status: 400 }
      )
    }
    
    const pool = getPool()
    const normalizedCode = code.trim().toUpperCase()
    
    // Check if code exists and is valid
    const result = await pool.query(
      `SELECT id, is_active, is_used, expires_at
       FROM partner_codes
       WHERE UPPER(code) = $1`,
      [normalizedCode]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid code'
      })
    }
    
    const codeData = result.rows[0]
    const now = new Date()
    
    // Check if code is active
    if (!codeData.is_active) {
      return NextResponse.json({
        valid: false,
        message: 'This code is no longer active'
      })
    }
    
    // Check if code is already used
    if (codeData.is_used) {
      return NextResponse.json({
        valid: false,
        message: 'This code has already been used'
      })
    }
    
    // Check if code has expired
    if (codeData.expires_at && new Date(codeData.expires_at) < now) {
      return NextResponse.json({
        valid: false,
        message: 'This code has expired'
      })
    }
    
    // Code is valid!
    return NextResponse.json({
      valid: true,
      codeId: codeData.id
    })
    
  } catch (error: any) {
    console.error('Error validating partner code:', error)
    return NextResponse.json(
      { valid: false, message: 'Error validating code' },
      { status: 500 }
    )
  }
}


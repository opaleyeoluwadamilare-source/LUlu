import { NextRequest, NextResponse } from 'next/server'
import { fixDuplicateCallsIssue } from '@/lib/fix-duplicate-calls'

/**
 * ADMIN ENDPOINT: Fix duplicate calls issue
 * Adds unique constraint and cleans up duplicate queue entries
 * 
 * Usage: GET /api/admin/fix-duplicate-calls?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // Security check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('🔧 Admin triggered: Fixing duplicate calls issue...')
    
    const result = await fixDuplicateCallsIssue()
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate calls issue fixed successfully',
      details: result
    })
    
  } catch (error: any) {
    console.error('❌ Error in fix-duplicate-calls endpoint:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

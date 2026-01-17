import { NextRequest, NextResponse } from 'next/server'
import { initDatabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    await initDatabase()
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    })
  } catch (error: any) {
    console.error('Error initializing database:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize database',
        message: error.message,
      },
      { status: 500 }
    )
  }
}


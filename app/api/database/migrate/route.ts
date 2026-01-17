import { NextRequest, NextResponse } from 'next/server'
import { addVapiSchema, addOnboardingSchema, consolidateRedundantFields } from '@/lib/db'

export async function POST(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Run all migrations in order
    await addVapiSchema()
    await addOnboardingSchema()
    
    // Consolidate redundant fields (safe to run multiple times)
    const consolidationResult = await consolidateRedundantFields()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schemas updated and fields consolidated successfully',
      consolidation: consolidationResult
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { processCallQueue } from '@/lib/call-queue'
import { getCustomersDueForCalls } from '@/lib/call-scheduler'
import { enqueueCall } from '@/lib/call-queue'
import { trackCronExecution } from '@/lib/monitoring'

// CRITICAL: Prevent caching of cron endpoint responses
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  // Verify cron secret (for external cron service)
  // Ultra-robust authentication that handles ALL edge cases
  
  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET not set in environment variables')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  
  const normalizedSecret = process.env.CRON_SECRET.trim()
  let isValid = false
  
  // Method 1: Check Authorization header (case-insensitive, handles all variations)
  // Next.js headers are case-insensitive, so 'authorization' works for all cases
  const authHeader = request.headers.get('authorization') || ''
  
  if (authHeader) {
    const normalizedHeader = authHeader.trim()
    
    // Extract secret from Bearer token (case-insensitive, flexible spacing)
    // Match "Bearer" followed by one or more spaces, then capture everything after
    const bearerMatch = normalizedHeader.match(/^[Bb]earer\s+(.+)$/)
    if (bearerMatch && bearerMatch[1]) {
      const receivedSecret = bearerMatch[1].trim()
      if (receivedSecret === normalizedSecret) {
        isValid = true
      }
    }
    
    // Also check direct match (without Bearer prefix) - some services might send just the secret
    if (normalizedHeader === normalizedSecret) {
      isValid = true
    }
    
    // Fallback: check if header contains the secret anywhere (for edge cases)
    if (!isValid && normalizedHeader.includes(normalizedSecret)) {
      // Only accept if it's the full secret, not a substring
      const parts = normalizedHeader.split(/\s+/)
      if (parts.includes(normalizedSecret)) {
        isValid = true
      }
    }
  }
  
  // Method 2: Check query parameter (fallback for cron services that can't set headers)
  if (!isValid) {
    const { searchParams } = new URL(request.url)
    const querySecret = searchParams.get('secret') || searchParams.get('token') || searchParams.get('key')
    
    if (querySecret && querySecret.trim() === normalizedSecret) {
      isValid = true
    }
  }
  
  // Method 3: Check X-API-Key header (some services use this)
  if (!isValid) {
    const apiKey = request.headers.get('x-api-key') || 
                   request.headers.get('X-API-Key') || 
                   request.headers.get('X-API-KEY') || ''
    
    if (apiKey.trim() === normalizedSecret) {
      isValid = true
    }
  }
  
  if (!isValid) {
    // Log for debugging (sanitized - don't log full secret)
    console.warn('❌ Cron authentication failed')
    console.warn(`   Authorization header: ${authHeader ? 'present' : 'missing'}`)
    console.warn(`   Header length: ${authHeader.length}`)
    console.warn(`   Query params: ${new URL(request.url).searchParams.toString() ? 'present' : 'none'}`)
    console.warn(`   CRON_SECRET set: ${!!process.env.CRON_SECRET}`)
    console.warn(`   CRON_SECRET length: ${normalizedSecret.length}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const startTime = Date.now()
  // CRITICAL: Vercel Hobby plan = 10s limit, Pro plan = 60s limit
  // Use 8s to be safe for Hobby plan (leaves 2s buffer)
  // If you're on Pro plan, this is still safe (well under 60s limit)
  // The timeout wrapper in processCallQueue() handles individual call timeouts
  const MAX_EXECUTION_TIME = 8000 // 8 seconds (safe for both Hobby and Pro plans)
  
  try {
    // 1. Get customers due for calls and add to queue
    const customersDue = await getCustomersDueForCalls()
    const now = new Date()
    
    // Limit processing to prevent timeout (reduced for Hobby plan)
    const maxCustomers = 10 // Process max 10 customers per cron run (Hobby plan safe limit)
    const customersToProcess = customersDue.slice(0, maxCustomers)
    
    let queued = 0
    for (const customer of customersToProcess) {
      // Check timeout before each operation
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn('⏱️ Cron job approaching timeout, stopping early')
        break
      }
      
      try {
        // CRITICAL FIX: Use the customer's actual scheduled time, not 'now'
        // This ensures calls happen at the exact time the user chose, not when cron runs
        const scheduledTime = customer.scheduledFor || now
        
        // CRITICAL FIX: Trust getCustomersDueForCalls() - it already filtered by time window
        // The query uses: next_call_scheduled_at BETWEEN startOfTodayUTC AND oneHourFromNow
        // So all customers returned are already eligible - just queue them all
        // No need for additional time checks - they were causing valid calls to be skipped
        
        await enqueueCall(
          customer.id,
          customer.callType,
          scheduledTime // Use actual scheduled time, not 'now'
        )
        queued++
        console.log(`✅ Queued ${customer.callType} call for customer ${customer.id} at ${scheduledTime.toISOString()}`)
      } catch (error: any) {
        console.error(`Failed to enqueue call for customer ${customer.id}:`, error.message)
        // Continue with next customer
      }
    }
    
    // 2. Process queue (with timeout protection)
    let results = { processed: 0, succeeded: 0, failed: 0 }
    
    if (Date.now() - startTime < MAX_EXECUTION_TIME) {
      try {
        results = await processCallQueue()
      } catch (error: any) {
        console.error('Error processing call queue:', error.message)
        // Return partial results
      }
    } else {
      console.warn('⏱️ Skipping queue processing due to time limit')
    }
    
    const executionTime = Date.now() - startTime
    
    const response = {
      success: true,
      queued: queued,
      executionTimeMs: executionTime,
      skipped: customersDue.length - queued,
      ...results
    }
    
    // Track cron execution metrics
    trackCronExecution('process-calls', true, {
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      executionTime
    })
    
    // CRITICAL: Prevent caching of cron responses
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    const executionTime = Date.now() - startTime
    
    trackCronExecution('process-calls', false, {
      executionTime,
      error: error.message
    })
    
    console.error('Error processing calls:', error)
    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }
}


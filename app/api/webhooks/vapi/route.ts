import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { extractContextSafely, updateContext } from '@/lib/context-tracker'
import { enqueueCall } from '@/lib/call-queue'
import { scheduleNextCall } from '@/lib/call-scheduler'
import { logOperation } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()
    
    if (event.type === 'end-of-call-report') {
      const { call, transcript, duration } = event
      
      const pool = getPool()
      
      // CRITICAL: Idempotency check - prevent duplicate webhook processing
      // First check if ANY call_log exists for this vapi_call_id (even without transcript)
      // This catches duplicates earlier, before transcript is ready
      const anyExistingLog = await pool.query(
        `SELECT id, transcript, duration_seconds, updated_at, created_at
         FROM call_logs 
         WHERE vapi_call_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [call.id]
      )
      
      // If call_log exists, check if it's fully processed
      if (anyExistingLog.rows.length > 0) {
        const existing = anyExistingLog.rows[0]
        
        // If fully processed (has transcript + duration), check if we should skip
        if (existing.transcript && existing.duration_seconds) {
          const existingTranscriptLength = existing.transcript?.length || 0
          const newTranscriptLength = transcript?.length || 0
          
          // Only skip if new transcript isn't significantly better (100+ chars improvement)
          if (newTranscriptLength <= existingTranscriptLength + 100) {
            logOperation('info', `Webhook already processed, skipping duplicate`, {
              callId: call.id,
              existingTranscriptLength,
              newTranscriptLength,
              existingUpdatedAt: existing.updated_at
            })
            return NextResponse.json({ received: true, alreadyProcessed: true })
          }
          
          // New transcript is significantly better - log and continue to update
          logOperation('info', `Updating with better transcript`, {
            callId: call.id,
            existingTranscriptLength,
            newTranscriptLength,
            improvement: newTranscriptLength - existingTranscriptLength
          })
        } else {
          // Call_log exists but not fully processed yet - this is normal (webhook arrived before transcript ready)
          // Continue processing to update with transcript when it arrives
          logOperation('info', `Call log exists but not fully processed yet, continuing`, {
            callId: call.id,
            hasTranscript: !!existing.transcript,
            hasDuration: !!existing.duration_seconds
          })
        }
      }
      
      // Legacy check for backward compatibility (can be removed later)
      const existingLog = await pool.query(
        `SELECT transcript, duration_seconds, updated_at
         FROM call_logs 
         WHERE vapi_call_id = $1 
         AND transcript IS NOT NULL 
         AND duration_seconds IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT 1`,
        [call.id]
      )
      
      
      // Find customer by call ID (check both last_call_id and call_logs)
      // Also get call_type from call_logs, or infer from welcome_call_completed
      const customerResult = await pool.query(
        `SELECT c.id, 
                COALESCE(cl.call_type, 
                         CASE WHEN c.welcome_call_completed = false THEN 'welcome' ELSE 'daily' END
                ) as call_type,
                c.welcome_call_completed
         FROM customers c
         LEFT JOIN call_logs cl ON cl.vapi_call_id = $1 AND cl.customer_id = c.id
         WHERE c.last_call_id = $1
         UNION
         SELECT cl2.customer_id as id,
                cl2.call_type,
                c2.welcome_call_completed
         FROM call_logs cl2
         JOIN customers c2 ON cl2.customer_id = c2.id
         WHERE cl2.vapi_call_id = $1
         LIMIT 1`,
        [call.id]
      )
      
      if (customerResult.rows.length === 0) {
        console.warn(`No customer found for call ${call.id}`)
        return NextResponse.json({ received: true })
      }
      
      const { id: customerId, call_type: callType, welcome_call_completed } = customerResult.rows[0]
      
      // Determine if call was actually answered (missed call detection)
      // Criteria: duration > 30 seconds AND transcript has meaningful content (> 50 chars)
      const durationSeconds = duration ? Math.round(duration) : 0
      const hasTranscript = transcript && transcript.trim().length > 50
      const wasAnswered = durationSeconds > 30 && hasTranscript
      
      // Determine call status based on whether it was answered
      const callStatus = wasAnswered ? 'completed' : 'no_answer'
      
      // Update call log with transcript, duration, and status
      try {
        await pool.query(
          `UPDATE call_logs 
           SET transcript = $1, 
               duration_seconds = $2, 
               status = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE vapi_call_id = $4`,
          [transcript || null, durationSeconds || null, callStatus, call.id]
        )
        
        // Also update customer record with transcript, duration, increment call count, and set last_call_id
        // CRITICAL: Increment total_calls_made here to ensure it's always accurate
        // CRITICAL: Set last_call_id so we can track which call this was
        // This handles cases where queue processing might not have updated it
        await pool.query(
          `UPDATE customers 
           SET last_call_transcript = $1, 
               last_call_duration = $2,
               last_call_id = $3,
               total_calls_made = COALESCE(total_calls_made, 0) + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [transcript || null, durationSeconds || null, call.id, customerId]
        )
        
        logOperation('info', `Call webhook processed`, {
          customerId,
          callId: call.id,
          callType,
          duration: durationSeconds,
          wasAnswered,
          status: callStatus
        })
      } catch (error) {
        console.warn('Call log update failed:', error)
        logOperation('error', `Failed to update call log`, {
          customerId,
          callId: call.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      
      // Handle missed calls: Schedule retry for daily calls only
      // Welcome calls that are missed don't get retried (user can be manually retriggered)
      if (!wasAnswered && callType === 'daily') {
        try {
          // Calculate retry time: 2 hours from now (gives user time to be available)
          const retryAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
          
          // Check if it's still today (don't retry if it's already late evening)
          const now = new Date()
          const todayEnd = new Date(now)
          todayEnd.setHours(20, 0, 0, 0) // 8 PM cutoff
          
          // Only retry if it's before 8 PM today
          if (retryAt < todayEnd) {
            // Revert last_call_date so the retry can happen today
            // This is safe because defensive checks in queue processing will prevent duplicates
            await pool.query(
              `UPDATE customers 
               SET last_call_date = NULL,
                   next_call_scheduled_at = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [retryAt, customerId]
            )
            
            // Schedule retry using existing queue system (infrastructure-safe!)
            // Note: enqueueCall uses ON CONFLICT DO NOTHING, so if there's already
            // an active entry, it will silently skip (which is fine - prevents duplicates)
            try {
              await enqueueCall(customerId, 'daily', retryAt)
              
              logOperation('info', `Missed call retry scheduled`, {
                customerId,
                callId: call.id,
                retryAt: retryAt.toISOString(),
                originalDuration: durationSeconds
              })
            } catch (enqueueError) {
              // Non-blocking: If enqueue fails (e.g., unique constraint), just log it
              // The existing queue entry will be processed by cron anyway
              logOperation('warn', `Retry enqueue skipped (may already exist)`, {
                customerId,
                callId: call.id,
                error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError)
              })
            }
          } else {
            // Too late to retry today, just mark as missed and move to tomorrow
            logOperation('info', `Missed call - too late to retry today`, {
              customerId,
              callId: call.id,
              currentTime: now.toISOString(),
              cutoffTime: todayEnd.toISOString()
            })
          }
        } catch (error) {
          // Non-blocking: Log error but don't fail webhook
          console.warn('Failed to schedule missed call retry:', error)
          logOperation('error', `Failed to schedule missed call retry`, {
            customerId,
            callId: call.id,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      } else if (!wasAnswered && callType === 'welcome') {
        // Welcome call missed - just log it, don't retry automatically
        // Admin can manually retrigger if needed
        logOperation('warn', `Welcome call missed`, {
          customerId,
          callId: call.id,
          duration: durationSeconds
        })
      }
      
      // CRITICAL FIX: Update last_call_date for ALL daily calls (answered or not)
      // This ensures the system knows a call was attempted, preventing duplicate calls
      // Only update if not already set to today (prevents overwriting if already set)
      if (callType === 'daily') {
        try {
          const today = new Date().toISOString().split('T')[0]
          
          // Update last_call_date to today for ALL daily calls (answered or not)
          // This is critical: even if call wasn't answered, we attempted it today
          // The condition ensures we only update if it's NULL or before today
          await pool.query(
            `UPDATE customers 
             SET last_call_date = CURRENT_DATE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 
               AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)`,
            [customerId]
          )
          
          // Only schedule next call if call was answered
          if (wasAnswered) {
            // Schedule next call for tomorrow at their preferred time
            await scheduleNextCall(customerId)
            
            logOperation('info', `Next daily call scheduled after successful call`, {
              customerId,
              callId: call.id,
              duration: durationSeconds
            })
          } else {
            logOperation('info', `Daily call not answered, last_call_date updated to prevent duplicates`, {
              customerId,
              callId: call.id,
              duration: durationSeconds
            })
          }
        } catch (scheduleError) {
          // Non-blocking: Log error but don't fail webhook
          console.warn('Failed to update last_call_date or schedule next call:', scheduleError)
          logOperation('error', `Failed to update last_call_date or schedule next call`, {
            customerId,
            callId: call.id,
            error: scheduleError instanceof Error ? scheduleError.message : String(scheduleError)
          })
        }
      }
      
      // Extract context and learning signals ASYNC - don't block webhook response
      // Only extract context if call was actually answered (has meaningful transcript)
      if (wasAnswered && transcript) {
        extractContextSafely(customerId, transcript)
          .then(context => {
            if (context) {
              return updateContext(customerId, {
                mood: context.mood,
                events: context.events,
                // Pass learning signals for implicit learning
                positiveSignals: context.positiveSignals,
                energyLevel: context.energyLevel,
                engagementLevel: context.engagementLevel,
                progressIndicators: context.progressIndicators,
                tonePreference: context.tonePreference,
                callDuration: durationSeconds
              })
            }
          })
          .catch(error => {
            console.warn('Background context update failed:', error)
            // User never knows - conversation worked fine!
          })
      }
      
      // Return immediately - don't wait for extraction or retry scheduling
      return NextResponse.json({ received: true })
    }
    
    return NextResponse.json({ received: true })
  } catch (error: any) {
    // Always return success to Vapi - don't break their webhook
    console.error('Webhook error (non-blocking):', error)
    logOperation('error', `Webhook processing error`, {
      error: error.message,
      stack: error.stack
    })
    return NextResponse.json({ received: true })
  }
}


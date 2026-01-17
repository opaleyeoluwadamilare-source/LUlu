import { getPool } from './db'
import { makeVapiCall, logCallAttempt, type VapiCallResult } from './vapi'
import { scheduleNextCall } from './call-scheduler'
import { trackCallMetrics, logOperation } from './monitoring'

/**
 * Add call to queue for processing
 */
export async function enqueueCall(
  customerId: number,
  callType: 'welcome' | 'daily',
  scheduledFor: Date
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `INSERT INTO call_queue (customer_id, call_type, scheduled_for, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT DO NOTHING`,
    [customerId, callType, scheduledFor]
  )
}

/**
 * Process pending calls from queue (called by cron)
 * Handles retries, failures, and updates customer records
 */
export async function processCallQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const pool = getPool()
  const client = await pool.connect()
  
  let processed = 0
  let succeeded = 0
  let failed = 0
  
  try {
    await client.query('BEGIN')
    
    // Get pending calls due now (look back to start of today UTC and forward 1 hour)
    // CRITICAL FIX: Expanded window to match getCustomersDueForCalls (1 hour forward)
    // This ensures queue items are processed even if they were queued with times slightly in the future
    // We look back to start of today UTC to catch calls scheduled earlier today (but not previous days)
    // IMPORTANT: Use UTC start of day to match database TIMESTAMP comparisons
    const now = new Date()
    const startOfTodayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ))
    // CRITICAL FIX: Look forward 1 hour (matching getCustomersDueForCalls) instead of 20 minutes
    // This ensures all queued calls from today are processed
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    const queueItems = await client.query(
      `SELECT cq.*, c.*
       FROM call_queue cq
       JOIN customers c ON cq.customer_id = c.id
       WHERE cq.status IN ('pending', 'retrying')
         AND cq.scheduled_for BETWEEN $1 AND $2
         AND cq.attempts < cq.max_attempts
       ORDER BY cq.scheduled_for ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED`,
      [startOfTodayUTC, oneHourFromNow]
    )
    
    for (const item of queueItems.rows) {
      processed++
      
      try {
        // DEFENSIVE CHECK #1: Verify call should still be made
        const verify = await client.query(
          `SELECT welcome_call_completed, last_call_date FROM customers WHERE id = $1`,
          [item.customer_id]
        )
        
        if (verify.rows.length === 0) {
          console.log(`⚠️ Customer ${item.customer_id} not found, skipping`)
          await client.query(`UPDATE call_queue SET status = 'completed' WHERE id = $1`, [item.id])
          continue
        }
        
        const customer = verify.rows[0]
        const today = new Date().toISOString().split('T')[0]
        
        // Check if welcome call already completed
        if (item.call_type === 'welcome' && customer.welcome_call_completed) {
          console.log(`✅ Skipping welcome call for customer ${item.customer_id} - already completed`)
          await client.query(`UPDATE call_queue SET status = 'completed' WHERE id = $1`, [item.id])
          continue
        }
        
        // Check if daily call already made today
        if (item.call_type === 'daily' && customer.last_call_date) {
          const lastCallDate = new Date(customer.last_call_date).toISOString().split('T')[0]
          if (lastCallDate === today) {
            console.log(`✅ Skipping daily call for customer ${item.customer_id} - already called today`)
            await client.query(`UPDATE call_queue SET status = 'completed' WHERE id = $1`, [item.id])
            continue
          }
        }
        
        // CRITICAL FIX: Set last_call_date IMMEDIATELY for daily calls (before making Vapi call)
        // This prevents duplicate calls from multiple cron runs picking up the same customer
        // We set it early to block other cron runs, even if this call fails later
        if (item.call_type === 'daily') {
          await client.query(
            `UPDATE customers 
             SET last_call_date = CURRENT_DATE,
                 updated_at = NOW()
             WHERE id = $1
               AND (last_call_date IS NULL OR last_call_date < CURRENT_DATE)`,
            [item.customer_id]
          )
          console.log(`🔒 Set last_call_date = TODAY for customer ${item.customer_id} (preventing duplicates)`)
        }
        
        // Mark as processing
        await client.query(
          `UPDATE call_queue SET status = 'processing', updated_at = NOW() WHERE id = $1`,
          [item.id]
        )
        
        // Make the call - use extracted fields as source of truth, fallback to legacy fields
        // CRITICAL: Add timeout wrapper to prevent hanging
        const callPromise = makeVapiCall({
          customerId: item.customer_id,
          customerName: item.name,
          phone: item.phone,
          timezone: item.timezone,
          goals: item.extracted_goal || item.goals || '', // extracted_goal is source of truth
          biggestInsecurity: item.extracted_insecurity || item.biggest_insecurity || '', // extracted_insecurity is source of truth
          delusionLevel: item.delusion_level || 'Standard',
          isWelcomeCall: item.call_type === 'welcome'
        })
        
        // Timeout wrapper: if Vapi call takes more than 20 seconds, fail it
        // This prevents the function from hanging while still allowing legitimate slow responses
        const timeoutPromise = new Promise<VapiCallResult>((resolve) => {
          const timeoutId = setTimeout(() => {
            resolve({
              success: false,
              callId: null,
              error: 'Vapi API call timeout (exceeded 20 seconds)'
            })
          }, 20000) // 20 second max wait (allows for network delays)
          
          // Clean up timeout if call completes first
          callPromise.finally(() => clearTimeout(timeoutId))
        })
        
        const result = await Promise.race([callPromise, timeoutPromise])
        
        // Log attempt
        await logCallAttempt(item.customer_id, item.call_type, result)
        
        // Track metrics
        trackCallMetrics(item.customer_id, item.call_type, result.success, undefined, result.error || undefined)
        
        if (result.success) {
          succeeded++
          logOperation('info', `Call succeeded`, {
            customerId: item.customer_id,
            callType: item.call_type,
            callId: result.callId
          })
          
          // Update customer record
          if (item.call_type === 'welcome') {
            const updateResult = await client.query(
              `UPDATE customers 
               SET welcome_call_completed = true,
                   last_call_id = $1,
                   call_status = 'completed',
                   total_calls_made = COALESCE(total_calls_made, 0) + 1,
                   consecutive_failures = 0,
                   updated_at = NOW()
               WHERE id = $2
               RETURNING welcome_call_completed`,
              [result.callId, item.customer_id]
            )
            
            // DEFENSIVE CHECK #2: Verify flag was set
            if (updateResult.rows.length === 0 || !updateResult.rows[0].welcome_call_completed) {
              console.error(`❌ CRITICAL: Failed to set welcome_call_completed for customer ${item.customer_id}`)
              throw new Error('Flag update failed')
            }
            console.log(`✅ Verified: welcome_call_completed = true for customer ${item.customer_id}`)
            
            // Schedule first daily call
            await scheduleNextCall(item.customer_id)
          } else {
            // NOTE: last_call_date was already set earlier (before Vapi call) to prevent duplicates
            // Just update the other fields now
            const updateResult = await client.query(
              `UPDATE customers 
               SET last_call_id = $1,
                   call_status = 'completed',
                   total_calls_made = COALESCE(total_calls_made, 0) + 1,
                   consecutive_failures = 0,
                   updated_at = NOW()
               WHERE id = $2
               RETURNING last_call_date`,
              [result.callId, item.customer_id]
            )
            
            // DEFENSIVE CHECK #3: Verify last_call_date is still set (should be from earlier)
            const today = new Date().toISOString().split('T')[0]
            const setDate = updateResult.rows[0]?.last_call_date
            if (!setDate || new Date(setDate).toISOString().split('T')[0] !== today) {
              // If somehow not set, set it now (shouldn't happen, but safety net)
              console.warn(`⚠️ last_call_date not set for customer ${item.customer_id}, setting now`)
              await client.query(
                `UPDATE customers SET last_call_date = CURRENT_DATE WHERE id = $1`,
                [item.customer_id]
              )
            } else {
              console.log(`✅ Verified: last_call_date = ${today} for customer ${item.customer_id} (was set earlier)`)
            }
            
            // Schedule next call
            await scheduleNextCall(item.customer_id)
          }
          
          // Mark queue item as completed
          await client.query(
            `UPDATE call_queue 
             SET status = 'completed', 
                 processed_at = NOW(),
                 vapi_call_id = $1
             WHERE id = $2`,
            [result.callId, item.id]
          )
        } else {
          failed++
          
          // Increment attempts
          const newAttempts = item.attempts + 1
          
          logOperation('warn', `Call failed, attempt ${newAttempts}/${item.max_attempts}`, {
            customerId: item.customer_id,
            callType: item.call_type,
            error: result.error,
            attempts: newAttempts
          })
          
          if (newAttempts >= item.max_attempts) {
            // Max attempts reached - mark as failed
            await client.query(
              `UPDATE call_queue 
               SET status = 'failed', 
                   error_message = $1,
                   processed_at = NOW()
               WHERE id = $2`,
              [result.error, item.id]
            )
            
            // Update customer failure count
            await client.query(
              `UPDATE customers 
               SET consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
                   call_status = CASE 
                     WHEN consecutive_failures >= 4 THEN 'disabled'
                     ELSE 'failed'
                   END
               WHERE id = $1`,
              [item.customer_id]
            )
            
            logOperation('error', `Call failed after max attempts`, {
              customerId: item.customer_id,
              callType: item.call_type,
              error: result.error
            })
          } else {
            // Retry later
            const retryAt = new Date(now.getTime() + (newAttempts * 15 * 60 * 1000)) // 15, 30, 45 min
            
            await client.query(
              `UPDATE call_queue 
               SET status = 'retrying',
                   attempts = $1,
                   scheduled_for = $2,
                   error_message = $3
               WHERE id = $4`,
              [newAttempts, retryAt, result.error, item.id]
            )
            
            logOperation('info', `Call queued for retry`, {
              customerId: item.customer_id,
              callType: item.call_type,
              retryAt: retryAt.toISOString(),
              attempts: newAttempts
            })
          }
        }
      } catch (error: any) {
        logOperation('error', `Error processing queue item`, {
          queueItemId: item.id,
          customerId: item.customer_id,
          error: error.message,
          stack: error.stack
        })
        failed++
        
        await client.query(
          `UPDATE call_queue 
           SET status = 'failed', 
               error_message = $1,
               processed_at = NOW()
           WHERE id = $2`,
          [error.message, item.id]
        )
      }
    }
    
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  
  return { processed, succeeded, failed }
}


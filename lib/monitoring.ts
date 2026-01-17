/**
 * Production monitoring and logging utilities
 * Provides structured logging and metrics tracking
 */

interface LogContext {
  customerId?: number
  callId?: string
  operation?: string
  [key: string]: any
}

/**
 * Log operation with structured context
 */
export function logOperation(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext
) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...context
  }
  
  // In production, you might send to logging service (e.g., Sentry, LogRocket)
  // For now, structured console logging
  const logMethod = level === 'error' ? console.error : 
                   level === 'warn' ? console.warn : 
                   console.log
  
  // Format for readability
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  logMethod(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`)
}

/**
 * Track call metrics for monitoring
 */
export function trackCallMetrics(
  customerId: number,
  callType: 'welcome' | 'daily',
  success: boolean,
  duration?: number,
  error?: string
) {
  logOperation('info', `Call ${success ? 'succeeded' : 'failed'}`, {
    customerId,
    callType,
    success,
    duration,
    error
  })
}

/**
 * Track database operation
 */
export function trackDatabaseOperation(
  operation: string,
  success: boolean,
  duration?: number,
  error?: string
) {
  if (!success) {
    logOperation('error', `Database operation failed: ${operation}`, {
      operation,
      duration,
      error
    })
  }
}

/**
 * Track cron job execution
 */
export function trackCronExecution(
  jobName: string,
  success: boolean,
  metrics: {
    processed?: number
    succeeded?: number
    failed?: number
    executionTime?: number
  }
) {
  logOperation('info', `Cron job ${success ? 'completed' : 'failed'}: ${jobName}`, {
    jobName,
    success,
    ...metrics
  })
}

/**
 * Track webhook event
 */
export function trackWebhookEvent(
  eventType: string,
  success: boolean,
  context?: LogContext
) {
  logOperation(success ? 'info' : 'error', `Webhook event: ${eventType}`, {
    eventType,
    success,
    ...context
  })
}


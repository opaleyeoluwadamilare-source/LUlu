import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { cookies } from 'next/headers'
import { scheduleNextCall } from '@/lib/call-scheduler'

/**
 * Admin endpoint to recalculate all customer schedules
 * Fixes any incorrect next_call_scheduled_at values
 * 
 * Usage: GET /api/admin/recalculate-all-schedules?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    const secretAuth = secret === ADMIN_SECRET

    if (!cookieAuth && !secretAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    
    // Get all paid/partner customers who should have schedules
    const customers = await pool.query(`
      SELECT 
        id, name, email,
        call_time_hour,
        call_time_minute,
        timezone,
        next_call_scheduled_at,
        welcome_call_completed,
        last_call_date,
        payment_status
      FROM customers
      WHERE payment_status IN ('Paid', 'Partner')
        AND phone_validated = true
        AND call_status NOT IN ('disabled', 'paused')
      ORDER BY id
    `)
    
    const updates: Array<{
      id: number
      name: string
      oldSchedule: string | null
      newSchedule: string | null
      error?: string
    }> = []
    
    for (const customer of customers.rows) {
      try {
        const oldSchedule = customer.next_call_scheduled_at
        
        // Only recalculate if they've completed welcome call
        // (welcome calls are handled separately)
        if (customer.welcome_call_completed && customer.call_time_hour && customer.timezone) {
          // Recalculate using scheduleNextCall
          await scheduleNextCall(customer.id)
          
          // Get the new schedule
          const updated = await pool.query(
            'SELECT next_call_scheduled_at FROM customers WHERE id = $1',
            [customer.id]
          )
          
          const newSchedule = updated.rows[0]?.next_call_scheduled_at
          
          updates.push({
            id: customer.id,
            name: customer.name,
            oldSchedule: oldSchedule ? new Date(oldSchedule).toISOString() : null,
            newSchedule: newSchedule ? new Date(newSchedule).toISOString() : null
          })
        } else if (!customer.welcome_call_completed) {
          // For welcome calls, don't recalculate (they're scheduled differently)
          updates.push({
            id: customer.id,
            name: customer.name,
            oldSchedule: oldSchedule ? new Date(oldSchedule).toISOString() : null,
            newSchedule: 'Welcome call - not recalculated',
            error: 'Welcome call not completed yet'
          })
        } else {
          updates.push({
            id: customer.id,
            name: customer.name,
            oldSchedule: oldSchedule ? new Date(oldSchedule).toISOString() : null,
            newSchedule: null,
            error: 'Missing call_time_hour or timezone'
          })
        }
      } catch (error: any) {
        updates.push({
          id: customer.id,
          name: customer.name,
          oldSchedule: customer.next_call_scheduled_at ? new Date(customer.next_call_scheduled_at).toISOString() : null,
          newSchedule: null,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Recalculated schedules for ${updates.length} customers`,
      updates,
      summary: {
        total: updates.length,
        recalculated: updates.filter(u => u.newSchedule && !u.error).length,
        skipped: updates.filter(u => u.error).length
      }
    })
  } catch (error: any) {
    console.error('Error recalculating schedules:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


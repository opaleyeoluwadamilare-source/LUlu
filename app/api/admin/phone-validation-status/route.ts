import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * ADMIN ENDPOINT: Redirect to new React dashboard
 * This endpoint now redirects to /admin/dashboard for the modern React-based admin interface
 * 
 * Authentication: Accepts either cookie-based auth or secret param (for backward compatibility)
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Check both cookie authentication and secret param (backward compatibility)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_bedelulu_secure_2025'
    
    // Check cookie authentication
    const cookieStore = await cookies()
    const cookieAuth = cookieStore.get('admin_authenticated')?.value === 'true'
    
    // Check secret param (backward compatibility)
    const secretAuth = secret === ADMIN_SECRET
    
    // Require either cookie or secret authentication
    if (!cookieAuth && !secretAuth) {
      // If secret is provided but wrong, redirect to login
      if (secret) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return new Response(
        `<html><body style="font-family: Arial; padding: 20px;">
          <h1>🔒 Unauthorized</h1>
          <p>Invalid or missing admin authentication.</p>
          <p><a href="/admin">Login here</a></p>
        </body></html>`,
        {
          status: 401,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    // Redirect to new React dashboard
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  } catch (error: any) {
    console.error('Error in admin redirect:', error)
    return new Response(
      `<html><body style="font-family: Arial; padding: 20px;">
        <h1>❌ Error</h1>
        <p>An error occurred: ${error.message}</p>
        <p><a href="/admin">Go to login</a></p>
      </body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

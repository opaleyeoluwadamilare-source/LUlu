import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin Logout Endpoint
 * Clears authentication cookie and redirects to login
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin', request.url))
  response.cookies.delete('admin_authenticated')
  return response
}

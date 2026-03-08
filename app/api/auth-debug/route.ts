import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL

  // Read all cookies visible to the server
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll().map((c) => c.name)

  const hasSessionCookie =
    allCookies.some((n) => n.includes('session')) || allCookies.some((n) => n.includes('better-auth'))

  // Read relevant headers
  const headerStore = await headers()
  const cookieHeader = headerStore.get('cookie') ?? ''
  const hasCookieHeader = cookieHeader.length > 0

  // Try to call the Convex token endpoint with forwarded headers
  let tokenStatus: number | null = null
  let tokenError: string | null = null
  try {
    const mutableHeaders = new Headers(headerStore)
    mutableHeaders.delete('content-length')
    mutableHeaders.delete('transfer-encoding')
    const res = await fetch(`${convexSiteUrl}/api/auth/convex/token`, {
      headers: mutableHeaders,
    })
    tokenStatus = res.status
  } catch (err) {
    tokenError = String(err)
  }

  return NextResponse.json({
    envVars: {
      convexUrl: convexUrl ? 'SET' : 'MISSING',
      convexSiteUrl: convexSiteUrl ?? 'MISSING',
      convexSiteUrlValid: convexSiteUrl?.endsWith('.convex.site') ?? false,
    },
    cookies: {
      allCookieNames: allCookies,
      hasSessionCookie,
      hasCookieHeader,
    },
    tokenEndpoint: {
      url: `${convexSiteUrl}/api/auth/convex/token`,
      status: tokenStatus,
      error: tokenError,
    },
  })
}

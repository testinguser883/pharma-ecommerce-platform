import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function getCanonicalOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function buildCsp() {
  const isProd = process.env.NODE_ENV === 'production'

  const scriptSrc = [
    "'self'",
    // Required for inline JSON-LD + analytics bootstrap.
    "'unsafe-inline'",
    // Next.js dev tooling uses eval in development builds.
    ...(isProd ? [] : ["'unsafe-eval'"]),
    'https://challenges.cloudflare.com',
    'https://www.googletagmanager.com',
    'https://*.google-analytics.com',
  ].join(' ')

  const connectSrc = ["'self'", 'https:', 'wss:'].join(' ')

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https:",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    'frame-src https://challenges.cloudflare.com',
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ]

  return directives.join('; ')
}

export function middleware(request: NextRequest) {
  const canonicalOrigin = getCanonicalOrigin()
  if (canonicalOrigin) {
    const requestOrigin = request.nextUrl.origin
    if (requestOrigin !== canonicalOrigin) {
      const redirectUrl = new URL(request.url)
      const canonicalUrl = new URL(canonicalOrigin)
      redirectUrl.protocol = canonicalUrl.protocol
      redirectUrl.host = canonicalUrl.host
      return NextResponse.redirect(redirectUrl, 308)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', buildCsp())

  // Only respected by browsers on HTTPS responses.
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return response
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
}

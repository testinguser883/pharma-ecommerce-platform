import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs'
import { ConvexHttpClient } from 'convex/browser'
import { createHmac } from 'crypto'
import { cookies, headers } from 'next/headers'
import { api } from '@/convex/_generated/api'

type AuthBridge = ReturnType<typeof convexBetterAuthNextJs>
type AuthMethod = 'preloadAuthQuery' | 'fetchAuthQuery' | 'fetchAuthMutation' | 'fetchAuthAction'
type SessionFallback = {
  sessionToken: string
  userId: string
  email: string | null
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL

const authConfigError =
  !convexUrl || !convexSiteUrl ? 'Missing NEXT_PUBLIC_CONVEX_URL or NEXT_PUBLIC_CONVEX_SITE_URL in runtime env.' : null

let authBridge: AuthBridge | null = null

function getAuthBridge(): AuthBridge | null {
  if (!convexUrl || !convexSiteUrl) {
    return null
  }
  if (!authBridge) {
    authBridge = convexBetterAuthNextJs({
      convexUrl: convexUrl,
      convexSiteUrl: convexSiteUrl,
    })
  }
  return authBridge
}

function logAuthServerWarning(context: string, error?: unknown) {
  // Keep SSR alive in production even if auth backend is temporarily unavailable.
  console.error(`[auth-server] ${context}`, error ?? authConfigError ?? 'Unknown auth error')
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')

  if (forwardedHost) {
    return `${forwardedProto ?? 'https'}://${forwardedHost}`
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
}

const CAPTCHA_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

function verifyCaptchaProof(proof: string, timestampStr: string): boolean {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secretKey) return false
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return false
  const age = Date.now() - timestamp
  if (age < 0 || age > CAPTCHA_MAX_AGE_MS) return false
  const expected = createHmac('sha256', secretKey).update(timestampStr).digest('hex')
  return proof === expected
}

function getCaptchaProofFromCookie(request: Request): { proof: string; timestampStr: string } | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)captcha_proof=([^;]+)/)
  if (!match) return null
  const [proof, timestampStr] = decodeURIComponent(match[1]).split(':')
  if (!proof || !timestampStr) return null
  return { proof, timestampStr }
}

function isSameOriginPost(request: Request) {
  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')
  const requestOrigin = getRequestOrigin(request)

  const candidateOrigin = originHeader && originHeader !== 'null' ? originHeader : refererHeader
  if (candidateOrigin) {
    try {
      return new URL(candidateOrigin).origin === requestOrigin
    } catch {
      return false
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  return fetchSite === 'same-origin' || fetchSite === 'same-site'
}

async function getAppUrl() {
  const headerStore = await headers()
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  return process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${proto}://${host}` : null)
}

async function getCookieHeader() {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')
}

async function getSessionFallback(): Promise<SessionFallback | null> {
  try {
    const appUrl = await getAppUrl()
    if (!appUrl) {
      return null
    }

    const cookieHeader = await getCookieHeader()
    const response = await fetch(`${appUrl}/api/auth/get-session`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const session = (await response.json()) as {
      session?: { token?: string | null } | null
      user?: { id?: string | null; email?: string | null } | null
    }

    const sessionToken = session?.session?.token ?? null
    const userId = session?.user?.id ?? null
    if (!sessionToken || !userId) {
      return null
    }

    return {
      sessionToken,
      userId,
      email: normalizeEmail(session.user?.email),
    }
  } catch (error) {
    logAuthServerWarning('Session fallback check failed.', error)
    return null
  }
}

async function getConvexJwtFromCookies() {
  const cookieStore = await cookies()
  const exactMatch = cookieStore.get('convex_jwt')?.value
  if (exactMatch) {
    return exactMatch
  }
  return (
    cookieStore
      .getAll()
      .find(({ name }) => name === 'convex_jwt' || name.endsWith('.convex_jwt') || name.includes('convex_jwt'))
      ?.value ?? null
  )
}

export const handler: AuthBridge['handler'] = {
  GET: async (request) => {
    const bridge = getAuthBridge()
    if (!bridge) {
      logAuthServerWarning('Auth route requested but auth env is not configured.')
      return new Response('Auth server is not configured.', { status: 503 })
    }
    try {
      return await bridge.handler.GET(request)
    } catch (error) {
      logAuthServerWarning('Auth GET proxy failed.', error)
      return new Response('Auth service temporarily unavailable.', { status: 503 })
    }
  },
  POST: async (request) => {
    const bridge = getAuthBridge()
    if (!bridge) {
      logAuthServerWarning('Auth route requested but auth env is not configured.')
      return new Response('Auth server is not configured.', { status: 503 })
    }
    // CSRF defense: require same-origin POSTs for auth endpoints that set cookies / mutate auth state.
    if (!isSameOriginPost(request)) {
      return new Response('Forbidden', { status: 403 })
    }
    // CAPTCHA enforcement for sign-in and sign-up endpoints.
    const url = new URL(request.url)
    if (url.pathname.includes('/sign-in/email') || url.pathname.includes('/sign-up/email')) {
      const captchaCookie = getCaptchaProofFromCookie(request)
      if (!captchaCookie || !verifyCaptchaProof(captchaCookie.proof, captchaCookie.timestampStr)) {
        return new Response('CAPTCHA verification required.', { status: 403 })
      }
    }
    try {
      return await bridge.handler.POST(request)
    } catch (error) {
      logAuthServerWarning('Auth POST proxy failed.', error)
      return new Response('Auth service temporarily unavailable.', { status: 503 })
    }
  },
}

export const getToken: AuthBridge['getToken'] = async () => {
  const bridge = getAuthBridge()
  if (!bridge) {
    logAuthServerWarning('getToken called with missing auth env.')
    return undefined
  }
  try {
    return await bridge.getToken()
  } catch (error) {
    logAuthServerWarning('getToken failed.', error)
    return undefined
  }
}

export const isAuthenticated: AuthBridge['isAuthenticated'] = async () => {
  const token = await getToken()
  if (token) {
    return true
  }
  return Boolean(await getSessionFallback())
}

export async function isAdminAuthenticated() {
  const token = (await getToken()) ?? (await getConvexJwtFromCookies())
  if (!token || !convexUrl) {
    return false
  }
  try {
    const client = new ConvexHttpClient(convexUrl)
    client.setAuth(token)
    return await client.query(api.admin.isAdmin, {})
  } catch (error) {
    logAuthServerWarning('Admin check failed.', error)
    return false
  }
}

async function callAuthMethod(method: AuthMethod, args: unknown[]) {
  const bridge = getAuthBridge()
  if (!bridge) {
    throw new Error(authConfigError ?? 'Auth service is not configured.')
  }
  const fn = bridge[method] as unknown as (...params: unknown[]) => Promise<unknown>
  return await fn(...args)
}

export const preloadAuthQuery = ((...args: unknown[]) =>
  callAuthMethod('preloadAuthQuery', args)) as AuthBridge['preloadAuthQuery']

export const fetchAuthQuery = ((...args: unknown[]) =>
  callAuthMethod('fetchAuthQuery', args)) as AuthBridge['fetchAuthQuery']

export const fetchAuthMutation = ((...args: unknown[]) =>
  callAuthMethod('fetchAuthMutation', args)) as AuthBridge['fetchAuthMutation']

export const fetchAuthAction = ((...args: unknown[]) =>
  callAuthMethod('fetchAuthAction', args)) as AuthBridge['fetchAuthAction']

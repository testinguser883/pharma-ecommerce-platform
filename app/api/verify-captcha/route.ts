import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string }
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  // Allow explicitly disabling CAPTCHA in non-production environments.
  if (process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'false') {
    return NextResponse.json({ success: true, bypassed: true })
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ success: false, error: 'CAPTCHA not configured' }, { status: 500 })

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    })
    const result = (await res.json().catch(() => null)) as { success?: boolean; ['error-codes']?: string[] } | null
    const success = Boolean(res.ok && result?.success)
    if (!success) {
      console.warn('[verify-captcha] Turnstile verification failed.', { status: res.status, errorCodes: result?.['error-codes'] })
    }
    return NextResponse.json({ success })
  } catch (err) {
    console.error('[verify-captcha] Turnstile verification error.', err)
    // Fail closed to avoid bot bypasses on network / parsing errors.
    return NextResponse.json({ success: false }, { status: 502 })
  }
}

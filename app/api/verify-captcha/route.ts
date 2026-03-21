import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string }
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  // Allow explicitly disabling CAPTCHA in non-production environments.
  if (process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'false') {
    return NextResponse.json({ success: true, bypassed: true })
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secretKey) return NextResponse.json({ success: false, error: 'CAPTCHA not configured' }, { status: 500 })

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    const rawText = await res.text()
    console.log('[verify-captcha] raw response', { status: res.status, body: rawText })
    let result: { success?: boolean; ['error-codes']?: string[] } | null = null
    try { result = JSON.parse(rawText) } catch { /* non-JSON */ }
    const success = Boolean(res.ok && result?.success)
    if (!success) {
      console.warn('[verify-captcha] Turnstile verification failed.', { status: res.status, errorCodes: result?.['error-codes'] })
    }
    return NextResponse.json({ success, errorCodes: result?.['error-codes'] ?? [], httpStatus: res.status })
  } catch (err) {
    console.error('[verify-captcha] Turnstile verification error.', err)
    // Fail closed to avoid bot bypasses on network / parsing errors.
    return NextResponse.json({ success: false }, { status: 502 })
  }
}

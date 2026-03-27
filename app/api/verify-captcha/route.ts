import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string }
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

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
    const result = (await res.json()) as { 'success'?: boolean; 'error-codes'?: string[] }
    const success = Boolean(res.ok && result?.success)
    if (!success) {
      console.warn('[verify-captcha] Turnstile verification failed.', { errorCodes: result?.['error-codes'] })
      return NextResponse.json({ success: false, errorCodes: result?.['error-codes'] ?? [] })
    }

    // Generate HMAC proof that CAPTCHA was verified server-side.
    // Convex validates this proof so attackers cannot call Convex directly.
    const timestamp = Date.now()
    const proof = createHmac('sha256', secretKey).update(timestamp.toString()).digest('hex')

    const response = NextResponse.json({ success: true, captchaProof: proof, captchaTimestamp: timestamp })
    // Set a short-lived HttpOnly cookie so the auth endpoints can verify CAPTCHA
    // server-side without relying on custom request headers.
    response.cookies.set('captcha_proof', `${proof}:${timestamp}`, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 300, // 5 minutes
      secure: true,
    })
    return response
  } catch (err) {
    console.error('[verify-captcha] Turnstile verification error.', err)
    // Fail closed to avoid bot bypasses on network / parsing errors.
    return NextResponse.json({ success: false }, { status: 502 })
  }
}

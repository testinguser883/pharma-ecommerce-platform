import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string }
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ success: false, error: 'CAPTCHA not configured' }, { status: 500 })

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secretKey, response: token }),
  })
  const result = (await res.json()) as { success: boolean }
  return NextResponse.json({ success: result.success })
}

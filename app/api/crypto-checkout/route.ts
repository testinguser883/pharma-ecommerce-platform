import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Payment provider not configured' }, { status: 500 })
  }

  const { orderId, total } = (await request.json()) as { orderId: string; total: number }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site')

  const body = {
    price_amount: total,
    price_currency: 'INR',
    order_id: orderId,
    order_description: `Pharma order ${orderId}`,
    success_url: `${baseUrl}/orders`,
    cancel_url: `${baseUrl}/checkout`,
    ipn_callback_url: `${convexSiteUrl}/nowpayments-ipn`,
  }

  const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('NOWPayments error:', text)
    return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 502 })
  }

  const data = (await response.json()) as { invoice_url: string }
  return NextResponse.json({ invoiceUrl: data.invoice_url })
}

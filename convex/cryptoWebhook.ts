import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

async function verifyNowPaymentsSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])

  // NOWPayments requires the body keys to be sorted alphabetically
  const parsed = JSON.parse(body) as Record<string, unknown>
  const sortedKeys = Object.keys(parsed).sort()
  const sortedObj: Record<string, unknown> = {}
  for (const k of sortedKeys) {
    sortedObj[k] = parsed[k]
  }
  const sortedBody = JSON.stringify(sortedObj)

  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(sortedBody))
  const hex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hex === signature.toLowerCase()
}

export const handleIPN = httpAction(async (ctx, request) => {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!ipnSecret) {
    return new Response('IPN secret not configured', { status: 500 })
  }

  const signature = request.headers.get('x-nowpayments-sig')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await request.text()

  const isValid = await verifyNowPaymentsSignature(body, signature, ipnSecret)
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(body) as {
    payment_status: string
    order_id: string
    payment_id: number
    actually_paid?: number
    pay_amount?: number
    pay_currency?: string
  }

  const orderId = payload.order_id as Id<'orders'>
  const nowPaymentsId = String(payload.payment_id)

  if (payload.payment_status === 'finished') {
    await ctx.runMutation(internal.orders.confirmCryptoPayment, {
      orderId,
      nowPaymentsId,
      amountPaid: payload.actually_paid,
      payAmount: payload.pay_amount,
      payCurrency: payload.pay_currency,
    })
  } else if (payload.payment_status === 'partially_paid') {
    await ctx.runMutation(internal.orders.updatePartialCryptoPayment, {
      orderId,
      nowPaymentsId,
      amountPaid: payload.actually_paid ?? 0,
      payAmount: payload.pay_amount ?? 0,
      payCurrency: payload.pay_currency ?? '',
    })
  }

  return new Response('OK', { status: 200 })
})

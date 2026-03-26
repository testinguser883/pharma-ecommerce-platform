'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { formatPrice } from '@/lib/utils'

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function normalizeTrackingWebsite(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
  payment_review: { label: 'Payment Under Review', color: 'bg-blue-100 text-blue-800' },
  partial_payment: { label: 'Partial Payment', color: 'bg-amber-100 text-amber-800' },
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', color: 'bg-orange-100 text-orange-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

const STATUS_STEPS = [
  'pending_payment',
  'payment_review',
  'partial_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
]

function OrderStatusTracker({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
        Order Cancelled
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.indexOf(status)
  const labels: Record<string, string> = {
    pending_payment: 'Payment',
    payment_review: 'Review',
    partial_payment: 'Partial Payment Done',
    paid: 'Paid',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
  }

  return (
    <div className="mt-4 flex items-center">
      {STATUS_STEPS.map((step, i) => {
        const done = currentIdx >= i
        const active = currentIdx === i
        return (
          <div key={step} className="flex flex-1 flex-col items-center">
            <div className="relative flex w-full items-center">
              {i > 0 && <div className={`h-0.5 flex-1 transition-colors ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />}
              <div
                className={`h-5 w-5 shrink-0 rounded-full transition-all ${
                  active
                    ? 'border-2 border-teal-500 bg-teal-500 ring-4 ring-teal-100'
                    : done
                      ? 'border-2 border-teal-500 bg-teal-500'
                      : 'border-2 border-slate-200 bg-white'
                }`}
              >
                {done && !active && (
                  <svg
                    className="h-full w-full p-0.5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${done && currentIdx > i ? 'bg-teal-500' : 'bg-slate-200'}`}
                />
              )}
            </div>
            <span
              className={`mt-1.5 text-center text-[10px] font-semibold ${active ? 'text-teal-700' : done ? 'text-teal-500' : 'text-slate-400'}`}
            >
              {labels[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Make Payment Button ────────────────────────────────────────────────────────

function MakePaymentButton({ order }: { order: Doc<'orders'> }) {
  if (order.status !== 'pending_payment' && order.status !== 'partial_payment') return null

  return (
    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
      <p className="mb-1 text-sm font-semibold text-orange-800">₿ Bitcoin Payment</p>
      {order.status === 'partial_payment' && order.partialAmountReceived != null && (
        <div className="mb-2 space-y-0.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Received (USD)</span>
            <span className="font-semibold text-green-700">{formatPrice(order.partialAmountReceived)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending (USD)</span>
            <span className="font-semibold text-red-600">{formatPrice(order.partialAmountPending ?? 0)}</span>
          </div>
          {order.partialPaymentDueAt && (
            <div className="flex justify-between">
              <span>Due by</span>
              <span className="font-semibold text-amber-700">
                {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(order.partialPaymentDueAt)}
              </span>
            </div>
          )}
          {order.adminNote && (
            <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Note: </span>
              {order.adminNote}
            </div>
          )}
        </div>
      )}
      <Link
        href={`/orders/${order._id}/pay`}
        className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
        {order.status === 'partial_payment' ? 'Pay Remaining Amount →' : 'Make Payment →'}
      </Link>
    </div>
  )
}

// ── Payment Review Banner ──────────────────────────────────────────────────────

function PaymentReviewBanner({ order }: { order: Doc<'orders'> }) {
  if (order.status !== 'payment_review') return null
  const hasPartial = order.partialAmountReceived != null && order.partialAmountReceived > 0
  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
      {hasPartial && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <svg
            className="h-4 w-4 shrink-0 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-green-800">
            Partial payment of <span className="font-semibold">{formatPrice(order.partialAmountReceived!)}</span> has
            been received.
          </span>
        </div>
      )}
      <p className="font-semibold text-blue-800">
        {hasPartial ? 'Remaining Payment Proof Under Review' : 'Payment Proof Under Review'}
      </p>
      <p className="mt-0.5 text-xs text-blue-700">
        Your screenshot was submitted on{' '}
        {order.paymentProofUploadedAt ? formatDate(order.paymentProofUploadedAt) : 'recently'}. We&apos;ll confirm your
        payment shortly.
      </p>
    </div>
  )
}

// ── Payment Rejected Banner ────────────────────────────────────────────────────

function PaymentRejectedBanner({ order }: { order: Doc<'orders'> }) {
  if (order.status !== 'pending_payment') return null
  if (!order.adminNote || !order.paymentProofStorageId) return null
  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <p className="font-semibold text-red-800">✕ Payment Proof Rejected</p>
      <p className="mt-0.5 text-xs text-red-700">
        Your previously submitted proof was not accepted. Please upload a new screenshot.
      </p>
      {order.adminNote && (
        <p className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Reason: </span>
          {order.adminNote}
        </p>
      )}
    </div>
  )
}

// ── Cancel Order Button ────────────────────────────────────────────────────────

function CancelOrderButton({ order }: { order: Doc<'orders'> }) {
  const cancellableStatuses = ['pending_payment', 'payment_review']
  if (!cancellableStatuses.includes(order.status)) return null

  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const cancelOrder = useMutation(api.orders.cancelOrder)

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelOrder({ orderId: order._id })
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Cancel this order?</span>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Keep
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-xs font-semibold text-red-500 hover:underline">
          Cancel order
        </button>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function OrdersPageContent() {
  const orders = useQuery(api.orders.listMyOrders)
  const router = useRouter()

  // Re-fetch server components when the tab regains focus, ensuring the page
  // reflects any status changes the admin made while the tab was in the background.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [router])

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Orders</h1>
        <p className="mt-0.5 text-sm text-slate-400">Track and manage your order history.</p>
      </div>

      {orders === undefined ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-500">No orders yet.</p>
          <Link href="/products" className="rx-btn-primary mt-4">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] ?? {
              label: order.status,
              color: 'bg-slate-100 text-slate-700',
            }
            return (
              <li key={order._id} className="rx-card overflow-hidden">
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.paymentMethod === 'crypto' && (
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        ₿ Bitcoin
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Status tracker */}
                  <OrderStatusTracker status={order.status} />

                  {/* Make payment link (for pending/partial) */}
                  <MakePaymentButton order={order} />

                  {/* Payment review banner */}
                  <PaymentReviewBanner order={order} />

                  {/* Payment rejected banner */}
                  <PaymentRejectedBanner order={order} />

                  {/* Cancel order */}
                  <CancelOrderButton order={order} />

                  {/* Items */}
                  <ul className="mt-5 divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <li
                        key={`${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span className="text-slate-600">
                          {item.name} <span className="font-semibold text-slate-800">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold text-slate-900">{formatPrice(item.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Delivery address */}
                  {order.billingAddress && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Deliver to: </span>
                      {order.shippingAddress &&
                      'sameAsBilling' in order.shippingAddress &&
                      !order.shippingAddress.sameAsBilling
                        ? `${(order.shippingAddress as { firstName: string }).firstName} ${(order.shippingAddress as { lastName: string }).lastName}, ${(order.shippingAddress as { city: string }).city}, ${(order.shippingAddress as { country: string }).country}`
                        : `${order.billingAddress.firstName} ${order.billingAddress.lastName}, ${order.billingAddress.city}, ${order.billingAddress.country}`}
                    </div>
                  )}

                  {/* Tracking */}
                  {(order.trackingWebsite || order.trackingNumber) && (
                    <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-teal-800">Tracking Details</p>
                      {order.trackingWebsite && (
                        <p className="mt-1 text-slate-600">
                          Website:{' '}
                          {(() => {
                            const safeHref = normalizeTrackingWebsite(order.trackingWebsite)
                            return safeHref ? (
                              <a
                                href={safeHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-600"
                              >
                                {order.trackingWebsite}
                              </a>
                            ) : (
                              <span className="font-medium text-slate-700">{order.trackingWebsite}</span>
                            )
                          })()}
                        </p>
                      )}
                      {order.trackingNumber && (
                        <p className="mt-1 text-slate-600">
                          Tracking #: <span className="font-semibold text-slate-800">{order.trackingNumber}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">Order total</span>
                    <span className="text-lg font-extrabold text-slate-900">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

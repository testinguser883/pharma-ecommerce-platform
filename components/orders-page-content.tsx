'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { formatPrice } from '@/lib/utils'

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function normalizeTrackingWebsite(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', color: 'bg-orange-100 text-orange-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

const STATUS_STEPS = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered']

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
              {i > 0 && (
                <div className={`h-0.5 flex-1 transition-colors ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />
              )}
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
                  <svg className="h-full w-full p-0.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 transition-colors ${done && currentIdx > i ? 'bg-teal-500' : 'bg-slate-200'}`} />
              )}
            </div>
            <span
              className={`mt-1.5 text-center text-[10px] font-semibold ${
                active ? 'text-teal-700' : done ? 'text-teal-500' : 'text-slate-400'
              }`}
            >
              {labels[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function OrdersPageContent() {
  const orders = useQuery(api.orders.listMyOrders)

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
                    <p className="text-sm font-bold text-slate-900">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.paymentMethod === 'crypto' && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                        Crypto
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

                  {/* Items */}
                  <ul className="mt-5 divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <li key={item.productId} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-slate-600">
                          {item.name}{' '}
                          <span className="font-semibold text-slate-800">× {item.quantity}</span>
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
                          <a
                            href={normalizeTrackingWebsite(order.trackingWebsite)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-600"
                          >
                            {order.trackingWebsite}
                          </a>
                        </p>
                      )}
                      {order.trackingNumber && (
                        <p className="mt-1 text-slate-600">
                          Tracking #:{' '}
                          <span className="font-semibold text-slate-800">{order.trackingNumber}</span>
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

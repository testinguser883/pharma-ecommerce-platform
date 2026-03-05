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
      <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
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
    <div className="mt-3 flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = currentIdx >= i
        const active = currentIdx === i
        return (
          <div key={step} className="flex flex-1 flex-col items-center">
            <div className="relative flex w-full items-center">
              {i > 0 && (
                <div className={`h-0.5 flex-1 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
              <div className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                active ? 'border-emerald-500 bg-emerald-500 ring-2 ring-emerald-200' :
                done ? 'border-emerald-500 bg-emerald-500' :
                'border-slate-300 bg-white'
              }`} />
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${done && currentIdx > i ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
            <span className={`mt-1 text-center text-xs ${active ? 'font-bold text-emerald-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
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
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-6">
      <h1 className="text-3xl font-bold text-slate-900 md:text-2xl">My Orders</h1>

      {orders === undefined ? (
        <p className="text-sm text-slate-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No orders yet.</p>
          <Link
            href="/products"
            className="mt-3 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-700' }
            return (
              <li key={order._id} className="pharma-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.paymentMethod === 'crypto' && (
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                        Crypto
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Status tracker */}
                <OrderStatusTracker status={order.status} />

                {/* Items */}
                <ul className="mt-4 space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.productId} className="flex items-center justify-between">
                      <span className="text-slate-600">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium text-slate-900">{formatPrice(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                {/* Shipping address (if present) */}
                {order.billingAddress && (
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold">Delivered to: </span>
                    {order.shippingAddress && !('sameAsBilling' in order.shippingAddress ? order.shippingAddress.sameAsBilling : false) && 'sameAsBilling' in order.shippingAddress && !order.shippingAddress.sameAsBilling
                      ? `${(order.shippingAddress as { firstName: string }).firstName} ${(order.shippingAddress as { lastName: string }).lastName}, ${(order.shippingAddress as { city: string }).city}, ${(order.shippingAddress as { country: string }).country}`
                      : `${order.billingAddress.firstName} ${order.billingAddress.lastName}, ${order.billingAddress.city}, ${order.billingAddress.country}`
                    }
                  </div>
                )}

                <div className="mt-3 border-t border-slate-200 pt-3 text-right text-lg font-bold text-slate-900">
                  {formatPrice(order.total)}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

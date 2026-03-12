'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
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
  pending_payment: { label: 'Pending payment', color: 'bg-amber-50 text-amber-700' },
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  paid: { label: 'Paid', color: 'bg-sky-50 text-sky-700' },
  processing: { label: 'Processing', color: 'bg-orange-50 text-orange-700' },
  shipped: { label: 'Shipped', color: 'bg-violet-50 text-violet-700' },
  delivered: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600' },
}

const STATUS_STEPS = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered']

function OrderStatusTracker({ status }: { status: string }) {
  if (status === 'cancelled') {
    return <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">Order cancelled</div>
  }

  const normalizedStatus = status === 'pending' ? 'pending_payment' : status
  const currentIndex = STATUS_STEPS.indexOf(normalizedStatus)
  const labels: Record<string, string> = {
    pending_payment: 'Payment',
    paid: 'Paid',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
  }

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/70 px-4 py-5 sm:px-5">
      <div className="relative hidden sm:block">
        <div className="absolute left-0 right-0 top-4 h-px bg-slate-200" />
        <div
          className="absolute left-0 top-4 h-px bg-teal-500 transition-all"
          style={{
            width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
          }}
        />
        <div className="relative grid grid-cols-5 gap-3">
          {STATUS_STEPS.map((step, index) => {
            const done = currentIndex >= index
            const active = currentIndex === index
            return (
              <div key={step} className="flex flex-col items-center text-center">
                <div
                  className={`z-10 h-8 w-8 rounded-full border-2 ${
                    done
                      ? 'border-teal-500 bg-teal-500'
                      : active
                        ? 'border-slate-950 bg-slate-950'
                        : 'border-slate-300 bg-white'
                  }`}
                />
                <p
                  className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${
                    done || active ? 'text-slate-950' : 'text-slate-400'
                  }`}
                >
                  {labels[step]}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {STATUS_STEPS.map((step, index) => {
          const done = currentIndex >= index
          const active = currentIndex === index
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${done ? 'bg-teal-500' : active ? 'bg-slate-950' : 'bg-slate-300'}`}
              />
              <p className={`text-sm font-semibold ${done || active ? 'text-slate-950' : 'text-slate-400'}`}>
                {labels[step]}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function OrdersPageContent() {
  const orders = useQuery(api.orders.listMyOrders)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="rx-card-dark overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="rx-kicker text-teal-200">Order center</p>
            <h1 className="rx-display mt-4 text-5xl leading-none text-white sm:text-6xl">My orders</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Track your order status, payment progress, and delivery updates.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="rx-kicker text-teal-200">History</p>
            <p className="mt-4 text-4xl font-semibold text-white">{orders?.length ?? '...'}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Orders found</p>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-5">
        {orders === undefined ? (
          <div className="rx-card px-6 py-6 text-sm text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="rx-card p-10 text-center">
            <p className="rx-kicker text-teal-700">No history yet</p>
            <h2 className="rx-display mt-3 text-4xl text-slate-950">No orders found.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Start with the catalog and your first order will appear here.
            </p>
            <Link href="/products" className="rx-btn-primary mt-6">
              Browse products
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] ?? {
              label: order.status,
              color: 'bg-slate-100 text-slate-700',
            }
            return (
              <article key={order._id} className="rx-card overflow-hidden">
                <div className="rx-gradient-hero px-6 py-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="rx-kicker text-teal-200">Order #{order._id.slice(-8).toUpperCase()}</p>
                      <p className="mt-2 text-sm text-slate-300">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.paymentMethod === 'crypto' ? (
                        <span className="rx-badge border-white/10 bg-white/10 text-white">Crypto</span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  <OrderStatusTracker status={order.status} />

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-5">
                      <p className="rx-kicker text-teal-700">Items</p>
                      <div className="mt-3 space-y-3">
                        {order.items.map((item, index) => (
                          <div
                            key={`${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}-${index}`}
                            className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3 last:border-b-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950">
                                {item.name}
                                <span className="ml-2 text-slate-400">× {item.quantity}</span>
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                                {[item.dosage, item.unit].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-slate-950">
                              {formatPrice(item.lineTotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[24px] border border-slate-200/80 bg-white p-4">
                        <p className="rx-kicker text-teal-700">Shipping</p>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {order.billingAddress
                            ? order.shippingAddress &&
                              'sameAsBilling' in order.shippingAddress &&
                              !order.shippingAddress.sameAsBilling
                              ? `${(order.shippingAddress as { firstName: string }).firstName} ${(order.shippingAddress as { lastName: string }).lastName}, ${(order.shippingAddress as { city: string }).city}, ${(order.shippingAddress as { country: string }).country}`
                              : `${order.billingAddress.firstName} ${order.billingAddress.lastName}, ${order.billingAddress.city}, ${order.billingAddress.country}`
                            : 'Shipping address not available.'}
                        </p>
                      </div>

                      {order.trackingWebsite || order.trackingNumber ? (
                        <div className="rounded-[24px] border border-teal-200 bg-teal-50/70 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                            <Sparkles className="h-4 w-4" />
                            Tracking details
                          </div>
                          {order.trackingWebsite ? (
                            <a
                              href={normalizeTrackingWebsite(order.trackingWebsite)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-800"
                            >
                              Open tracking site
                              <ArrowUpRight className="h-4 w-4" />
                            </a>
                          ) : null}
                          {order.trackingNumber ? (
                            <p className="mt-3 text-sm text-slate-700">Tracking #: {order.trackingNumber}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="text-sm text-slate-500">Order total</span>
                    <span className="text-2xl font-semibold text-slate-950">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { formatPrice } from '@/lib/utils'

export function CartPageContent() {
  const cart = useQuery(api.cart.getMyCart)
  const updateQuantity = useMutation(api.cart.updateItemQuantity)
  const removeItem = useMutation(api.cart.removeItem)
  const clearCart = useMutation(api.cart.clearCart)

  if (cart === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="rx-card flex items-center gap-3 px-6 py-6 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          Loading your cart...
        </div>
      </div>
    )
  }

  if (cart === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <div className="rx-card p-10 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
          <p className="rx-kicker mt-5 text-teal-700">Authentication required</p>
          <h1 className="rx-display mt-3 text-4xl text-slate-950">Sign in to access your cart</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">Your cart is saved to your account.</p>
          <Link href="/auth/login?next=/cart" className="rx-btn-primary mt-6">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="rx-card-dark overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="rx-kicker text-teal-200">Cart overview</p>
            <h1 className="rx-display mt-4 text-5xl leading-none text-white sm:text-6xl">Shopping cart</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Review your items, update quantities, or continue to checkout.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="rx-kicker text-teal-200">Cart signal</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-3xl font-semibold text-white">{itemCount}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Items</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">{formatPrice(cart.total)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Current total</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          {cart.items.length === 0 ? (
            <div className="rx-card p-10 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
              <p className="rx-kicker mt-5 text-teal-700">Cart empty</p>
              <h2 className="rx-display mt-3 text-4xl text-slate-950">Nothing here yet.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Browse the catalog and add products to see them here.
              </p>
              <Link href="/products" className="rx-btn-primary mt-6">
                Browse products
              </Link>
            </div>
          ) : (
            <>
              {cart.items.map((item) => {
                const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
                return (
                  <div key={itemKey} className="rx-card p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-slate-50">
                        <img src={item.image} alt={item.name} className="h-16 w-16 object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-semibold text-slate-950">{item.name}</p>
                            {item.genericName ? (
                              <p className="mt-1 text-sm text-slate-500">{item.genericName}</p>
                            ) : null}
                            {item.dosage ? (
                              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-teal-700">
                                {item.dosage}
                                {item.pillCount ? ` · ${item.unit}` : ''}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-semibold tracking-tight text-slate-950">
                              {formatPrice(item.lineTotal)}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                              {formatPrice(item.price)} / {item.unit}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2">
                            <button
                              type="button"
                              disabled={item.quantity <= 1}
                              onClick={() =>
                                void updateQuantity({
                                  productId: item.productId,
                                  quantity: item.quantity - 1,
                                  dosage: item.dosage,
                                  pillCount: item.pillCount,
                                })
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-10 text-center text-sm font-semibold text-slate-950">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void updateQuantity({
                                  productId: item.productId,
                                  quantity: item.quantity + 1,
                                  dosage: item.dosage,
                                  pillCount: item.pillCount,
                                })
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void removeItem({
                                productId: item.productId,
                                dosage: item.dosage,
                                pillCount: item.pillCount,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => void clearCart({})}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Clear all items
              </button>
            </>
          )}
        </section>

        <aside className="h-fit lg:sticky lg:top-28">
          <div className="rx-card overflow-hidden">
            <div className="rx-gradient-hero px-6 py-5 text-white">
              <p className="rx-kicker text-teal-200">Summary</p>
              <h2 className="mt-2 text-2xl font-semibold">Ready to check out?</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Items</span>
                  <span className="font-semibold text-slate-950">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-950">{formatPrice(cart.total)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="font-semibold text-slate-950">Total</span>
                  <span className="text-2xl font-semibold text-slate-950">{formatPrice(cart.total)}</span>
                </div>
              </div>

              <Link href="/checkout" className="rx-btn-primary mt-6 w-full">
                Proceed to checkout
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

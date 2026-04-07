'use client'

import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { formatPrice } from '@/lib/utils'

export function CartPageContent() {
  const cart = useQuery(api.cart.getMyCart)
  const updateQuantity = useMutation(api.cart.updateItemQuantity)
  const removeItem = useMutation(api.cart.removeItem)
  const clearCart = useMutation(api.cart.clearCart)

  if (cart === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading your cart...
        </div>
      </div>
    )
  }

  if (cart === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Sign in to access your cart</h1>
          <p className="mt-1 text-sm text-slate-400">Your cart is saved to your account.</p>
          <Link href="/auth/login?next=/cart" className="rx-btn-primary mt-5">
            Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_300px] lg:px-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Shopping Cart</h1>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-500">Your cart is empty.</p>
            <Link href="/" className="rx-btn-primary mt-4">
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {cart.items.map((item) => {
                const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
                return (
                  <li key={itemKey} className="rx-card p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-18 w-18 shrink-0 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-2 h-[72px] w-[72px] object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                        {item.genericName && <p className="text-xs text-slate-400">{item.genericName}</p>}
                        {item.dosage && (
                          <p className="mt-0.5 text-xs font-semibold text-teal-600">
                            {item.dosage}
                            {item.pillCount ? ` · ${item.pillCount} ${item.unit.split(' ')[0]}s` : ''}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatPrice(item.price)} / {item.unit}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50">
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
                              className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-3 text-sm font-bold text-slate-800">{item.quantity}</span>
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
                              className="p-2 text-slate-500 hover:text-slate-800"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-slate-900">{formatPrice(item.lineTotal)}</span>
                            <button
                              type="button"
                              onClick={() =>
                                void removeItem({
                                  productId: item.productId,
                                  dosage: item.dosage,
                                  pillCount: item.pillCount,
                                })
                              }
                              className="text-slate-300 hover:text-red-400 transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              onClick={() => void clearCart({})}
              className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear all items
            </button>
          </>
        )}
      </section>

      {/* Summary sidebar */}
      <aside className="h-fit">
        <div className="rx-card overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4">
            <h2 className="text-sm font-bold text-white">Order Summary</h2>
          </div>
          <div className="p-5">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-slate-900">
                  {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatPrice(cart.total)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-xl font-extrabold text-slate-900">{formatPrice(cart.total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white hover:from-teal-500 hover:to-cyan-500 transition-all shadow-sm"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </aside>
    </div>
  )
}

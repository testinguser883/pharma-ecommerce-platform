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
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <p className="text-sm text-slate-500">Loading your cart...</p>
      </div>
    )
  }

  if (cart === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Please sign in to access your cart</h1>
          <p className="mt-2 text-sm text-slate-500">Your cart is persisted per authenticated account.</p>
          <Link
            href="/auth/login?next=/cart"
            className="mt-5 inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_320px] lg:px-6">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900 md:text-2xl">Shopping Cart</h1>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-600">Your cart is empty.</p>
            <Link
              href="/products"
              className="mt-3 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {cart.items.map((item) => {
                const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
                return (
                  <li key={itemKey} className="pharma-card p-4">
                    <div className="flex gap-3">
                      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl bg-slate-50 p-2" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.genericName}</p>
                        {item.dosage && (
                          <p className="mt-0.5 text-xs font-medium text-teal-700">
                            {item.dosage}{item.pillCount ? ` · ${item.pillCount} ${item.unit.split(' ')[0]}s` : ''}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {formatPrice(item.price)} per {item.unit}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                void updateQuantity({
                                  productId: item.productId,
                                  quantity: item.quantity - 1,
                                  dosage: item.dosage,
                                  pillCount: item.pillCount,
                                })
                              }
                              className="p-2 text-slate-600 hover:text-slate-900"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 text-sm font-semibold">{item.quantity}</span>
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
                              className="p-2 text-slate-600 hover:text-slate-900"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900">{formatPrice(item.lineTotal)}</span>
                            <button
                              type="button"
                              onClick={() => void removeItem({ productId: item.productId, dosage: item.dosage, pillCount: item.pillCount })}
                              className="text-slate-400 hover:text-red-500"
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
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Clear cart
            </button>
          </>
        )}
      </section>

      <aside className="pharma-card h-fit p-5">
        <h2 className="text-lg font-bold text-slate-900">Cart Summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Items</span>
            <span className="font-medium text-slate-900">
              {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-900">{formatPrice(cart.total)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatPrice(cart.total)}</span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="mt-5 inline-flex w-full justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Proceed to checkout
        </Link>
      </aside>
    </div>
  )
}

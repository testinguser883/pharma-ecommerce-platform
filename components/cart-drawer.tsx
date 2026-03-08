'use client'

import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { formatPrice } from '@/lib/utils'

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const cart = useQuery(api.cart.getMyCart)
  const updateQuantity = useMutation(api.cart.updateItemQuantity)
  const removeItem = useMutation(api.cart.removeItem)

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold">Your Cart</h2>
            {cart && cart.items.length > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {cart.items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {cart === undefined ? (
            <p className="text-sm text-slate-500">Loading cart...</p>
          ) : cart === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
              <p className="text-sm text-slate-600">Sign in to start shopping and save your cart.</p>
              <Link
                href="/auth/login"
                onClick={onClose}
                className="mt-3 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Login
              </Link>
            </div>
          ) : cart.items.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Your cart is empty</p>
              <Link
                href="/products"
                onClick={onClose}
                className="mt-3 inline-flex rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Browse medicines
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {cart.items.map((item) => {
                  const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
                  return (
                    <li key={itemKey} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl border border-slate-100 bg-slate-50 object-contain p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                          {item.dosage && (
                            <p className="text-xs font-medium text-teal-700">
                              {item.dosage}
                              {item.pillCount ? ` · ${item.pillCount} ${item.unit.split(' ')[0]}s` : ''}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {formatPrice(item.price)} per {item.unit}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-full border border-slate-200">
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
                                className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="px-2 text-xs font-semibold">{item.quantity}</span>
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
                                className="p-1.5 text-slate-600 hover:text-slate-900"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatPrice(item.lineTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void removeItem({
                                    productId: item.productId,
                                    dosage: item.dosage,
                                    pillCount: item.pillCount,
                                  })
                                }
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

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatPrice(cart.total)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

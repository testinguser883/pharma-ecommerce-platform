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
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Your Cart</h2>
            {cart && cart.items.length > 0 && (
              <span className="rounded-full border border-teal-500/30 bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-400">
                {cart.items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          {cart === undefined ? (
            <div className="flex items-center gap-2 pt-4 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              Loading cart...
            </div>
          ) : cart === null ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">Sign in to access your cart</p>
              <Link href="/auth/login" onClick={onClose} className="rx-btn-primary mt-4">
                Login
              </Link>
            </div>
          ) : cart.items.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-3 text-sm font-medium text-slate-500">Your cart is empty</p>
              <Link href="/" onClick={onClose} className="rx-btn-primary mt-4">
                Browse medicines
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {cart.items.map((item) => {
                const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
                return (
                  <li key={itemKey} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-12 shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                        {item.dosage && (
                          <p className="text-xs font-medium text-teal-600">
                            {item.dosage}
                            {item.pillCount ? ` · ${item.pillCount} ${item.unit.split(' ')[0]}s` : ''}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white">
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
                              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 text-xs font-bold">{item.quantity}</span>
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
                              className="p-1.5 text-slate-500 hover:text-slate-800"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{formatPrice(item.lineTotal)}</span>
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
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-extrabold text-slate-900">{formatPrice(cart.total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={onClose}
                className="inline-flex justify-center rounded-full border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                View Cart
              </Link>
              <Link
                href="/checkout"
                onClick={onClose}
                className="inline-flex justify-center rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-2.5 text-sm font-semibold text-white hover:from-teal-500 hover:to-cyan-500 transition-all"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

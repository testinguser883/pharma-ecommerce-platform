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
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-[32px] border border-white/15 bg-[rgba(11,18,32,0.92)] text-white shadow-[0_30px_80px_-35px_rgba(2,6,23,1)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/10">
              <ShoppingBag className="h-4.5 w-4.5 text-teal-200" />
            </span>
            <div>
              <p className="rx-kicker text-teal-200">Cart drawer</p>
              <h2 className="text-lg font-semibold text-white">Your basket</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {cart === undefined ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
              Loading cart...
            </div>
          ) : cart === null ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-6 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-500" />
              <p className="mt-4 text-sm text-slate-300">Sign in to access your cart.</p>
              <Link href="/auth/login" onClick={onClose} className="rx-btn-primary mt-5">
                Sign in
              </Link>
            </div>
          ) : cart.items.length === 0 ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-6 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-500" />
              <p className="mt-4 text-sm text-slate-300">Your cart is empty.</p>
              <Link href="/products" onClick={onClose} className="rx-btn-primary mt-5">
                Browse products
              </Link>
            </div>
          ) : (
            cart.items.map((item) => {
              const itemKey = `${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`
              return (
                <div key={itemKey} className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-white/10">
                      <img src={item.image} alt={item.name} className="h-12 w-12 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      {item.dosage ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-teal-200">
                          {item.dosage}
                          {item.pillCount ? ` · ${item.pillCount}` : ''}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2">
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
                            className="inline-flex h-8 w-8 items-center justify-center text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-xs font-semibold text-white">{item.quantity}</span>
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
                            className="inline-flex h-8 w-8 items-center justify-center text-slate-300"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{formatPrice(item.lineTotal)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              void removeItem({
                                productId: item.productId,
                                dosage: item.dosage,
                                pillCount: item.pillCount,
                              })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-200"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {cart && cart.items.length > 0 ? (
          <div className="border-t border-white/10 px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-300">Total</span>
              <span className="text-2xl font-semibold text-white">{formatPrice(cart.total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View cart
              </Link>
              <Link href="/checkout" onClick={onClose} className="rx-btn-primary">
                Checkout
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

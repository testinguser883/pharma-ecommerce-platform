'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ArrowUpRight, PackageCheck, ShoppingBag, User2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'

export function AccountPageContent() {
  const currentUser = useQuery(api.auth.getCurrentUser)
  const itemCount = useQuery(api.cart.getItemCount)
  const orders = useQuery(api.orders.listMyOrders)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="rx-card-dark overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="rx-kicker text-teal-200">Account center</p>
            <h1 className="rx-display mt-4 text-5xl leading-none text-white sm:text-6xl">Your account</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Manage your profile, cart, and order history.
            </p>
          </div>
          <button type="button" onClick={() => void authClient.signOut()} className="rx-btn-ghost h-fit self-start">
            Sign out
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rx-card p-6">
          <User2 className="h-5 w-5 text-teal-700" />
          <p className="rx-kicker mt-5 text-teal-700">Signed in</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">{currentUser?.email ?? 'Loading...'}</p>
        </article>
        <article className="rx-card p-6">
          <ShoppingBag className="h-5 w-5 text-teal-700" />
          <p className="rx-kicker mt-5 text-teal-700">Cart items</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{itemCount ?? 0}</p>
        </article>
        <article className="rx-card p-6">
          <PackageCheck className="h-5 w-5 text-teal-700" />
          <p className="rx-kicker mt-5 text-teal-700">Orders placed</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{orders?.length ?? 0}</p>
        </article>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/cart" className="rx-card p-6 transition hover:-translate-y-0.5">
          <p className="rx-kicker text-teal-700">Quick action</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Review cart</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Adjust quantities, remove items, or continue to checkout.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
            Open cart
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/orders" className="rx-card p-6 transition hover:-translate-y-0.5">
          <p className="rx-kicker text-teal-700">Quick action</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Track orders</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            See payment, fulfillment, and shipping progress for every order.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
            Open orders
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/checkout" className="rx-card p-6 transition hover:-translate-y-0.5">
          <p className="rx-kicker text-teal-700">Quick action</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Go to checkout</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Continue to payment with the current cart and shipping details.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
            Start checkout
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </section>
    </div>
  )
}

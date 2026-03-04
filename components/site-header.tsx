'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Heart, LogOut, Pill, Search, ShoppingCart, UserRound } from 'lucide-react'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { api } from '@/convex/_generated/api'
import { CartDrawer } from './cart-drawer'

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const { data: session } = authClient.useSession()
  const cartItemCount = useQuery(api.cart.getItemCount) ?? 0
  const router = useRouter()

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = searchInput.trim()
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white">
              <Pill className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">PharmaCare</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 max-w-sm md:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search medicines..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-300 focus:ring-2"
              />
            </div>
          </form>

          <nav className="hidden items-center gap-5 lg:flex">
            <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Home
            </Link>
            <Link href="/products" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Products
            </Link>
            <Link href="/orders" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Orders
            </Link>
            <Link href="/account" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Account
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-teal-200 hover:text-teal-700"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            {session?.user ? (
              <>
                <Link
                  href="/account"
                  className="hidden items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-200 hover:text-teal-700 sm:inline-flex"
                >
                  <UserRound className="h-4 w-4" />
                  {session.user.name ?? session.user.email}
                </Link>
                <button
                  type="button"
                  onClick={() => void authClient.signOut()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-red-200 hover:text-red-600"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Heart className="h-4 w-4" />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}

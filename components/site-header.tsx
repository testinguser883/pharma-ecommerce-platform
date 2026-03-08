'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, Pill, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { api } from '@/convex/_generated/api'
import { CartDrawer } from './cart-drawer'

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const { data: session } = authClient.useSession()
  const cartItemCount = useQuery(api.cart.getItemCount) ?? 0
  const isAdmin = useQuery(api.admin.isAdmin)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSearchInteraction = useRef(false)

  useEffect(() => {
    if (!hasSearchInteraction.current) {
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = searchInput.trim()
      router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, router])

  const handleSearch = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = searchInput.trim()
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    setIsMobileMenuOpen(false)
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/orders', label: 'Orders' },
    { href: '/account', label: 'Account' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          {/* Logo */}
          <Link href="/" className="inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white">
              <Pill className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">PharmaCare</span>
          </Link>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-sm md:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  hasSearchInteraction.current = true
                  setSearchInput(e.target.value)
                }}
                placeholder="Search medicines..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-300 focus:ring-2"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 lg:flex">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm font-medium text-slate-700 hover:text-slate-900">
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-teal-600 hover:text-teal-800">
                Admin
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Cart button */}
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
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-red-200 hover:text-red-600 sm:inline-flex"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/auth/login"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 lg:hidden">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => {
                    hasSearchInteraction.current = true
                    setSearchInput(e.target.value)
                  }}
                  placeholder="Search medicines..."
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-300 focus:ring-2"
                />
              </div>
            </form>

            {/* Mobile nav links */}
            <nav className="mt-3 space-y-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Mobile auth */}
            <div className="mt-3 border-t border-slate-100 pt-3">
              {session?.user ? (
                <div className="flex items-center justify-between">
                  <Link
                    href="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700"
                  >
                    <UserRound className="h-4 w-4" />
                    {session.user.name ?? session.user.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void authClient.signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 rounded-full border border-slate-300 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 rounded-full bg-teal-600 py-2 text-center text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}

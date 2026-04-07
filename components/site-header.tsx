'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, Pill, Search, ShoppingCart, UserRound, X, ChevronDown } from 'lucide-react'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { SITE_NAME } from '@/lib/site-inputs'
import { api } from '@/convex/_generated/api'
import { CartDrawer } from './cart-drawer'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: session } = authClient.useSession()
  const cartItemCount = useQuery(api.cart.getItemCount) ?? 0
  const isAdmin = useQuery(api.admin.isAdmin)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSearchInteraction = useRef(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!hasSearchInteraction.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = searchInput.trim()
      router.push(q ? `/?q=${encodeURIComponent(q)}` : '/')
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, router])

  const handleSearch = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = searchInput.trim()
    router.push(q ? `/?q=${encodeURIComponent(q)}` : '/')
    setIsMobileMenuOpen(false)
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/orders', label: 'Orders' },
    { href: '/account', label: 'Account' },
  ]

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          isScrolled ? 'bg-slate-950/95 backdrop-blur-md shadow-lg shadow-black/20' : 'bg-slate-950',
        )}
      >
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500" />

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          {/* Logo */}
          <Link href="/" className="inline-flex shrink-0 items-center gap-2.5 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-900/30 group-hover:shadow-teal-500/40 transition-all duration-200">
              <Pill className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-teal-300 transition-colors">
              {SITE_NAME}
            </span>
          </Link>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-sm md:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  hasSearchInteraction.current = true
                  setSearchInput(e.target.value)
                }}
                placeholder="Search medicines..."
                className="w-full rounded-full border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none ring-teal-500/30 focus:border-teal-500/70 focus:ring-2 focus:bg-slate-800 transition-all"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-150"
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3 py-2 text-sm font-semibold text-teal-400 hover:text-teal-300 hover:bg-teal-950/50 rounded-lg transition-all duration-150"
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Cart button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/50 hover:text-teal-400 hover:bg-slate-700 transition-all duration-150"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-teal-500 px-1 text-[9px] font-bold text-white shadow-lg">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {session?.user ? (
              <>
                <Link
                  href="/account"
                  className="hidden items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-teal-500/50 hover:text-teal-300 hover:bg-slate-700 transition-all sm:inline-flex"
                >
                  <UserRound className="h-3.5 w-3.5" />
                  <span className="max-w-[100px] truncate">{session.user.name ?? session.user.email}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void authClient.signOut()}
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:border-red-500/50 hover:text-red-400 hover:bg-slate-700 transition-all sm:inline-flex"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/auth/login"
                  className="rounded-full border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-cyan-500 transition-all"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-900 px-4 pb-5 lg:hidden">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => {
                    hasSearchInteraction.current = true
                    setSearchInput(e.target.value)
                  }}
                  placeholder="Search medicines..."
                  className="w-full rounded-full border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </form>

            {/* Mobile nav links */}
            <nav className="mt-3 space-y-0.5">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-teal-400 hover:bg-teal-950/50"
                >
                  Admin Panel
                </Link>
              )}
            </nav>

            {/* Mobile auth */}
            <div className="mt-3 border-t border-slate-800 pt-3">
              {session?.user ? (
                <div className="flex items-center justify-between">
                  <Link
                    href="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <UserRound className="h-4 w-4 text-teal-400" />
                    {session.user.name ?? session.user.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void authClient.signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300"
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
                    className="flex-1 rounded-full border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 text-center text-sm font-semibold text-white"
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

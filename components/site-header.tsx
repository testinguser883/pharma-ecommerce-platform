'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { HeartPulse, LogOut, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { api } from '@/convex/_generated/api'
import { CartDrawer } from './cart-drawer'
import { cn } from '@/lib/utils'
import { brand } from '@/lib/brand'

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/account', label: 'Account' },
]

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
    const onScroll = () => setIsScrolled(window.scrollY > 18)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!hasSearchInteraction.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = searchInput.trim()
      router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    }, 280)
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

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4 lg:px-6">
        <div
          className={cn(
            'mx-auto max-w-7xl rounded-[32px] border backdrop-blur-xl transition-all duration-300',
            isScrolled
              ? 'border-white/70 bg-white/78 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.85)]'
              : 'border-white/55 bg-white/58 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.6)]',
          )}
        >
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                <HeartPulse className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold tracking-tight text-slate-950">{brand.name}</p>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="hidden min-w-0 flex-1 xl:flex">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => {
                    hasSearchInteraction.current = true
                    setSearchInput(event.target.value)
                  }}
                  placeholder="Search medicines..."
                  className="rx-input h-12 rounded-full border-white bg-white/80 pl-11 pr-4 shadow-inner"
                />
              </div>
            </form>

            <nav className="hidden items-center gap-1.5 lg:flex">
              {primaryLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-950 hover:text-white"
                >
                  {label}
                </Link>
              ))}
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100"
                >
                  Admin
                </Link>
              ) : null}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                {cartItemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                ) : null}
              </button>

              {session?.user ? (
                <>
                  <Link
                    href="/account"
                    className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white sm:inline-flex"
                  >
                    <UserRound className="h-4 w-4 text-teal-700" />
                    <span className="max-w-[120px] truncate">{session.user.name ?? session.user.email}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void authClient.signOut()}
                    className="hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:inline-flex"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link href="/auth/login" className="rx-btn-secondary py-2.5">
                    Login
                  </Link>
                  <Link href="/auth/register" className="rx-btn-primary py-2.5">
                    Register
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen ? (
            <div className="border-t border-slate-200/70 px-4 py-4 sm:px-5 lg:hidden">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => {
                      hasSearchInteraction.current = true
                      setSearchInput(event.target.value)
                    }}
                    placeholder="Search medicines..."
                    className="rx-input rounded-full pl-11"
                  />
                </div>
              </form>

              <nav className="mt-4 grid gap-2">
                {primaryLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900"
                  >
                    {label}
                  </Link>
                ))}
                {isAdmin ? (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-[20px] border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700"
                  >
                    Admin Panel
                  </Link>
                ) : null}
              </nav>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {session?.user ? (
                  <>
                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4">
                      <p className="rx-kicker text-teal-700">Signed in</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {session.user.name ?? session.user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void authClient.signOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-left text-sm font-semibold text-red-600"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="rx-btn-secondary">
                      Login
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)} className="rx-btn-primary">
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </header>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}

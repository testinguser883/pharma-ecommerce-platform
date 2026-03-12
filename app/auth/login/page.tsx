import Link from 'next/link'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 lg:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_24%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1fr_460px]">
        <div className="rx-card-dark overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
          <p className="rx-kicker text-teal-200">Authentication</p>
          <h1 className="rx-display mt-4 max-w-3xl text-5xl leading-none text-white sm:text-6xl">Sign in</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Access your account, cart, and order history.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-semibold text-white">1</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Shared account</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-semibold text-white">2</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Saved cart</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-semibold text-white">3</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">Order history</p>
            </div>
          </div>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-200">
            Back to store
          </Link>
        </div>

        <div className="relative">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

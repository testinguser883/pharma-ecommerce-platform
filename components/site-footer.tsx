import Link from 'next/link'
import { Pill, Mail, Shield } from 'lucide-react'
import { SITE_NAME } from '@/lib/site-inputs'

export function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      {/* Top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-900/30">
                <Pill className="h-4.5 w-4.5" />
              </span>
              <span className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                {SITE_NAME}
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Quality pharmaceutical products delivered to your doorstep. Your health, our mission.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rx-badge bg-slate-800 text-slate-300 border border-slate-700">₿ BTC</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick Links</p>
            <ul className="space-y-2.5">
              {[
                { href: '/', label: 'Home' },
                { href: '/orders', label: 'Order Status' },
                { href: '/faq', label: 'FAQ' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Company</p>
            <ul className="space-y-2.5">
              {[
                { href: '/about-us', label: 'About Us' },
                { href: '/contact-us', label: 'Contact Us' },
                { href: '/testimonials', label: 'Testimonials' },
                { href: '/our-policy', label: 'Our Policy' },
                { href: '/terms-conditions', label: 'Terms & Conditions' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Payment */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Support</p>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span>Contact us via our support page for assistance.</span>
              </div>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 hover:bg-teal-500/20 hover:border-teal-400/50 transition-all"
              >
                Get in Touch
              </Link>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  ₿ Bitcoin (BTC)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-slate-800 pt-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Shield className="h-3 w-3 text-teal-600" />
              Secure & encrypted transactions
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 text-center max-w-2xl mx-auto">
            Please note: after contacting us you will receive an automatic confirmation. Our support team will reply
            ASAP. If you did not receive a confirmation, your message may not have reached us — please try again.
          </p>
        </div>
      </div>
    </footer>
  )
}

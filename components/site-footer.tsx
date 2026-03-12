import Link from 'next/link'
import { ArrowUpRight, Bitcoin, HeartPulse, Mail, Shield } from 'lucide-react'
import { brand } from '@/lib/brand'

const footerGroups = [
  {
    title: 'Quick Links',
    links: [
      { href: '/', label: 'Home' },
      { href: '/products', label: 'Products' },
      { href: '/orders', label: 'Order Status' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about-us', label: 'About Us' },
      { href: '/contact-us', label: 'Contact Us' },
      { href: '/testimonials', label: 'Testimonials' },
      { href: '/our-policy', label: 'Our Policy' },
      { href: '/terms-conditions', label: 'Terms & Conditions' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 px-4 pb-4 lg:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/10 bg-slate-950 text-slate-200 shadow-[0_42px_100px_-45px_rgba(15,23,42,0.95)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] lg:px-10 lg:py-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/10 text-white">
                <HeartPulse className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-white">{brand.name}</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Quality pharmaceutical products delivered to your doorstep. Your health, our mission.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rx-badge border-amber-400/30 bg-amber-400/10 text-amber-100">
                <Bitcoin className="mr-2 h-3.5 w-3.5" />
                BTC Accepted
              </span>
            </div>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="rx-kicker text-slate-500">{group.title}</p>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="rx-kicker text-slate-500">Support</p>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-teal-300" />
                <p className="leading-6 text-slate-400">Contact us via our support page for assistance.</p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <p className="rx-kicker text-slate-500">Payment Methods</p>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                <Bitcoin className="h-3.5 w-3.5" />
                Bitcoin (BTC)
              </span>
            </div>
            <Link
              href="/contact-us"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Get in Touch
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-teal-300" />
              <p>Secure & encrypted transactions</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-center text-xs text-slate-500 sm:text-left">
            Please note: after contacting us you will receive an automatic confirmation. Our support team will reply
            ASAP. If you did not receive a confirmation, your message may not have reached us. Please try again.
          </p>
        </div>
      </div>
    </footer>
  )
}

import type { PropsWithChildren } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { SeedDataBootstrap } from '@/components/seed-data-bootstrap'

export function ShopShell({ children }: PropsWithChildren) {
  return (
    <div className="rx-shell min-h-screen">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.18),transparent_45%)]" />
      <div className="pointer-events-none fixed inset-y-0 right-[-10rem] z-0 w-[24rem] bg-[radial-gradient(circle,rgba(245,158,11,0.14),transparent_50%)] blur-3xl" />
      <SeedDataBootstrap />
      <SiteHeader />
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </div>
  )
}

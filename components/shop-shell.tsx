import type { PropsWithChildren } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { SeedDataBootstrap } from '@/components/seed-data-bootstrap'

export function ShopShell({ children }: PropsWithChildren) {
  return (
    <>
      <SeedDataBootstrap />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  )
}

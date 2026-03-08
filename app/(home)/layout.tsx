import type { PropsWithChildren } from 'react'
import { ShopShell } from '@/components/shop-shell'

export default function HomeLayout({ children }: PropsWithChildren) {
  return <ShopShell>{children}</ShopShell>
}

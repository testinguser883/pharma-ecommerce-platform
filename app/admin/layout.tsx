import type { PropsWithChildren } from 'react'
import { redirect } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { fetchAuthQuery, isAuthenticated } from '@/lib/auth-server'

export default async function AdminLayout({ children }: PropsWithChildren) {
  if (!(await isAuthenticated())) {
    redirect('/auth/login')
  }
  if (!(await fetchAuthQuery(api.admin.isAdmin, {}))) {
    redirect('/')
  }
  return <>{children}</>
}

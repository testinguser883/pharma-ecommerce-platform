import type { PropsWithChildren } from 'react'
import { redirect } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { fetchAuthQuery, isAuthenticated } from '@/lib/auth-server'

export default async function AdminLayout({ children }: PropsWithChildren) {
  if (!(await isAuthenticated())) {
    redirect('/auth/login')
  }

  try {
    if (!(await fetchAuthQuery(api.admin.isAdmin, {}))) {
      redirect('/')
    }
  } catch (error) {
    console.error('[admin-layout] Server-side admin check failed, falling back to client-side guard.', error)
  }

  return <>{children}</>
}

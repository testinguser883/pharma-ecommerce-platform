import Link from 'next/link'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md space-y-4">
        <div className="text-center">
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors">
            ← Back to store
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

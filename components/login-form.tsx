'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    await authClient.signIn.email(
      { email, password },
      {
        onRequest: () => setIsSubmitting(true),
        onSuccess: () => {
          setIsSubmitting(false)
          router.push(nextPath as Route)
        },
        onError: (ctx) => {
          setIsSubmitting(false)
          setErrorMessage(ctx.error.message)
        },
      },
    )
  }

  return (
    <div className="rx-card w-full p-6 sm:p-8">
      <p className="rx-kicker text-teal-700">Account access</p>
      <h1 className="rx-display mt-3 text-4xl text-slate-950">Welcome back.</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Sign in to manage orders, review your cart, and continue to checkout.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="rx-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="rx-input mt-2"
          />
        </div>

        <div>
          <label className="rx-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="••••••••"
            className="rx-input mt-2"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="rx-btn-primary w-full">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        New here?{' '}
        <Link href="/auth/register" className="font-semibold text-slate-950">
          Create an account
        </Link>
      </p>
    </div>
  )
}

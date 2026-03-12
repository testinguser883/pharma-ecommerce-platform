'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function RegisterForm() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    await authClient.signUp.email(
      { name, email, password },
      {
        onRequest: () => setIsSubmitting(true),
        onSuccess: () => {
          setIsSubmitting(false)
          router.push('/')
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
      <p className="rx-kicker text-teal-700">New account</p>
      <h1 className="rx-display mt-3 text-4xl text-slate-950">Create your profile.</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Set up an account to save your cart, place orders, and track delivery progress.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="rx-label">Full name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="John Doe"
            className="rx-input mt-2"
          />
        </div>

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
            minLength={8}
            placeholder="At least 8 characters"
            className="rx-input mt-2"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="rx-btn-primary w-full">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-slate-950">
          Sign in
        </Link>
      </p>
    </div>
  )
}

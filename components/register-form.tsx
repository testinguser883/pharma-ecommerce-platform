'use client'

import Link from 'next/link'
import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { authClient } from '@/lib/auth-client'
import { SITE_NAME } from '@/lib/site-inputs'

function getPasswordPolicyError(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 128) return 'Password is too long.'
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  if (!hasLower || !hasUpper || !hasNumber) {
    return 'Password must include at least 1 uppercase letter, 1 lowercase letter, and 1 number.'
  }
  return null
}

export function RegisterForm() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const passwordError = getPasswordPolicyError(password)
    if (passwordError) {
      setErrorMessage(passwordError)
      return
    }

    if (!turnstileToken) {
      setErrorMessage('Please complete the CAPTCHA verification.')
      return
    }

    try {
      const captchaRes = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      const captchaData = await captchaRes.json() as { success: boolean }
      if (!captchaData.success) {
        setTurnstileToken(null)
        turnstileRef.current?.reset()
        setErrorMessage('CAPTCHA verification failed. Please try again.')
        return
      }
    } catch {
      setTurnstileToken(null)
      turnstileRef.current?.reset()
      setErrorMessage('Unable to verify CAPTCHA. Please try again.')
      return
    }

    await authClient.signUp.email(
      {
        name,
        email,
        password,
      },
      {
        onRequest: () => {
          setIsSubmitting(true)
        },
        onSuccess: () => {
          setIsSubmitting(false)
          router.push('/')
        },
        onError: (ctx) => {
          setIsSubmitting(false)
          setTurnstileToken(null)
          turnstileRef.current?.reset()
          const message = ctx.error.message
          setErrorMessage(/password/i.test(message) ? message : 'Unable to create account right now. Please try again.')
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />

        <div className="p-7">
          {/* Logo mark */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-200 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6"
              >
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Create account</h1>
            <p className="mt-0.5 text-sm text-slate-400">Join {SITE_NAME} and order with ease.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="John Doe"
                className="rx-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                className="rx-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                placeholder="8+ chars, upper/lower/number"
                className="rx-input"
              />
            </div>

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token: string) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: 'light', size: 'normal' }}
              />
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-teal-600 hover:text-teal-500 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

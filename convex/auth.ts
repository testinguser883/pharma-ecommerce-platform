import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import type { AuthContext, BetterAuthPlugin } from '@better-auth/core'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { DataModel } from './_generated/dataModel'
import authConfig from './auth.config'
import { SITE_NAME } from '../lib/site-inputs'

const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL

if (!siteUrl) {
  throw new Error('Missing SITE_URL or NEXT_PUBLIC_APP_URL in Convex environment')
}

export const authComponent = createClient<DataModel>(components.betterAuth)

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

const passwordPolicyPlugin: BetterAuthPlugin = {
  id: 'password-policy',
  onRequest: async (request: Request, ctx: AuthContext) => {
    if (request.method !== 'POST') return

    const basePath = ctx.options.basePath || '/api/auth'
    const pathname = new URL(request.url).pathname.replace(basePath, '').replace(/\/+$/, '')

    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as { password?: unknown; newPassword?: unknown } | null

    const passwordField =
      pathname === '/sign-up/email'
        ? body?.password
        : pathname === '/reset-password' || pathname === '/change-password' || pathname === '/set-password'
          ? body?.newPassword
          : null

    if (typeof passwordField !== 'string') return
    const error = getPasswordPolicyError(passwordField)
    if (!error) return

    return {
      response: new Response(JSON.stringify({ message: error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  },
}

async function sendWelcomeEmail(email: string, name: string | null | undefined) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const displayName = name ?? email.split('@')[0]
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:8px">Welcome to GetUrPill, ${displayName}!</h1>
      <p style="color:#475569;font-size:15px;line-height:1.6">
        Your account is ready. Browse our full range of medicines, add items to your cart, and get them delivered to your door.
      </p>
      <a href="${siteUrl}" style="display:inline-block;margin-top:20px;background:#0d9488;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
        Start Shopping
      </a>
      <p style="margin-top:32px;color:#94a3b8;font-size:12px">If you didn&rsquo;t create this account, you can safely ignore this email.</p>
    </div>
  `
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`,
        to: email,
        subject: `Welcome to ${SITE_NAME}, ${displayName}!`,
        html,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err)
  }
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, 'http://localhost:3000'].filter(Boolean) as string[],
    rateLimit: {
      enabled: process.env.BETTER_AUTH_RATE_LIMIT_ENABLED !== 'false',
    },
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [passwordPolicyPlugin, convex({ authConfig })],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (user.email) {
              await sendWelcomeEmail(user.email, user.name)
            }
          },
        },
      },
    },
  })

export const { getAuthUser } = authComponent.clientApi()

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx)
  },
})

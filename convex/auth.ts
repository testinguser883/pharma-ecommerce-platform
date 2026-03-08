import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { DataModel } from './_generated/dataModel'
import authConfig from './auth.config'

const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL

if (!siteUrl) {
  throw new Error('Missing SITE_URL or NEXT_PUBLIC_APP_URL in Convex environment')
}

export const authComponent = createClient<DataModel>(components.betterAuth)

async function sendWelcomeEmail(email: string, name: string | null | undefined) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const displayName = name ?? email.split('@')[0]
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:8px">Welcome to MedShop, ${displayName}! 💊</h1>
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
        from: process.env.EMAIL_FROM ?? 'MedShop <onboarding@resend.dev>',
        to: email,
        subject: `Welcome to MedShop, ${displayName}!`,
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
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
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

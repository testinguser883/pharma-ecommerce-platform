import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server'
import { internal } from './_generated/api'
import { resolveProductSelection } from './pricing'

type AuthenticatedCtx = QueryCtx | MutationCtx | ActionCtx

const getAuthenticatedUserId = async (ctx: AuthenticatedCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity.subject
}

function isIndiaCountry(country: string | undefined) {
  if (!country) return false
  const normalizedCountry = country.trim().toLowerCase()
  return normalizedCountry === 'india' || normalizedCountry === 'in'
}

const buildOrderItemsFromCart = async (ctx: MutationCtx, userId: string) => {
  const cart = await ctx.db
    .query('carts')
    .withIndex('by_user_id', (q) => q.eq('userId', userId))
    .unique()

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty')
  }

  const orderItems: Array<{
    productId: (typeof cart.items)[number]['productId']
    name: string
    genericName: string
    dosage?: string
    pillCount?: number
    quantity: number
    unitPrice: number
    unit: string
    lineTotal: number
    image: string
  }> = []

  for (const cartItem of cart.items) {
    const product = await ctx.db.get(cartItem.productId)
    if (!product || !product.inStock) {
      continue
    }
    let selection: ReturnType<typeof resolveProductSelection>
    try {
      selection = resolveProductSelection(product, cartItem)
    } catch {
      continue
    }
    const unitPrice = selection.unitPrice
    const lineTotal = Number((unitPrice * cartItem.quantity).toFixed(2))
    orderItems.push({
      productId: product._id,
      name: product.name,
      genericName: product.genericName,
      dosage: selection.dosage,
      pillCount: selection.pillCount,
      quantity: cartItem.quantity,
      unitPrice,
      unit: cartItem.pillCount ? `package (${cartItem.pillCount} ${product.unit}s)` : product.unit,
      lineTotal,
      image: product.image,
    })
  }

  if (orderItems.length === 0) {
    throw new Error('No valid items found in cart')
  }

  return { cart, orderItems }
}

const billingAddressArg = v.optional(
  v.object({
    isNewCustomer: v.boolean(),
    mobilePhone: v.string(),
    email: v.string(),
    dateOfBirth: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    streetAddress: v.string(),
    city: v.string(),
    country: v.string(),
    state: v.string(),
    zipCode: v.string(),
  }),
)

const shippingAddressArg = v.optional(
  v.union(
    v.object({ sameAsBilling: v.literal(true) }),
    v.object({
      sameAsBilling: v.literal(false),
      firstName: v.string(),
      lastName: v.string(),
      streetAddress: v.string(),
      city: v.string(),
      country: v.string(),
      state: v.string(),
      zipCode: v.string(),
    }),
  ),
)

function assertIndiaOnlyDelivery(args: {
  billingAddress?: { country: string } | undefined
  shippingAddress?: { sameAsBilling: true } | { sameAsBilling: false; country: string } | undefined
}) {
  const billingCountry = args.billingAddress?.country
  if (billingCountry && !isIndiaCountry(billingCountry)) {
    throw new Error('Delivery is currently available only within India.')
  }

  const shipping = args.shippingAddress
  if (shipping && shipping.sameAsBilling === false && !isIndiaCountry(shipping.country)) {
    throw new Error('Delivery is currently available only within India.')
  }
}


async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 6000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchBtcPriceUsd(): Promise<number> {
  const sources: Array<() => Promise<number>> = [
    async () => {
      const data = await fetchJsonWithTimeout<{ data?: { amount?: string } }>('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      const amount = Number.parseFloat(String(data?.data?.amount ?? ''))
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Coinbase returned invalid price')
      return amount
    },
    async () => {
      const data = await fetchJsonWithTimeout<{ bitcoin?: { usd?: number } }>(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      )
      const amount = Number(data?.bitcoin?.usd)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('CoinGecko returned invalid price')
      return amount
    },
  ]

  for (const source of sources) {
    try {
      return await source()
    } catch {
      // try next source
    }
  }
  throw new Error('Unable to fetch BTC price right now. Please try again.')
}

export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx)
    return await ctx.db
      .query('orders')
      .withIndex('by_user_id_and_created_at', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const getById = query({
  args: {
    orderId: v.id('orders'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) {
      throw new Error('Order not found')
    }
    return order
  },
})

export const getOrderById = internalQuery({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.orderId)
  },
})

export const createFromCart = mutation({
  args: {
    billingAddress: billingAddressArg,
    shippingAddress: shippingAddressArg,
  },
  handler: async () => {
    throw new Error('Standard checkout is disabled. Please use Bitcoin payment.')
  },
})

// ── BTC Direct Payment ─────────────────────────────────────────────────────────

export const getBtcWalletAddress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return process.env.BTC_WALLET_ADDRESS ?? null
  },
})

const MAX_PENDING_ORDERS_PER_USER = 3

export const createBtcOrder = mutation({
  args: {
    billingAddress: billingAddressArg,
    shippingAddress: shippingAddressArg,
  },
  handler: async (ctx, args) => {
    assertIndiaOnlyDelivery(args)
    const userId = await getAuthenticatedUserId(ctx)

    // Prevent order flooding: limit unpaid orders per user
    const existingOrders = await ctx.db
      .query('orders')
      .withIndex('by_user_id_and_created_at', (q) => q.eq('userId', userId))
      .collect()
    const pendingCount = existingOrders.filter(
      (o) => o.status === 'pending_payment' || o.status === 'partial_payment' || o.status === 'payment_review',
    ).length
    if (pendingCount >= MAX_PENDING_ORDERS_PER_USER) {
      throw new ConvexError(
        `You already have ${pendingCount} unpaid order(s). Please complete or cancel existing orders before placing a new one.`,
      )
    }

    const { cart, orderItems } = await buildOrderItemsFromCart(ctx, userId)
    const total = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

    const orderId = await ctx.db.insert('orders', {
      userId,
      items: orderItems,
      status: 'pending_payment',
      paymentMethod: 'crypto',
      total,
      createdAt: Date.now(),
      billingAddress: args.billingAddress,
      shippingAddress: args.shippingAddress,
    })

    // Prevent duplicate order creation from the same cart by clearing it once an order is created.
    await ctx.db.patch(cart._id, { items: [], total: 0, updatedAt: Date.now() })

    return { orderId, total }
  },
})

export const saveBtcPaymentDetails = action({
  args: {
    orderId: v.id('orders'),
  },
  handler: async (ctx, args): Promise<{ btcAmountDue: number; btcPriceUsd: number; btcPriceUpdatedAt: number }> => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.runQuery(internal.orders.getOrderById, { orderId: args.orderId })
    if (!order || order.userId !== userId) {
      throw new Error('Order not found')
    }

    const amountUsd =
      order.status === 'partial_payment'
        ? (order.partialAmountPending ?? order.total)
        : order.total
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      throw new Error('Invalid order amount')
    }

    const btcPriceUsd = await fetchBtcPriceUsd()
    const btcAmountDue = Number((amountUsd / btcPriceUsd).toFixed(8))

    await ctx.runMutation(internal.orders.setBtcPaymentQuoteInternal, {
      orderId: args.orderId,
      btcAmountDue,
      btcPriceUsd,
    })

    return {
      btcAmountDue,
      btcPriceUsd,
      btcPriceUpdatedAt: Date.now(),
    }
  },
})

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_REJECTIONS = 5
const MAX_TOTAL_PROOF_UPLOADS = 10 // lifetime cap per order
const UPLOAD_URL_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes between URL generations

// Returns rejection entries sorted oldest→newest and the cooldown end time (ms) for the current cycle.
function getUploadGuard(order: { paymentProofHistory?: Array<{ decision: string; decidedAt: number }> }) {
  const rejections = (order.paymentProofHistory ?? []).filter((h) => h.decision === 'rejected')
  const locked = rejections.length >= MAX_REJECTIONS
  const lastRejection = rejections[rejections.length - 1]
  // Exponential backoff: 5 → 10 → 20 → 40 minutes per rejection cycle
  const cooldownMs = lastRejection ? Math.pow(2, rejections.length - 1) * 5 * 60 * 1000 : 0
  const cooldownEndsAt = lastRejection ? lastRejection.decidedAt + cooldownMs : 0
  const isCoolingDown = cooldownEndsAt > Date.now()
  return { locked, isCoolingDown, cooldownEndsAt, rejectionCount: rejections.length }
}

// Internal: order validation + URL generation (called after Turnstile passes)
export const generateUploadUrlInternal = internalMutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) throw new Error('Order not found')
    if (order.status === 'payment_review') throw new Error('Your payment proof is already under review.')
    if (order.status !== 'pending_payment' && order.status !== 'partial_payment') {
      throw new Error('Upload not allowed for this order.')
    }

    // Lifetime cap on total proof uploads per order
    if ((order.totalProofUploads ?? 0) >= MAX_TOTAL_PROOF_UPLOADS) {
      throw new Error('Maximum upload limit reached for this order. Please contact support.')
    }

    // Cooldown between URL generations to prevent rapid-fire requests
    const lastGen = order.lastUploadUrlGeneratedAt ?? 0
    const sinceLast = Date.now() - lastGen
    if (sinceLast < UPLOAD_URL_COOLDOWN_MS) {
      const waitSecs = Math.ceil((UPLOAD_URL_COOLDOWN_MS - sinceLast) / 1000)
      throw new Error(`Please wait ${waitSecs} seconds before requesting another upload.`)
    }

    const { locked, isCoolingDown, cooldownEndsAt } = getUploadGuard(order)
    if (locked) throw new Error('Upload locked. Please contact support.')
    if (isCoolingDown) {
      const remainingMins = Math.ceil((cooldownEndsAt - Date.now()) / 60000)
      throw new Error(`Please wait ${remainingMins} more minute(s) before uploading again.`)
    }

    // Record URL generation timestamp
    await ctx.db.patch(args.orderId, { lastUploadUrlGeneratedAt: Date.now() })

    return ctx.storage.generateUploadUrl()
  },
})

export const setBtcPaymentQuoteInternal = internalMutation({
  args: {
    orderId: v.id('orders'),
    btcAmountDue: v.number(),
    btcPriceUsd: v.number(),
  },
  // Called only from saveBtcPaymentDetails action which already verified auth + ownership.
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    await ctx.db.patch(args.orderId, {
      btcAmountDue: args.btcAmountDue,
      btcPriceUsd: args.btcPriceUsd,
      btcPriceUpdatedAt: Date.now(),
    })
  },
})

// CAPTCHA proof validity window (5 minutes)
const CAPTCHA_PROOF_MAX_AGE_MS = 5 * 60 * 1000

// Public: generates the upload URL — CAPTCHA proof + auth verified here.
export const generatePaymentProofUploadUrl = action({
  args: {
    orderId: v.id('orders'),
    captchaProof: v.string(),
    captchaTimestamp: v.number(),
  },
  handler: async (ctx, args): Promise<string> => {
    await getAuthenticatedUserId(ctx)

    // Validate CAPTCHA proof (HMAC signed by /api/verify-captcha after Cloudflare Turnstile passes)
    const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
    if (!secretKey) throw new Error('CAPTCHA not configured on server')

    const age = Date.now() - args.captchaTimestamp
    if (age < 0 || age > CAPTCHA_PROOF_MAX_AGE_MS) {
      throw new Error('CAPTCHA verification expired. Please complete the CAPTCHA again.')
    }

    // Recompute HMAC using Web Crypto API and compare
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(args.captchaTimestamp.toString()))
    const expectedProof = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedProof !== args.captchaProof) {
      throw new Error('CAPTCHA verification failed. Please try again.')
    }

    return await ctx.runMutation(internal.orders.generateUploadUrlInternal, { orderId: args.orderId })
  },
})

export const savePaymentProof = mutation({
  args: {
    orderId: v.id('orders'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Enforce 5 MB limit server-side — delete the file and reject if oversized
    const metadata = await ctx.storage.getMetadata(args.storageId)
    if (!metadata) throw new Error('Uploaded file not found')
    if (metadata.size > MAX_PROOF_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId)
      throw new Error('File too large. Maximum size is 5 MB.')
    }

    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) {
      await ctx.storage.delete(args.storageId)
      throw new Error('Order not found')
    }

    // One proof per review cycle — block if already awaiting admin review
    if (order.status === 'payment_review') {
      await ctx.storage.delete(args.storageId)
      throw new Error('Your payment proof is already under review. Please wait for admin to respond.')
    }
    if (order.status === 'paid' || order.status === 'cancelled') {
      await ctx.storage.delete(args.storageId)
      throw new Error('Cannot upload proof for this order status.')
    }

    // Abuse guard: exponential backoff + hard lock
    const { locked, isCoolingDown, cooldownEndsAt, rejectionCount } = getUploadGuard(order)
    if (locked) {
      await ctx.storage.delete(args.storageId)
      throw new Error(`Upload locked after ${MAX_REJECTIONS} rejected submissions. Please contact support.`)
    }
    if (isCoolingDown) {
      await ctx.storage.delete(args.storageId)
      const remainingMins = Math.ceil((cooldownEndsAt - Date.now()) / 60000)
      throw new Error(
        `Too many upload attempts. Please wait ${remainingMins} more minute(s). (Attempt ${rejectionCount}/${MAX_REJECTIONS})`,
      )
    }

    // Delete the previous proof only if it hasn't been archived in history.
    // Archived proofs must be kept so admins can view them via the proof history.
    const isArchived = (order.paymentProofHistory ?? []).some(
      (h) => h.storageId === order.paymentProofStorageId,
    )
    if (order.paymentProofStorageId && !isArchived) {
      await ctx.storage.delete(order.paymentProofStorageId)
    }

    await ctx.db.patch(args.orderId, {
      paymentProofStorageId: args.storageId,
      paymentProofUploadedAt: Date.now(),
      status: 'payment_review',
      totalProofUploads: (order.totalProofUploads ?? 0) + 1,
    })

    // Clear the cart now that payment proof is submitted
    const cart = await ctx.db
      .query('carts')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .unique()
    if (cart) {
      await ctx.db.patch(cart._id, { items: [], total: 0, updatedAt: Date.now() })
    }
  },
})

export const getPaymentProofUrl = query({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) return null
    if (!order.paymentProofStorageId) return null
    return ctx.storage.getUrl(order.paymentProofStorageId)
  },
})

export const getPaymentProofUrlInternal = internalQuery({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return ctx.storage.getUrl(args.storageId)
  },
})

// ── Admin payment review actions ───────────────────────────────────────────────

export const adminConfirmPayment = internalMutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return
    const historyEntry =
      order.paymentProofStorageId
        ? {
            storageId: order.paymentProofStorageId,
            uploadedAt: order.paymentProofUploadedAt ?? Date.now(),
            decision: 'paid' as const,
            decidedAt: Date.now(),
          }
        : null
    await ctx.db.patch(args.orderId, {
      status: 'paid',
      partialAmountReceived: undefined,
      partialAmountPending: undefined,
      partialPaymentDueAt: undefined,
      paymentProofHistory: historyEntry
        ? [...(order.paymentProofHistory ?? []), historyEntry]
        : order.paymentProofHistory,
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendPaymentConfirmedEmail, {
      orderId: args.orderId,
    })
  },
})

export const adminMarkPartialPayment = internalMutation({
  args: {
    orderId: v.id('orders'),
    amountReceived: v.number(),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return
    // Accumulate previously received amounts so repeated partial payments are tracked correctly
    const totalReceived = Number(((order.partialAmountReceived ?? 0) + args.amountReceived).toFixed(2))
    const amountPending = Number((order.total - totalReceived).toFixed(2))
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const historyEntry =
      order.paymentProofStorageId
        ? {
            storageId: order.paymentProofStorageId,
            uploadedAt: order.paymentProofUploadedAt ?? Date.now(),
            decision: 'partial_payment' as const,
            decidedAt: Date.now(),
            adminNote: args.adminNote,
          }
        : null
    await ctx.db.patch(args.orderId, {
      status: 'partial_payment',
      partialAmountReceived: totalReceived,
      partialAmountPending: amountPending,
      partialPaymentDueAt: Date.now() + thirtyDaysMs,
      adminNote: args.adminNote,
      paymentProofHistory: historyEntry
        ? [...(order.paymentProofHistory ?? []), historyEntry]
        : order.paymentProofHistory,
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendPartialPaymentEmail, {
      orderId: args.orderId,
      amountReceived: args.amountReceived,
      amountPending,
    })
  },
})

export const adminRejectPayment = internalMutation({
  args: {
    orderId: v.id('orders'),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return
    const historyEntry =
      order.paymentProofStorageId
        ? {
            storageId: order.paymentProofStorageId,
            uploadedAt: order.paymentProofUploadedAt ?? Date.now(),
            decision: 'rejected' as const,
            decidedAt: Date.now(),
            adminNote: args.adminNote,
          }
        : null
    // If partial payment was already received, revert to partial_payment so the
    // user knows to upload proof for the remaining amount, not start from scratch.
    const revertStatus: 'pending_payment' | 'partial_payment' =
      order.partialAmountReceived != null ? 'partial_payment' : 'pending_payment'
    await ctx.db.patch(args.orderId, {
      status: revertStatus,
      adminNote: args.adminNote,
      paymentProofHistory: historyEntry
        ? [...(order.paymentProofHistory ?? []), historyEntry]
        : order.paymentProofHistory,
    })
  },
})

// ── One-time migration: remove legacy invoiceUrl field ────────────────────────

export const removeInvoiceUrlField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('orders').collect()
    let count = 0
    for (const order of orders) {
      if ('invoiceUrl' in order) {
        await ctx.db.patch(order._id, { invoiceUrl: undefined })
        count++
      }
    }
    return { patched: count }
  },
})

// ── Auto-cancel helper (called by cron) ───────────────────────────────────────

export const cancelExpiredOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const expiredOrders = await ctx.db
      .query('orders')
      .filter((q) =>
        q.and(
          q.eq(q.field('status'), 'pending_payment'),
          q.lt(q.field('createdAt'), sevenDaysAgo),
        ),
      )
      .collect()
    for (const order of expiredOrders) {
      await ctx.db.patch(order._id, { status: 'cancelled' })
    }
  },
})

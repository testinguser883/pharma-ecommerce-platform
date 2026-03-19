import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'
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
  handler: async () => {
    return process.env.BTC_WALLET_ADDRESS ?? null
  },
})

export const createBtcOrder = mutation({
  args: {
    billingAddress: billingAddressArg,
    shippingAddress: shippingAddressArg,
  },
  handler: async (ctx, args) => {
    assertIndiaOnlyDelivery(args)
    const userId = await getAuthenticatedUserId(ctx)
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

    // Clear cart
    await ctx.db.patch(cart._id, { items: [], total: 0, updatedAt: Date.now() })

    return { orderId, total }
  },
})

export const saveBtcPaymentDetails = mutation({
  args: {
    orderId: v.id('orders'),
    btcAmountDue: v.number(),
    btcPriceUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) {
      throw new Error('Order not found')
    }
    await ctx.db.patch(args.orderId, {
      btcAmountDue: args.btcAmountDue,
      btcPriceUsd: args.btcPriceUsd,
      btcPriceUpdatedAt: Date.now(),
    })
  },
})

export const generatePaymentProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUserId(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const savePaymentProof = mutation({
  args: {
    orderId: v.id('orders'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Enforce 5 MB limit server-side — delete the file and reject if oversized
    const metadata = await ctx.storage.getMetadata(args.storageId)
    if (!metadata) {
      throw new Error('Uploaded file not found')
    }
    if (metadata.size > MAX_PROOF_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId)
      throw new Error('File too large. Maximum size is 5 MB.')
    }

    const order = await ctx.db.get(args.orderId)
    if (!order || order.userId !== userId) {
      await ctx.storage.delete(args.storageId)
      throw new Error('Order not found')
    }
    if (order.status === 'paid' || order.status === 'cancelled') {
      await ctx.storage.delete(args.storageId)
      throw new Error('Cannot upload proof for this order status')
    }
    await ctx.db.patch(args.orderId, {
      paymentProofStorageId: args.storageId,
      paymentProofUploadedAt: Date.now(),
      status: 'payment_review',
    })
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

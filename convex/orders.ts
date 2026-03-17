import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
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
    throw new Error('Standard checkout is disabled. Please use crypto payment.')
  },
})

export const createPendingCryptoOrder = mutation({
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
    return { orderId, total }
  },
})

export const createNowPaymentsInvoice = action({
  args: {
    orderId: v.id('orders'),
    payCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId,
    })
    if (!order || order.userId !== userId) {
      throw new Error('Order not found')
    }
    if (order.paymentMethod !== 'crypto') {
      throw new Error('Invalid payment method')
    }
    if (order.status !== 'pending_payment') {
      throw new Error('Order is not awaiting payment')
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    if (!apiKey) {
      throw new Error('Payment provider not configured')
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    // const response = await fetch('https://api-sandbox.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: Number(order.total.toFixed(2)),
        price_currency: 'USD',
        pay_currency: args.payCurrency ?? undefined,
        order_id: order._id,
        order_description: `Pharma order ${order._id}`,
        success_url: `${siteUrl}/orders`,
        cancel_url: `${siteUrl}/checkout`,
        ipn_callback_url: convexSiteUrl ? `${convexSiteUrl}/nowpayments-ipn` : undefined,
        is_fee_paid_by_user: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('NOWPayments error:', text)
      throw new Error('Failed to create payment invoice')
    }

    const data = (await response.json()) as { invoice_url: string }
    await ctx.runMutation(internal.orders.saveInvoiceUrl, {
      orderId: args.orderId,
      invoiceUrl: data.invoice_url,
    })
    await ctx.runMutation(internal.cart.clearCartForUser, { userId })
    return { invoiceUrl: data.invoice_url }
  },
})

export const saveInvoiceUrl = internalMutation({
  args: { orderId: v.id('orders'), invoiceUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { invoiceUrl: args.invoiceUrl })
  },
})

export const confirmCryptoPayment = internalMutation({
  args: {
    orderId: v.id('orders'),
    nowPaymentsId: v.string(),
    amountPaid: v.optional(v.number()),
    payAmount: v.optional(v.number()),
    payCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order || order.paymentMethod !== 'crypto') return
    if (order.status === 'paid' && order.nowPaymentsId === args.nowPaymentsId) return
    if (order.status !== 'pending_payment') return
    await ctx.db.patch(args.orderId, {
      status: 'paid',
      nowPaymentsId: args.nowPaymentsId,
      ...(args.amountPaid !== undefined && { amountPaid: args.amountPaid }),
      ...(args.payAmount !== undefined && { payAmount: args.payAmount }),
      ...(args.payCurrency !== undefined && { payCurrency: args.payCurrency }),
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmationEmails, {
      orderId: args.orderId,
    })
  },
})

export const updatePartialCryptoPayment = internalMutation({
  args: {
    orderId: v.id('orders'),
    nowPaymentsId: v.string(),
    amountPaid: v.number(),
    payAmount: v.number(),
    payCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order || order.paymentMethod !== 'crypto') return
    if (order.status !== 'pending_payment') return
    await ctx.db.patch(args.orderId, {
      nowPaymentsId: args.nowPaymentsId,
      amountPaid: args.amountPaid,
      payAmount: args.payAmount,
      payCurrency: args.payCurrency,
    })
  },
})

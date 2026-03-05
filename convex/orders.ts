import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { internal } from './_generated/api'

type ConvexCtx = QueryCtx | MutationCtx

const getAuthenticatedUserId = async (ctx: ConvexCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity.subject
}

function isIndiaCountry(country: string | undefined) {
  if (!country) return false
  return country.toLowerCase().includes('india')
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
    const unitPrice = cartItem.unitPrice ?? product.price
    const lineTotal = Number((unitPrice * cartItem.quantity).toFixed(2))
    orderItems.push({
      productId: product._id,
      name: product.name,
      genericName: product.genericName,
      dosage: cartItem.dosage,
      pillCount: cartItem.pillCount,
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

    await ctx.db.patch(cart._id, {
      items: [],
      total: 0,
      updatedAt: Date.now(),
    })

    return { orderId, total }
  },
})

export const createNowPaymentsInvoice = action({
  args: {
    orderId: v.id('orders'),
    total: v.number(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.NOWPAYMENTS_API_KEY
    if (!apiKey) {
      throw new Error('Payment provider not configured')
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const convexSiteUrl = process.env.CONVEX_SITE_URL

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: args.total,
        price_currency: 'INR',
        order_id: args.orderId,
        order_description: `Pharma order ${args.orderId}`,
        success_url: `${siteUrl}/orders`,
        cancel_url: `${siteUrl}/checkout`,
        ipn_callback_url: convexSiteUrl ? `${convexSiteUrl}/nowpayments-ipn` : undefined,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('NOWPayments error:', text)
      throw new Error('Failed to create payment invoice')
    }

    const data = (await response.json()) as { invoice_url: string }
    return { invoiceUrl: data.invoice_url }
  },
})

export const confirmCryptoPayment = internalMutation({
  args: {
    orderId: v.id('orders'),
    nowPaymentsId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return
    await ctx.db.patch(args.orderId, {
      status: 'paid',
      nowPaymentsId: args.nowPaymentsId,
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmationEmails, {
      orderId: args.orderId,
    })
  },
})

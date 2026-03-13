import { internalMutation, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { resolveProductSelection } from './pricing'

type CartItem = Doc<'carts'>['items'][number]
type ConvexCtx = QueryCtx | MutationCtx

const getAuthenticatedUserId = async (ctx: ConvexCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity.subject
}

const calculateCartTotal = async (ctx: MutationCtx, items: Array<CartItem>) => {
  let total = 0
  for (const item of items) {
    const product = await ctx.db.get(item.productId)
    if (!product) continue
    try {
      const selection = resolveProductSelection(product, item)
      total += selection.unitPrice * item.quantity
    } catch {
      continue
    }
  }
  return Number(total.toFixed(2))
}

const getCartForUser = async (ctx: ConvexCtx, userId: string) => {
  return await ctx.db
    .query('carts')
    .withIndex('by_user_id', (q) => q.eq('userId', userId))
    .unique()
}

const findCartItemIndex = (items: Array<CartItem>, productId: Id<'products'>, dosage?: string, pillCount?: number) => {
  return items.findIndex(
    (item) => item.productId === productId && item.dosage === dosage && item.pillCount === pillCount,
  )
}

export const getMyCart = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const cart = await getCartForUser(ctx, identity.subject)
    if (!cart) {
      return { items: [], total: 0 }
    }

    const hydratedItems: Array<{
      productId: Id<'products'>
      name: string
      genericName: string
      dosage?: string
      pillCount?: number
      quantity: number
      image: string
      price: number
      unit: string
      lineTotal: number
      inStock: boolean
    }> = []

    for (const item of cart.items) {
      const product = await ctx.db.get(item.productId)
      if (!product) {
        continue
      }
      let price: number
      try {
        price = resolveProductSelection(product, item).unitPrice
      } catch {
        continue
      }
      const unit = item.pillCount ? `package (${item.pillCount} ${product.unit}s)` : product.unit
      hydratedItems.push({
        productId: product._id,
        name: product.name,
        genericName: product.genericName,
        dosage: item.dosage,
        pillCount: item.pillCount,
        quantity: item.quantity,
        image: product.image,
        price,
        unit,
        lineTotal: Number((price * item.quantity).toFixed(2)),
        inStock: product.inStock,
      })
    }

    const total = hydratedItems.reduce((acc, item) => acc + item.lineTotal, 0)

    return {
      items: hydratedItems,
      total: Number(total.toFixed(2)),
    }
  },
})

export const getItemCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return 0
    }
    const cart = await getCartForUser(ctx, identity.subject)
    if (!cart) {
      return 0
    }

    let itemCount = 0
    for (const item of cart.items) {
      const product = await ctx.db.get(item.productId)
      if (!product) continue
      try {
        resolveProductSelection(product, item)
        itemCount += item.quantity
      } catch {
        continue
      }
    }
    return itemCount
  },
})

export const addItem = mutation({
  args: {
    productId: v.id('products'),
    quantity: v.optional(v.number()),
    dosage: v.optional(v.string()),
    pillCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const quantity = Math.max(1, Math.min(args.quantity ?? 1, 99))

    const product = await ctx.db.get(args.productId)
    if (!product || !product.inStock) {
      throw new Error('Product is not available')
    }
    const selection = resolveProductSelection(product, args)

    const cart = await getCartForUser(ctx, userId)
    const items = [...(cart?.items ?? [])]

    const existingItemIdx = findCartItemIndex(items, args.productId, selection.dosage, selection.pillCount)
    if (existingItemIdx >= 0) {
      const existingItem = items[existingItemIdx]
      items[existingItemIdx] = {
        ...existingItem,
        quantity: Math.min(existingItem.quantity + quantity, 99),
        unitPrice: selection.unitPrice,
      }
    } else {
      items.push({
        productId: args.productId,
        quantity,
        dosage: selection.dosage,
        pillCount: selection.pillCount,
        unitPrice: selection.unitPrice,
      })
    }

    const total = await calculateCartTotal(ctx, items)
    const updatedAt = Date.now()

    if (cart) {
      await ctx.db.patch(cart._id, { items, total, updatedAt })
      return { cartId: cart._id }
    }

    const cartId = await ctx.db.insert('carts', {
      userId,
      items,
      total,
      updatedAt,
    })
    return { cartId }
  },
})

export const updateItemQuantity = mutation({
  args: {
    productId: v.id('products'),
    quantity: v.number(),
    dosage: v.optional(v.string()),
    pillCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const cart = await getCartForUser(ctx, userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    const items = [...cart.items]
    const itemIndex = findCartItemIndex(items, args.productId, args.dosage, args.pillCount)
    if (itemIndex < 0) {
      throw new Error('Cart item not found')
    }

    if (args.quantity <= 0) {
      items.splice(itemIndex, 1)
    } else {
      items[itemIndex] = {
        ...items[itemIndex],
        quantity: Math.min(Math.max(args.quantity, 1), 99),
      }
    }

    const total = await calculateCartTotal(ctx, items)
    await ctx.db.patch(cart._id, { items, total, updatedAt: Date.now() })
    return { success: true }
  },
})

export const removeItem = mutation({
  args: {
    productId: v.id('products'),
    dosage: v.optional(v.string()),
    pillCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const cart = await getCartForUser(ctx, userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    const items = cart.items.filter(
      (item) =>
        !(item.productId === args.productId && item.dosage === args.dosage && item.pillCount === args.pillCount),
    )
    const total = await calculateCartTotal(ctx, items)
    await ctx.db.patch(cart._id, { items, total, updatedAt: Date.now() })
    return { success: true }
  },
})

export const clearCart = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx)
    const cart = await getCartForUser(ctx, userId)
    if (!cart) {
      return { success: true }
    }
    await ctx.db.patch(cart._id, {
      items: [],
      total: 0,
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})

export const clearCartForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const cart = await getCartForUser(ctx, args.userId)
    if (!cart) {
      return { success: true }
    }
    await ctx.db.patch(cart._id, {
      items: [],
      total: 0,
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})

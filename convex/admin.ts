import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { authComponent } from './auth'

// Checks that the current user's email matches the ADMIN_EMAIL env var set in Convex dashboard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminUser(ctx: any) {
  const user = await authComponent.safeGetAuthUser(ctx)
  if (!user) return null
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const email = (user as any).email as string | undefined
  if (!email || email !== adminEmail) return null
  return user
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAdminUser(ctx)
    return user !== null
  },
})

export const listAllProducts = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const search = args.search?.trim()
    if (search) {
      return ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => q.search('searchText', search))
        .take(100)
    }
    return ctx.db.query('products').order('desc').collect()
  },
})

const pricingMatrixArg = v.optional(v.array(v.object({
  dosage: v.string(),
  packages: v.array(v.object({
    pillCount: v.number(),
    originalPrice: v.number(),
    price: v.number(),
    benefits: v.optional(v.array(v.string())),
  })),
})))

export const createProduct = mutation({
  args: {
    name: v.string(),
    genericName: v.string(),
    category: v.string(),
    description: v.string(),
    fullDescription: v.optional(v.string()),
    price: v.number(),
    unit: v.string(),
    dosageOptions: v.array(v.string()),
    pricingMatrix: pricingMatrixArg,
    image: v.string(),
    imageAlt: v.optional(v.string()),
    discount: v.number(),
    inStock: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const searchText = `${args.name} ${args.genericName} ${args.category} ${args.description}`.toLowerCase()
    return ctx.db.insert('products', { ...args, searchText })
  },
})

export const updateProduct = mutation({
  args: {
    id: v.id('products'),
    name: v.string(),
    genericName: v.string(),
    category: v.string(),
    description: v.string(),
    fullDescription: v.optional(v.string()),
    price: v.number(),
    unit: v.string(),
    dosageOptions: v.array(v.string()),
    pricingMatrix: pricingMatrixArg,
    image: v.string(),
    imageAlt: v.optional(v.string()),
    discount: v.number(),
    inStock: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const { id, ...fields } = args
    const searchText = `${fields.name} ${fields.genericName} ${fields.category} ${fields.description}`.toLowerCase()
    await ctx.db.patch(id, { ...fields, searchText })
  },
})

export const deleteProduct = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.delete(args.id)
  },
})

export const toggleStock = mutation({
  args: { id: v.id('products'), inStock: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.patch(args.id, { inStock: args.inStock })
  },
})

export const toggleVisibility = mutation({
  args: { id: v.id('products'), isVisible: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.patch(args.id, { isVisible: args.isVisible })
  },
})

// ── Categories ────────────────────────────────────────────────────────────────

export const listAdminCategories = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const cats = await ctx.db.query('categories').collect()
    return cats.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const createCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    return ctx.db.insert('categories', { name: args.name.trim(), icon: 'pill' })
  },
})

export const updateCategory = mutation({
  args: { id: v.id('categories'), name: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.patch(args.id, { name: args.name.trim() })
  },
})

export const deleteCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.delete(args.id)
  },
})

// ── Orders (admin) ────────────────────────────────────────────────────────────

export const listAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    return ctx.db.query('orders').order('desc').collect()
  },
})

export const updateOrderStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.union(
      v.literal('pending_payment'),
      v.literal('pending'),
      v.literal('paid'),
      v.literal('processing'),
      v.literal('shipped'),
      v.literal('delivered'),
      v.literal('cancelled'),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.patch(args.id, { status: args.status })
  },
})

// ── Slider images ─────────────────────────────────────────────────────────────

export const listSliderImages = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('sliderImages').order('asc').collect()
  },
})

export const listActiveSliderImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query('sliderImages').collect()
    return images.filter((img) => img.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const addSliderImage = mutation({
  args: {
    url: v.string(),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const existing = await ctx.db.query('sliderImages').collect()
    if (existing.length >= 5) throw new Error('Maximum 5 slider images allowed')
    const maxOrder = existing.reduce((m, img) => Math.max(m, img.sortOrder), 0)
    return ctx.db.insert('sliderImages', {
      url: args.url,
      altText: args.altText,
      sortOrder: maxOrder + 1,
      isActive: true,
    })
  },
})

export const updateSliderImage = mutation({
  args: {
    id: v.id('sliderImages'),
    altText: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

export const deleteSliderImage = mutation({
  args: { id: v.id('sliderImages') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.delete(args.id)
  },
})

export const reorderSliderImages = mutation({
  args: { orderedIds: v.array(v.id('sliderImages')) },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { sortOrder: i + 1 })
    }
  },
})

// ── File storage ──────────────────────────────────────────────────────────────
// File storage — generates a short-lived signed URL for the client to POST an image to
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    return ctx.storage.generateUploadUrl()
  },
})

// After upload, resolves the storageId into a permanent CDN URL
export const getUploadedImageUrl = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    return ctx.storage.getUrl(args.storageId as Id<'_storage'>)
  },
})

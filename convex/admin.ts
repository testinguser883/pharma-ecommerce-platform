import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { authComponent } from './auth'
import { DEFAULT_UNIT_TYPES } from './constants'

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

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveSlug(ctx: any, input: string, excludeId?: string): Promise<string> {
  const base = slugify(input)
  let candidate = base
  let i = 2
  while (true) {
    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q: any) => q.eq('slug', candidate))
      .first()
    if (!existing || existing._id === excludeId) return candidate
    candidate = `${base}-${i++}`
  }
}

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
    slug: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ensureCategoryExists(ctx, args.category)
    const slug = await resolveSlug(ctx, args.slug || `${args.name} ${args.genericName}`)
    const searchText = `${args.name} ${args.genericName} ${args.category} ${args.description}`.toLowerCase()
    return ctx.db.insert('products', { ...args, slug, searchText })
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
    slug: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ensureCategoryExists(ctx, args.category)
    const { id, ...fields } = args
    const slug = await resolveSlug(ctx, fields.slug || `${fields.name} ${fields.genericName}`, id)
    const searchText = `${fields.name} ${fields.genericName} ${fields.category} ${fields.description}`.toLowerCase()
    await ctx.db.patch(id, { ...fields, slug, searchText })
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

export const toggleRecommended = mutation({
  args: { id: v.id('products'), isRecommended: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.db.patch(args.id, { isRecommended: args.isRecommended })
  },
})

// Ensures a category with the given name exists in the DB.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureCategoryExists(ctx: any, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = await ctx.db
    .query('categories')
    .collect()
    .then((cats: { name: string }[]) => cats.find((c) => c.name === trimmed))
  if (!existing) {
    await ctx.db.insert('categories', { name: trimmed, icon: 'pill' })
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export const categoryProductCounts = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const products = await ctx.db.query('products').collect()
    const counts: Record<string, number> = {}
    for (const p of products) {
      counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    return counts
  },
})

export const productsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    return ctx.db
      .query('products')
      .withIndex('by_category_and_name', (q) => q.eq('category', args.category))
      .collect()
  },
})

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

export const listUnitTypes = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const units = await ctx.db.query('unitTypes').collect()
    if (units.length === 0) return DEFAULT_UNIT_TYPES.map((name) => ({ _id: name, name }))
    return units.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const createUnitType = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const name = args.name.trim()
    const existing = await ctx.db.query('unitTypes').collect()
    // Seed defaults if table is empty (first time a unit is created post-deploy)
    if (existing.length === 0) {
      for (const defaultName of DEFAULT_UNIT_TYPES) {
        await ctx.db.insert('unitTypes', { name: defaultName })
      }
    } else if (existing.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    return ctx.db.insert('unitTypes', { name })
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
    const category = await ctx.db.get(args.id)
    if (!category) throw new Error('Category not found')
    const products = await ctx.db
      .query('products')
      .withIndex('by_category_and_name', (q) => q.eq('category', category.name))
      .collect()
    if (products.length > 0)
      throw new Error(`Cannot delete: ${products.length} product${products.length === 1 ? '' : 's'} use this category`)
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

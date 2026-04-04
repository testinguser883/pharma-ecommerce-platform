import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { authComponent } from './auth'
import { DEFAULT_UNIT_TYPES } from './constants'

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null
}

function getConfiguredAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL)
}

function getConfiguredAdminUserId() {
  const raw = process.env.ADMIN_USER_ID?.trim()
  return raw ? raw : null
}

async function getAssignedAdminRole(ctx: { db: { query: (table: 'adminRoles') => any } }, userId: string | undefined) {
  if (!userId) return null
  return await ctx.db
    .query('adminRoles')
    .withIndex('by_user_id', (q: any) => q.eq('userId', userId))
    .unique()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminState(ctx: any) {
  const user = await authComponent.safeGetAuthUser(ctx)
  if (!user) {
    return {
      user: null,
      isAdmin: false,
      isSuperAdmin: false,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const email = normalizeEmail((user as any).email as string | undefined)
  const configuredAdminEmail = getConfiguredAdminEmail()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = String((user as any)._id ?? (user as any).id ?? '')
  const configuredAdminUserId = getConfiguredAdminUserId()

  const isSuperAdminByUserId = Boolean(configuredAdminUserId && userId && userId === configuredAdminUserId)
  const isSuperAdminByEmail = Boolean(configuredAdminEmail && email === configuredAdminEmail)
  const isSuperAdmin = isSuperAdminByUserId || isSuperAdminByEmail

  const assignedAdminRole = await getAssignedAdminRole(ctx, userId || undefined)

  return {
    user,
    isAdmin: isSuperAdmin || assignedAdminRole !== null,
    isSuperAdmin,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminUser(ctx: any) {
  const state = await getAdminState(ctx)
  return state.isAdmin ? state.user : null
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const state = await getAdminState(ctx)
    return state.isAdmin
  },
})

export const isSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    const state = await getAdminState(ctx)
    return state.isSuperAdmin
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

type AuthUserRecord = {
  _id?: string
  id?: string
  name?: string | null
  email?: string | null
  emailVerified?: boolean
  createdAt?: number
  updatedAt?: number
}

function getAuthUserRecordId(user: AuthUserRecord) {
  return String(user.id ?? user._id ?? '')
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function normalizeHttpUrl(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listAuthUsers(ctx: any) {
  const adapter = authComponent.adapter(ctx)({})
  return (await adapter.findMany({
    model: 'user',
    limit: 500,
    sortBy: { field: 'createdAt', direction: 'desc' },
  })) as Array<AuthUserRecord>
}

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const state = await getAdminState(ctx)
    if (!state.isSuperAdmin) return null

    const [users, adminRoles] = await Promise.all([listAuthUsers(ctx), ctx.db.query('adminRoles').collect()])
    const assignedAdminUserIds = new Set(adminRoles.map((role) => role.userId))
    const configuredAdminEmail = getConfiguredAdminEmail()
    const configuredAdminUserId = getConfiguredAdminUserId()

    return users
      .filter((user) => Boolean(user.email))
      .map((user) => {
        const userId = getAuthUserRecordId(user)
        const normalizedEmail = normalizeEmail(user.email)
        const isSuperAdminByUserId = Boolean(configuredAdminUserId && userId && userId === configuredAdminUserId)
        const isSuperAdminByEmail = Boolean(
          configuredAdminEmail && normalizedEmail === configuredAdminEmail && Boolean(user.emailVerified),
        )
        const isSuperAdmin = isSuperAdminByUserId || isSuperAdminByEmail
        const role = isSuperAdmin ? 'super_admin' : assignedAdminUserIds.has(userId) ? 'admin' : 'user'

        return {
          id: userId,
          name: user.name?.trim() || null,
          email: user.email ?? '',
          emailVerified: Boolean(user.emailVerified),
          createdAt: normalizeTimestamp(user.createdAt),
          updatedAt: normalizeTimestamp(user.updatedAt),
          role,
          isSuperAdmin,
        }
      })
  },
})

export const setUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal('user'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const state = await getAdminState(ctx)
    if (!state.isSuperAdmin || !state.user) {
      throw new Error('Not authorized')
    }

    const users = await listAuthUsers(ctx)
    const targetUser = users.find((user) => getAuthUserRecordId(user) === args.userId)
    if (!targetUser) {
      throw new Error('User not found')
    }

    const configuredAdminUserId = getConfiguredAdminUserId()
    if (
      (configuredAdminUserId && args.userId === configuredAdminUserId) ||
      normalizeEmail(targetUser.email) === getConfiguredAdminEmail()
    ) {
      throw new Error('The primary admin role is managed by ADMIN_EMAIL and cannot be changed here.')
    }

    const existingRole = await getAssignedAdminRole(ctx, args.userId)
    if (args.role === 'admin') {
      if (existingRole) {
        await ctx.db.patch(existingRole._id, {
          updatedAt: Date.now(),
          updatedByUserId: String(state.user._id),
        })
      } else {
        await ctx.db.insert('adminRoles', {
          userId: args.userId,
          updatedAt: Date.now(),
          updatedByUserId: String(state.user._id),
        })
      }
      return { success: true }
    }

    if (existingRole) {
      await ctx.db.delete(existingRole._id)
    }

    return { success: true }
  },
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

const pricingMatrixArg = v.optional(
  v.array(
    v.object({
      dosage: v.string(),
      packages: v.array(
        v.object({
          pillCount: v.number(),
          originalPrice: v.number(),
          price: v.number(),
          benefits: v.optional(v.array(v.string())),
          expiryDate: v.optional(v.string()),
        }),
      ),
    }),
  ),
)

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
    const searchText = `${args.name} ${args.genericName}`.toLowerCase()
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
    const searchText = `${fields.name} ${fields.genericName}`.toLowerCase()
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

export const backfillSearchText = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const products = await ctx.db.query('products').collect()
    for (const product of products) {
      const searchText = `${product.name} ${product.genericName}`.toLowerCase()
      if (product.searchText !== searchText) {
        await ctx.db.patch(product._id, { searchText })
      }
    }
    return { updated: products.length }
  },
})

export const backfillSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    const products = await ctx.db.query('products').collect()
    let updated = 0
    for (const product of products) {
      if (!product.slug) {
        const slug = await resolveSlug(ctx, `${product.name} ${product.genericName}`, product._id)
        await ctx.db.patch(product._id, { slug })
        updated++
      }
    }
    return { updated }
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
    const category = await ctx.db.get(args.id)
    if (!category) throw new Error('Category not found')
    const newName = args.name.trim()
    await ctx.db.patch(args.id, { name: newName })
    // Cascade rename to all products in this category
    const products = await ctx.db
      .query('products')
      .withIndex('by_category_and_name', (q) => q.eq('category', category.name))
      .collect()
    for (const product of products) {
      await ctx.db.patch(product._id, { category: newName })
    }
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

export const listOrdersForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    return await ctx.db
      .query('orders')
      .withIndex('by_user_id_and_created_at', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect()
  },
})

export const updateOrderStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.union(
      v.literal('pending_payment'),
      v.literal('payment_review'),
      v.literal('partial_payment'),
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

export const adminConfirmPayment = mutation({
  args: { id: v.id('orders') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.runMutation(internal.orders.adminConfirmPayment, { orderId: args.id })
  },
})

export const adminMarkPartialPayment = mutation({
  args: {
    id: v.id('orders'),
    amountReceived: v.number(),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.runMutation(internal.orders.adminMarkPartialPayment, {
      orderId: args.id,
      amountReceived: args.amountReceived,
      adminNote: args.adminNote,
    })
  },
})

export const adminRejectPayment = mutation({
  args: {
    id: v.id('orders'),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')
    await ctx.runMutation(internal.orders.adminRejectPayment, {
      orderId: args.id,
      adminNote: args.adminNote,
    })
  },
})

export const getOrderPaymentProofUrl = query({
  args: { id: v.id('orders') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const order = await ctx.db.get(args.id)
    if (!order?.paymentProofStorageId) return null
    return ctx.storage.getUrl(order.paymentProofStorageId)
  },
})

export const getPaymentProofHistory = query({
  args: { id: v.id('orders') },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
    const order = await ctx.db.get(args.id)
    if (!order?.paymentProofHistory?.length) return []
    return Promise.all(
      order.paymentProofHistory.map(async (entry) => ({
        storageId: entry.storageId,
        uploadedAt: entry.uploadedAt,
        decision: entry.decision,
        decidedAt: entry.decidedAt,
        adminNote: entry.adminNote,
        url: await ctx.storage.getUrl(entry.storageId),
      })),
    )
  },
})

export const updateOrderTracking = mutation({
  args: {
    id: v.id('orders'),
    trackingWebsite: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminUser(ctx)
    if (!admin) throw new Error('Not authorized')

    const trackingWebsiteRaw = args.trackingWebsite?.trim()
    const trackingWebsite = trackingWebsiteRaw ? normalizeHttpUrl(trackingWebsiteRaw) : null
    if (trackingWebsiteRaw && !trackingWebsite) {
      throw new Error('Invalid tracking website URL. Please use an http(s) URL.')
    }
    const trackingNumber = args.trackingNumber?.trim()

    await ctx.db.patch(args.id, {
      trackingWebsite: trackingWebsite || undefined,
      trackingNumber: trackingNumber || undefined,
    })
  },
})

// ── Slider images ─────────────────────────────────────────────────────────────

export const listSliderImages = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdminUser(ctx)
    if (!admin) return null
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
    titleText: v.optional(v.string()),
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
      titleText: args.titleText,
      sortOrder: maxOrder + 1,
      isActive: true,
    })
  },
})

export const updateSliderImage = mutation({
  args: {
    id: v.id('sliderImages'),
    altText: v.optional(v.string()),
    titleText: v.optional(v.string()),
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

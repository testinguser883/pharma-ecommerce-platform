import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'

function isVisibleInStorefront(product: Doc<'products'> | null | undefined) {
  return Boolean(product && product.isVisible !== false)
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase()
}

function matchesStorefrontSearch(product: Doc<'products'>, search: string) {
  const searchableFields = [product.name, product.genericName]

  return searchableFields.some((field) => normalizeSearchValue(field).includes(search))
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 24, 100))
    const search = args.search?.trim()
    const category = args.category?.trim()

    let products: Array<Doc<'products'>> = []

    if (search && search.length > 0) {
      const normalizedSearch = normalizeSearchValue(search)
      products = category
        ? await ctx.db
            .query('products')
            .withIndex('by_category_and_name', (q) => q.eq('category', category))
            .collect()
        : await ctx.db.query('products').order('desc').collect()

      return products
        .filter((p) => p.isVisible !== false)
        .filter((p) => matchesStorefrontSearch(p, normalizedSearch))
        .slice(0, limit)
    }

    if (category) {
      products = await ctx.db
        .query('products')
        .withIndex('by_category_and_name', (q) => q.eq('category', category))
        .take(limit)
      return products.filter((p) => p.isVisible !== false)
    }

    products = await ctx.db.query('products').order('desc').take(limit)
    return products.filter((p) => p.isVisible !== false)
  },
})

export const listRecommended = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').order('desc').collect()
    return products.filter((p) => isVisibleInStorefront(p) && p.isRecommended === true)
  },
})

export const getById = query({
  args: {
    productId: v.id('products'),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    return isVisibleInStorefront(product) ? product : null
  },
})

export const getBySlugOrId = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.identifier))
      .first()
    if (bySlug) return isVisibleInStorefront(bySlug) ? bySlug : null
    try {
      const product = await ctx.db.get(args.identifier as Id<'products'>)
      return isVisibleInStorefront(product) ? product : null
    } catch {
      return null
    }
  },
})

export const related = query({
  args: {
    productId: v.id('products'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product || product.isVisible === false) {
      return []
    }

    const relatedLimit = Math.max(1, Math.min(args.limit ?? 4, 12))
    const relatedProducts = await ctx.db
      .query('products')
      .withIndex('by_category_and_name', (q) => q.eq('category', product.category))
      .take(relatedLimit + 1)

    return relatedProducts
      .filter((item) => item._id !== product._id && isVisibleInStorefront(item))
      .slice(0, relatedLimit)
  },
})

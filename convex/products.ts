import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'

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
      products = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let searchQuery = q.search('searchText', search)
          if (category) {
            searchQuery = searchQuery.eq('category', category)
          }
          return searchQuery
        })
        .take(limit)
      return products.filter((p) => p.isVisible !== false)
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

export const getById = query({
  args: {
    productId: v.id('products'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId)
  },
})

export const related = query({
  args: {
    productId: v.id('products'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product) {
      return []
    }

    const relatedLimit = Math.max(1, Math.min(args.limit ?? 4, 12))
    const relatedProducts = await ctx.db
      .query('products')
      .withIndex('by_category_and_name', (q) => q.eq('category', product.category))
      .take(relatedLimit + 1)

    return relatedProducts
      .filter((item) => item._id !== product._id && item.isVisible !== false)
      .slice(0, relatedLimit)
  },
})

import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

export const getProductImageSourceByIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.identifier))
      .first()

    if (bySlug && bySlug.isVisible !== false) {
      return {
        image: bySlug.image,
        alt: bySlug.imageAlt ?? bySlug.name,
        name: bySlug.name,
      }
    }

    try {
      const product = await ctx.db.get(args.identifier as Id<'products'>)
      if (!product || product.isVisible === false) return null
      return {
        image: product.image,
        alt: product.imageAlt ?? product.name,
        name: product.name,
      }
    } catch {
      return null
    }
  },
})

export const getSliderImageSourceById = query({
  args: { id: v.id('sliderImages') },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id)
    if (!image || !image.isActive) return null

    return {
      image: image.url,
      alt: image.altText ?? image.titleText ?? 'Slider image',
    }
  },
})

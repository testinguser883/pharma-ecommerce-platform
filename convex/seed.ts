import { internalMutation, query } from './_generated/server'
import { CATEGORY_NAMES, SEED_PRODUCTS } from './sampleData'
import { DEFAULT_UNIT_TYPES } from './constants'

export const getSeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const categoryCount = (await ctx.db.query('categories').take(1)).length
    const productCount = (await ctx.db.query('products').take(1)).length
    return {
      categoriesSeeded: categoryCount > 0,
      productsSeeded: productCount > 0,
      isSeeded: categoryCount > 0 && productCount > 0,
    }
  },
})

export const seedDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingCategories = await ctx.db.query('categories').take(1)
    const existingProducts = await ctx.db.query('products').take(1)

    if (existingCategories.length === 0) {
      for (const [index, categoryName] of CATEGORY_NAMES.entries()) {
        await ctx.db.insert('categories', {
          name: categoryName,
          icon: 'heart',
          sortOrder: index,
        })
      }
    }

    if (existingProducts.length === 0) {
      for (const product of SEED_PRODUCTS) {
        await ctx.db.insert('products', {
          ...product,
          searchText: `${product.name} ${product.genericName}`.toLowerCase(),
        })
      }
    }

    const existingUnits = await ctx.db.query('unitTypes').collect()
    const existingNames = new Set(existingUnits.map((u) => u.name.toLowerCase()))
    let unitsInserted = 0
    for (const name of DEFAULT_UNIT_TYPES) {
      if (!existingNames.has(name.toLowerCase())) {
        await ctx.db.insert('unitTypes', { name })
        unitsInserted++
      }
    }

    return {
      categoriesInserted: existingCategories.length === 0 ? CATEGORY_NAMES.length : 0,
      productsInserted: existingProducts.length === 0 ? SEED_PRODUCTS.length : 0,
      unitsInserted,
    }
  },
})

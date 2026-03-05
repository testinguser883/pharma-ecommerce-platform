import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const cartItemValidator = v.object({
  productId: v.id('products'),
  dosage: v.optional(v.string()),
  quantity: v.number(),
})

const orderItemValidator = v.object({
  productId: v.id('products'),
  name: v.string(),
  genericName: v.string(),
  dosage: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
  unit: v.string(),
  lineTotal: v.number(),
  image: v.string(),
})

const addressValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  streetAddress: v.string(),
  city: v.string(),
  country: v.string(),
  state: v.string(),
  zipCode: v.string(),
})

const billingAddressValidator = v.object({
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
})

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    icon: v.string(),
    sortOrder: v.optional(v.number()),
  }),

  products: defineTable({
    name: v.string(),
    genericName: v.string(),
    category: v.string(),
    description: v.string(),
    price: v.number(),
    unit: v.string(),
    dosageOptions: v.array(v.string()),
    image: v.string(),
    imageAlt: v.optional(v.string()),
    discount: v.number(),
    inStock: v.boolean(),
    isBestseller: v.optional(v.boolean()),
    isVisible: v.optional(v.boolean()), // undefined / true = visible, false = hidden from shop
    searchText: v.string(),
    // SEO metadata
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  })
    .index('by_category_and_name', ['category', 'name'])
    .searchIndex('search_products', {
      searchField: 'searchText',
      filterFields: ['category', 'inStock'],
    }),

  carts: defineTable({
    userId: v.string(),
    items: v.array(cartItemValidator),
    total: v.number(),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),

  orders: defineTable({
    userId: v.string(),
    items: v.array(orderItemValidator),
    status: v.union(
      v.literal('pending_payment'),
      v.literal('pending'),
      v.literal('paid'),
      v.literal('processing'),
      v.literal('shipped'),
      v.literal('delivered'),
      v.literal('cancelled'),
    ),
    total: v.number(),
    createdAt: v.number(),
    paymentMethod: v.optional(v.union(v.literal('standard'), v.literal('crypto'))),
    nowPaymentsId: v.optional(v.string()),
    billingAddress: v.optional(billingAddressValidator),
    shippingAddress: v.optional(
      v.union(
        v.object({ sameAsBilling: v.literal(true) }),
        v.object({ sameAsBilling: v.literal(false), ...addressValidator.fields }),
      ),
    ),
  }).index('by_user_id_and_created_at', ['userId', 'createdAt']),

  sliderImages: defineTable({
    url: v.string(),
    altText: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  }),
})

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const cartItemValidator = v.object({
  productId: v.id('products'),
  dosage: v.optional(v.string()),
  pillCount: v.optional(v.number()),
  unitPrice: v.optional(v.number()),
  quantity: v.number(),
})

const orderItemValidator = v.object({
  productId: v.id('products'),
  name: v.string(),
  genericName: v.string(),
  dosage: v.optional(v.string()),
  pillCount: v.optional(v.number()),
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

const packageValidator = v.object({
  pillCount: v.number(),
  originalPrice: v.number(),
  price: v.number(),
  benefits: v.optional(v.array(v.string())),
  expiryDate: v.optional(v.string()),
})

const dosagePricingValidator = v.object({
  dosage: v.string(),
  packages: v.array(packageValidator),
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
    fullDescription: v.optional(v.string()),
    price: v.number(),
    unit: v.string(),
    dosageOptions: v.array(v.string()),
    pricingMatrix: v.optional(v.array(dosagePricingValidator)),
    image: v.string(),
    imageAlt: v.optional(v.string()),
    discount: v.number(),
    inStock: v.boolean(),
    isBestseller: v.optional(v.boolean()),
    isVisible: v.optional(v.boolean()),
    isRecommended: v.optional(v.boolean()),
    slug: v.optional(v.string()),
    searchText: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
  })
    .index('by_category_and_name', ['category', 'name'])
    .index('by_slug', ['slug'])
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
      v.literal('payment_review'),
      v.literal('partial_payment'),
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
    // BTC direct payment fields
    btcAmountDue: v.optional(v.number()),
    btcPriceUsd: v.optional(v.number()),
    btcPriceUpdatedAt: v.optional(v.number()),
    paymentProofStorageId: v.optional(v.id('_storage')),
    paymentProofUploadedAt: v.optional(v.number()),
    lastUploadUrlGeneratedAt: v.optional(v.number()),
    totalProofUploads: v.optional(v.number()),
    partialAmountReceived: v.optional(v.number()),
    partialAmountPending: v.optional(v.number()),
    partialPaymentDueAt: v.optional(v.number()),
    adminNote: v.optional(v.string()),
    trackingWebsite: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()), // legacy: to be removed after migration
    paymentProofHistory: v.optional(
      v.array(
        v.object({
          storageId: v.id('_storage'),
          uploadedAt: v.number(),
          decision: v.union(v.literal('paid'), v.literal('partial_payment'), v.literal('rejected')),
          decidedAt: v.number(),
          adminNote: v.optional(v.string()),
        }),
      ),
    ),
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
    titleText: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  }),

  unitTypes: defineTable({
    name: v.string(),
  }),

  adminRoles: defineTable({
    userId: v.string(),
    updatedAt: v.number(),
    updatedByUserId: v.string(),
  }).index('by_user_id', ['userId']),
})

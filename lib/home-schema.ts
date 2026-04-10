import type { Doc } from '@/convex/_generated/dataModel'
import { toAbsoluteProductImageUrl } from '@/lib/image-url'
import { siteInputs } from '@/lib/site-inputs'

type HomeProduct = Doc<'products'>

const BREADCRUMB_NAMES: Record<string, string> = {
  '/': 'Home',
  '/about-us': 'About Us',
  '/contact-us': 'Contact Us',
  '/faq': 'FAQ',
  '/our-policy': 'Our Policy',
  '/terms-conditions': 'Terms and Conditions',
  '/testimonials': 'Testimonials',
}

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url : `${url}/`
}

function toAbsoluteUrl(pathOrUrl: string, baseUrl: string) {
  return new URL(pathOrUrl, normalizeBaseUrl(baseUrl)).toString()
}

function getProductOfferPrice(product: HomeProduct) {
  if (product.pricingMatrix && product.pricingMatrix.length > 0) {
    let lowestPrice = Number.POSITIVE_INFINITY
    for (const dosage of product.pricingMatrix) {
      for (const pkg of dosage.packages) {
        if (pkg.price > 0 && pkg.price < lowestPrice) {
          lowestPrice = pkg.price
        }
      }
    }
    if (lowestPrice !== Number.POSITIVE_INFINITY) {
      return Number(lowestPrice.toFixed(2))
    }
  }

  return Number(((product.price ?? 0) * (1 - (product.discount ?? 0) / 100)).toFixed(2))
}

function buildProductOfferEntries(product: HomeProduct, siteUrl: string) {
  const identifier = product.slug ?? product._id
  const baseUrl = toAbsoluteUrl(`/${identifier}`, siteUrl)

  if (product.pricingMatrix && product.pricingMatrix.length > 0) {
    const offers = product.pricingMatrix.flatMap((dosage) =>
      dosage.packages.map((pkg) => ({
        '@type': 'Offer',
        'priceCurrency': siteInputs.home.schema.products.currency,
        'price': pkg.price.toFixed(2),
        'availability': product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'priceValidUntil': siteInputs.home.schema.products.priceValidUntil,
        'url': dosage.dosage ? `${baseUrl}?dosage=${encodeURIComponent(dosage.dosage)}` : baseUrl,
        'itemCondition': 'https://schema.org/NewCondition',
        'sku': `${identifier}-${dosage.dosage}-${pkg.pillCount}`,
        'name': `${product.genericName} ${dosage.dosage} - ${pkg.pillCount} ${product.unit}${pkg.pillCount === 1 ? '' : 's'}`,
        'description': [
          dosage.dosage ? `Dosage: ${dosage.dosage}` : null,
          `Quantity: ${pkg.pillCount} ${product.unit}${pkg.pillCount === 1 ? '' : 's'}`,
          pkg.benefits?.length ? `Benefits: ${pkg.benefits.join(', ')}` : null,
          pkg.expiryDate ? `Expiry: ${pkg.expiryDate}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      })),
    )

    return offers
  }

  if (typeof product.price === 'number' && product.price > 0) {
    return [
      {
        '@type': 'Offer',
        'priceCurrency': siteInputs.home.schema.products.currency,
        'price': getProductOfferPrice(product).toFixed(2),
        'availability': product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'priceValidUntil': siteInputs.home.schema.products.priceValidUntil,
        'url': baseUrl,
        'itemCondition': 'https://schema.org/NewCondition',
        'sku': identifier,
      },
    ]
  }

  return []
}

export function buildSiteSchemas() {
  const schema = siteInputs.home.schema
  if (!schema.enabled) return []

  const siteUrl = schema.organization.url
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': schema.organization.name,
    'url': siteUrl,
    'logo': toAbsoluteUrl(schema.organization.logoPath, siteUrl),
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': schema.organization.telephone,
      'email': schema.organization.email,
      'contactType': schema.organization.contactType,
      'areaServed': schema.organization.areaServed,
      'availableLanguage': schema.organization.availableLanguages,
    },
    ...(schema.organization.sameAs.length > 0 ? { sameAs: schema.organization.sameAs } : {}),
  }

  const breadcrumbList = schema.breadcrumbs.enabled
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': schema.breadcrumbs.paths.map((path, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'name': BREADCRUMB_NAMES[path] ?? path,
          'item': toAbsoluteUrl(path, siteUrl),
        })),
      }
    : null

  const localBusiness = schema.localBusiness.enabled
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        'name': schema.organization.name,
        'image': toAbsoluteUrl(schema.organization.logoPath, siteUrl),
        'address': {
          '@type': 'PostalAddress',
          ...schema.localBusiness.address,
        },
        'telephone': schema.organization.telephone,
        'url': siteUrl,
        'priceRange': schema.localBusiness.priceRange,
        'openingHours': schema.localBusiness.openingHours,
      }
    : null

  return [organization, breadcrumbList, localBusiness].filter(Boolean)
}

export function buildProductSchemas(products: HomeProduct[]) {
  const schema = siteInputs.home.schema
  if (!schema.enabled || !schema.products.enabled) return []

  const siteUrl = schema.organization.url

  const productSchemas = products.slice(0, schema.products.maxItems).map((product) => {
    const identifier = product.slug ?? product._id
    const offerPrice = getProductOfferPrice(product)

    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'image': toAbsoluteProductImageUrl(identifier, product.image),
      'description': product.seoDescription || product.description,
      'brand': {
        '@type': 'Brand',
        'name': schema.organization.name,
      },
      'offers': {
        '@type': 'Offer',
        'priceCurrency': schema.products.currency,
        'price': offerPrice.toFixed(2),
        'availability': product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'priceValidUntil': schema.products.priceValidUntil,
        'url': toAbsoluteUrl(`/${identifier}`, siteUrl),
      },
    }
  })

  return productSchemas.length > 0 ? [productSchemas] : []
}

export function buildProductDetailSchema(product: HomeProduct) {
  const schema = siteInputs.home.schema
  if (!schema.enabled || !schema.products.enabled) return null

  const siteUrl = schema.organization.url
  const identifier = product.slug ?? product._id
  const imageUrl = toAbsoluteProductImageUrl(identifier, product.image)
  const offers = buildProductOfferEntries(product, siteUrl)
  const lowPrice =
    offers.length > 0
      ? Math.min(...offers.map((offer) => Number(offer.price)).filter((price) => !Number.isNaN(price)))
      : null
  const highPrice =
    offers.length > 0
      ? Math.max(...offers.map((offer) => Number(offer.price)).filter((price) => !Number.isNaN(price)))
      : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.genericName || product.name,
    ...(product.name ? { alternateName: product.name } : {}),
    'sku': identifier,
    'url': toAbsoluteUrl(`/${identifier}`, siteUrl),
    'image': [imageUrl],
    'description': product.fullDescription || product.seoDescription || product.description,
    'category': product.category,
    'brand': product.name
      ? {
          '@type': 'Brand',
          'name': product.name,
        }
      : {
          '@type': 'Brand',
          'name': schema.organization.name,
        },
    ...(offers.length > 1
      ? {
          offers: {
            '@type': 'AggregateOffer',
            'priceCurrency': schema.products.currency,
            'lowPrice': lowPrice?.toFixed(2),
            'highPrice': highPrice?.toFixed(2),
            'offerCount': offers.length,
            'availability': product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'offers': offers,
          },
        }
      : offers.length === 1
        ? { offers: offers[0] }
        : {}),
    'additionalProperty': [
      {
        '@type': 'PropertyValue',
        'name': 'Brand Name',
        'value': product.name,
      },
      {
        '@type': 'PropertyValue',
        'name': 'Generic Name',
        'value': product.genericName,
      },
      {
        '@type': 'PropertyValue',
        'name': 'Unit',
        'value': product.unit,
      },
      {
        '@type': 'PropertyValue',
        'name': 'Dosage Options',
        'value': product.dosageOptions.join(', '),
      },
      ...(typeof product.discount === 'number'
        ? [
            {
              '@type': 'PropertyValue',
              'name': 'Discount',
              'value': `${product.discount}%`,
            },
          ]
        : []),
      ...(product.imageAlt
        ? [
            {
              '@type': 'PropertyValue',
              'name': 'Image Alt',
              'value': product.imageAlt,
            },
          ]
        : []),
    ].filter((entry) => entry.value),
  }
}

export function buildHomeSchemas(products: HomeProduct[]) {
  return [...buildSiteSchemas(), ...buildProductSchemas(products)]
}

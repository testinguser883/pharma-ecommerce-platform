import type { Doc } from '@/convex/_generated/dataModel'
import { siteInputs } from '@/lib/site-inputs'

type HomeProduct = Doc<'products'>

const BREADCRUMB_NAMES: Record<string, string> = {
  '/': 'Home',
  '/about-us': 'About Us',
  '/contact-us': 'Contact Us',
  '/products': 'Products',
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

  return Number((product.price * (1 - product.discount / 100)).toFixed(2))
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
      'image': toAbsoluteUrl(product.image, siteUrl),
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

export function buildHomeSchemas(products: HomeProduct[]) {
  return [...buildSiteSchemas(), ...buildProductSchemas(products)]
}

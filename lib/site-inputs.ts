export const SITE_NAME = 'gardenerpersonal.click'
const DEFAULT_SITE_URL = 'https://www.gardenerpersonal.click'
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')

function normalizeGoogleTagId(value: string | undefined) {
  const trimmed = (value ?? '').trim()
  if (!trimmed || trimmed === 'G-XXXXX') return ''
  return trimmed
}

export const siteInputs = {
  home: {
    seoTitle: 'Pharma eCommerce Platform',
    seoDescription: 'Trusted online pharmaceutical platform with secure authentication and real-time cart sync.',
    seoKeywords: 'online pharmacy, pharma ecommerce, medicines, healthcare',
    googleTagId: normalizeGoogleTagId(process.env.NEXT_PUBLIC_GOOGLE_TAG_ID),
    schema: {
      enabled: true,
      organization: {
        name: SITE_NAME,
        url: SITE_URL,
        logoPath: '/favicon.ico',
        telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || '+91-8454039832',
        email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'orderfulfil@tutanota.com',
        contactType: 'Customer Service',
        areaServed: 'IN',
        availableLanguages: ['English'],
        sameAs: [],
      },
      localBusiness: {
        enabled: true,
        priceRange: '$10',
        openingHours: 'Mo-Fr 09:00-18:00',
        address: {
          streetAddress: 'Creative Industrial Estate, 205/A, Sunder Nagar Rd Number 2, Kalina, Santacruz East',
          addressLocality: 'Mumbai',
          addressRegion: 'Maharashtra',
          postalCode: '400098',
          addressCountry: 'IN',
        },
      },
      breadcrumbs: {
        enabled: true,
        paths: ['/', '/about-us', '/contact-us', '/products'],
      },
      products: {
        enabled: true,
        currency: 'USD',
        priceValidUntil: '2099-12-31',
        maxItems: 8,
      },
    },
  },
} as const

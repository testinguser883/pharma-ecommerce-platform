import { brand } from './brand'

export const siteInputs = {
  home: {
    seoTitle: `${brand.name} | Digital Pharmacy Experience`,
    seoDescription: 'Trusted online pharmaceutical platform with secure authentication and real-time cart sync.',
    seoKeywords: 'online pharmacy, pharma ecommerce, medicines, healthcare',
    googleTagId: 'G-XXXXX',
    schema: {
      enabled: true,
      organization: {
        name: brand.name,
        url: 'https://pharma-ecommerce-platform-5an9.vercel.app',
        logoPath: '/favicon.ico',
        telephone: brand.supportPhone,
        email: brand.supportEmail,
        contactType: 'Customer Service',
        areaServed: 'Worldwide',
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

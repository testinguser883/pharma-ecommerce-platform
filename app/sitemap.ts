import type { MetadataRoute } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { isDisallowed } from '@/lib/seo-config'

const DEFAULT_SITE_URL = 'https://www.gardenerpersonal.click'

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const lastModified = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about-us`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact-us`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/our-policy`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms-conditions`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/testimonials`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
  ]

  let categoryRoutes: MetadataRoute.Sitemap = []
  let productRoutes: MetadataRoute.Sitemap = []

  try {
    const [categories, products] = await Promise.all([
      fetchQuery(api.categories.list),
      fetchQuery(api.products.listForSitemap),
    ])

    categoryRoutes = categories.map((category) => ({
      url: `${baseUrl}/category/${category.name.replace(/ /g, '+')}`,
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    productRoutes = products.map((product) => ({
      url: `${baseUrl}/category/${product.category.replace(/ /g, '+')}/${product.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // If Convex is unavailable, fall back to static routes only
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes].filter((entry) => !isDisallowed(entry.url))
}

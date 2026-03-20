import type { MetadataRoute } from 'next'

const DEFAULT_SITE_URL = 'https://www.gardenerpersonal.click'

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const lastModified = new Date()

  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/products', changeFrequency: 'daily', priority: 0.9 },
    { path: '/about-us', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/contact-us', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/our-policy', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/terms-conditions', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/testimonials', changeFrequency: 'monthly', priority: 0.4 },
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}


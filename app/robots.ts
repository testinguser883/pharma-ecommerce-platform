import type { MetadataRoute } from 'next'
import { DISALLOWED_PATHS } from '@/lib/seo-config'

const DEFAULT_SITE_URL = 'https://www.gardenerpersonal.click'

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '')
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

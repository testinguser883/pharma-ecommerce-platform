import type { MetadataRoute } from 'next'
import { DISALLOWED_PATHS } from '@/lib/seo-config'
import { SITE_URL } from '@/lib/site-inputs'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL

  return {
    rules: {
      userAgent: '*',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

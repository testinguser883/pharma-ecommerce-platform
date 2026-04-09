import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { toAbsolutePublicImageUrl } from '@/lib/image-url'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

  if (!product) {
    return { title: 'Product Not Found' }
  }

  const title = product.seoTitle || `${product.name} (${product.genericName})`
  const description = product.seoDescription || product.description
  const keywords = product.seoKeywords

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: toAbsolutePublicImageUrl(product.image), alt: product.imageAlt ?? product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [toAbsolutePublicImageUrl(product.image)],
    },
    ...(keywords && { keywords }),
  }
}

export default async function ProductCategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry))
    } else if (value !== undefined) {
      query.set(key, value)
    }
  }

  permanentRedirect(`/${slug}${query.size > 0 ? `?${query.toString()}` : ''}`)
}

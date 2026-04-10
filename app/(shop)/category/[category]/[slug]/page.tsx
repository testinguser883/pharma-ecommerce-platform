import { cache } from 'react'
import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { toAbsoluteProductImageUrl } from '@/lib/image-url'

const getProduct = cache((identifier: string) =>
  fetchQuery(api.products.getBySlugOrId, { identifier })
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return { title: 'Product Not Found' }
  }

  const title = product.seoTitle || `${product.name} (${product.genericName})`
  const description = product.seoDescription || product.description
  const keywords = product.seoKeywords
  const imageUrl = toAbsoluteProductImageUrl(product.slug ?? product._id, product.image)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, alt: product.imageAlt ?? product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
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
  const product = await getProduct(slug)

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

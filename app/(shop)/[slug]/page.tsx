import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailPage } from '@/components/product-detail-page'
import { toAbsoluteProductImageUrl } from '@/lib/image-url'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

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

export default async function ProductSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

  if (!product) {
    notFound()
  }

  const initialDosage = typeof resolvedSearchParams.dosage === 'string' ? resolvedSearchParams.dosage : undefined

  return <ProductDetailPage product={product} initialDosage={initialDosage} />
}

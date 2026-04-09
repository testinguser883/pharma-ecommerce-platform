import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailContent } from '@/components/product-detail-content'
import { toAbsolutePublicImageUrl } from '@/lib/image-url'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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

export default async function ProductSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

  if (!product) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      }
    >
      <ProductDetailContent productId={slug} initialProduct={product} />
    </Suspense>
  )
}

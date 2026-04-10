import { cache, Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailContent } from '@/components/product-detail-content'
import { buildProductDetailSchema } from '@/lib/home-schema'
import { toAbsoluteProductImageUrl } from '@/lib/image-url'

const getProduct = cache((identifier: string) =>
  fetchQuery(api.products.getBySlugOrId, { identifier })
)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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

function serializeJsonLd(schema: unknown) {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export default async function ProductSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return null
  }

  const productSchema = buildProductDetailSchema(product)

  return (
    <>
      {productSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }} />
      ) : null}
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        }
      >
        <ProductDetailContent productId={slug} />
      </Suspense>
    </>
  )
}

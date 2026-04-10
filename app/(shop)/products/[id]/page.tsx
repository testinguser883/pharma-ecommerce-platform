import { Suspense } from 'react'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailContent } from '@/components/product-detail-content'
import { buildProductDetailSchema } from '@/lib/home-schema'

function serializeJsonLd(schema: unknown) {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export default async function ProductDetailByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: id })
  const productSchema = product ? buildProductDetailSchema(product) : null

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
        <ProductDetailContent productId={id} />
      </Suspense>
    </>
  )
}

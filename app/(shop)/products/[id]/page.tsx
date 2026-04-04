import { Suspense } from 'react'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailContent } from '@/components/product-detail-content'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: id })
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      }
    >
      <ProductDetailContent productId={id} initialProduct={product ?? undefined} />
    </Suspense>
  )
}

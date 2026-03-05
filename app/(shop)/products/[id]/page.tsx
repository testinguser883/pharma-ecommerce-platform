import { Suspense } from 'react'
import { ProductDetailContent } from '@/components/product-detail-content'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 lg:px-6"><p className="text-sm text-slate-500">Loading...</p></div>}>
      <ProductDetailContent productId={id} />
    </Suspense>
  )
}

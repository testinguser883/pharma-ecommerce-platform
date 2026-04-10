import { notFound } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { ProductDetailPage } from '@/components/product-detail-page'

export default async function ProductDetailByIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: id })
  const initialDosage = typeof resolvedSearchParams.dosage === 'string' ? resolvedSearchParams.dosage : undefined

  if (!product) {
    notFound()
  }

  return <ProductDetailPage product={product} initialDosage={initialDosage} />
}

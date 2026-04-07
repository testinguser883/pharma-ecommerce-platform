import { redirect } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export default async function ProductSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await fetchQuery(api.products.getBySlugOrId, { identifier: slug })

  if (product?.category) {
    const categoryPath = product.category.replace(/ /g, '+')
    redirect(`/category/${categoryPath}/${slug}`)
  }

  redirect('/')
}

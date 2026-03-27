'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { CategorySidebar } from './category-sidebar'
import { ProductGrid } from './product-grid'

export function ProductsPageContent({ categoryFromPath }: { categoryFromPath?: string } = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedCategory = categoryFromPath ?? searchParams.get('category') ?? ''
  const searchTerm = searchParams.get('q') ?? ''

  const fetchedCategories = useQuery(api.categories.list)
  const products = useQuery(api.products.list, {
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    limit: 40,
  })

  const categories =
    fetchedCategories?.map((category) => ({ _id: category._id, name: category.name })) ?? []

  const updateCategory = (nextCategory: string) => {
    if (nextCategory) {
      const categoryPath = nextCategory.replace(/ /g, '+')
      router.push(`/category/${categoryPath}` as Route)
    } else {
      router.push('/products' as Route)
    }
  }

  const headingText = useMemo(() => {
    return selectedCategory || 'All Products'
  }, [selectedCategory])

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[260px_1fr] lg:px-6">
      <CategorySidebar categories={categories} selectedCategory={selectedCategory} onSelectCategory={updateCategory} />
      <main className="space-y-4">
        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 md:text-2xl">{headingText}</h1>
          <ProductGrid products={products} />
        </section>
      </main>
    </div>
  )
}

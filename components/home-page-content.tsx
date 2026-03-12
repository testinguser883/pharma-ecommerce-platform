'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { CATEGORY_LIST } from '@/lib/category-list'
import { CategorySidebar } from './category-sidebar'
import { ImageSlider } from './image-slider'
import { ProductGrid } from './product-grid'

export function HomePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const selectedCategory = searchParams.get('category') ?? undefined

  const fetchedCategories = useQuery(api.categories.list)
  const recommendedProducts = useQuery(api.products.listRecommended)
  const categoryProducts = useQuery(
    api.products.list,
    selectedCategory ? { category: selectedCategory, limit: 24 } : 'skip',
  )

  const products = selectedCategory ? categoryProducts : recommendedProducts
  const categories =
    fetchedCategories?.map((category) => ({ _id: category._id, name: category.name })) ??
    CATEGORY_LIST.map((name) => ({ name }))

  const heading = selectedCategory ?? 'Recommended'
  const emptyMessage =
    !selectedCategory && recommendedProducts?.length === 0
      ? 'No recommended products yet. Ask your admin to mark some products as recommended.'
      : undefined

  const handleSelectCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!category || category === selectedCategory) {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    const query = params.toString()
    router.push((query ? `${pathname}?${query}` : pathname) as Route)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <ImageSlider />

      <section className="mt-8 grid gap-6 lg:grid-cols-[290px_1fr]">
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rx-kicker text-teal-700">Products</p>
              <h2 className="rx-display mt-3 text-4xl text-slate-950">{heading}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedCategory ? (
                <button
                  type="button"
                  onClick={() => handleSelectCategory(selectedCategory)}
                  className="rx-btn-secondary"
                >
                  Clear filter
                </button>
              ) : null}
              <Link href="/products" className="rx-btn-primary">
                Browse Products
              </Link>
            </div>
          </div>

          {emptyMessage ? (
            <div className="rx-card p-10 text-center">
              <p className="text-sm text-slate-500">{emptyMessage}</p>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </section>
    </div>
  )
}

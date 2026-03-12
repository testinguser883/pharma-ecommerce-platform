'use client'

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { Search, Sparkles } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { CATEGORY_LIST } from '@/lib/category-list'
import { CategorySidebar } from './category-sidebar'
import { ProductGrid } from './product-grid'

export function ProductsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedCategory = searchParams.get('category') ?? ''
  const searchTerm = searchParams.get('q') ?? ''

  const fetchedCategories = useQuery(api.categories.list)
  const products = useQuery(api.products.list, {
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    limit: 40,
  })

  const categories =
    fetchedCategories?.map((category) => ({ _id: category._id, name: category.name })) ??
    CATEGORY_LIST.map((name) => ({ name }))

  const updateCategory = (nextCategory: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextCategory) {
      params.set('category', nextCategory)
    } else {
      params.delete('category')
    }
    const query = params.toString()
    router.push((query ? `${pathname}?${query}` : pathname) as Route)
  }

  const headingText = selectedCategory || (searchTerm ? 'Search results' : 'Full catalog')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="rx-card p-6 sm:p-8">
        <p className="rx-kicker text-teal-700">Products</p>
        <h1 className="rx-display mt-3 text-4xl text-slate-950 sm:text-5xl">{headingText}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          {searchTerm
            ? `Showing products that match "${searchTerm}".`
            : 'Browse all products and use the category filter to narrow the list.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {searchTerm ? (
            <span className="rx-badge border-slate-200 bg-white text-slate-700">
              <Search className="mr-2 h-3.5 w-3.5" />
              Search: {searchTerm}
            </span>
          ) : null}
          {selectedCategory ? (
            <span className="rx-badge border-slate-200 bg-white text-slate-700">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Category: {selectedCategory}
            </span>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[290px_1fr]">
        <div className="space-y-4">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory || undefined}
            onSelectCategory={updateCategory}
          />
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rx-kicker text-teal-700">Results</p>
              <h2 className="rx-display mt-3 text-4xl text-slate-950">
                {selectedCategory || (searchTerm ? `Matches for “${searchTerm}”` : 'Every available product')}
              </h2>
            </div>
          </div>
          <ProductGrid products={products} />
        </div>
      </section>
    </div>
  )
}

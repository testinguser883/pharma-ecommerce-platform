'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Search } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const [searchInput, setSearchInput] = useState(searchTerm)

  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  const fetchedCategories = useQuery(api.categories.list)
  const products = useQuery(api.products.list, {
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    limit: 40,
  })

  const categories =
    fetchedCategories?.map((category) => ({ _id: category._id, name: category.name })) ??
    CATEGORY_LIST.map((name) => ({ name }))

  const updateParams = (nextCategory: string, nextSearch: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextCategory) {
      params.set('category', nextCategory)
    } else {
      params.delete('category')
    }
    if (nextSearch.trim()) {
      params.set('q', nextSearch.trim())
    } else {
      params.delete('q')
    }
    const query = params.toString()
    router.push((query ? `${pathname}?${query}` : pathname) as Route)
  }

  const headingText = useMemo(() => {
    return selectedCategory || 'All Products'
  }, [selectedCategory])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams(selectedCategory, searchInput)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[260px_1fr] lg:px-6">
      <CategorySidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(nextCategory) => updateParams(nextCategory, searchTerm)}
      />
      <main className="space-y-4">
        <section className="pharma-card p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by brand, generic, or category..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-300 focus:ring-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  updateParams(selectedCategory, '')
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 md:text-2xl">{headingText}</h1>
          <ProductGrid products={products} />
        </section>
      </main>
    </div>
  )
}

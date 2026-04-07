'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { CategorySidebar, type SidebarView } from './category-sidebar'
import { ImageSlider } from './image-slider'
import { ProductGrid } from './product-grid'

export function HomePageContent() {
  const [selectedView, setSelectedView] = useState<SidebarView>('recommended')

  const fetchedCategories = useQuery(api.categories.list)
  const recommendedProducts = useQuery(
    api.products.listRecommended,
    selectedView === 'recommended' ? {} : 'skip',
  )
  const allProducts = useQuery(
    api.products.list,
    selectedView === 'all' ? { limit: 40 } : 'skip',
  )
  const categoryProducts = useQuery(
    api.products.list,
    selectedView !== 'recommended' && selectedView !== 'all'
      ? { category: selectedView, limit: 40 }
      : 'skip',
  )

  const categories =
    fetchedCategories?.map((category) => ({ _id: category._id, name: category.name })) ?? []

  const heading =
    selectedView === 'recommended'
      ? 'Recommended'
      : selectedView === 'all'
        ? 'All Products'
        : selectedView

  const displayProducts =
    selectedView === 'recommended'
      ? recommendedProducts
      : selectedView === 'all'
        ? allProducts
        : categoryProducts

  const emptyMessage =
    selectedView === 'recommended' && recommendedProducts?.length === 0
      ? 'No recommended products yet. Ask your admin to mark some products as recommended.'
      : undefined

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[260px_1fr] lg:px-6">
      <div className="order-2 lg:order-1">
        <CategorySidebar
          categories={categories}
          selectedView={selectedView}
          onSelect={setSelectedView}
        />
      </div>
      <div className="order-1 space-y-4 lg:order-2">
        <ImageSlider />
        <section className="space-y-3">
          <h2 className="text-3xl font-bold text-slate-900 md:text-2xl">{heading}</h2>
          {emptyMessage ? (
            <p className="py-12 text-center text-slate-400">{emptyMessage}</p>
          ) : (
            <ProductGrid products={displayProducts} />
          )}
        </section>
      </div>
    </div>
  )
}

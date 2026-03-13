'use client'

import { useState } from 'react'
import { ChevronDown, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryLike = {
  _id?: string
  name: string
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: Array<CategoryLike>
  selectedCategory: string | undefined
  onSelectCategory: (category: string) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const selectedLabel = selectedCategory || 'All categories'

  return (
    <aside className="rx-card h-fit overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-100">Browse by</p>
        <p className="text-sm font-bold text-white">Categories</p>
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden hover:bg-slate-50"
        aria-expanded={mobileOpen}
        aria-controls="category-sidebar-list"
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-teal-500" />
          <span className="text-sm font-medium text-slate-700">{selectedLabel}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            mobileOpen && 'rotate-180',
          )}
        />
      </button>

      <ul id="category-sidebar-list" className={cn('py-2', mobileOpen ? 'block' : 'hidden', 'lg:block')}>
        {categories.map((category) => {
          const isActive = selectedCategory === category.name
          return (
            <li key={category._id ?? category.name}>
              <button
                type="button"
                onClick={() => {
                  onSelectCategory(category.name)
                  setMobileOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-all duration-150',
                  isActive
                    ? 'bg-teal-50 font-semibold text-teal-700 border-r-2 border-teal-500'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                    isActive ? 'bg-teal-500' : 'bg-slate-300',
                  )}
                />
                <span className="truncate">{category.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

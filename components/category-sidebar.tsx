'use client'

import { useState } from 'react'
import { ChevronDown, Grid2X2, Sparkles } from 'lucide-react'
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

  return (
    <aside className="rx-card h-fit overflow-hidden">
      <div className="border-b border-slate-200/70 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white">
            <Grid2X2 className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="rx-kicker text-teal-700">Collections</p>
            <p className="text-sm text-slate-600">Filter the catalog by focus area.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="category-list"
      >
        <div>
          <p className="rx-label">Selected</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCategory ?? 'All categories'}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', mobileOpen && 'rotate-180')} />
      </button>

      <div id="category-list" className={cn('px-3 pb-3', mobileOpen ? 'block' : 'hidden lg:block')}>
        <button
          type="button"
          onClick={() => {
            onSelectCategory('')
            setMobileOpen(false)
          }}
          className={cn(
            'mt-3 flex w-full items-center justify-between rounded-[22px] px-4 py-3 text-left text-sm transition',
            !selectedCategory
              ? 'bg-slate-950 text-white'
              : 'border border-slate-200/80 bg-white/90 text-slate-800 hover:border-slate-300',
          )}
        >
          <span>All categories</span>
          <Sparkles className="h-4 w-4" />
        </button>

        <ul className="mt-3 space-y-2">
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
                    'flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left text-sm transition',
                    isActive
                      ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-[0_12px_30px_-24px_rgba(13,148,136,0.8)]'
                      : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white',
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  <span className={cn('h-2.5 w-2.5 rounded-full', isActive ? 'bg-teal-600' : 'bg-slate-300')} />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
          <p className="rx-kicker text-teal-700">Browsing tip</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Search from the header for brand or generic names, then use categories here to narrow the results further.
          </p>
        </div>
      </div>
    </aside>
  )
}

'use client'

import { useState } from 'react'
import { ChevronDown, LayoutGrid, Star, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryLike = {
  _id?: string
  name: string
}

export type SidebarView = 'recommended' | 'all' | string

const SPECIAL_VIEWS: Array<{ id: SidebarView; label: string; icon: typeof Star }> = [
  { id: 'recommended', label: 'Recommended', icon: Star },
  { id: 'all', label: 'All Products', icon: LayoutGrid },
]

export function CategorySidebar({
  categories,
  selectedView,
  onSelect,
}: {
  categories: Array<CategoryLike>
  selectedView: SidebarView
  onSelect: (view: SidebarView) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectedLabel =
    SPECIAL_VIEWS.find((v) => v.id === selectedView)?.label ?? selectedView

  const handleSelect = (view: SidebarView) => {
    onSelect(view)
    setMobileOpen(false)
  }

  return (
    <aside className="rx-card h-fit overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3">
        <p className="text-sm font-bold text-white whitespace-nowrap">Browse by Categories</p>
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

      <div
        id="category-sidebar-list"
        className={cn(mobileOpen ? 'block' : 'hidden', 'lg:block')}
      >
        {/* Special views */}
        <div className="border-b border-slate-100 py-2">
          {SPECIAL_VIEWS.map(({ id, label, icon: Icon }) => {
            const isActive = selectedView === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-all duration-150',
                  isActive
                    ? 'bg-teal-50 font-semibold text-teal-700 border-r-2 border-teal-500'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon
                  className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-teal-500' : 'text-slate-400')}
                />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="py-2">
            <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Categories
            </p>
            <ul>
              {categories.map((category) => {
                const isActive = selectedView === category.name
                return (
                  <li key={category._id ?? category.name}>
                    <button
                      type="button"
                      onClick={() => handleSelect(category.name)}
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
          </div>
        )}
      </div>
    </aside>
  )
}

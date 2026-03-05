'use client'

import { Heart } from 'lucide-react'
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
  return (
    <aside className="pharma-card h-fit p-4">
      <ul className="space-y-1">
        {categories.map((category) => {
          const isActive = selectedCategory === category.name
          return (
            <li key={category._id ?? category.name}>
              <button
                type="button"
                onClick={() => onSelectCategory(category.name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
                  isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <Heart className={cn('h-4 w-4', isActive ? 'fill-red-500 text-red-500' : 'text-slate-300')} />
                <span>{category.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

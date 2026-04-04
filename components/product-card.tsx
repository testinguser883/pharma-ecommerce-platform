'use client'

import Link from 'next/link'
import type { Doc } from '@/convex/_generated/dataModel'

function productUrl(product: Doc<'products'>, suffix = '') {
  const categoryPath = product.category.replace(/ /g, '+')
  const id = product.slug ?? product._id
  return `/category/${categoryPath}/${id}${suffix}`
}

export function ProductCard({ product }: { product: Doc<'products'> }) {
  return (
    <article className="group rx-card flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="relative">
        <Link href={productUrl(product)} className="block">
          {/* Image area — fixed height so all cards align */}
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <img
              src={product.image}
              alt={product.imageAlt ?? product.name}
              className="h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image'
              }}
            />
          </div>

          {/* Info — fixed height so name/price area is uniform */}
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 truncate">{product.genericName ?? '\u00A0'}</p>
          </div>
        </Link>
      </div>

      {/* Dosage chips — flex-1 pushes "View Item" to bottom */}
      <div className="flex-1 px-4 pb-3">
        {product.pricingMatrix && product.pricingMatrix.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.pricingMatrix.map((entry) => (
              <Link
                key={entry.dosage}
                href={productUrl(product, `?dosage=${encodeURIComponent(entry.dosage)}`)}
                className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                {entry.dosage}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA — always at the bottom */}
      <Link
        href={productUrl(product)}
        className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 text-sm font-semibold text-white transition-all hover:from-teal-500 hover:to-cyan-500"
      >
        View Item
      </Link>
    </article>
  )
}

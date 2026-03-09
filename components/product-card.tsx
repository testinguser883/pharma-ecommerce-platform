'use client'

import Link from 'next/link'
import type { Doc } from '@/convex/_generated/dataModel'
import { formatPrice } from '@/lib/utils'

function getFromPrice(product: Doc<'products'>): { price: number; perUnit: string } {
  if (product.pricingMatrix && product.pricingMatrix.length > 0) {
    let minPerUnit = Infinity
    for (const dosage of product.pricingMatrix) {
      for (const pkg of dosage.packages) {
        if (pkg.pillCount > 0) {
          const perUnit = pkg.price / pkg.pillCount
          if (perUnit < minPerUnit) minPerUnit = perUnit
        }
      }
    }
    if (minPerUnit !== Infinity) {
      return { price: minPerUnit, perUnit: product.unit }
    }
  }
  const discounted = product.price * (1 - product.discount / 100)
  return { price: discounted, perUnit: product.unit }
}

export function ProductCard({ product }: { product: Doc<'products'> }) {
  const fromPrice = getFromPrice(product)

  return (
    <article className="group rx-card flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Discount badge */}
      <div className="relative">
        {product.discount > 0 && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
            -{product.discount}%
          </span>
        )}

        <Link href={`/${product.slug ?? product._id}`} className="block">
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
            <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400 truncate">{product.genericName ?? '\u00A0'}</p>
            <p className="mt-2 text-base font-extrabold text-slate-900">
              {formatPrice(fromPrice.price)}
              <span className="ml-1 text-xs font-normal text-slate-400">/ {fromPrice.perUnit}</span>
            </p>
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
                href={`/${product.slug ?? product._id}?dosage=${encodeURIComponent(entry.dosage)}`}
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
        href={`/${product.slug ?? product._id}`}
        className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 text-sm font-semibold text-white transition-all hover:from-teal-500 hover:to-cyan-500"
      >
        View Item
      </Link>
    </article>
  )
}

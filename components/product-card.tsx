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
    <article className="pharma-card overflow-hidden">
      <div className="relative p-5">
        {product.discount > 0 && (
          <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-red-500 px-3 py-1 text-lg font-bold text-white">
            -{product.discount}%
          </span>
        )}
        <Link href={`/products/${product._id}`} className="block">
          <img src={product.image} alt={product.imageAlt ?? product.name} className="mx-auto h-24 w-24 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image' }} />
          <h3 className="mt-4 text-center text-xl font-bold text-slate-900">{product.name}</h3>
          <p className="mt-1 text-center text-sm text-slate-500">{product.genericName}</p>
          <p className="mt-2 text-center text-lg font-bold text-slate-900">
            {formatPrice(fromPrice.price)} per {fromPrice.perUnit}
          </p>
        </Link>

        {/* Dosage chips derived from pricing matrix */}
        {product.pricingMatrix && product.pricingMatrix.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {product.pricingMatrix.map((entry) => (
              <Link
                key={entry.dosage}
                href={`/products/${product._id}?dosage=${encodeURIComponent(entry.dosage)}`}
                className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                {entry.dosage}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link
        href={`/products/${product._id}`}
        className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-base font-semibold text-white transition hover:from-emerald-600 hover:to-teal-600"
      >
        View Item
      </Link>
    </article>
  )
}

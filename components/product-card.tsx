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

  return {
    price: product.price * (1 - product.discount / 100),
    perUnit: product.unit,
  }
}

export function ProductCard({ product }: { product: Doc<'products'> }) {
  const fromPrice = getFromPrice(product)
  const dosageOptions = product.pricingMatrix?.map((entry) => entry.dosage) ?? product.dosageOptions ?? []

  return (
    <article className="group rx-card overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_85px_-42px_rgba(15,23,42,0.9)]">
      <div className="rx-gradient-hero relative overflow-hidden px-5 py-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_25%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="rx-badge border-white/10 bg-white/10 text-white">{product.category}</span>
          {product.discount > 0 ? (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-950">
              {product.discount}% off
            </span>
          ) : null}
        </div>

        <Link href={`/${product.slug ?? product._id}`} className="relative mt-6 block">
          <div className="flex min-h-[180px] items-center justify-center">
            <img
              src={product.image}
              alt={product.imageAlt ?? product.name}
              className="rx-floating h-32 w-32 object-contain drop-shadow-[0_28px_34px_rgba(2,6,23,0.45)] transition duration-300 group-hover:scale-105"
              onError={(event) => {
                ;(event.currentTarget as HTMLImageElement).src =
                  'https://placehold.co/240x240/f8fafc/94a3b8?text=No+Image'
              }}
            />
          </div>
        </Link>
      </div>

      <div className="p-5">
        <p className="rx-kicker text-teal-700">{product.genericName || 'Curated medicine'}</p>
        <Link href={`/${product.slug ?? product._id}`}>
          <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-950 transition group-hover:text-teal-700">
            {product.name}
          </h3>
        </Link>
        <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-slate-600">
          {product.description || 'Well-structured product information, clear pricing, and faster selection paths.'}
        </p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">{formatPrice(fromPrice.price)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">From / {fromPrice.perUnit}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
              product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {product.inStock ? 'In stock' : 'Out of stock'}
          </span>
        </div>

        {dosageOptions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {dosageOptions.slice(0, 3).map((dosage) => (
              <span
                key={dosage}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {dosage}
              </span>
            ))}
            {dosageOptions.length > 3 ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                +{dosageOptions.length - 3} more
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <Link href={`/${product.slug ?? product._id}`} className="text-sm font-semibold text-slate-950">
            View details
          </Link>
          <Link
            href={`/${product.slug ?? product._id}`}
            className="rx-btn-primary px-4 py-2.5 text-xs uppercase tracking-[0.24em]"
          >
            Shop
          </Link>
        </div>
      </div>
    </article>
  )
}

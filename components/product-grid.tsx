import type { Doc } from '@/convex/_generated/dataModel'
import { ProductCard } from './product-card'

export function ProductGrid({ products }: { products: Array<Doc<'products'>> | undefined }) {
  if (products === undefined) {
    return (
      <div className="rx-card flex min-h-[220px] items-center justify-center p-8 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          <p className="mt-4 text-sm text-slate-500">Loading the catalog...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rx-card p-10 text-center">
        <p className="rx-kicker text-teal-700">No matches</p>
        <h3 className="rx-display mt-3 text-3xl text-slate-950">Nothing fits this filter right now.</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Try a different category or clear the current search term from the header.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  )
}

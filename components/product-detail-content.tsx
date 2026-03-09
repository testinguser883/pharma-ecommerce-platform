'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, ShoppingCart, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { renderMarkdownContent } from '@/lib/markdown'
import { formatPrice } from '@/lib/utils'

// ── Package row ────────────────────────────────────────────────────────────────

type PackageRowProps = {
  dosage: string
  pillCount: number
  originalPrice: number
  price: number
  benefits: string[]
  expiryDate?: string
  unit: string
  image: string
  imageAlt?: string
  inStock: boolean
  onAddToCart: (dosage: string, pillCount: number, price: number) => void
  adding: boolean
  justAdded: boolean
}

function PackageRow({
  dosage,
  pillCount,
  originalPrice,
  price,
  benefits,
  expiryDate,
  unit,
  image,
  imageAlt,
  inStock,
  onAddToCart,
  adding,
  justAdded,
}: PackageRowProps) {
  const perUnit = price / pillCount
  const savings = originalPrice - price
  const expiry = expiryDate ? new Date(`${expiryDate}T00:00:00`) : null
  const formattedExpiryDate =
    expiry && !Number.isNaN(expiry.valueOf())
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(expiry)
      : expiryDate || null

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-teal-200 hover:bg-teal-50/30 md:grid-cols-[140px_1fr_1fr_auto]">
      {/* Dosage + pill count */}
      <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-1">
        <img src={image} alt={imageAlt ?? dosage} className="h-10 w-10 shrink-0 object-contain" />
        <div>
          <p className="text-sm font-bold text-slate-900">{dosage}</p>
          <p className="text-xs text-slate-500">
            {pillCount} {unit}s
          </p>
          {formattedExpiryDate && (
            <p className="text-xs text-slate-400">Exp: {formattedExpiryDate}</p>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="hidden md:block">
        {originalPrice > price && (
          <p className="text-xs text-slate-400 line-through">{formatPrice(originalPrice)}</p>
        )}
        <p className="text-lg font-extrabold text-slate-900">{formatPrice(price)}</p>
        <p className="text-xs text-slate-500">
          {formatPrice(perUnit)} / {unit}
        </p>
        {savings > 0 && (
          <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
            Save {formatPrice(savings)}
          </span>
        )}
      </div>

      {/* Benefits */}
      <div className="hidden md:block space-y-1">
        {benefits.map((b) => (
          <p key={b} className="flex items-center gap-1 text-xs text-slate-600">
            <span className="h-1 w-1 rounded-full bg-teal-500 shrink-0" />
            {b}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-end gap-1">
        {/* Price on mobile */}
        <div className="mb-1 text-right md:hidden">
          {originalPrice > price && (
            <p className="text-xs text-slate-400 line-through">{formatPrice(originalPrice)}</p>
          )}
          <p className="text-base font-extrabold text-slate-900">{formatPrice(price)}</p>
          {savings > 0 && (
            <p className="text-xs font-semibold text-red-500">Save {formatPrice(savings)}</p>
          )}
        </div>
        <button
          type="button"
          disabled={adding || !inStock}
          onClick={() => onAddToCart(dosage, pillCount, price)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
            justAdded
              ? 'bg-teal-50 border border-teal-300 text-teal-700'
              : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500 shadow-sm'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : adding ? (
            'Adding...'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Product description accordion ────────────────────────────────────────────

function ProductDescriptionAccordion({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rx-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <h2 className="text-base font-bold text-slate-900">Product Description</h2>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all ${open ? 'bg-teal-50 border-teal-200 text-teal-600' : ''}`}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-5 prose prose-sm max-w-none">{renderMarkdownContent(content)}</div>}
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const addItem = useMutation(api.cart.addItem)

  const product = useQuery(api.products.getBySlugOrId, productId ? { identifier: productId } : 'skip')

  const [selectedDosage, setSelectedDosage] = useState<string | null>(null)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null)

  const dosages = product?.pricingMatrix?.map((d) => d.dosage) ?? product?.dosageOptions ?? []
  const hasPricingMatrix = !!(product?.pricingMatrix && product.pricingMatrix.length > 0)

  useEffect(() => {
    if (!product) return
    const paramDosage = searchParams.get('dosage')
    if (paramDosage && dosages.includes(paramDosage)) {
      setSelectedDosage(paramDosage)
    } else if (dosages.length > 0 && !selectedDosage) {
      setSelectedDosage(dosages[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const handleAddToCart = async (dosage?: string, pillCount?: number, unitPrice?: number) => {
    if (!product) return
    if (!session?.user) {
      router.push(`/auth/login?next=/${product.slug ?? product._id}`)
      return
    }
    const key = dosage ? `${dosage}-${pillCount ?? ''}` : 'simple'
    try {
      setAddingKey(key)
      await addItem({ productId: product._id, quantity: 1, dosage, pillCount, unitPrice })
      setJustAddedKey(key)
      setTimeout(() => setJustAddedKey(null), 2000)
      if (!dosage) router.push('/cart')
    } finally {
      setAddingKey(null)
    }
  }

  if (product === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading product...
        </div>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-700">Product not found.</p>
          <p className="mt-1 text-sm text-slate-400">This product may have been removed or the link is invalid.</p>
          <Link href="/products" className="rx-btn-primary mt-5">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const selectedDosageData = product.pricingMatrix?.find((d) => d.dosage === selectedDosage)

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header */}
      <section className="rx-card overflow-hidden">
        <div className="flex flex-wrap items-start gap-6 p-5 md:p-6">
          {/* Image */}
          <div className="shrink-0 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <img
              src={product.image}
              alt={product.imageAlt ?? product.name}
              className="h-36 w-36 object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image'
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {product.discount > 0 && (
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  -{product.discount}% OFF
                </span>
              )}
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                {product.category}
              </span>
              {!product.inStock && (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl lg:text-3xl">
              {product.name}
            </h1>
            {product.genericName && (
              <p className="mt-0.5 text-sm text-slate-400">Generic: {product.genericName}</p>
            )}

            {product.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{product.description}</p>
            )}

            {/* Simple add-to-cart when no dosage tabs */}
            {dosages.length === 0 && (
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatPrice(product.price)}
                  <span className="ml-1.5 text-sm font-normal text-slate-400">per {product.unit}</span>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void handleAddToCart(undefined, undefined, product.price * (1 - product.discount / 100))
                  }
                  disabled={addingKey !== null || !product.inStock}
                  className="rx-btn-primary mt-4"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingKey !== null ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dosage tabs + packages */}
      {dosages.length > 0 && (
        <section className="rx-card overflow-hidden">
          {/* Dosage selector header */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Select Dosage</p>
            <div className="flex flex-wrap gap-2">
              {dosages.map((dosage) => (
                <button
                  key={dosage}
                  type="button"
                  onClick={() => setSelectedDosage(dosage)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                    selectedDosage === dosage
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  {dosage}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-4">
            {hasPricingMatrix && selectedDosageData ? (
              selectedDosageData.packages.map((pkg) => {
                const key = `${selectedDosage}-${pkg.pillCount}`
                return (
                  <PackageRow
                    key={key}
                    dosage={selectedDosage!}
                    pillCount={pkg.pillCount}
                    originalPrice={pkg.originalPrice}
                    price={pkg.price}
                    benefits={pkg.benefits ?? []}
                    expiryDate={pkg.expiryDate}
                    unit={product.unit}
                    image={product.image}
                    imageAlt={product.imageAlt}
                    inStock={product.inStock}
                    onAddToCart={(d, pc, p) => void handleAddToCart(d, pc, p)}
                    adding={addingKey === key}
                    justAdded={justAddedKey === key}
                  />
                )
              })
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-5">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {formatPrice(product.price * (1 - product.discount / 100))}
                    <span className="ml-1.5 text-sm font-normal text-slate-400">per {product.unit}</span>
                  </p>
                  {selectedDosage && (
                    <p className="mt-1 text-sm text-slate-500">Dosage: <strong>{selectedDosage}</strong></p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void handleAddToCart(
                      selectedDosage ?? undefined,
                      undefined,
                      product.price * (1 - product.discount / 100),
                    )
                  }
                  disabled={addingKey !== null || !product.inStock}
                  className="rx-btn-primary"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingKey !== null ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full product description accordion */}
      {product.fullDescription && <ProductDescriptionAccordion content={product.fullDescription} />}
    </div>
  )
}

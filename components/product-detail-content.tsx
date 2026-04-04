'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, ShoppingCart, ChevronDown, ChevronUp, Minus, Plus, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
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
  inStock: boolean
  onAddToCart: (dosage: string, pillCount: number) => void
  onIncreaseQuantity: (dosage: string, pillCount: number, quantity: number) => void
  onDecreaseQuantity: (dosage: string, pillCount: number, quantity: number) => void
  quantity: number
  updating: boolean
}

function PackageRow({
  dosage,
  pillCount,
  originalPrice,
  price,
  benefits,
  expiryDate,
  unit,
  inStock,
  onAddToCart,
  onIncreaseQuantity,
  onDecreaseQuantity,
  quantity,
  updating,
}: PackageRowProps) {
  const perUnit = price / pillCount
  const savings = originalPrice - price
  const unitCountLabel = `${pillCount} ${unit}${pillCount === 1 ? '' : 's'}`
  const expiry = expiryDate ? new Date(`${expiryDate}T00:00:00`) : null
  const formattedExpiryDate =
    expiry && !Number.isNaN(expiry.valueOf())
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(expiry)
      : expiryDate || null

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-teal-200 hover:bg-teal-50/30 md:grid-cols-[minmax(0,1fr)_minmax(70px,0.6fr)_minmax(200px,1.4fr)_140px] md:items-start">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">Quantity</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 md:mt-0">{unitCountLabel}</p>
        {formattedExpiryDate && <p className="mt-1 text-xs text-slate-500">Expiry: {formattedExpiryDate}</p>}
        {benefits.length > 0 && <p className="mt-1 text-xs text-teal-700">{benefits.join(' • ')}</p>}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">Strength</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 md:mt-0">{dosage}</p>
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">Price</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-x-2">
            {originalPrice > price && <span className="text-xs text-slate-400 line-through">{formatPrice(originalPrice)}</span>}
            <span className="text-lg font-extrabold text-slate-900">{formatPrice(price)}</span>
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap">{formatPrice(perUnit)} / {unit}</span>
          {savings > 0 && (
            <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 whitespace-nowrap">
              Save {formatPrice(savings)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-2 md:w-[140px] md:justify-self-end">
        {quantity > 0 ? (
          <div className="inline-flex items-center self-end rounded-full border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              disabled={updating || !inStock}
              onClick={() => onDecreaseQuantity(dosage, pillCount, quantity)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-l-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex min-w-10 items-center justify-center text-sm font-bold text-slate-900">
              {updating ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : quantity}
            </span>
            <button
              type="button"
              disabled={updating || !inStock}
              onClick={() => onIncreaseQuantity(dosage, pillCount, quantity)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-r-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={updating || !inStock}
            onClick={() => onAddToCart(dosage, pillCount)}
            className="inline-flex items-center justify-center gap-2 self-end rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 md:min-w-[112px]"
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add
              </>
            )}
          </button>
        )}
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
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all ${open ? 'bg-teal-50 border-teal-200 text-teal-600' : ''}`}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {/* Content always present in DOM for SEO crawlers; CSS controls visibility */}
      <div className={`border-t border-slate-100 px-5 py-5 prose prose-sm max-w-none ${open ? '' : 'hidden'}`}>
        {renderMarkdownContent(content)}
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailContent({
  productId,
  initialProduct,
}: {
  productId: string
  initialProduct?: Doc<'products'>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const cart = useQuery(api.cart.getMyCart)
  const addItem = useMutation(api.cart.addItem)
  const updateItemQuantity = useMutation(api.cart.updateItemQuantity)

  const queryResult = useQuery(api.products.getBySlugOrId, productId ? { identifier: productId } : 'skip')
  // During SSR/hydration useQuery returns undefined; fall back to server-fetched initialProduct
  const product = queryResult !== undefined ? queryResult : initialProduct

  const [selectedDosage, setSelectedDosage] = useState<string | null>(null)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

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

  const getSelectionKey = (dosage?: string, pillCount?: number) => `${dosage ?? 'simple'}-${pillCount ?? ''}`
  const getSelectionQuantity = (dosage?: string, pillCount?: number) =>
    cart?.items.find(
      (item) => item.productId === product?._id && item.dosage === dosage && item.pillCount === pillCount,
    )?.quantity ?? 0

  const handleAddToCart = async (dosage?: string, pillCount?: number) => {
    if (!product) return
    if (!session?.user) {
      router.push(`/auth/login?next=/${product.slug ?? product._id}`)
      return
    }
    const key = getSelectionKey(dosage, pillCount)
    try {
      setUpdatingKey(key)
      await addItem({ productId: product._id, quantity: 1, dosage, pillCount })
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleDecreaseQuantity = async (dosage?: string, pillCount?: number, quantity?: number) => {
    if (!product || !quantity) return
    const key = getSelectionKey(dosage, pillCount)
    try {
      setUpdatingKey(key)
      await updateItemQuantity({
        productId: product._id,
        quantity: quantity - 1,
        dosage,
        pillCount,
      })
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleIncreaseQuantity = async (dosage?: string, pillCount?: number) => {
    await handleAddToCart(dosage, pillCount)
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

              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                {product.category}
              </span>
              {!product.inStock && (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl lg:text-3xl">{product.name}</h1>
            {product.genericName && <p className="mt-0.5 text-sm text-slate-400">Generic: {product.genericName}</p>}

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
                {getSelectionQuantity() > 0 ? (
                  <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      disabled={updatingKey === getSelectionKey() || !product.inStock}
                      onClick={() => void handleDecreaseQuantity(undefined, undefined, getSelectionQuantity())}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-l-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex min-w-10 items-center justify-center text-sm font-bold text-slate-900">
                      {updatingKey === getSelectionKey() ? (
                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      ) : (
                        getSelectionQuantity()
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={updatingKey === getSelectionKey() || !product.inStock}
                      onClick={() => void handleIncreaseQuantity()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-r-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleAddToCart()}
                    disabled={updatingKey !== null || !product.inStock}
                    className="rx-btn-primary mt-4"
                  >
                    {updatingKey === getSelectionKey() ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {updatingKey === getSelectionKey() ? 'Adding...' : 'Add to Cart'}
                  </button>
                )}
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
              <>
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(70px,0.6fr)_minmax(200px,1.4fr)_140px] gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 md:grid">
                  <span className="text-left">Quantity</span>
                  <span className="text-left">Strength</span>
                  <span className="text-left">Price</span>
                  <span className="justify-self-end text-right">Action</span>
                </div>
                {selectedDosageData.packages.map((pkg) => {
                  const key = getSelectionKey(selectedDosage ?? undefined, pkg.pillCount)
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
                      inStock={product.inStock}
                      onAddToCart={(d, pc) => void handleAddToCart(d, pc)}
                      onIncreaseQuantity={(d, pc) => void handleIncreaseQuantity(d, pc)}
                      onDecreaseQuantity={(d, pc, quantity) => void handleDecreaseQuantity(d, pc, quantity)}
                      quantity={getSelectionQuantity(selectedDosage ?? undefined, pkg.pillCount)}
                      updating={updatingKey === key}
                    />
                  )
                })}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold text-slate-500">Pricing not available for this dosage.</p>
                <p className="mt-1 text-xs text-slate-400">Please check back later or contact us for pricing.</p>
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

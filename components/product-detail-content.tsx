'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, ShoppingCart, ChevronDown, ChevronUp, Minus, Plus, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { toProductImagePath } from '@/lib/image-url'
import { renderMarkdownContent } from '@/lib/markdown'
import { formatPrice } from '@/lib/utils'

// ── Product not found ──────────────────────────────────────────────────────────

function ProductNotFound() {
  const [countdown, setCountdown] = useState(5)
  const router = useRouter()

  useEffect(() => {
    if (countdown === 0) {
      router.push('/')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, router])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-700">Product not found.</p>
        <p className="mt-1 text-sm text-slate-400">This product may have been removed or the link is invalid.</p>

        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">
            Redirecting to home page in <span className="font-bold text-teal-600 tabular-nums">{countdown}</span> second
            {countdown !== 1 ? 's' : ''}…
          </p>
          <div className="flex gap-1">
            {[5, 4, 3, 2, 1].map((n) => (
              <span
                key={n}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  countdown >= n ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-300 line-through'
                }`}
              >
                {n}
              </span>
            ))}
          </div>
          <Link
            href="/"
            className="mt-2 inline-flex items-center rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Go home now
          </Link>
        </div>
      </div>
    </div>
  )
}

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
            {originalPrice > price && (
              <span className="text-xs text-slate-400 line-through">{formatPrice(originalPrice)}</span>
            )}
            <span className="text-lg font-extrabold text-slate-900">{formatPrice(price)}</span>
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatPrice(perUnit)} / {unit}
          </span>
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
      {open ? (
        <div className="border-t border-slate-100 px-5 py-5 prose prose-sm max-w-none">
          {renderMarkdownContent(content)}
        </div>
      ) : null}
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const cart = useQuery(api.cart.getMyCart)
  const addItem = useMutation(api.cart.addItem)
  const updateItemQuantity = useMutation(api.cart.updateItemQuantity)

  const product = useQuery(api.products.getBySlugOrId, productId ? { identifier: productId } : 'skip')
  const imageSrc = product ? toProductImagePath(product.slug ?? product._id, product.image) : ''

  const [selectedDosage, setSelectedDosage] = useState<string | null>(null)
  const [selectedPillCount, setSelectedPillCount] = useState<number | null>(null)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  const dosages = product?.pricingMatrix?.map((d) => d.dosage) ?? product?.dosageOptions ?? []
  const hasPricingMatrix = !!(product?.pricingMatrix && product.pricingMatrix.length > 0)

  useEffect(() => {
    if (!product) return
    const paramDosage = searchParams?.get('dosage')
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
    return <ProductNotFound />
  }

  const selectedDosageData = product.pricingMatrix?.find((d) => d.dosage === selectedDosage)
  const packages = selectedDosageData?.packages ?? []
  const effectivePillCount = selectedPillCount ?? packages[0]?.pillCount ?? null
  const selectedPkg = packages.find((p) => p.pillCount === effectivePillCount) ?? packages[0] ?? null

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Category label above product card */}
      {product.category && (
        <div>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
            {product.category}
          </span>
        </div>
      )}

      {/* Product header */}
      <section className="rx-card overflow-hidden">
        <div className="flex flex-wrap items-start gap-6 p-5 md:p-6">
          {/* Image */}
          <div className="shrink-0 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <img
              src={imageSrc}
              alt={product.imageAlt ?? product.name}
              className="h-36 w-36 object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image'
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!product.inStock && (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  Out of Stock
                </span>
              )}
            </div>

            <p className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl lg:text-3xl">{product.genericName}</p>
            {product.name && <p className="mt-0.5 text-sm text-slate-400">Brand Name: {product.name}</p>}

            {product.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{product.description}</p>
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

          <div className="space-y-4 p-4">
            {hasPricingMatrix && selectedDosageData && selectedPkg ? (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Select Quantity
                  </label>
                  <select
                    value={effectivePillCount ?? ''}
                    onChange={(e: { target: { value: string } }) => setSelectedPillCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:w-64"
                  >
                    {packages.map((pkg: { pillCount: number }) => (
                      <option key={pkg.pillCount} value={pkg.pillCount}>
                        {pkg.pillCount} {product.unit}
                        {pkg.pillCount === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(70px,0.6fr)_minmax(200px,1.4fr)_140px] gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 md:grid">
                  <span className="text-left">Quantity</span>
                  <span className="text-left">Strength</span>
                  <span className="text-left">Price</span>
                  <span className="justify-self-end text-right">Action</span>
                </div>
                <PackageRow
                  dosage={selectedDosage!}
                  pillCount={selectedPkg.pillCount}
                  originalPrice={selectedPkg.originalPrice}
                  price={selectedPkg.price}
                  benefits={selectedPkg.benefits ?? []}
                  expiryDate={selectedPkg.expiryDate}
                  unit={product.unit}
                  inStock={product.inStock}
                  onAddToCart={(d, pc) => void handleAddToCart(d, pc)}
                  onIncreaseQuantity={(d, pc) => void handleIncreaseQuantity(d, pc)}
                  onDecreaseQuantity={(d, pc, quantity) => void handleDecreaseQuantity(d, pc, quantity)}
                  quantity={getSelectionQuantity(selectedDosage ?? undefined, selectedPkg.pillCount)}
                  updating={updatingKey === getSelectionKey(selectedDosage ?? undefined, selectedPkg.pillCount)}
                />
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

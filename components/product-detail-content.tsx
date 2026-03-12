'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Check, ShoppingBag, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { formatPrice } from '@/lib/utils'

type PackageRowProps = {
  dosage: string
  pillCount: number
  originalPrice: number
  price: number
  benefits: string[]
  expiryDate?: string
  unit: string
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
    <div className="rx-card p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div>
          <div>
            <p className="rx-kicker text-teal-700">Dose option</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{dosage}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pillCount} {unit}
              {pillCount > 1 ? 's' : ''}
            </p>
            {formattedExpiryDate ? (
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Expiry {formattedExpiryDate}</p>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[170px_minmax(0,1fr)_auto] lg:items-center">
          <div>
            {originalPrice > price ? (
              <p className="text-sm text-slate-400 line-through">{formatPrice(originalPrice)}</p>
            ) : null}
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{formatPrice(price)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
              {formatPrice(perUnit)} / {unit}
            </p>
            {savings > 0 ? (
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Save {formatPrice(savings)}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {benefits.length > 0
              ? benefits.map((benefit) => (
                  <p key={benefit} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-600" />
                    <span>{benefit}</span>
                  </p>
                ))
              : null}
          </div>

          <button
            type="button"
            disabled={adding || !inStock}
            onClick={() => onAddToCart(dosage, pillCount, price)}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
              justAdded
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'bg-slate-950 text-white hover:bg-teal-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
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
                <ShoppingBag className="h-4 w-4" />
                Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const addItem = useMutation(api.cart.addItem)
  const product = useQuery(api.products.getBySlugOrId, productId ? { identifier: productId } : 'skip')

  const [selectedDosage, setSelectedDosage] = useState<string | null>(null)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null)

  const dosages = product?.pricingMatrix?.map((entry) => entry.dosage) ?? product?.dosageOptions ?? []
  const hasPricingMatrix = !!(product?.pricingMatrix && product.pricingMatrix.length > 0)
  const requestedDosage = searchParams.get('dosage')

  useEffect(() => {
    if (requestedDosage && dosages.includes(requestedDosage)) {
      setSelectedDosage((current) => (current === requestedDosage ? current : requestedDosage))
      return
    }

    setSelectedDosage((current) => {
      if (current && dosages.includes(current)) return current
      return dosages[0] ?? null
    })
  }, [dosages, requestedDosage])

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
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="rx-card flex items-center gap-3 px-6 py-6 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          Loading product...
        </div>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <div className="rx-card p-10 text-center">
          <p className="rx-kicker text-teal-700">Unavailable</p>
          <h1 className="rx-display mt-3 text-4xl text-slate-950">Product not found.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This product may have been removed or the link is invalid.
          </p>
          <Link href="/products" className="rx-btn-primary mt-6">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const selectedDosageData = product.pricingMatrix?.find((entry) => entry.dosage === selectedDosage)
  const basePrice = product.price * (1 - product.discount / 100)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rx-card-dark h-fit overflow-hidden p-6 xl:sticky xl:top-28">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <img
              src={product.image}
              alt={product.imageAlt ?? product.name}
              className="rx-floating mx-auto h-56 w-56 object-contain"
              onError={(event) => {
                ;(event.currentTarget as HTMLImageElement).src =
                  'https://placehold.co/280x280/f8fafc/94a3b8?text=No+Image'
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rx-badge border-white/10 bg-white/10 text-white">{product.category}</span>
            {product.discount > 0 ? (
              <span className="rx-badge border-amber-300/20 bg-amber-300/10 text-amber-100">
                {product.discount}% off
              </span>
            ) : null}
            <span
              className={`rx-badge ${
                product.inStock
                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                  : 'border-red-300/20 bg-red-300/10 text-red-100'
              }`}
            >
              {product.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {product.genericName ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="rx-kicker text-teal-200">Generic</p>
                <p className="mt-2 text-sm font-medium text-white">{product.genericName}</p>
              </div>
            ) : null}
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="rx-kicker text-teal-200">Unit</p>
              <p className="mt-2 text-sm font-medium text-white">{product.unit}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rx-card p-6 sm:p-8">
            <p className="rx-kicker text-teal-700">Product spotlight</p>
            <h1 className="rx-display mt-3 text-4xl leading-none text-slate-950 sm:text-5xl">{product.name}</h1>
            {product.genericName ? (
              <p className="mt-3 text-sm uppercase tracking-[0.24em] text-slate-500">
                Generic name: {product.genericName}
              </p>
            ) : null}
            {product.description ? (
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{product.description}</p>
            ) : null}

            {dosages.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="rx-kicker text-teal-700">Simple pricing</p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                      {formatPrice(basePrice)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">Per {product.unit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddToCart(undefined, undefined, basePrice)}
                    disabled={addingKey !== null || !product.inStock}
                    className="rx-btn-primary"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {addingKey !== null ? 'Adding...' : 'Add to cart'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="rx-kicker text-teal-700">Dosage selector</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">Choose how you want to buy it.</h2>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                    {dosages.length} option{dosages.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {dosages.map((dosage) => (
                    <button
                      key={dosage}
                      type="button"
                      onClick={() => setSelectedDosage(dosage)}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        selectedDosage === dosage
                          ? 'bg-slate-950 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700'
                      }`}
                    >
                      {dosage}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {dosages.length > 0 ? (
            <section id="purchase-options" className="scroll-mt-32 space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="rx-kicker text-teal-700">Purchase options</p>
                  <h2 className="rx-display mt-2 text-3xl text-slate-950">
                    {selectedDosage ? `${selectedDosage} packages` : 'Available packages'}
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-500 sm:inline-flex">
                  <Sparkles className="h-3.5 w-3.5" />
                  Available packages
                </div>
              </div>

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
                      inStock={product.inStock}
                      onAddToCart={(dosage, pillCount, price) => void handleAddToCart(dosage, pillCount, price)}
                      adding={addingKey === key}
                      justAdded={justAddedKey === key}
                    />
                  )
                })
              ) : (
                <div className="rx-card p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="rx-kicker text-teal-700">Selected dosage</p>
                      <h3 className="mt-3 text-3xl font-semibold text-slate-950">{formatPrice(basePrice)}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Dosage: <span className="font-semibold text-slate-900">{selectedDosage}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddToCart(selectedDosage ?? undefined, undefined, basePrice)}
                      disabled={addingKey !== null || !product.inStock}
                      className="rx-btn-primary"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {addingKey !== null ? 'Adding...' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

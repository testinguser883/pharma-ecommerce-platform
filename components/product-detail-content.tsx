'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Minus, Plus, ShoppingBag, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { authClient } from '@/lib/auth-client'
import { formatPrice } from '@/lib/utils'

type PackageRowProps = {
  productId: Id<'products'>
  dosage: string
  pillCount: number
  originalPrice: number
  price: number
  benefits: string[]
  expiryDate?: string
  unit: string
  inStock: boolean
  quantity: number
  pending: boolean
  onAddToCart: (dosage: string, pillCount: number, price: number) => void
  onSetQuantity: (args: { productId: Id<'products'>; dosage?: string; pillCount?: number; quantity: number }) => void
}

function ProductCartControl({
  quantity,
  pending,
  inStock,
  onAdd,
  onDecrease,
  onIncrease,
}: {
  quantity: number
  pending: boolean
  inStock: boolean
  onAdd: () => void
  onDecrease: () => void
  onIncrease: () => void
}) {
  if (quantity > 0) {
    return (
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 shadow-sm">
        <button
          type="button"
          disabled={pending}
          onClick={onDecrease}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-10 text-center text-sm font-semibold text-slate-950">{quantity}</span>
        <button
          type="button"
          disabled={pending || !inStock || quantity >= 99}
          onClick={onIncrease}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={pending || !inStock}
      onClick={onAdd}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ShoppingBag className="h-4 w-4" />
      {pending ? 'Adding...' : 'Add to cart'}
    </button>
  )
}

function PackageRow({
  productId,
  dosage,
  pillCount,
  originalPrice,
  price,
  benefits,
  expiryDate,
  unit,
  inStock,
  quantity,
  pending,
  onAddToCart,
  onSetQuantity,
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

          <ProductCartControl
            quantity={quantity}
            pending={pending}
            inStock={inStock}
            onAdd={() => onAddToCart(dosage, pillCount, price)}
            onDecrease={() => onSetQuantity({ productId, dosage, pillCount, quantity: quantity - 1 })}
            onIncrease={() => onSetQuantity({ productId, dosage, pillCount, quantity: quantity + 1 })}
          />
        </div>
      </div>
    </div>
  )
}

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const cart = useQuery(api.cart.getMyCart)
  const addItem = useMutation(api.cart.addItem)
  const updateItemQuantity = useMutation(api.cart.updateItemQuantity)
  const product = useQuery(api.products.getBySlugOrId, productId ? { identifier: productId } : 'skip')

  const [selectedDosage, setSelectedDosage] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

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
      setPendingKey(key)
      await addItem({ productId: product._id, quantity: 1, dosage, pillCount, unitPrice })
    } finally {
      setPendingKey(null)
    }
  }

  const handleSetQuantity = async ({
    productId,
    dosage,
    pillCount,
    quantity,
  }: {
    productId: Id<'products'>
    dosage?: string
    pillCount?: number
    quantity: number
  }) => {
    if (!session?.user) {
      router.push(`/auth/login?next=/${product?.slug ?? product?._id ?? productId}`)
      return
    }

    const key = dosage ? `${dosage}-${pillCount ?? ''}` : 'simple'
    try {
      setPendingKey(key)
      await updateItemQuantity({
        productId,
        quantity,
        dosage,
        pillCount,
      })
    } finally {
      setPendingKey(null)
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
  const getCartQuantity = (dosage?: string, pillCount?: number) =>
    cart?.items.find((item) => item.productId === product._id && item.dosage === dosage && item.pillCount === pillCount)
      ?.quantity ?? 0

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
                  <ProductCartControl
                    quantity={getCartQuantity(undefined, undefined)}
                    pending={pendingKey === 'simple'}
                    inStock={product.inStock}
                    onAdd={() => void handleAddToCart(undefined, undefined, basePrice)}
                    onDecrease={() =>
                      void handleSetQuantity({
                        productId: product._id,
                        quantity: getCartQuantity(undefined, undefined) - 1,
                      })
                    }
                    onIncrease={() =>
                      void handleSetQuantity({
                        productId: product._id,
                        quantity: getCartQuantity(undefined, undefined) + 1,
                      })
                    }
                  />
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
                      productId={product._id}
                      dosage={selectedDosage!}
                      pillCount={pkg.pillCount}
                      originalPrice={pkg.originalPrice}
                      price={pkg.price}
                      benefits={pkg.benefits ?? []}
                      expiryDate={pkg.expiryDate}
                      unit={product.unit}
                      inStock={product.inStock}
                      quantity={getCartQuantity(selectedDosage!, pkg.pillCount)}
                      pending={pendingKey === key}
                      onAddToCart={(dosage, pillCount, price) => void handleAddToCart(dosage, pillCount, price)}
                      onSetQuantity={({ productId, dosage, pillCount, quantity }) =>
                        void handleSetQuantity({ productId, dosage, pillCount, quantity })
                      }
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
                    <ProductCartControl
                      quantity={getCartQuantity(selectedDosage ?? undefined, undefined)}
                      pending={pendingKey === `${selectedDosage ?? 'simple'}-`}
                      inStock={product.inStock}
                      onAdd={() => void handleAddToCart(selectedDosage ?? undefined, undefined, basePrice)}
                      onDecrease={() =>
                        void handleSetQuantity({
                          productId: product._id,
                          dosage: selectedDosage ?? undefined,
                          quantity: getCartQuantity(selectedDosage ?? undefined, undefined) - 1,
                        })
                      }
                      onIncrease={() =>
                        void handleSetQuantity({
                          productId: product._id,
                          dosage: selectedDosage ?? undefined,
                          quantity: getCartQuantity(selectedDosage ?? undefined, undefined) + 1,
                        })
                      }
                    />
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

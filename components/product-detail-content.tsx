'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, ShoppingCart, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { formatPrice } from '@/lib/utils'
import { ProductGrid } from './product-grid'

// ── Package row ────────────────────────────────────────────────────────────────

type PackageRowProps = {
  dosage: string
  pillCount: number
  originalPrice: number
  price: number
  benefits: string[]
  unit: string
  image: string
  imageAlt?: string
  inStock: boolean
  onAddToCart: (dosage: string, pillCount: number, price: number) => void
  adding: boolean
  justAdded: boolean
}

function PackageRow({
  dosage, pillCount, originalPrice, price, benefits,
  unit, image, imageAlt, inStock, onAddToCart, adding, justAdded,
}: PackageRowProps) {
  const perUnit = price / pillCount
  const savings = originalPrice - price

  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-start gap-4 border-b border-slate-100 py-5 last:border-0 md:grid-cols-[160px_1fr_1fr_auto]">
      <div>
        <p className="text-base font-bold text-slate-900">{dosage}</p>
        <p className="text-sm text-slate-500">{pillCount} {unit}s</p>
        <img src={image} alt={imageAlt ?? dosage} className="mt-2 h-12 w-12 object-contain" />
      </div>
      <div>
        {originalPrice > price && (
          <p className="text-sm text-slate-400 line-through">${originalPrice.toFixed(2)}</p>
        )}
        <p className="text-xl font-bold text-slate-900">$ {price.toFixed(2)}</p>
        <p className="text-sm text-slate-500">$ {perUnit.toFixed(2)} per {unit}</p>
      </div>
      <div className="hidden space-y-1 md:block">
        {benefits.map((b) => (
          <p key={b} className="text-sm text-slate-600">+ {b}</p>
        ))}
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={adding || !inStock}
          onClick={() => onAddToCart(dosage, pillCount, price)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {justAdded ? (
            <><Check className="h-4 w-4 text-teal-600" />Added</>
          ) : adding ? 'Adding...' : (
            <><ShoppingCart className="h-4 w-4" />Add to cart</>
          )}
        </button>
        {savings > 0 && (
          <p className="text-xs font-semibold text-red-500">save: ${savings.toFixed(2)}</p>
        )}
      </div>
    </div>
  )
}

// ── Product description accordion ────────────────────────────────────────────

function ProductDescriptionAccordion({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="pharma-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-bold text-slate-900">Product Description</h2>
        {open ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-6 py-5">
          {content.split('\n').map((line, i) =>
            line.trim() === '' ? (
              <br key={i} />
            ) : (
              <p key={i} className="mb-2 text-sm leading-6 text-slate-700">{line}</p>
            ),
          )}
        </div>
      )}
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const addItem = useMutation(api.cart.addItem)

  const product = useQuery(api.products.getById, productId ? { productId: productId as Id<'products'> } : 'skip')
  const relatedProducts = useQuery(api.products.related, productId ? { productId: productId as Id<'products'>, limit: 4 } : 'skip')

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

  useEffect(() => {
    if (!product) return
    const title = product.seoTitle || `${product.name} (${product.genericName})`
    document.title = title
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    if (product.seoDescription) setMeta('description', product.seoDescription)
    if (product.seoKeywords) setMeta('keywords', product.seoKeywords)
    return () => { document.title = 'PharmaCare' }
  }, [product])

  const handleAddToCart = async (dosage?: string, pillCount?: number, unitPrice?: number) => {
    if (!product) return
    if (!session?.user) {
      router.push(`/auth/login?next=/products/${product._id}`)
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
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <p className="text-sm text-slate-500">Loading product...</p>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Product not found.</p>
          <Link href="/products" className="mt-3 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const selectedDosageData = product.pricingMatrix?.find((d) => d.dosage === selectedDosage)

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline">
        <ChevronLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header */}
      <section className="pharma-card p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-3xl bg-slate-50 p-6">
            <img src={product.image} alt={product.imageAlt ?? product.name} className="h-40 w-40 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {product.discount > 0 && (
                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                  -{product.discount}%
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {product.category}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              {product.name}{' '}
              <span className="text-lg font-normal text-slate-500">( {product.genericName} )</span>
            </h1>
            {product.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{product.description}</p>
            )}
            {/* Show price + add-to-cart only when no dosage tabs at all */}
            {dosages.length === 0 && (
              <>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {formatPrice(product.price)}
                  <span className="ml-1 text-base font-medium text-slate-500">per {product.unit}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void handleAddToCart(undefined, undefined, product.price * (1 - product.discount / 100))}
                  disabled={addingKey !== null || !product.inStock}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingKey !== null ? 'Adding...' : 'Add to cart'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Dosage tabs + packages (shown whenever dosages exist) */}
      {dosages.length > 0 && (
        <section className="pharma-card overflow-hidden">
          {/* Dosage selector */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-4">
            {dosages.map((dosage) => (
              <button
                key={dosage}
                type="button"
                onClick={() => setSelectedDosage(dosage)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  selectedDosage === dosage
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50'
                }`}
              >
                {dosage}
              </button>
            ))}
          </div>

          <div className="px-5">
            {hasPricingMatrix && selectedDosageData ? (
              /* Full package pricing rows */
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
              /* Fallback: simple add-to-cart for selected dosage */
              <div className="flex items-center justify-between py-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatPrice(product.price * (1 - product.discount / 100))}
                    <span className="ml-1 text-base font-medium text-slate-500">per {product.unit}</span>
                  </p>
                  {selectedDosage && (
                    <p className="mt-1 text-sm text-slate-500">Selected: {selectedDosage}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddToCart(selectedDosage ?? undefined, undefined, product.price * (1 - product.discount / 100))}
                  disabled={addingKey !== null || !product.inStock}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingKey !== null ? 'Adding...' : 'Add to cart'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full product description accordion */}
      {product.fullDescription && (
        <ProductDescriptionAccordion content={product.fullDescription} />
      )}

      {/* Related products */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">Related products</h2>
        <ProductGrid products={relatedProducts} />
      </section>
    </div>
  )
}

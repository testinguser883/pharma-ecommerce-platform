'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import type { Doc } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { formatPrice } from '@/lib/utils'

export function ProductCard({ product }: { product: Doc<'products'> }) {
  const router = useRouter()
  const addItem = useMutation(api.cart.addItem)
  const { data: session } = authClient.useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBuyNow = async () => {
    if (!session?.user) {
      router.push(`/auth/login?next=/products/${product._id}`)
      return
    }
    try {
      setIsSubmitting(true)
      await addItem({ productId: product._id, quantity: 1 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="pharma-card overflow-hidden">
      <div className="relative p-5">
        {product.discount > 0 && (
          <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-red-500 px-3 py-1 text-lg font-bold text-white">
            -{product.discount}%
          </span>
        )}
        <Link href={`/products/${product._id}`} className="block">
          <img src={product.image} alt={product.imageAlt ?? product.name} className="mx-auto h-24 w-24 object-contain" />
          <h3 className="mt-4 text-center text-3xl font-bold text-slate-900 md:text-2xl">{product.name}</h3>
          <p className="mt-1 text-center text-sm text-slate-500">{product.genericName}</p>
          <p className="mt-2 text-center text-lg font-bold text-slate-900">
            {formatPrice(product.price)} per {product.unit}
          </p>
        </Link>
      </div>
      <button
        type="button"
        onClick={() => void handleBuyNow()}
        disabled={isSubmitting || !product.inStock}
        className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-base font-semibold text-white transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShoppingCart className="h-4 w-4" />
        {isSubmitting ? 'Adding...' : 'Buy Now'}
      </button>
    </article>
  )
}

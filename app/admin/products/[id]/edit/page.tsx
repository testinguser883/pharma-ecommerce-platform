'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { AdminProductForm, type ProductFormData } from '@/components/admin-product-form'

function normalizeFormData(data: ProductFormData) {
  const pricingMatrix = data.pricingMatrix
    .filter((d) => d.dosage.trim() && d.packages.length > 0)
    .map((d) => ({
      dosage: d.dosage,
      packages: d.packages
        .filter((p) => p.pillCount && p.price)
        .map((p) => ({
          pillCount: parseFloat(p.pillCount) || 0,
          originalPrice: parseFloat(p.originalPrice) || 0,
          price: parseFloat(p.price) || 0,
          benefits: p.benefits
            ? p.benefits
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean)
            : [],
          expiryDate: p.expiryDate.trim() || undefined,
        })),
    }))
    .filter((d) => d.packages.length > 0)
  return {
    ...data,
    dosageOptions: pricingMatrix.map((d) => d.dosage),
    pricingMatrix: pricingMatrix.length > 0 ? pricingMatrix : undefined,
    fullDescription: data.fullDescription || undefined,
    slug: data.slug.trim() || undefined,
  }
}

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const product = useQuery(api.admin.getProductById, { id: id as Id<'products'> })
  const updateProduct = useMutation(api.admin.updateProduct)

  useEffect(() => {
    router.prefetch('/admin')
  }, [router])

  if (product === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-slate-700">Product not found</p>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Back to Admin
        </button>
      </div>
    )
  }

  const handleUpdate = async (data: ProductFormData) => {
    await updateProduct({ id: product._id, ...normalizeFormData(data) })
    router.push('/admin')
  }

  return <AdminProductForm initial={product} onSubmit={handleUpdate} onClose={() => router.push('/admin')} fullPage />
}

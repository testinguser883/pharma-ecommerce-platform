'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
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

export default function AdminNewProductPage() {
  const router = useRouter()
  const createProduct = useMutation(api.admin.createProduct)

  useEffect(() => {
    router.prefetch('/admin')
  }, [router])

  const handleCreate = async (data: ProductFormData) => {
    await createProduct(normalizeFormData(data))
    router.push('/admin')
  }

  return <AdminProductForm onSubmit={handleCreate} onClose={() => router.push('/admin')} fullPage />
}

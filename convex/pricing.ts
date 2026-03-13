import type { Doc } from './_generated/dataModel'

type ProductSelection = {
  dosage?: string
  pillCount?: number
}

export function resolveProductSelection(product: Doc<'products'>, selection: ProductSelection) {
  const dosage = selection.dosage?.trim()
  const pillCount = selection.pillCount

  if (product.pricingMatrix && product.pricingMatrix.length > 0) {
    if (!dosage) {
      throw new Error('A dosage selection is required.')
    }
    if (pillCount === undefined) {
      throw new Error('A package selection is required.')
    }

    const dosageOption = product.pricingMatrix.find((option) => option.dosage === dosage)
    if (!dosageOption) {
      throw new Error('Invalid dosage selection.')
    }

    const selectedPackage = dosageOption.packages.find((pkg) => pkg.pillCount === pillCount)
    if (!selectedPackage) {
      throw new Error('Invalid package selection.')
    }

    return {
      dosage,
      pillCount: selectedPackage.pillCount,
      unitPrice: Number(selectedPackage.price.toFixed(2)),
    }
  }

  if (product.dosageOptions.length > 0) {
    if (!dosage) {
      throw new Error('A dosage selection is required.')
    }
    if (!product.dosageOptions.includes(dosage)) {
      throw new Error('Invalid dosage selection.')
    }
  } else if (dosage) {
    throw new Error('Invalid dosage selection.')
  }

  if (pillCount !== undefined) {
    throw new Error('Invalid package selection.')
  }

  return {
    dosage,
    pillCount: undefined,
    unitPrice: Number((product.price * (1 - (product.discount ?? 0) / 100)).toFixed(2)),
  }
}

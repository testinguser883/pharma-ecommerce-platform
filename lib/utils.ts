import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}

export function sanitizeNextPath(path: string | null | undefined) {
  if (!path) return '/'
  if (!path.startsWith('/')) return '/'
  if (path.startsWith('//')) return '/'
  return path
}

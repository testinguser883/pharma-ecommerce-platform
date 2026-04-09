import { SITE_URL } from '@/lib/site-inputs'

const CONVEX_IMAGE_HOST_FRAGMENTS = ['convex.cloud', 'convex.site']

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function isConvexImageUrl(value: string) {
  if (!isHttpUrl(value)) return false

  try {
    const url = new URL(value)
    return CONVEX_IMAGE_HOST_FRAGMENTS.some((fragment) => url.hostname.includes(fragment))
  } catch {
    return false
  }
}

export function toPublicImagePath(value: string) {
  if (!isConvexImageUrl(value)) return value
  return `/media?url=${encodeURIComponent(value)}`
}

export function toAbsolutePublicImageUrl(value: string) {
  return new URL(toPublicImagePath(value), `${SITE_URL}/`).toString()
}

export function toProductImagePath(identifier: string, imageUrl: string) {
  if (!isConvexImageUrl(imageUrl)) return imageUrl
  return `/media/products/${encodeURIComponent(identifier)}.jpg`
}

export function toSliderImagePath(id: string, imageUrl: string) {
  if (!isConvexImageUrl(imageUrl)) return imageUrl
  return `/media/slides/${encodeURIComponent(id)}.jpg`
}

export function toAbsoluteProductImageUrl(identifier: string, imageUrl: string) {
  return new URL(toProductImagePath(identifier, imageUrl), `${SITE_URL}/`).toString()
}

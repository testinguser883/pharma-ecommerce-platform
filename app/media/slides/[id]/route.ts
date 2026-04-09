import { fetchQuery } from 'convex/nextjs'
import type { NextRequest } from 'next/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { isConvexImageUrl } from '@/lib/image-url'

export const runtime = 'nodejs'

function copyHeader(source: Headers, name: string, target: Headers, fallback?: string) {
  const value = source.get(name) ?? fallback
  if (value) target.set(name, value)
}

function getSliderId(rawId: string) {
  return rawId.replace(/\.[a-z0-9]+$/i, '') as Id<'sliderImages'>
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const image = await fetchQuery(api.media.getSliderImageSourceById, { id: getSliderId(rawId) })

  if (!image || !isConvexImageUrl(image.image)) {
    return new Response('Image not found', { status: 404 })
  }

  const upstream = await fetch(image.image, {
    cache: 'force-cache',
    next: { revalidate: 86400 },
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('Image not found', { status: upstream.status || 404 })
  }

  const headers = new Headers()
  copyHeader(upstream.headers, 'content-type', headers, 'application/octet-stream')
  copyHeader(upstream.headers, 'content-length', headers)
  copyHeader(upstream.headers, 'etag', headers)
  copyHeader(upstream.headers, 'last-modified', headers)
  headers.set('cache-control', upstream.headers.get('cache-control') ?? 'public, max-age=86400, s-maxage=86400')
  headers.set('x-robots-tag', 'all')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

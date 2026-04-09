import { fetchQuery } from 'convex/nextjs'
import type { NextRequest } from 'next/server'
import { api } from '@/convex/_generated/api'
import { isConvexImageUrl } from '@/lib/image-url'

export const runtime = 'nodejs'

function copyHeader(source: Headers, name: string, target: Headers, fallback?: string) {
  const value = source.get(name) ?? fallback
  if (value) target.set(name, value)
}

function getIdentifier(rawIdentifier: string) {
  return rawIdentifier.replace(/\.[a-z0-9]+$/i, '')
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ identifier: string }> }) {
  const { identifier: rawIdentifier } = await params
  const identifier = getIdentifier(rawIdentifier)
  const product = await fetchQuery(api.media.getProductImageSourceByIdentifier, { identifier })

  if (!product || !isConvexImageUrl(product.image)) {
    return new Response('Image not found', { status: 404 })
  }

  const upstream = await fetch(product.image, {
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

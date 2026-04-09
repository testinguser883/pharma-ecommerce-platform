import { NextRequest } from 'next/server'
import { isConvexImageUrl } from '@/lib/image-url'

export const runtime = 'nodejs'

function copyHeader(source: Headers, name: string, target: Headers, fallback?: string) {
  const value = source.get(name) ?? fallback
  if (value) target.set(name, value)
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url')?.trim()

  if (!sourceUrl || !isConvexImageUrl(sourceUrl)) {
    return new Response('Invalid image URL', { status: 400 })
  }

  const upstream = await fetch(sourceUrl, {
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

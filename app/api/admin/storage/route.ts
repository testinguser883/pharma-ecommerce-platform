import { isAdminAuthenticated, fetchAuthQuery } from '@/lib/auth-server'
import { api } from '@/convex/_generated/api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const storageId = searchParams.get('storageId')

  if (!storageId) {
    return new Response('Missing storageId', { status: 400 })
  }

  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    return new Response('Forbidden', { status: 403 })
  }

  const fileUrl = await fetchAuthQuery(api.admin.getStorageUrl, { storageId })
  if (!fileUrl) {
    return new Response('Not found', { status: 404 })
  }

  const upstream = await fetch(fileUrl)
  if (!upstream.ok) {
    return new Response('Storage fetch failed', { status: 502 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

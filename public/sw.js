const CACHE_NAME = 'images-v1'

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp|svg|gif|avif|ico)(\?.*)?$/i

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isImage =
    IMAGE_EXTENSIONS.test(url.pathname) ||
    url.hostname.includes('convex.cloud') ||
    url.hostname.includes('convex.site')

  if (!isImage) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)

      // Fetch fresh copy in background regardless
      const fetchPromise = fetch(request).then(async (response) => {
        if (!response.ok) return response

        // Compare with cached version — update cache if different
        if (cached) {
          const [cachedBuffer, freshBuffer] = await Promise.all([
            cached.clone().arrayBuffer(),
            response.clone().arrayBuffer(),
          ])
          const changed =
            cachedBuffer.byteLength !== freshBuffer.byteLength ||
            !new Uint8Array(cachedBuffer).every((b, i) => b === new Uint8Array(freshBuffer)[i])

          if (changed) {
            await cache.put(request, response.clone())
            // Notify all open tabs so they can reload the image
            const clients = await self.clients.matchAll()
            clients.forEach((client) =>
              client.postMessage({ type: 'IMAGE_UPDATED', url: request.url })
            )
          }
        } else {
          await cache.put(request, response.clone())
        }

        return response
      }).catch(() => cached) // network failure — fall back to cache silently

      // Serve cached immediately, revalidate in background
      return cached ?? fetchPromise
    })
  )
})

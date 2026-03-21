'use client'

import { useState, useEffect } from 'react'

/** Build the proxy URL for a storage file (served via Next.js API route). */
export function getAdminStorageProxyUrl(storageId: string): string {
  return `/api/admin/storage?storageId=${encodeURIComponent(storageId)}`
}

/** Fetch a file from the admin storage proxy. Cookies are sent automatically (same-origin). */
export async function fetchAuthenticatedBlob(storageId: string): Promise<Blob | null> {
  const res = await fetch(getAdminStorageProxyUrl(storageId), { credentials: 'include' })
  if (!res.ok) return null
  return res.blob()
}

/**
 * Fetches an image through the admin storage proxy and returns a blob URL.
 * Returns `null` while loading, or a blob URL string on success.
 */
export function useAuthenticatedImage(storageId: string | null | undefined): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!storageId) {
      setBlobUrl(null)
      return
    }

    let revoked = false

    fetchAuthenticatedBlob(storageId)
      .then((blob) => {
        if (revoked || !blob) return
        setBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null)
      })

    return () => {
      revoked = true
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [storageId])

  return blobUrl
}

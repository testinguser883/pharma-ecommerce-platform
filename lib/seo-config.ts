export const DISALLOWED_PATHS = [
  '/admin',
  '/cart',
  '/checkout',
  '/orders',
  '/account',
  '/auth/',
]

export function isDisallowed(url: string): boolean {
  return DISALLOWED_PATHS.some((path) => {
    const urlPath = new URL(url).pathname
    return urlPath === path || urlPath.startsWith(path)
  })
}

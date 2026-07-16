/** Build a public asset URL that respects Vite's deployment base path. */
export function publicAssetUrl(path: string, baseUrl = import.meta.env.BASE_URL) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${path.replace(/^\/+/, '')}`
}

export function f4AssetUrl(filename: string, baseUrl = import.meta.env.BASE_URL) {
  return publicAssetUrl(`assets/f4/${filename}`, baseUrl)
}

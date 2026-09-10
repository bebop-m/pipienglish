/** Build a public asset URL that respects Vite's deployment base path. */
export function publicAssetUrl(path: string, baseUrl = import.meta.env.BASE_URL) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${path.replace(/^\/+/, '')}`
}

/**
 * F4 素材 URL。领域层的 assetId 一律沿用批准母版的 `.png` 文件名(稳定逻辑 ID,存档与文档都引用它),
 * 生产目录里实际提供的是 scripts/optimize-f4-assets.py 派生的同名 `.webp`(F4-CHG-035:
 * 离线包 58 MB → 约 3 MB),映射只在这里做一次。
 */
export function f4AssetUrl(filename: string, baseUrl = import.meta.env.BASE_URL) {
  return publicAssetUrl(`assets/f4/${filename.replace(/\.png$/i, '.webp')}`, baseUrl)
}

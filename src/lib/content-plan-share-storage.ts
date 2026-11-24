type ContentShare = { id: string; url: string; brandId: string; brandName: string; month: string }
type ShareStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>

export const contentShareStorageKey = (brandId: string, month: string) => `workspace-content-plan-share:${brandId}:${month}`

export function loadStoredContentShare(storage: ShareStorage, brandId: string, month: string): ContentShare | null {
  const key = contentShareStorageKey(brandId, month)
  // Carry existing tab-local links over from an installation-specific namespace.
  const legacyKey = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .find((candidate) => candidate !== key && candidate?.endsWith(`-content-plan-share:${brandId}:${month}`))
  const stored = storage.getItem(key) ?? (legacyKey ? storage.getItem(legacyKey) : null)
  if (!stored) return null
  const parsed = JSON.parse(stored) as ContentShare | null
  if (!parsed || parsed.brandId !== brandId || parsed.month !== month || typeof parsed.id !== 'string' || typeof parsed.url !== 'string') return null
  if (!storage.getItem(key) && legacyKey) {
    storage.setItem(key, stored)
    storage.removeItem(legacyKey)
  }
  return parsed
}

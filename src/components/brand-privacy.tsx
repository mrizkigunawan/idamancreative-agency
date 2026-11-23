import { createContext, useContext } from 'react'

export type BrandPrivacyState = { enabled: boolean; aliases: Record<string, string>; maskText: (value: string) => string }
export const BrandPrivacyContext = createContext<BrandPrivacyState>({ enabled: false, aliases: {}, maskText: (value) => value })
export const useBrandPrivacy = () => useContext(BrandPrivacyContext)

export function BrandLabel({ id, name, fallback = 'Brand' }: { id?: string; name: string; fallback?: string }) {
  const { enabled, aliases } = useBrandPrivacy()
  return <>{enabled ? (id ? aliases[id] : undefined) ?? fallback : name}</>
}

import { normalizeAppearance } from './workspace-theme'
import type { WorkspaceAppearance } from './workspace-theme'

export type WorkspaceProfileDetails = WorkspaceAppearance & { id?: string; name: string; tagline: string; ownerName: string; email: string; phone: string; address: string; website: string; updatedAt?: number }
export const defaultWorkspaceProfile: WorkspaceProfileDetails = { name: 'Agency Workspace', tagline: 'Agency operating system', ownerName: '', email: '', phone: '', address: '', website: '', themeAccent: 'blue', themeMode: 'light' }
export const defaultWorkspaceLogo = '/brand/workspace-logo.png'
export const workspaceTitle = (name: string) => name === defaultWorkspaceProfile.name ? name : `${name} — Agency Workspace`

export function normalizeWorkspaceProfile(profile?: Partial<WorkspaceProfileDetails> | null): WorkspaceProfileDetails {
  return { ...defaultWorkspaceProfile, ...profile, ...normalizeAppearance(profile), name: profile?.name?.trim() || defaultWorkspaceProfile.name, tagline: profile?.tagline?.trim() || defaultWorkspaceProfile.tagline }
}

// Only these fields may be shown before login or on public review links.
export function publicWorkspaceIdentity(profile?: Partial<WorkspaceProfileDetails> | null) {
  const { name, tagline, updatedAt, themeAccent, themeMode } = normalizeWorkspaceProfile(profile)
  return { name, tagline, updatedAt, themeAccent, themeMode }
}

export function workspaceLogoUrl(profile: Pick<WorkspaceProfileDetails, 'updatedAt'>) {
  return `/api/workspace-logo${profile.updatedAt ? `?v=${profile.updatedAt}` : ''}`
}

export function workspaceDocumentPrefix(name: string) {
  const initials = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z0-9]+/g)?.slice(0, 4).map((word) => word[0]).join('').toUpperCase()
  return initials || 'WS'
}

export async function loadWorkspaceProfile(): Promise<WorkspaceProfileDetails> {
  const response = await fetch('/api/workspace-profile', { cache: 'no-store' })
  if (!response.ok) throw new Error('Profil workspace gagal dimuat. Coba lagi sebelum membuat dokumen.')
  const result = await response.json() as Partial<WorkspaceProfileDetails>
  return normalizeWorkspaceProfile(result)
}

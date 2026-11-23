export type WorkspaceProfileDetails = { id?: string; name: string; tagline: string; ownerName: string; email: string; phone: string; address: string; website: string; updatedAt?: number }
export const defaultWorkspaceProfile: WorkspaceProfileDetails = { name: 'Idaman Creative', tagline: 'Agency operating system', ownerName: '', email: '', phone: '', address: '', website: '' }

export async function loadWorkspaceProfile(): Promise<WorkspaceProfileDetails> {
  try {
    const response = await fetch('/api/workspace-profile', { cache: 'no-store' })
    if (!response.ok) return defaultWorkspaceProfile
    const result = await response.json() as Partial<WorkspaceProfileDetails>
    return { ...defaultWorkspaceProfile, ...result }
  } catch { return defaultWorkspaceProfile }
}

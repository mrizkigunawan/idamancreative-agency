import { createContext, useContext } from 'react'
import { defaultWorkspaceLogo, defaultWorkspaceProfile, workspaceLogoUrl } from '#/lib/workspace-profile'
import type { WorkspaceProfileDetails } from '#/lib/workspace-profile'

export const WorkspaceProfileContext = createContext<WorkspaceProfileDetails>(defaultWorkspaceProfile)
export const useWorkspaceProfile = () => useContext(WorkspaceProfileContext)

export function WorkspaceLogo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  const profile = useWorkspaceProfile()
  return <img className={className} src={workspaceLogoUrl(profile)} alt={decorative ? '' : profile.name} onError={(event) => {
    if (!event.currentTarget.src.endsWith(defaultWorkspaceLogo)) event.currentTarget.src = defaultWorkspaceLogo
  }} />
}

export function WorkspaceBrand() {
  const profile = useWorkspaceProfile()
  return <div className="brandmark"><WorkspaceLogo className="brand-logo" /><div className="workspace-brand-copy"><strong className="workspace-brand-name" title={profile.name}>{profile.name}</strong><div className="brand-sub" title={profile.tagline}>{profile.tagline}</div></div></div>
}

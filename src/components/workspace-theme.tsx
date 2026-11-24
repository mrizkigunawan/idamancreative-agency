import type { WorkspaceAppearance } from '#/lib/workspace-theme'
import { workspaceThemeCss } from '#/lib/workspace-theme'

export function WorkspaceTheme({ appearance }: { appearance: WorkspaceAppearance }) {
  return <style data-workspace-theme>{workspaceThemeCss(appearance)}</style>
}

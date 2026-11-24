import { eq } from 'drizzle-orm'
import { db } from './db'
import { workspaceProfile } from './schema'
import { normalizeWorkspaceProfile } from './workspace-profile'

export async function getWorkspaceProfile() {
  const [profile] = await db.select().from(workspaceProfile).where(eq(workspaceProfile.id, 'workspace')).limit(1)
  return normalizeWorkspaceProfile(profile)
}

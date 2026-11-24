export const setupTokenPattern = /^[a-f0-9]{64}$/
export const setupLifetimeMs = 30 * 60 * 1000
export const setupUnavailableMessage = 'Tautan aktivasi tidak valid, sudah kedaluwarsa, atau sudah digunakan. Minta tautan baru dari pengelola instalasi.'

export async function hashSetupToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function findSetupGrant(database: D1Database, email: string | undefined, token: string | undefined, now = Date.now()) {
  if (!email || !token || !setupTokenPattern.test(token)) return null
  return database.prepare(`SELECT email, expires_at FROM admin_setup
    WHERE id = 'workspace' AND token_hash = ? AND email = ? AND consumed_at IS NULL AND expires_at > ?
    AND NOT EXISTS (SELECT 1 FROM "user")`)
    .bind(await hashSetupToken(token), email, now).first<{ email: string; expires_at: number }>()
}

// D1 batch is atomic: a failed credential write rolls back the user and preserves the link.
// Recheck the grant inside the write, since it can expire or be replaced during password hashing.
export async function createActivatedAdmin(database: D1Database, input: { email: string; token: string; name: string; passwordHash: string }, now = Date.now()) {
  const userId = crypto.randomUUID()
  const tokenHash = await hashSetupToken(input.token)
  const createdAt = new Date(now).toISOString()
  const result = await database.batch([
    database.prepare(`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      SELECT ?, ?, email, 0, ?, ? FROM admin_setup
      WHERE id = 'workspace' AND token_hash = ? AND email = ? AND consumed_at IS NULL AND expires_at > ?
      AND NOT EXISTS (SELECT 1 FROM "user")`)
      .bind(userId, input.name, createdAt, createdAt, tokenHash, input.email, now),
    database.prepare(`INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      SELECT ?, id, 'credential', id, ?, ?, ? FROM "user" WHERE id = ?`)
      .bind(crypto.randomUUID(), input.passwordHash, createdAt, createdAt, userId),
    database.prepare(`UPDATE admin_setup SET consumed_at = ?, completed_user_id = ?
      WHERE id = 'workspace' AND token_hash = ? AND consumed_at IS NULL
      AND EXISTS (SELECT 1 FROM account WHERE "userId" = ? AND "providerId" = 'credential')`)
      .bind(now, userId, tokenHash, userId),
  ])
  if (result[0].meta.changes !== 1) return null
  return { id: userId, name: input.name, email: input.email, emailVerified: false, image: null, createdAt: new Date(now), updatedAt: new Date(now) }
}

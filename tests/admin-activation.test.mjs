import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { buildSetupGrant } from '../scripts/setup-link.mjs'
import { createActivatedAdmin, findSetupGrant, hashSetupToken } from '../src/lib/admin-setup.ts'

const email = 'owner@example.test'
const now = 1800000000000
function fixture(existingAdmin = false) {
  const sqlite = new DatabaseSync(':memory:')
  for (const path of readdirSync('migrations').filter((name) => name.endsWith('.sql')).sort()) {
    if (path.startsWith('0033') && existingAdmin) sqlite.exec(`INSERT INTO "user" (id,name,email,"createdAt","updatedAt") VALUES ('existing','Existing','${email}',0,0)`)
    sqlite.exec(readFileSync(`migrations/${path}`, 'utf8'))
  }
  // Small D1-compatible facade over real SQLite, including batch rollback.
  function prepare(sql, args = []) {
    return {
      bind: (...values) => prepare(sql, values),
      first: async () => sqlite.prepare(sql).get(...args) ?? null,
      run: () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
    }
  }
  const db = { prepare, batch: async (statements) => {
    sqlite.exec('BEGIN IMMEDIATE')
    try { const results = statements.map((statement) => statement.run()); sqlite.exec('COMMIT'); return results }
    catch (error) { sqlite.exec('ROLLBACK'); throw error }
  } }
  const issue = () => {
    const grant = buildSetupGrant(email, 'https://workspace.example.test', now)
    sqlite.exec(grant.sql)
    return new URL(grant.url).hash.slice('#activate='.length)
  }
  return { sqlite, db, issue }
}

test('issuer generates private, short-lived links and persists only the digest', async () => {
  const grant = buildSetupGrant(' OWNER@example.test ', 'https://workspace.example.test', now)
  const url = new URL(grant.url)
  const token = url.hash.slice('#activate='.length)
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.equal(url.search, '')
  assert.equal(grant.expiresAt - now, 30 * 60 * 1000)
  assert.ok(!grant.sql.includes(token))
  assert.ok(grant.sql.includes(await hashSetupToken(token)))
  for (const origin of ['http://public.example', 'https://owner:secret@example.test', 'https://example.test/path', 'https://example.test/?secret=1', 'https://example.test/#x']) assert.throws(() => buildSetupGrant(email, origin))
  assert.doesNotThrow(() => buildSetupGrant(email, 'http://localhost:3000'))
})

test('inspection requires the configured email and a current link; opening does not consume it', async () => {
  const { db, sqlite, issue } = fixture()
  const token = issue()
  for (const [allowedEmail, value, time] of [[undefined, token, now], ['other@example.test', token, now], [email, 'bad', now], [email, 'f'.repeat(64), now], [email, token, now + 1800000]]) assert.equal(await findSetupGrant(db, allowedEmail, value, time), null)
  assert.equal((await findSetupGrant(db, email, token, now)).email, email)
  assert.equal((await findSetupGrant(db, email, token, now)).email, email)
  assert.equal(sqlite.prepare('SELECT consumed_at FROM admin_setup').get().consumed_at, null)
})

test('a replacement invalidates the old link and the final write rechecks expiry and email', async () => {
  const { db, sqlite, issue } = fixture()
  const oldToken = issue()
  const replacement = issue()
  const input = { email, name: 'Owner', token: oldToken, passwordHash: 'hash' }
  assert.equal(await createActivatedAdmin(db, input, now), null)
  assert.equal(await createActivatedAdmin(db, { ...input, token: replacement }, now + 1800000), null)
  assert.equal(await createActivatedAdmin(db, { ...input, token: replacement, email: 'other@example.test' }, now), null)
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM "user"').get().count, 0)
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM account').get().count, 0)
})

test('activation stores a Better Auth compatible credential and consumes the link exactly once', async () => {
  const { db, sqlite, issue } = fixture()
  const token = issue()
  const password = 'Unique test password 123!'
  const passwordHash = await hashPassword(password)
  const input = { email, token, name: 'Owner', passwordHash }
  const results = await Promise.all([createActivatedAdmin(db, input, now), createActivatedAdmin(db, input, now)])
  assert.equal(results.filter(Boolean).length, 1)
  const user = results.find(Boolean)
  const account = sqlite.prepare('SELECT * FROM account').get()
  assert.equal(account.userId, user.id)
  assert.equal(account.providerId, 'credential')
  assert.equal(await verifyPassword({ password, hash: account.password }), true)
  assert.equal(new Date(sqlite.prepare('SELECT "createdAt" FROM "user"').get().createdAt).getTime(), now)
  assert.equal(sqlite.prepare('SELECT consumed_at FROM admin_setup').get().consumed_at, now)
  assert.equal(await findSetupGrant(db, email, token, now), null)
  assert.throws(issue, /activation is already closed/)
  sqlite.exec('DELETE FROM "user"')
  assert.throws(issue, /activation is already closed/)
})

test('failed credential writes roll back the user and preserve the activation link', async () => {
  const { db, sqlite, issue } = fixture()
  const token = issue()
  sqlite.exec(`CREATE TRIGGER simulate_failure BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT, 'test write failure'); END`)
  await assert.rejects(createActivatedAdmin(db, { email, token, name: 'Owner', passwordHash: 'hash' }, now), /test write failure/)
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM "user"').get().count, 0)
  assert.ok(await findSetupGrant(db, email, token, now))
  sqlite.exec('DROP TRIGGER simulate_failure')
  assert.ok(await createActivatedAdmin(db, { email, token, name: 'Owner', passwordHash: 'hash' }, now))
})

test('migration leaves an existing admin intact and permanently closes installation setup', () => {
  const { sqlite, issue } = fixture(true)
  assert.equal(sqlite.prepare('SELECT name FROM "user"').get().name, 'Existing')
  assert.equal(sqlite.prepare('SELECT completed_user_id FROM admin_setup').get().completed_user_id, 'existing')
  assert.throws(issue, /activation is already closed/)
  sqlite.exec('DELETE FROM "user"')
  assert.throws(issue, /activation is already closed/)
})

import { randomBytes, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const lifetimeMs = 30 * 60 * 1000
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`

export function buildSetupGrant(email, origin, now = Date.now()) {
  const normalizedEmail = z.email().parse(email.trim().toLowerCase())
  const url = new URL(origin)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
    !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('Use an HTTPS origin (or HTTP localhost), without a path, query, or fragment.')
  }
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = now + lifetimeMs
  // Triggers prevent issuing/replacing a grant after an admin or completion marker exists.
  const sql = `INSERT INTO admin_setup (id, token_hash, email, created_at, expires_at)
    VALUES ('workspace', ${sqlText(tokenHash)}, ${sqlText(normalizedEmail)}, ${now}, ${expiresAt})
    ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, email = excluded.email,
    created_at = excluded.created_at, expires_at = excluded.expires_at;`
  return { sql, url: `${url.origin}/#activate=${token}`, expiresAt }
}

function localDefaults() {
  try {
    const values = {}
    for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(ADMIN_EMAIL|BETTER_AUTH_URL)\s*=\s*(.*?)\s*$/)
      if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
    return values
  } catch { return {} }
}

export function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    local: { type: 'boolean' }, remote: { type: 'boolean' }, email: { type: 'string' }, origin: { type: 'string' },
    config: { type: 'string' }, 'persist-to': { type: 'string' }, help: { type: 'boolean' },
  } })
  if (values.help) {
    console.log('Usage: pnpm setup:link --local [--email owner@example.com --origin http://localhost:3000]\n       pnpm setup:link --remote --email owner@example.com --origin https://your-workspace.example\nOptions: --config <wrangler config>, --persist-to <local state directory>\nLocal email/origin default to ADMIN_EMAIL/BETTER_AUTH_URL in .dev.vars. Replacement links invalidate the previous link.')
    return
  }
  if (Boolean(values.local) === Boolean(values.remote)) throw new Error('Choose exactly one target: --local or --remote.')
  if (values.remote && values['persist-to']) throw new Error('--persist-to is only available with --local.')
  const defaults = values.local ? { ...localDefaults(), ...Object.fromEntries(['ADMIN_EMAIL', 'BETTER_AUTH_URL'].filter((key) => process.env[key]).map((key) => [key, process.env[key]])) } : {}
  const email = values.email || defaults.ADMIN_EMAIL
  const origin = values.origin || defaults.BETTER_AUTH_URL
  if (!email || !origin) throw new Error('Provide --email and --origin, matching ADMIN_EMAIL and BETTER_AUTH_URL on the Worker.')
  const grant = buildSetupGrant(email, origin)
  const require = createRequire(import.meta.url)
  const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js')
  const config = values.config || (values.remote ? 'wrangler.production.jsonc' : 'wrangler.jsonc')
  const command = [wrangler, 'd1', 'execute', 'DB', '--config', resolve(config), values.remote ? '--remote' : '--local', '--command', grant.sql, '--json']
  if (values['persist-to']) command.push('--persist-to', resolve(values['persist-to']))
  try {
    execFileSync(process.execPath, command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    const output = `${error.stdout || ''} ${error.stderr || ''}`
    if (output.includes('admin activation is already closed')) throw new Error('Activation is closed: an admin account or completed activation already exists. Use normal sign-in.')
    throw new Error('Could not issue an activation link. Check Wrangler access, the selected database, and migration 0033. No link was printed.')
  }
  console.log(`\nOne-time admin activation link (${values.remote ? 'REMOTE' : 'LOCAL'}):\n${grant.url}\n\nExpires: ${new Date(grant.expiresAt).toISOString()} (30 minutes).\nShare privately with the approved owner. Any previous activation link is now invalid.\nThe email and origin must match ADMIN_EMAIL and BETTER_AUTH_URL on this installation.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main() } catch (error) { console.error(error instanceof z.ZodError ? 'Provide a valid admin email address.' : error.message); process.exitCode = 1 }
}

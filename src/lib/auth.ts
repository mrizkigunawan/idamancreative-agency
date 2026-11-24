import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from 'cloudflare:workers'

async function matchesSecret(provided: string, expected: string) {
  const encoder = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash)
}

export const auth = betterAuth({
  database: env.DB,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [env.BETTER_AUTH_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  rateLimit: { window: 60, max: 5, storage: 'database' },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { crossSubDomainCookies: { enabled: false } },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const bootstrapToken = ctx?.headers?.get('x-admin-bootstrap')
          const expectedToken = env.ADMIN_BOOTSTRAP_TOKEN
          const allowedEmail = env.ADMIN_EMAIL?.trim().toLowerCase()
          const account = await env.DB.prepare('SELECT id FROM "user" LIMIT 1').first()
          const validBootstrap = expectedToken && bootstrapToken ? await matchesSecret(bootstrapToken, expectedToken) : false
          if (account || !validBootstrap || !allowedEmail || user.email.toLowerCase() !== allowedEmail) {
            throw new APIError('FORBIDDEN', { message: 'Admin setup is unavailable.' })
          }
          return { data: { ...user, emailVerified: true } }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
})

import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from 'cloudflare:workers'
import { adminActivation } from './admin-activation.server'

export const auth = betterAuth({
  database: env.DB,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [env.BETTER_AUTH_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  rateLimit: { enabled: true, window: 60, max: 5, storage: 'database' },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { crossSubDomainCookies: { enabled: false }, ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
  databaseHooks: {
    user: {
      create: {
        before: async () => { throw new APIError('FORBIDDEN', { message: 'Gunakan tautan aktivasi dari pengelola instalasi.' }) },
      },
    },
  },
  plugins: [adminActivation(env.DB, env.ADMIN_EMAIL), tanstackStartCookies()],
})

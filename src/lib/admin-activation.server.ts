import type { BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthEndpoint, formCsrfMiddleware } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { z } from 'zod'
import { createActivatedAdmin, findSetupGrant, setupUnavailableMessage } from './admin-setup'

export function adminActivation(database: D1Database, configuredEmail?: string) {
  const email = configuredEmail?.trim().toLowerCase()
  const allowedEmail = email && z.email().safeParse(email).success ? email : undefined
  return {
    id: 'admin-activation',
    endpoints: {
      inspectAdminActivation: createAuthEndpoint('/admin-setup/inspect', {
        method: 'POST', use: [formCsrfMiddleware],
        body: z.object({ token: z.string().max(128).optional() }),
      }, async (ctx) => {
        ctx.setHeader('Cache-Control', 'no-store')
        const secure = new URL(ctx.context.baseURL).protocol === 'https:'
        const cookie = secure ? '__Secure-workspace-activation' : 'workspace-activation'
        const token = ctx.body.token ?? ctx.getCookie(cookie) ?? undefined
        const grant = await findSetupGrant(database, allowedEmail, token)
        if (!grant) {
          if (token) ctx.setCookie(cookie, '', { httpOnly: true, secure, sameSite: 'strict', path: '/api/auth', maxAge: 0 })
          // An ordinary login visit has no activation cookie and needs no error message.
          return ctx.json({ available: false, invalid: Boolean(token) })
        }
        ctx.setCookie(cookie, token!, { httpOnly: true, secure, sameSite: 'strict', path: '/api/auth', maxAge: Math.max(0, Math.floor((grant.expires_at - Date.now()) / 1000)) })
        return ctx.json({ available: true, email: grant.email, expiresAt: grant.expires_at })
      }),
      activateAdmin: createAuthEndpoint('/admin-setup/activate', {
        method: 'POST', use: [formCsrfMiddleware],
        body: z.object({ name: z.string().trim().min(1).max(80), password: z.string().min(8).max(128) }),
      }, async (ctx) => {
        ctx.setHeader('Cache-Control', 'no-store')
        const secure = new URL(ctx.context.baseURL).protocol === 'https:'
        const cookie = secure ? '__Secure-workspace-activation' : 'workspace-activation'
        const token = ctx.getCookie(cookie) ?? undefined
        const grant = await findSetupGrant(database, allowedEmail, token)
        if (!grant || !token) throw new APIError('FORBIDDEN', { message: setupUnavailableMessage })
        const passwordHash = await ctx.context.password.hash(ctx.body.password)
        let user
        try { user = await createActivatedAdmin(database, { email: grant.email, token, name: ctx.body.name, passwordHash }) }
        catch {
          ctx.context.logger.error('Admin activation transaction failed.')
          throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Aktivasi belum dapat disimpan. Coba lagi sebelum tautan kedaluwarsa.' })
        }
        if (!user) throw new APIError('FORBIDDEN', { message: setupUnavailableMessage })
        ctx.setCookie(cookie, '', { httpOnly: true, secure, sameSite: 'strict', path: '/api/auth', maxAge: 0 })
        try {
          const session = await ctx.context.internalAdapter.createSession(user.id)
          if (!session) throw new Error('Session unavailable')
          await setSessionCookie(ctx, { session, user })
          return ctx.json({ activated: true, signedIn: true })
        } catch {
          // The account is complete. A session failure must not reopen registration.
          ctx.context.logger.error('Admin activated but automatic sign-in failed.')
          return ctx.json({ activated: true, signedIn: false })
        }
      }),
    },
    rateLimit: [
      { pathMatcher: (path) => path === '/admin-setup/inspect', window: 60, max: 20 },
      { pathMatcher: (path) => path === '/admin-setup/activate', window: 60, max: 5 },
    ],
  } satisfies BetterAuthPlugin
}

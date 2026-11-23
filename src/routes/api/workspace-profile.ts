import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { workspaceProfile } from '#/lib/schema'

const defaults = { id: 'workspace', name: 'Idaman Creative', tagline: 'Agency operating system', ownerName: '', email: '', phone: '', address: '', website: '', updatedAt: 0 }
const profileInput = z.object({ name: z.string().trim().min(1).max(120), tagline: z.string().trim().max(160).optional(), ownerName: z.string().trim().max(120).optional(), email: z.string().trim().max(160).refine((value) => !value || z.email().safeParse(value).success, 'Alamat email usaha tidak valid.').optional(), phone: z.string().trim().max(40).optional(), address: z.string().trim().max(300).optional(), website: z.string().trim().max(200).refine((value) => !value || /^https:\/\//i.test(value), 'Gunakan alamat website HTTPS.').optional() })
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })

export const Route = createFileRoute('/api/workspace-profile')({
  server: { handlers: {
    GET: async ({ request }) => {
      if (!await auth.api.getSession({ headers: request.headers })) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
      const [profile] = await db.select().from(workspaceProfile).where(eq(workspaceProfile.id, 'workspace')).limit(1)
      return json(profile ?? defaults)
    },
    PUT: async ({ request }) => {
      if (!await auth.api.getSession({ headers: request.headers })) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
      const origin = request.headers.get('Origin')
      if (origin && new URL(origin).origin !== new URL(request.url).origin) return json({ error: 'Permintaan perubahan profil workspace tidak valid.' }, 403)
      let payload: unknown
      try { payload = await request.json() } catch { return json({ error: 'Detail profil tidak dapat dibaca.' }, 400) }
      const parsed = profileInput.safeParse(payload)
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Periksa kembali detail profil.' }, 400)
      const [current] = await db.select().from(workspaceProfile).where(eq(workspaceProfile.id, 'workspace')).limit(1)
      const values = { ...defaults, ...current, ...parsed.data, id: 'workspace', updatedAt: Date.now() }
      await db.insert(workspaceProfile).values(values).onConflictDoUpdate({ target: workspaceProfile.id, set: values })
      return json(values)
    },
  } },
})

import { Buffer } from 'node:buffer'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { workspaceBranding } from '#/lib/schema'

const maxImageBytes = 1_600_000
const imageMimes = new Set(['image/jpeg', 'image/png'])
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const hasAdminSession = async (request: Request) => Boolean(await auth.api.getSession({ headers: request.headers }))
const validOrigin = (request: Request) => { const origin = request.headers.get('Origin'); return !origin || new URL(origin).origin === new URL(request.url).origin }
function validImage(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
}

export const Route = createFileRoute('/api/workspace-logo')({
  server: { handlers: {
    GET: async () => {
      const [logo] = await db.select().from(workspaceBranding).where(eq(workspaceBranding.id, 'workspace')).limit(1)
      if (!logo) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
      return new Response(new Uint8Array(logo.fileData), { headers: { 'Content-Type': logo.mime, 'Content-Length': String(logo.sizeBytes), 'Content-Disposition': 'inline', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
    },
    POST: async ({ request }) => {
      if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
      if (!validOrigin(request)) return json({ error: 'Permintaan unggah tidak valid.' }, 403)
      if (Number(request.headers.get('Content-Length') || 0) > maxImageBytes + 32_000) return json({ error: 'Logo maksimal 1,6 MB.' }, 413)
      let form: FormData
      try { form = await request.formData() } catch { return json({ error: 'File logo tidak dapat dibaca.' }, 400) }
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'Pilih file logo.' }, 400)
      if (!imageMimes.has(file.type)) return json({ error: 'Gunakan logo PNG atau JPG.' }, 415)
      if (file.size < 8 || file.size > maxImageBytes) return json({ error: 'Ukuran logo maksimal 1,6 MB.' }, 413)
      const bytes = Buffer.from(await file.arrayBuffer())
      if (!validImage(bytes, file.type)) return json({ error: 'Isi file tidak cocok dengan format gambar.' }, 415)
      const filename = file.name.replace(/[^\w.() -]/g, '_').slice(0, 120) || 'workspace-logo'
      const updatedAt = Date.now()
      await db.insert(workspaceBranding).values({ id: 'workspace', filename, mime: file.type, fileData: bytes, sizeBytes: bytes.byteLength, updatedAt }).onConflictDoUpdate({ target: workspaceBranding.id, set: { filename, mime: file.type, fileData: bytes, sizeBytes: bytes.byteLength, updatedAt } })
      return json({ ok: true, updatedAt })
    },
    DELETE: async ({ request }) => {
      if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
      if (!validOrigin(request)) return json({ error: 'Permintaan hapus tidak valid.' }, 403)
      await db.delete(workspaceBranding).where(eq(workspaceBranding.id, 'workspace'))
      return json({ ok: true })
    },
  } },
})

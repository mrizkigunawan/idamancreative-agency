import { Buffer } from 'node:buffer'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { contentThumbnails, contents } from '#/lib/schema'

const maxImageBytes = 1_600_000
const imageMimes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
const hasAdminSession = async (request: Request) => Boolean(await auth.api.getSession({ headers: request.headers }))
const validOrigin = (request: Request) => { const origin = request.headers.get('Origin'); return !origin || new URL(origin).origin === new URL(request.url).origin }
function validImage(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return mime === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

export const Route = createFileRoute('/api/content-thumbnail')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const contentId = new URL(request.url).searchParams.get('contentId')
        if (!contentId) return json({ error: 'Thumbnail tidak ditemukan.' }, 400)
        const [row] = await db.select().from(contentThumbnails).where(eq(contentThumbnails.contentId, contentId)).limit(1)
        if (!row) return json({ error: 'Thumbnail belum diunggah.' }, 404)
        const bytes = new Uint8Array(row.fileData)
        return new Response(bytes, { headers: { 'Content-Type': imageMimes.has(row.mime) ? row.mime : 'application/octet-stream', 'Content-Length': String(row.sizeBytes), 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
      },
      POST: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!validOrigin(request)) return json({ error: 'Permintaan unggah tidak valid.' }, 403)
        if (Number(request.headers.get('Content-Length') || 0) > maxImageBytes + 32_000) return json({ error: 'Cover maksimal 1,6 MB.' }, 413)
        let form: FormData
        try { form = await request.formData() } catch { return json({ error: 'File cover tidak dapat dibaca.' }, 400) }
        const contentId = form.get('contentId')
        const file = form.get('file')
        if (typeof contentId !== 'string' || !contentId || !(file instanceof File)) return json({ error: 'Pilih konten dan file gambar.' }, 400)
        if (!imageMimes.has(file.type)) return json({ error: 'Gunakan gambar JPG, PNG, atau WebP.' }, 415)
        if (file.size < 8 || file.size > maxImageBytes) return json({ error: 'Ukuran cover maksimal 1,6 MB.' }, 413)
        const [content] = await db.select({ id: contents.id }).from(contents).where(eq(contents.id, contentId)).limit(1)
        if (!content) return json({ error: 'Konten tidak ditemukan.' }, 404)
        const bytes = Buffer.from(await file.arrayBuffer())
        if (!validImage(bytes, file.type)) return json({ error: 'Isi file tidak cocok dengan format gambar.' }, 415)
        const filename = file.name.replace(/[^\w.() -]/g, '_').slice(0, 120) || 'content-cover'
        await db.insert(contentThumbnails).values({ contentId, filename, mime: file.type, fileData: bytes, sizeBytes: bytes.byteLength, updatedAt: Date.now() }).onConflictDoUpdate({ target: contentThumbnails.contentId, set: { filename, mime: file.type, fileData: bytes, sizeBytes: bytes.byteLength, updatedAt: Date.now() } })
        return json({ filename, sizeBytes: bytes.byteLength })
      },
      DELETE: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!validOrigin(request)) return json({ error: 'Permintaan hapus tidak valid.' }, 403)
        const contentId = new URL(request.url).searchParams.get('contentId')
        if (!contentId) return json({ error: 'Konten tidak ditemukan.' }, 400)
        await db.delete(contentThumbnails).where(eq(contentThumbnails.contentId, contentId))
        return json({ ok: true })
      },
    },
  },
})

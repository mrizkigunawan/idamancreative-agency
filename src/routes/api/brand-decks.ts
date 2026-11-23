import { Buffer } from 'node:buffer'
import { createFileRoute } from '@tanstack/react-router'
import { desc, eq } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { brandDecks, brands } from '#/lib/schema'

const maxPdfBytes = 1_800_000

async function hasAdminSession(request: Request) {
  return Boolean(await auth.api.getSession({ headers: request.headers }))
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function checkOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  return !origin || new URL(origin).origin === new URL(request.url).origin
}

export const Route = createFileRoute('/api/brand-decks')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const url = new URL(request.url)
        const brandId = url.searchParams.get('brandId')
        if (url.searchParams.get('info') === '1') {
          if (!brandId) return json({ error: 'Brand tidak ditemukan.' }, 400)
          const decks = await db.select({ id: brandDecks.id, filename: brandDecks.filename, sizeBytes: brandDecks.sizeBytes, uploadedAt: brandDecks.uploadedAt }).from(brandDecks).where(eq(brandDecks.brandId, brandId)).orderBy(desc(brandDecks.uploadedAt))
          return json({ decks })
        }
        const deckId = url.searchParams.get('deckId')
        const [deck] = deckId
          ? await db.select().from(brandDecks).where(eq(brandDecks.id, deckId)).limit(1)
          : brandId ? await db.select().from(brandDecks).where(eq(brandDecks.brandId, brandId)).orderBy(desc(brandDecks.uploadedAt)).limit(1) : []
        if (!deck) return json({ error: 'Deck tidak ditemukan.' }, 404)
        const safeFilename = deck.filename.replace(/[\r\n"\\]/g, '_')
        const pdfBytes = new Uint8Array(deck.sizeBytes)
        pdfBytes.set(deck.fileData)
        return new Response(pdfBytes.buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(deck.sizeBytes),
            'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(deck.filename)}`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
      DELETE: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!checkOrigin(request)) return json({ error: 'Permintaan hapus tidak valid.' }, 403)
        const deckId = new URL(request.url).searchParams.get('deckId')
        if (!deckId) return json({ error: 'Pilih deck yang ingin dihapus.' }, 400)
        await db.delete(brandDecks).where(eq(brandDecks.id, deckId))
        return json({ ok: true })
      },
      POST: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!checkOrigin(request)) return json({ error: 'Permintaan upload tidak valid.' }, 403)
        const contentLength = Number(request.headers.get('Content-Length') || 0)
        if (contentLength > maxPdfBytes + 64_000) return json({ error: 'Ukuran PDF maksimal 1,8 MB.' }, 413)
        let form: FormData
        try { form = await request.formData() } catch { return json({ error: 'File PDF tidak dapat dibaca.' }, 400) }
        const brandId = form.get('brandId')
        const file = form.get('file')
        if (typeof brandId !== 'string' || !brandId || !(file instanceof File)) return json({ error: 'Pilih brand dan file PDF.' }, 400)
        if (file.size < 8 || file.size > maxPdfBytes) return json({ error: 'Ukuran PDF harus lebih dari 0 dan maksimal 1,8 MB.' }, 413)
        const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1)
        if (!brand) return json({ error: 'Brand tidak ditemukan.' }, 404)
        const bytes = Buffer.from(await file.arrayBuffer())
        if (bytes.toString('ascii', 0, 5) !== '%PDF-') return json({ error: 'File yang dipilih bukan PDF yang valid.' }, 415)
        const filename = file.name.replace(/[^\w.() -]/g, '_').slice(0, 120) || 'social-media-deck.pdf'
        const uploadedAt = Date.now()
        const id = crypto.randomUUID()
        await db.insert(brandDecks).values({ id, brandId, filename, fileData: bytes, sizeBytes: bytes.byteLength, uploadedAt })
        return json({ id, filename, sizeBytes: bytes.byteLength, uploadedAt })
      },
    },
  },
})

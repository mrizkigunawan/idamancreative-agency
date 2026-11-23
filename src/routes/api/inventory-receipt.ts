import { Buffer } from 'node:buffer'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { inventoryItems } from '#/lib/schema'

const maxFileBytes = 1_800_000
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

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
function hasValidSignature(bytes: Buffer, mime: string) {
  if (mime === 'application/pdf') return bytes.toString('ascii', 0, 5) === '%PDF-'
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return mime === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

export const Route = createFileRoute('/api/inventory-receipt')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const inventoryId = new URL(request.url).searchParams.get('inventoryId')
        if (!inventoryId) return json({ error: 'Nota tidak ditemukan.' }, 400)
        const [item] = await db.select({ data: inventoryItems.receiptData, filename: inventoryItems.receiptFilename, mime: inventoryItems.receiptMime, size: inventoryItems.receiptSizeBytes }).from(inventoryItems).where(eq(inventoryItems.id, inventoryId)).limit(1)
        if (!item?.data || !item.filename || !item.mime) return json({ error: 'Nota belum diunggah.' }, 404)
        const filename = item.filename.replace(/[\r\n"\\]/g, '_')
        const bytes = new Uint8Array(item.data)
        return new Response(bytes, { headers: {
          'Content-Type': allowedTypes.has(item.mime) ? item.mime : 'application/octet-stream',
          'Content-Length': String(item.size ?? bytes.byteLength),
          'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        } })
      },
      POST: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!checkOrigin(request)) return json({ error: 'Permintaan unggah tidak valid.' }, 403)
        if (Number(request.headers.get('Content-Length') || 0) > maxFileBytes + 64_000) return json({ error: 'Nota maksimal 1,8 MB.' }, 413)
        let form: FormData
        try { form = await request.formData() } catch { return json({ error: 'File nota tidak dapat dibaca.' }, 400) }
        const inventoryId = form.get('inventoryId')
        const file = form.get('file')
        if (typeof inventoryId !== 'string' || !inventoryId || !(file instanceof File)) return json({ error: 'Pilih barang dan file nota.' }, 400)
        if (file.size < 8 || file.size > maxFileBytes) return json({ error: 'Ukuran file nota maksimal 1,8 MB.' }, 413)
        if (!allowedTypes.has(file.type)) return json({ error: 'Gunakan nota PDF, JPG, PNG, atau WebP.' }, 415)
        const [item] = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(eq(inventoryItems.id, inventoryId)).limit(1)
        if (!item) return json({ error: 'Data inventaris tidak ditemukan.' }, 404)
        const data = Buffer.from(await file.arrayBuffer())
        if (!hasValidSignature(data, file.type)) return json({ error: 'Isi file tidak cocok dengan format nota.' }, 415)
        const filename = file.name.replace(/[^\w.() -]/g, '_').slice(0, 120) || 'nota-inventaris'
        await db.update(inventoryItems).set({ receiptData: data, receiptFilename: filename, receiptMime: file.type, receiptSizeBytes: data.byteLength, updatedAt: Date.now() }).where(eq(inventoryItems.id, inventoryId))
        return json({ filename, sizeBytes: data.byteLength })
      },
      DELETE: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        if (!checkOrigin(request)) return json({ error: 'Permintaan hapus tidak valid.' }, 403)
        const inventoryId = new URL(request.url).searchParams.get('inventoryId')
        if (!inventoryId) return json({ error: 'Data inventaris tidak ditemukan.' }, 400)
        await db.update(inventoryItems).set({ receiptData: null, receiptFilename: null, receiptMime: null, receiptSizeBytes: null, updatedAt: Date.now() }).where(eq(inventoryItems.id, inventoryId))
        return json({ ok: true })
      },
    },
  },
})

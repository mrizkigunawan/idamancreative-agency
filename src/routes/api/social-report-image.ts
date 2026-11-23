import { Buffer } from 'node:buffer'
import { and, asc, desc, eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { socialReportAttachments, socialReports } from '#/lib/schema'

const maxImageBytes = 1_800_000
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp'])
const attachmentPlatforms = new Set(['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Threads', 'Lainnya'])
const validPlatform = (platform: string) => attachmentPlatforms.has(platform) || (platform.trim().length > 0 && platform.trim().length <= 60 && /^[\p{L}\p{N}][\p{L}\p{N}\s&()._-]*$/u.test(platform.trim()))
async function hasAdminSession(request: Request) { return Boolean(await auth.api.getSession({ headers: request.headers })) }
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }) }
function validMonth(month: string | null): month is string { return Boolean(month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) }
function validImage(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return mime === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

export const Route = createFileRoute('/api/social-report-image')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const url = new URL(request.url)
        const brandId = url.searchParams.get('brandId')
        const month = url.searchParams.get('month')
        if (!brandId || !validMonth(month)) return json({ error: 'Brand atau periode laporan tidak valid.' }, 400)
        const where = and(eq(socialReports.brandId, brandId), eq(socialReports.month, month))
        const attachmentId = url.searchParams.get('attachmentId')
        if (url.searchParams.get('list') === '1' || attachmentId) {
          const [report] = await db.select().from(socialReports).where(where).limit(1)
          if (!report) return url.searchParams.get('list') === '1' ? json({ attachments: [] }) : json({ error: 'Lampiran tidak ditemukan.' }, 404)
          if (attachmentId) {
            const [attachment] = await db.select().from(socialReportAttachments).where(and(eq(socialReportAttachments.reportId, report.id), eq(socialReportAttachments.id, attachmentId))).limit(1)
            if (!attachment) return json({ error: 'Lampiran tidak ditemukan.' }, 404)
            const bytes = new Uint8Array(attachment.fileData)
            return new Response(bytes, { headers: { 'Content-Type': allowedMime.has(attachment.mime) ? attachment.mime : 'application/octet-stream', 'Content-Length': String(bytes.byteLength), 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
          }
          const selectAttachments = () => db.select({ id: socialReportAttachments.id, title: socialReportAttachments.title, platform: socialReportAttachments.platform, filename: socialReportAttachments.filename, mime: socialReportAttachments.mime, sizeBytes: socialReportAttachments.sizeBytes, sortOrder: socialReportAttachments.sortOrder, cropX: socialReportAttachments.cropX, cropY: socialReportAttachments.cropY, cropWidth: socialReportAttachments.cropWidth, cropHeight: socialReportAttachments.cropHeight, imageWidth: socialReportAttachments.imageWidth, imageHeight: socialReportAttachments.imageHeight }).from(socialReportAttachments).where(eq(socialReportAttachments.reportId, report.id)).orderBy(asc(socialReportAttachments.sortOrder), asc(socialReportAttachments.createdAt))
          let attachments = await selectAttachments()
          if (!attachments.length && report.referenceImage && report.referenceMime && report.referenceFilename) {
            const now = Date.now()
            await db.insert(socialReportAttachments).values({ id: crypto.randomUUID(), reportId: report.id, title: 'Screenshot insight', filename: report.referenceFilename, mime: report.referenceMime, fileData: report.referenceImage, sizeBytes: report.referenceImage.byteLength, sortOrder: 0, cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100, createdAt: now, updatedAt: now })
            await db.update(socialReports).set({ referenceImage: null, referenceFilename: null, referenceMime: null }).where(eq(socialReports.id, report.id))
            attachments = await selectAttachments()
          }
          return json({ attachments })
        }
        if (url.searchParams.get('info') === '1') {
          const [row] = await db.select({ filename: socialReports.referenceFilename, mime: socialReports.referenceMime }).from(socialReports).where(where).limit(1)
          return row?.filename && row.mime ? json({ filename: row.filename, mime: row.mime }) : json({ error: 'Screenshot belum diunggah.' }, 404)
        }
        const [row] = await db.select({ image: socialReports.referenceImage, filename: socialReports.referenceFilename, mime: socialReports.referenceMime }).from(socialReports).where(where).limit(1)
        if (!row?.image || !row.mime) return json({ error: 'Screenshot belum diunggah.' }, 404)
        const bytes = new Uint8Array(row.image)
        return new Response(bytes.buffer, { headers: { 'Content-Type': row.mime, 'Content-Length': String(bytes.byteLength), 'Content-Disposition': `inline; filename="${(row.filename ?? 'insight-screenshot').replace(/[\r\n"\\]/g, '_')}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
      },
      POST: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const origin = request.headers.get('Origin')
        if (origin && new URL(origin).origin !== new URL(request.url).origin) return json({ error: 'Permintaan upload tidak valid.' }, 403)
        if (Number(request.headers.get('Content-Length') || 0) > maxImageBytes + 32_000) return json({ error: 'Gambar terlalu besar setelah diproses. Coba unggah kembali.' }, 413)
        let form: FormData
        try { form = await request.formData() } catch { return json({ error: 'Screenshot tidak dapat dibaca.' }, 400) }
        const brandId = form.get('brandId')
        const month = form.get('month')
        const file = form.get('file')
        if (typeof brandId !== 'string' || typeof month !== 'string' || !validMonth(month) || !(file instanceof File)) return json({ error: 'Pilih screenshot dan periode laporan.' }, 400)
        if (!allowedMime.has(file.type)) return json({ error: 'Gunakan gambar JPG, PNG, atau WebP.' }, 415)
        const [report] = await db.select({ id: socialReports.id }).from(socialReports).where(and(eq(socialReports.brandId, brandId), eq(socialReports.month, month))).limit(1)
        if (!report) return json({ error: 'Simpan draft laporan terlebih dahulu.' }, 409)
        const bytes = Buffer.from(await file.arrayBuffer())
        const filename = file.name.replace(/[^\w.() -]/g, '_').slice(0, 120) || 'insight-screenshot'
        if (form.get('action') === 'upload') {
          const platform = form.get('platform')
          if (typeof platform !== 'string' || !validPlatform(platform)) return json({ error: 'Pilih platform lampiran yang valid.' }, 400)
          if (file.size < 8 || file.size > maxImageBytes) return json({ error: 'Gambar terlalu besar setelah diproses. Coba unggah kembali.' }, 413)
          if (!validImage(bytes, file.type)) return json({ error: 'Isi file tidak cocok dengan format gambar.' }, 415)
          const [last] = await db.select({ sortOrder: socialReportAttachments.sortOrder }).from(socialReportAttachments).where(eq(socialReportAttachments.reportId, report.id)).orderBy(desc(socialReportAttachments.sortOrder)).limit(1)
          const now = Date.now()
          const requestedTitle = form.get('title')
          const title = (typeof requestedTitle === 'string' ? requestedTitle.trim().slice(0, 120) : '') || filename.replace(/\.[^.]+$/, '')
          const imageWidth = Math.min(100_000, Math.max(0, Math.round(Number(form.get('imageWidth')) || 0)))
          const imageHeight = Math.min(100_000, Math.max(0, Math.round(Number(form.get('imageHeight')) || 0)))
          const id = crypto.randomUUID()
          await db.insert(socialReportAttachments).values({ id, reportId: report.id, title, platform, filename, mime: file.type, fileData: bytes, sizeBytes: bytes.byteLength, sortOrder: (last?.sortOrder ?? -1) + 1, cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100, imageWidth, imageHeight, createdAt: now, updatedAt: now })
          return json({ id, title, platform, filename, sizeBytes: bytes.byteLength, sortOrder: (last?.sortOrder ?? -1) + 1, cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100, imageWidth, imageHeight })
        }
        if (file.size < 8 || file.size > 850_000) return json({ error: 'Screenshot insight lama maksimal 850 KB.' }, 413)
        if (!validImage(bytes, file.type)) return json({ error: 'Isi file tidak cocok dengan format gambar.' }, 415)
        await db.update(socialReports).set({ referenceImage: bytes, referenceFilename: filename, referenceMime: file.type, updatedAt: Date.now() }).where(eq(socialReports.id, report.id))
        return json({ filename, sizeBytes: bytes.byteLength })
      },
      PATCH: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const origin = request.headers.get('Origin')
        if (origin && new URL(origin).origin !== new URL(request.url).origin) return json({ error: 'Permintaan perubahan lampiran tidak valid.' }, 403)
        let body: { brandId?: string; month?: string; attachments?: { id: string; title: string; platform: string; cropX: number; cropY: number; cropWidth: number; cropHeight: number; imageWidth: number; imageHeight: number; sortOrder: number }[] }
        try { body = await request.json() as typeof body } catch { return json({ error: 'Perubahan lampiran tidak dapat dibaca.' }, 400) }
        if (!body.brandId || !validMonth(body.month ?? null) || !Array.isArray(body.attachments)) return json({ error: 'Brand, periode, atau susunan lampiran tidak valid.' }, 400)
        const month = body.month!
        const [report] = await db.select({ id: socialReports.id }).from(socialReports).where(and(eq(socialReports.brandId, body.brandId), eq(socialReports.month, month))).limit(1)
        if (!report) return json({ error: 'Simpan draft laporan terlebih dahulu.' }, 409)
        const rows = await db.select({ id: socialReportAttachments.id }).from(socialReportAttachments).where(eq(socialReportAttachments.reportId, report.id))
        const validIds = new Set(rows.map((row) => row.id))
        const submittedIds = body.attachments.map((item) => item?.id)
        const validCrop = (item: NonNullable<typeof body.attachments>[number]) => [item.cropX, item.cropY, item.cropWidth, item.cropHeight].every(Number.isInteger) && item.cropX >= 0 && item.cropY >= 0 && item.cropWidth >= 5 && item.cropHeight >= 5 && item.cropX + item.cropWidth <= 100 && item.cropY + item.cropHeight <= 100 && Number.isInteger(item.imageWidth) && Number.isInteger(item.imageHeight) && item.imageWidth >= 0 && item.imageHeight >= 0 && item.imageWidth <= 100_000 && item.imageHeight <= 100_000
        if (body.attachments.length !== rows.length || new Set(submittedIds).size !== submittedIds.length || body.attachments.some((item) => typeof item?.id !== 'string' || !validIds.has(item.id) || typeof item.title !== 'string' || typeof item.platform !== 'string' || !validPlatform(item.platform) || !validCrop(item))) return json({ error: 'Susunan lampiran berubah. Muat ulang laporan lalu coba lagi.' }, 409)
        const now = Date.now()
        for (const [index, item] of body.attachments.entries()) await db.update(socialReportAttachments).set({ title: item.title.trim().slice(0, 120), platform: item.platform, cropX: item.cropX, cropY: item.cropY, cropWidth: item.cropWidth, cropHeight: item.cropHeight, imageWidth: item.imageWidth, imageHeight: item.imageHeight, sortOrder: index, updatedAt: now }).where(and(eq(socialReportAttachments.id, item.id), eq(socialReportAttachments.reportId, report.id)))
        return json({ ok: true })
      },
      DELETE: async ({ request }) => {
        if (!await hasAdminSession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const origin = request.headers.get('Origin')
        if (origin && new URL(origin).origin !== new URL(request.url).origin) return json({ error: 'Permintaan hapus tidak valid.' }, 403)
        const url = new URL(request.url)
        const brandId = url.searchParams.get('brandId')
        const month = url.searchParams.get('month')
        if (!brandId || !validMonth(month)) return json({ error: 'Brand atau periode laporan tidak valid.' }, 400)
        const attachmentId = url.searchParams.get('attachmentId')
        if (attachmentId) {
          const [report] = await db.select({ id: socialReports.id }).from(socialReports).where(and(eq(socialReports.brandId, brandId), eq(socialReports.month, month))).limit(1)
          if (!report) return json({ error: 'Lampiran tidak ditemukan.' }, 404)
          await db.delete(socialReportAttachments).where(and(eq(socialReportAttachments.reportId, report.id), eq(socialReportAttachments.id, attachmentId)))
          const remaining = await db.select({ id: socialReportAttachments.id }).from(socialReportAttachments).where(eq(socialReportAttachments.reportId, report.id)).orderBy(asc(socialReportAttachments.sortOrder))
          for (const [index, item] of remaining.entries()) await db.update(socialReportAttachments).set({ sortOrder: index }).where(eq(socialReportAttachments.id, item.id))
          return json({ ok: true })
        }
        await db.update(socialReports).set({ referenceImage: null, referenceFilename: null, referenceMime: null, updatedAt: Date.now() }).where(and(eq(socialReports.brandId, brandId), eq(socialReports.month, month)))
        return json({ ok: true })
      },
    },
  },
})

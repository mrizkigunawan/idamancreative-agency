import { createFileRoute } from '@tanstack/react-router'
import { and, asc, eq, gte, gt, inArray, isNull, lte } from 'drizzle-orm'
import { auth } from '#/lib/auth'
import { db } from '#/lib/db'
import { getWorkspaceProfile } from '#/lib/workspace-profile.server'
import { workspaceThemeCss } from '#/lib/workspace-theme'
import { defaultWorkspaceLogo, publicWorkspaceIdentity, workspaceLogoUrl } from '#/lib/workspace-profile'
import { brands, contentPlanComments, contentPlanShares, contentThumbnails, contents } from '#/lib/schema'

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const id = () => crypto.randomUUID()
async function digest(value: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
async function activeShare(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const tokenHash = await digest(token)
  const [share] = await db.select().from(contentPlanShares).where(and(eq(contentPlanShares.tokenHash, tokenHash), isNull(contentPlanShares.revokedAt), gt(contentPlanShares.expiresAt, Date.now()))).limit(1)
  return share ?? null
}
function checkOrigin(request: Request) { const origin = request.headers.get('Origin'); return !origin || new URL(origin).origin === new URL(request.url).origin }

export const Route = createFileRoute('/api/content-plan-share')({
  server: { handlers: {
    GET: async ({ request }) => {
      const url = new URL(request.url)
      const shareId = url.searchParams.get('shareId')
      if (shareId) {
        if (!await auth.api.getSession({ headers: request.headers })) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
        const comments = await db.select({ authorName: contentPlanComments.authorName, body: contentPlanComments.body, createdAt: contentPlanComments.createdAt }).from(contentPlanComments).where(eq(contentPlanComments.shareId, shareId)).orderBy(asc(contentPlanComments.createdAt))
        return json({ comments })
      }
      const token = url.searchParams.get('token') ?? ''
      const share = await activeShare(token)
      if (!share) return new Response('Tautan tidak berlaku atau sudah kedaluwarsa.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
      if (url.searchParams.get('image') === '1') {
        const contentId = url.searchParams.get('contentId') ?? ''
        const inScope = share.contentId ? contentId === share.contentId : Boolean((await db.select({ id: contents.id }).from(contents).where(and(eq(contents.id, contentId), eq(contents.brandId, share.brandId), gte(contents.date, `${share.month}-01`), lte(contents.date, `${share.month}-31`))).limit(1))[0])
        if (!contentId || !inScope) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
        const [image] = await db.select().from(contentThumbnails).where(eq(contentThumbnails.contentId, contentId)).limit(1)
        if (!image) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
        return new Response(new Uint8Array(image.fileData), { headers: { 'Content-Type': image.mime, 'Content-Length': String(image.sizeBytes), 'Content-Disposition': 'inline', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
      }
      const [[brand], plan, comments, workspace] = await Promise.all([
        db.select({ name: brands.name }).from(brands).where(eq(brands.id, share.brandId)).limit(1),
        db.select({ id: contents.id, title: contents.title, format: contents.format, date: contents.date, status: contents.status, platforms: contents.platforms, inspo: contents.inspo, hook: contents.hook, brief: contents.brief, caption: contents.caption, pillar: contents.pillar, funnel: contents.funnel, sceneBreakdown: contents.sceneBreakdown, hashtags: contents.hashtags, cta: contents.cta }).from(contents).where(share.contentId ? and(eq(contents.id, share.contentId), eq(contents.brandId, share.brandId)) : and(eq(contents.brandId, share.brandId), gte(contents.date, `${share.month}-01`), lte(contents.date, `${share.month}-31`))).orderBy(asc(contents.date)),
        db.select({ authorName: contentPlanComments.authorName, body: contentPlanComments.body, createdAt: contentPlanComments.createdAt }).from(contentPlanComments).where(eq(contentPlanComments.shareId, share.id)).orderBy(asc(contentPlanComments.createdAt)),
        getWorkspaceProfile(),
      ])
      const { name: workspaceName, tagline: workspaceTagline } = publicWorkspaceIdentity(workspace)
      const thumbnailIds = plan.length ? new Set((await db.select({ contentId: contentThumbnails.contentId }).from(contentThumbnails).where(inArray(contentThumbnails.contentId, plan.map((row) => row.id)))).map((row) => row.contentId)) : new Set<string>()
      const itemsHtml = plan.map((row) => {
        let inspiration = ''
        try {
          const candidate = new URL(row.inspo)
          if (candidate.protocol === 'https:' || candidate.protocol === 'http:') inspiration = `<a href="${escapeHtml(candidate.toString())}" target="_blank" rel="noopener noreferrer">Buka referensi</a>`
        } catch { /* omit invalid inspiration URL */ }
        const talkingHeadBrief = [row.hook, row.brief].filter(Boolean).join('\n\n')
        const captionCtaHashtag = [row.caption, row.cta ? `CTA: ${row.cta}` : '', row.hashtags ? `Hashtag: ${row.hashtags}` : ''].filter(Boolean).join('\n\n')
        const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${row.date}T12:00:00`))
        const coverUrl = thumbnailIds.has(row.id) ? `/api/content-plan-share?token=${encodeURIComponent(token)}&image=1&contentId=${encodeURIComponent(row.id)}` : ''
        const details = [
          ['Pillar konten', row.pillar],
          ['Marketing funnel', row.funnel],
          ['Link inspo', inspiration],
          ['Brief (talking head)', talkingHeadBrief],
          ['Details shoot', row.sceneBreakdown],
          ['Caption · CTA · Hashtag', captionCtaHashtag],
        ].filter(([, value]) => value).map(([label, value]) => `<section><strong>${escapeHtml(label)}</strong><p>${label === 'Link inspo' ? value : escapeHtml(value)}</p></section>`).join('')
        return `<article class="post">${coverUrl ? `<img class="cover" src="${coverUrl}" alt="Foto cover konten">` : '<div class="no-cover">Foto cover belum diunggah</div>'}<header><span>${escapeHtml(dateLabel)} · ${escapeHtml(row.format)}</span><span>${escapeHtml((row.platforms ?? []).join(' · '))} · ${escapeHtml(row.status)}</span></header><h2>${escapeHtml(row.title)}</h2>${details}</article>`
      }).join('')
      const postsHtml = plan.length ? `<div class="posts">${itemsHtml}</div>` : '<p class="muted">Belum ada konten untuk periode ini.</p>'
      const commentsHtml = comments.map((comment) => `<article class="comment"><strong>${escapeHtml(comment.authorName)}</strong><small>${new Date(comment.createdAt).toLocaleString('id-ID')}</small><p>${escapeHtml(comment.body)}</p></article>`).join('')
      const safeToken = escapeHtml(token)
      const html = `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(workspaceName)} · Draft konten · ${escapeHtml(brand?.name)}</title><style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');${workspaceThemeCss(workspace)}*{box-sizing:border-box}body{margin:0;background:var(--surface-subtle);color:var(--ink);font:14px/1.6 'DM Sans',sans-serif}.top-logo{float:right;width:auto;height:34px;max-width:120px;object-fit:contain}.watermark{margin-top:24px;padding-top:12px;border-top:1px solid var(--line);text-align:center;color:var(--muted);font-size:12px;letter-spacing:.02em}.wrap{max-width:1120px;margin:auto;padding:24px 20px 40px}header.top{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:18px}header.top small,.muted{color:var(--muted)}h1{margin:4px 0;font-size:24px;font-weight:600}.posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;gap:12px}.post,.review{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px}.cover{display:block;width:100%;height:180px;object-fit:cover;background:var(--surface-subtle);border-radius:9px;margin:0 0 10px}.no-cover{display:grid;place-items:center;height:48px;border-radius:9px;background:var(--surface-subtle);color:var(--muted);margin-bottom:10px;font-size:12px}.post header{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px 8px;color:var(--muted);font-size:12px}.post h2{font-size:16px;font-weight:600;line-height:1.4;margin:7px 0 9px;overflow-wrap:anywhere}.post section{border-top:1px solid var(--line);padding-top:7px;margin-top:7px}.post section strong{font-size:13px;font-weight:650}.post p,.comment p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0;font-size:13px}.review{margin-top:16px}.review h2{margin-top:0}input,textarea,button{font:inherit;font-size:14px;border-radius:9px;padding:10px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);width:100%}form{display:grid;gap:8px}form label{font-size:13px;font-weight:600;margin-top:8px}textarea{min-height:90px;margin:0}a{color:var(--accent);text-underline-offset:3px}input:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button:hover{background:var(--accent-hover)}button{background:var(--accent);color:var(--on-accent);font-weight:600;border:0;cursor:pointer;margin-top:8px}.comment{border-top:1px solid #eee;padding:12px 0}.comment small{float:right;color:var(--muted)}#notice{color:var(--success);min-height:20px;font-size:12px}@media(max-width:900px){.posts{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.wrap{padding:18px 12px 28px}.posts{grid-template-columns:1fr;gap:9px}.cover{height:210px}}</style><main class="wrap"><header class="top"><img class="top-logo" src="${escapeHtml(workspaceLogoUrl(workspace))}" alt="${escapeHtml(workspaceName)}" onerror="this.onerror=null;this.src='${defaultWorkspaceLogo}'"><small>Rencana konten untuk ditinjau</small><h1>${escapeHtml(brand?.name)}</h1><div>${escapeHtml(new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(`${share.month}-01T12:00:00`)))}</div></header>${postsHtml}<section class="review"><h2>Masukan untuk draft</h2><p class="muted">Tulis komentar atau revisi yang ingin disampaikan.</p><form id="form"><label for="review-name">Nama</label><input id="review-name" name="name" maxlength="100" required placeholder="Nama kamu"><label for="review-body">Komentar atau revisi</label><textarea id="review-body" name="body" maxlength="3000" required placeholder="Tulis masukan untuk draft ini"></textarea><button>Kirim masukan</button></form><p id="notice" role="status"></p><div id="comments">${commentsHtml}</div></section><footer class="watermark">${escapeHtml(workspaceName)} · ${escapeHtml(workspaceTagline)}</footer></main><script>const form=document.querySelector('#form'),notice=document.querySelector('#notice');form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'comment',token:'${safeToken}',name:data.get('name'),body:data.get('body')})});const result=await response.json();if(!response.ok){notice.textContent=result.error||'Komentar gagal dikirim.';return}notice.textContent='Masukan terkirim. Terima kasih!';form.reset();location.reload()})</script></html>`
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } })
    },
    POST: async ({ request }) => {
      if (!checkOrigin(request)) return json({ error: 'Asal permintaan tidak valid.' }, 403)
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
      if (body.action === 'comment') {
        const token = String(body.token ?? ''), authorName = String(body.name ?? '').trim(), commentBody = String(body.body ?? '').trim()
        const share = await activeShare(token)
        if (!share) return json({ error: 'Tautan tidak berlaku atau sudah kedaluwarsa.' }, 404)
        if (!authorName || authorName.length > 100 || !commentBody || commentBody.length > 3000) return json({ error: 'Isi nama dan komentar (maksimal 3.000 karakter).' }, 400)
        await db.insert(contentPlanComments).values({ id: id(), shareId: share.id, authorName, body: commentBody, createdAt: Date.now() })
        return json({ ok: true })
      }
      if (!await auth.api.getSession({ headers: request.headers })) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401)
      if (body.action === 'create') {
        const contentId = String(body.contentId ?? '')
        let brandId = String(body.brandId ?? ''), month = String(body.month ?? '')
        if (contentId) {
          const [content] = await db.select({ brandId: contents.brandId, date: contents.date }).from(contents).where(eq(contents.id, contentId)).limit(1)
          if (!content) return json({ error: 'Konten tidak ditemukan.' }, 404)
          brandId = content.brandId; month = content.date.slice(0, 7)
        }
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'Periode tidak valid.' }, 400)
        const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.id, brandId)).limit(1)
        if (!brand) return json({ error: 'Brand tidak ditemukan.' }, 404)
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
        const shareId = id(), now = Date.now()
        await db.insert(contentPlanShares).values({ id: shareId, brandId, contentId: contentId || null, month, tokenHash: await digest(token), createdAt: now, expiresAt: now + 30 * 24 * 60 * 60 * 1000, revokedAt: null })
        const url = new URL('/api/content-plan-share', request.url); url.searchParams.set('token', token)
        return json({ id: shareId, url: url.toString(), brandId: brand.id, brandName: brand.name, month, expiresAt: now + 30 * 24 * 60 * 60 * 1000 })
      }
      if (body.action === 'revoke') {
        const shareId = String(body.id ?? '')
        await db.update(contentPlanShares).set({ revokedAt: Date.now() }).where(eq(contentPlanShares.id, shareId))
        return json({ ok: true })
      }
      return json({ error: 'Aksi tidak dikenal.' }, 400)
    },
  } },
})

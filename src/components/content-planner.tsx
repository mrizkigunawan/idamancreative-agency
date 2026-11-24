import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Image as ImageIcon, Link2, Move, Pencil, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'
import type { brandSocialProfiles, brands, contents } from '#/lib/schema'

type Brand = typeof brands.$inferSelect
type Content = typeof contents.$inferSelect
type Profile = typeof brandSocialProfiles.$inferSelect
type Highlight = { id: string; title: string; coverUrl: string; sortOrder: number }
type ProfileForm = { profilePictureUrl: string; username: string; displayName: string; bio: string; highlights: Highlight[]; pinnedContentIds: string[] }
const emptyProfile: ProfileForm = { profilePictureUrl: '', username: '', displayName: '', bio: '', highlights: [], pinnedContentIds: [] }

function isInstagramPostLink(value: string) {
  try { const url = new URL(value); return /(^|\.)instagram\.com$/i.test(url.hostname) && /^\/(p|reel|tv)\//i.test(url.pathname) } catch { return false }
}

function instagramBrands(brands: Brand[], contents: Content[]) {
  return brands.filter((brand) => {
    if (!brand.isActive) return false
    const links = [...Object.entries(brand.platformLinks ?? {}).map(([title, url]) => `${title} ${url}`), ...(brand.customLinks ?? []).map((link) => `${link.title} ${link.url}`)]
    const brandContents = contents.filter((item) => item.brandId === brand.id)
    const hasInstagram = (brand.handledPlatforms ?? []).includes('Instagram') || brandContents.some((item) => item.platforms.includes('Instagram')) || links.some((value) => /instagram/i.test(value))
    if (hasInstagram) return true
    return false
  })
}

function PlannerBrandEmpty({ type }: { type: 'feed' | 'profile' }) {
  return <section className="card planner-brand-empty"><span className="planner-brand-empty-icon"><Camera size={20} /></span><div><div className="eyebrow">Instagram only</div><h3>{type === 'feed' ? 'Belum ada brand untuk Feed Planner' : 'Profile Planner belum tersedia'}</h3><p>Planner Instagram menampilkan brand aktif yang Instagram-nya dipilih sebagai platform yang di-handle.</p><small>Buka Edit profil di Brand &amp; SOW, lalu centang Instagram pada bagian Platform yang di-handle.</small></div></section>
}

async function cropProfileImage(file: File, x: number, y: number, fit: 'cover' | 'contain', repositionSaved = false, zoom = 1) {
  const image = await createImageBitmap(file)
  try {
    let sx = 0, sy = 0, sw = image.width, sh = image.height
    for (const size of [640, 520, 420, 320]) {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Foto tidak dapat diproses di browser ini.')
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, size, size)
      if (fit === 'contain') {
        if (repositionSaved) {
          const drawSize = size * zoom
          context.drawImage(image, (size - drawSize) * x / 100, (size - drawSize) * y / 100, drawSize, drawSize)
        } else {
          const scale = Math.min(size * 0.78 / image.width, size * 0.78 / image.height) * zoom
          const width = image.width * scale, height = image.height * scale
          context.drawImage(image, (size - width) * x / 100, (size - height) * y / 100, width, height)
        }
      } else {
        if (zoom < 1) {
          const scale = Math.min(size / image.width, size / image.height) * zoom
          const width = image.width * scale, height = image.height * scale
          context.drawImage(image, (size - width) * x / 100, (size - height) * y / 100, width, height)
        } else {
          const cropSize = Math.min(image.width, image.height) / zoom
          sw = cropSize; sh = cropSize
          sx = (image.width - cropSize) * x / 100
          sy = (image.height - cropSize) * y / 100
          context.drawImage(image, sx, sy, sw, sh, 0, 0, size, size)
        }
      }
      for (const quality of [0.82, 0.72, 0.62]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length * 0.75 <= 180_000) return dataUrl
      }
    }
    throw new Error('Foto terlalu besar setelah diproses. Coba pilih gambar lain.')
  } finally { image.close() }
}

export function ProfileImageUpload({ value, label, shape = 'square', fit = 'cover', onChange, onBusyChange, onRemove }: { value: string; label: string; shape?: 'square' | 'circle'; fit?: 'cover' | 'contain'; onChange: (value: string) => void; onBusyChange: (busy: boolean) => void; onRemove?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [zoom, setZoom] = useState(1)
  const [sourceSize, setSourceSize] = useState({ width: 1, height: 1 })
  const [repositionSaved, setRepositionSaved] = useState(false)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const positionRef = useRef(position)
  const dragging = useRef(false)
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  const setBusy = (busy: boolean) => { setWorking(busy); onBusyChange(busy) }
  const selectFile = async (selected: File | undefined) => {
    if (!selected) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setError('Pilih foto JPG, PNG, atau WebP.'); return }
    if (selected.size > 20_000_000) { setError('Ukuran foto maksimal 20 MB agar dapat diproses dengan lancar.'); return }
    const url = URL.createObjectURL(selected)
    setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url })
    setFile(selected); setRepositionSaved(false); positionRef.current = { x: 50, y: 50 }; setPosition(positionRef.current); setZoom(1)
    setBusy(true)
    try { const bitmap = await createImageBitmap(selected); setSourceSize({ width: bitmap.width, height: bitmap.height }); bitmap.close(); onChange(await cropProfileImage(selected, 50, 50, fit)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Foto gagal diproses.') }
    finally { setBusy(false) }
  }
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => { if (!file || working) return; dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId) }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !file) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const scale = repositionSaved ? zoom : fit === 'contain' ? Math.min(bounds.width * 0.78 / sourceSize.width, bounds.height * 0.78 / sourceSize.height) * zoom : zoom < 1 ? Math.min(bounds.width / sourceSize.width, bounds.height / sourceSize.height) * zoom : Math.max(bounds.width / sourceSize.width, bounds.height / sourceSize.height) * zoom
    const slackX = bounds.width - sourceSize.width * scale, slackY = bounds.height - sourceSize.height * scale
    const delta = positionRef.current
    const next = { x: Math.max(0, Math.min(100, delta.x + (Math.abs(slackX) < 1 ? 0 : event.movementX / slackX * 100))), y: Math.max(0, Math.min(100, delta.y + (Math.abs(slackY) < 1 ? 0 : event.movementY / slackY * 100))) }
    positionRef.current = next; setPosition(next)
  }
  const finishDrag = async () => {
    if (!dragging.current || !file) return
    dragging.current = false; setBusy(true)
    try { onChange(await cropProfileImage(file, positionRef.current.x, positionRef.current.y, fit, repositionSaved, zoom)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Penyesuaian foto gagal disimpan.') }
    finally { setBusy(false) }
  }
  const adjustSavedPhoto = async () => {
    if (!value || working) return
    setError(''); setBusy(true)
    try {
      const response = await fetch(value)
      if (!response.ok) throw new Error('Foto profil tidak dapat dibuka untuk diatur ulang.')
      const blob = await response.blob()
      const source = new File([blob], 'profile-photo.jpg', { type: blob.type || 'image/jpeg' })
      const bitmap = await createImageBitmap(source); setSourceSize({ width: bitmap.width, height: bitmap.height }); bitmap.close()
      const url = URL.createObjectURL(source)
      setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url }); setZoom(1)
      setFile(source); setRepositionSaved(true); positionRef.current = { x: 50, y: 50 }; setPosition(positionRef.current)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Foto profil tidak dapat diatur ulang.') }
    finally { setBusy(false) }
  }
  const applyCrop = async () => {
    if (!file || working) return
    setBusy(true); setError('')
    try { onChange(await cropProfileImage(file, positionRef.current.x, positionRef.current.y, fit, repositionSaved, zoom)); setFile(null); setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return '' }); setRepositionSaved(false); positionRef.current = { x: 50, y: 50 }; setPosition(positionRef.current); setZoom(1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Crop foto gagal diterapkan.') }
    finally { setBusy(false) }
  }
  const zoomImage = (next: number) => { setZoom(next); if (fit === 'contain') { positionRef.current = { ...positionRef.current }; setPosition(positionRef.current) } }
  return <div className={`profile-image-upload ${shape === 'circle' ? 'circle' : ''}`}><div className="field"><span>{label}</span><div className="profile-image-upload-row"><div className="profile-image-crop" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => void finishDrag()} onPointerCancel={() => void finishDrag()} style={{ cursor: file ? 'grab' : 'default' }} title={file ? 'Seret foto untuk mengatur posisi' : undefined}>{previewUrl ? <img src={previewUrl} alt="Pratinjau crop" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, maxWidth: 'none', objectFit: fit, objectPosition: `${position.x}% ${position.y}%`, left: `${-(zoom - 1) * position.x}%`, top: `${-(zoom - 1) * position.y}%`, position: 'absolute', padding: fit === 'contain' ? '10%' : undefined }} /> : value ? <img src={value} alt={label} /> : <span><ImageIcon size={18} /><small>Belum ada foto</small></span>}{working && <i className="profile-image-processing">Memproses…</i>}</div><div className="profile-image-upload-actions"><label className="button profile-image-choose"><Camera size={13} aria-hidden="true" /> {value || previewUrl ? 'Ganti foto' : 'Unggah foto'}<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>{value && !file && <button type="button" className="button" disabled={working} onClick={() => void adjustSavedPhoto()}><Move size={13} aria-hidden="true" /> Atur posisi</button>}{onRemove && value && !file && <button type="button" className="button danger profile-image-remove" disabled={working} onClick={onRemove}><Trash2 size={13} aria-hidden="true" /> Hapus foto</button>}<small>{file ? 'Seret foto dan atur zoom, lalu selesaikan crop.' : 'JPG, PNG, atau WebP · maksimal 20 MB'}</small></div></div>{file && <div className="profile-image-adjust"><label><span>Perbesar / perkecil</span><input type="range" min="0.6" max="2.4" step="0.05" value={zoom} onChange={(event) => zoomImage(Number(event.target.value))} /><small>{Math.round(zoom * 100)}%</small></label><button type="button" className="button primary" disabled={working} onClick={() => void applyCrop()}><Check size={13} /> {working ? 'Memproses…' : 'Selesai crop'}</button></div>}{error && <small className="error" role="alert">{error}</small>}</div></div>
}

function InstagramCoverPreview({ src, title, objectPosition = 'center' }: { src: string; title: string; objectPosition?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  if (!src || failed) return <span className="instagram-grid-placeholder"><span className="instagram-grid-placeholder-icon"><ImageIcon size={19} /></span><small>{failed ? isInstagramPostLink(src) ? 'Link posting, bukan file cover' : 'Cover tidak dapat dimuat' : 'Cover belum ditambahkan'}</small><strong>{title}</strong></span>
  return <img src={src} alt={`Cover ${title}`} loading="lazy" style={{ objectPosition }} onError={() => setFailed(true)} />
}

function ProfileGridCover({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  if (!src || failed || isInstagramPostLink(src)) return <span className="profile-grid-placeholder"><ImageIcon size={17} /><small>{isInstagramPostLink(src) ? 'Tambahkan file cover' : 'Cover belum tersedia'}</small></span>
  return <img src={src} alt={`Cover ${title}`} loading="lazy" onError={() => setFailed(true)} />
}

async function cropInstagramCover(file: File, verticalPosition: number) {
  const image = await createImageBitmap(file)
  try {
    const targetRatio = 4 / 5
    let sx = 0, sy = 0, sw = image.width, sh = image.height
    if (image.width / image.height > targetRatio) {
      sw = image.height * targetRatio
      sx = (image.width - sw) / 2
    } else {
      sh = image.width / targetRatio
      sy = (image.height - sh) * (verticalPosition / 100)
    }
    for (const scale of [1, 0.85, 0.7]) {
      const width = Math.max(1, Math.round(Math.min(1080, sw) * scale))
      const height = Math.round(width / targetRatio)
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Foto tidak dapat diproses di browser ini.')
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height)
      context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
      for (const quality of [0.9, 0.82, 0.74]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (blob && blob.size <= 1_600_000) return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-feed-4x5.jpg`, { type: 'image/jpeg' })
      }
    }
    throw new Error('Cover tidak bisa dioptimalkan di bawah 1,6 MB. Coba pilih foto yang lebih kecil.')
  } finally { image.close() }
}

export function ContentPlanShareButton({ brandId, brandName, month, hasContent = true }: { brandId: string; brandName: string; month: string; hasContent?: boolean }) {
  const [share, setShare] = useState<{ id: string; url: string; brandId: string; brandName: string; month: string } | null>(null)
  const [comments, setComments] = useState<{ authorName: string; body: string; createdAt: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [commentsBusy, setCommentsBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const storageKey = `idaman-content-plan-share:${brandId}:${month}`
  const currentShare = share?.brandId === brandId && share.month === month ? share : null
  useEffect(() => {
    setComments([]); setCommentsOpen(false); setDialogOpen(false); setMessage('')
    try {
      const stored = sessionStorage.getItem(storageKey)
      const parsed = stored ? JSON.parse(stored) as typeof share : null
      setShare(parsed?.brandId === brandId && parsed.month === month ? parsed : null)
    } catch { setShare(null) }
  }, [storageKey, brandId, month])
  const create = async () => {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/content-plan-share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', brandId, month }) })
      const result = await response.json() as { error?: string; id?: string; url?: string; brandId?: string; brandName?: string; month?: string }
      if (!response.ok || !result.id || !result.url || result.brandId !== brandId || result.month !== month) throw new Error(result.error || 'Tautan gagal dibuat untuk brand dan bulan yang dipilih.')
      const created = { id: result.id, url: result.url, brandId, brandName: result.brandName || brandName, month }
      setShare(created); setComments([]); setCommentsOpen(false); setDialogOpen(true); sessionStorage.setItem(storageKey, JSON.stringify(created))
      try { await navigator.clipboard.writeText(result.url); setMessage(`Link ${created.brandName} disalin. Berlaku 30 hari.`) } catch { setMessage('Link dibuat. Salin dari kolom berikut.') }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Tautan gagal dibuat.') }
    finally { setBusy(false) }
  }
  const copy = async () => { if (!currentShare) return; try { await navigator.clipboard.writeText(currentShare.url); setMessage('Link disalin.') } catch { setMessage('Salin link dari kolom berikut.') } }
  const revoke = async () => {
    if (!currentShare) return
    if (!window.confirm('Nonaktifkan link ini? Klien tidak bisa membuka atau memberi komentar lewat link tersebut. Kamu bisa membuat link baru kapan saja.')) return
    setBusy(true)
    try { const response = await fetch('/api/content-plan-share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke', id: currentShare.id }) }); if (!response.ok) throw new Error('Link gagal dinonaktifkan.'); setShare(null); sessionStorage.removeItem(storageKey); setComments([]); setCommentsOpen(false); setDialogOpen(false); setMessage('Link dinonaktifkan.') }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Link gagal dinonaktifkan.') }
    finally { setBusy(false) }
  }
  const loadComments = async () => {
    if (!currentShare) return
    setCommentsBusy(true)
    try { const response = await fetch(`/api/content-plan-share?shareId=${encodeURIComponent(currentShare.id)}`); const result = await response.json() as { error?: string; comments?: typeof comments }; if (!response.ok) throw new Error(result.error || 'Komentar gagal dimuat.'); setComments(result.comments ?? []); setCommentsOpen(true) }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Komentar gagal dimuat.') }
    finally { setCommentsBusy(false) }
  }
  useEffect(() => {
    if (!dialogOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDialogOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [dialogOpen])
  return <>
    <div className="content-plan-share"><button type="button" className="button" disabled={busy || !brandId || !hasContent} title={!hasContent ? 'Belum ada konten pada bulan ini' : undefined} aria-label={currentShare ? 'Kelola link Content Plan' : 'Bagikan semua konten'} onClick={() => currentShare ? setDialogOpen(true) : void create()}><Link2 size={14} /> {currentShare ? 'Kelola link' : 'Bagikan semua konten'}</button>{message && !dialogOpen && <small className="content-share-status" role="status">{message}</small>}</div>
    {dialogOpen && currentShare && <div className="content-share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false) }}><section className="content-share-dialog" role="dialog" aria-modal="true" aria-labelledby="content-share-title">
      <header className="content-share-dialog-head"><div><span className="eyebrow">Link untuk klien</span><h3 id="content-share-title">{currentShare.brandName} · Content Plan</h3></div><button type="button" className="icon-button" aria-label="Tutup panel link" onClick={() => setDialogOpen(false)}><X size={17} /></button></header>
      <p className="content-share-dialog-description">Semua konten {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))}. Link berlaku 30 hari.</p>
      <label className="content-share-url-label"><span>Link review</span><div className="content-share-url-row"><input className="input" readOnly value={currentShare.url} aria-label="Link Content Plan klien" /><button type="button" className="button primary" onClick={() => void copy()}><Copy size={14} /> Salin link</button></div></label>
      <div className="content-share-actions"><button type="button" className="button" disabled={commentsBusy} onClick={() => commentsOpen ? setCommentsOpen(false) : void loadComments()}>{commentsBusy ? 'Memuat komentar…' : commentsOpen ? 'Sembunyikan komentar' : `Lihat komentar${comments.length ? ` · ${comments.length}` : ''}`}</button><p>Menampilkan masukan yang klien kirim melalui link ini.</p></div>
      {commentsOpen && (comments.length ? <div className="content-share-comments">{comments.map((comment, index) => <article className="content-share-comment" key={`${comment.createdAt}-${index}`}><div><strong>{comment.authorName}</strong><small>{new Date(comment.createdAt).toLocaleString('id-ID')}</small></div><p>{comment.body}</p></article>)}</div> : <p className="content-share-empty">Belum ada komentar dari klien.</p>)}
      <div className="content-share-revoke"><div><strong>Nonaktifkan link</strong><span>Klien tidak bisa lagi membuka atau memberi komentar.</span></div><button type="button" className="button danger" disabled={busy} onClick={() => void revoke()}>{busy ? 'Memproses…' : 'Nonaktifkan'}</button></div>
      {message && <small className="content-share-dialog-status" role="status">{message}</small>}
    </section></div>}
  </>
}

export function InstagramFeedPlanner({ brands, contents, onEditContent, onSaveContent, onAddContent, onAnalyzeCover, onSaveOrder, brandId, onBrandChange }: {
  brands: Brand[]; contents: Content[]; brandId: string; onBrandChange: (brandId: string) => void; onEditContent: (item: Content) => void
  onSaveContent: (item: Content, patch: Partial<Content>, coverFile?: File) => Promise<void>
  onAddContent: (date?: string, brandId?: string) => void
  onAnalyzeCover: (contentId: string) => Promise<string>
  onSaveOrder: (brandId: string, contentIds: string[], dateAssignments: { contentId: string; date: string }[]) => Promise<void>
}) {
  const eligibleBrands = instagramBrands(brands, contents)
  const selectedBrand = brands.find((brand) => brand.id === brandId)
  const [previewCount, setPreviewCount] = useState(9)
  const [gridDraftOrder, setGridDraftOrder] = useState<string[] | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<{ title: string; date: string; status: string; thumbnailUrl: string } | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('')
  const [coverError, setCoverError] = useState('')
  const [cropY, setCropY] = useState(50)
  useEffect(() => () => { if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl) }, [coverPreviewUrl])
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  useEffect(() => { if (eligibleBrands.length && !eligibleBrands.some((brand) => brand.id === brandId)) onBrandChange(eligibleBrands[0].id) }, [eligibleBrands, brandId, onBrandChange])
  const brandContents = contents.filter((item) => item.brandId === brandId && item.platforms.includes('Instagram')).sort((a, b) => b.date.localeCompare(a.date) || (a.feedOrder ?? Number.MAX_SAFE_INTEGER) - (b.feedOrder ?? Number.MAX_SAFE_INTEGER) || a.postingTime.localeCompare(b.postingTime) || a.title.localeCompare(b.title, 'id'))
  const monthContents = brandContents.filter((item) => item.date.startsWith(calendarMonth))
  const contentById = new Map(monthContents.map((item) => [item.id, item]))
  const baseOrder = monthContents.map((item) => item.id)
  const currentOrder = gridDraftOrder ?? baseOrder
  const orderedContents = currentOrder.map((id) => contentById.get(id)).filter((item): item is Content => Boolean(item))
  const orderDirty = gridDraftOrder !== null && (gridDraftOrder.length !== baseOrder.length || gridDraftOrder.some((id, index) => id !== baseOrder[index]))
  useEffect(() => { setGridDraftOrder(null) }, [brandId, calendarMonth, contents])
  useEffect(() => { if (!monthContents.some((item) => item.id === selectedId)) { setSelectedId(monthContents[0]?.id ?? ''); setDraft(null); setCoverFile(null); setCoverPreviewUrl(''); setReview('') } }, [brandId, calendarMonth, contents, selectedId])
  const selected = monthContents.find((item) => item.id === selectedId) ?? null
  const visible = orderedContents.slice(0, previewCount)
  const previewItems = visible.map((item) => item.id === selectedId && draft ? { ...item, ...draft } : item)
  const previewSlots = Array.from({ length: previewCount }, (_, index) => previewItems[index] ?? null)
  const monthStart = new Date(`${calendarMonth}-01T12:00:00`)
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(monthStart)
  const monthItems = [...monthContents].sort((a, b) => a.date.localeCompare(b.date) || a.postingTime.localeCompare(b.postingTime))
  const changeMonth = (delta: number) => { const date = new Date(monthStart); date.setMonth(date.getMonth() + delta); setCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) }
  const selectContent = (item: Content) => { setSelectedId(item.id); setDraft({ title: item.title, date: item.date, status: item.status, thumbnailUrl: item.thumbnailUrl }); setCoverFile(null); setCoverPreviewUrl(''); setCoverError(''); setCropY(50); setReview('') }
  const reorderDraft = (draggedId: string, targetId: string) => {
    const from = currentOrder.indexOf(draggedId), to = currentOrder.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...currentOrder], [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setGridDraftOrder(next)
  }
  const saveGridOrder = async () => {
    if (!gridDraftOrder || !orderDirty) return
    const dateSlots = monthContents.map((item) => item.date).sort((a, b) => b.localeCompare(a))
    const assignments = gridDraftOrder.map((contentId, index) => ({ contentId, date: dateSlots[index] ?? '' })).filter((item) => item.date)
    setBusy(true); setError('')
    try { await onSaveOrder(brandId, gridDraftOrder, assignments); setGridDraftOrder(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Susunan grid gagal disimpan.') }
    finally { setBusy(false); setDragId(null) }
  }
  const saveDraft = async () => {
    if (!selected || !draft) return
    setBusy(true); setError('')
    try { const processedCover = coverFile ? await cropInstagramCover(coverFile, cropY) : undefined; await onSaveContent(selected, { ...draft, ...(coverFile ? { thumbnailUrl: '' } : {}) }, processedCover); setDraft(null); setCoverFile(null); setCoverPreviewUrl(''); setCoverError(''); setCropY(50) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Perubahan konten gagal disimpan.') }
    finally { setBusy(false) }
  }
  const analyzeCover = async () => {
    if (!selected) return
    setReviewBusy(true); setReview(''); setError('')
    try { setReview(await onAnalyzeCover(selected.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Analisa cover gagal. Coba lagi.') }
    finally { setReviewBusy(false) }
  }

  if (!eligibleBrands.length) return <PlannerBrandEmpty type="feed" />
  return <section className="card instagram-planner-card"><div className="card-head"><div><div className="eyebrow">Visual content planning</div><h3>Instagram Feed Planner</h3><p>Susun feed 4:5; Content Hub dan kalender mengikuti tanggal konten.</p></div><div className="instagram-planner-controls">{eligibleBrands.length > 1 && <label className="field"><span>Brand Instagram</span><select className="select" value={brandId} onChange={(event) => { onBrandChange(event.target.value); setSelectedId(''); setDraft(null); setReview('') }}>{eligibleBrands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>}<label className="field"><span>Jumlah grid</span><select className="select" value={previewCount} onChange={(event) => setPreviewCount(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => (index + 3) * 3).map((count) => <option value={count} key={count}>{count} postingan</option>)}</select></label></div></div>
    <div className="feed-planner-toolbar"><span><Camera size={14} /> {monthContents.length} konten · {monthLabel}</span>{orderDirty ? <div className="feed-grid-actions"><small>Belum disimpan · kalender ikut berubah</small><button className="button" disabled={busy} onClick={() => { setGridDraftOrder(null); setError('') }}>Batal</button><button className="button primary" disabled={busy} onClick={() => void saveGridOrder()}><Save size={13} /> {busy ? 'Menyimpan…' : 'Simpan susunan'}</button></div> : monthContents.length > 1 ? <span>Tarik kartu untuk menyusun</span> : null}</div>
    <div className="feed-workspace"><section className="feed-preview-panel"><div className="feed-panel-heading"><div><strong>Preview feed</strong><small>{previewItems.length} posting · terbaru di atas</small></div><span className="badge">{previewItems.length} / {previewCount}</span></div><div className="instagram-grid-preview">{previewSlots.map((item, index) => item ? <button key={item.id} className={`instagram-grid-tile ${item.status === 'Uploaded' ? 'published' : 'planned'} ${selectedId === item.id ? 'selected' : ''}`} style={{ aspectRatio: '4 / 5' }} draggable={!busy} onDragStart={() => setDragId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dragId && reorderDraft(dragId, item.id)} onDragEnd={() => setDragId(null)} onClick={() => selectContent(item)} title={`Pilih ${item.title}`}><span className="instagram-grid-position">{index + 1}</span><InstagramCoverPreview src={item.thumbnailUrl} title={item.title} objectPosition={selectedId === item.id && coverFile ? `center ${cropY}%` : 'center'} /><span className="instagram-grid-overlay"><strong>{item.title}</strong><small>{item.status} · {item.format}</small></span></button> : <button key={`empty-${index}`} className="instagram-grid-tile instagram-grid-empty" style={{ aspectRatio: '4 / 5' }} onClick={() => onAddContent(`${calendarMonth}-01`, brandId)} title="Tambah posting"><span className="instagram-grid-position">{index + 1}</span><span className="instagram-grid-placeholder"><span className="instagram-grid-placeholder-icon"><Plus size={19} /></span><small>Slot kosong</small><strong>Tambah posting</strong></span></button>)}</div>
      {selected && <div className="feed-selected-summary"><span className="feed-status-mark" data-status={selected.status} /><div><strong>{draft?.title || selected.title}</strong><small>{draft?.date || selected.date} · {selected.format} · {draft?.status || selected.status}</small></div><button className="button" onClick={() => onEditContent(draft ? { ...selected, ...draft, ...(coverFile ? { thumbnailUrl: selected.thumbnailUrl } : {}) } : selected)}><Pencil size={13} /> Detail</button></div>}
    </section><aside className="feed-plan-panel"><div className="feed-panel-heading"><div><strong>Content Plan</strong><small>Agenda dan edit cepat</small></div><div className="actions"><ContentPlanShareButton brandId={brandId} brandName={selectedBrand?.name ?? ''} month={calendarMonth} hasContent={monthItems.length > 0} /><button className="button primary" onClick={() => onAddContent(`${calendarMonth}-01`, brandId)}><Plus size={13} /> Posting</button></div></div>
      <div className="feed-month-nav"><button className="icon-button" aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)}><ChevronLeft size={15} /></button><strong>{monthLabel}</strong><button className="icon-button" aria-label="Bulan berikutnya" onClick={() => changeMonth(1)}><ChevronRight size={15} /></button></div>
      <div className="feed-plan-list-head"><strong>Posting bulan ini</strong><small>{monthItems.length} konten</small></div>
      <div className="feed-plan-list">{monthItems.length ? monthItems.map((item) => <button key={item.id} className={`feed-plan-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => selectContent(item)}><span className="feed-plan-date">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(`${item.date}T12:00:00`))}<small>{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(`${item.date}T12:00:00`))}</small></span><span className="feed-plan-copy"><strong>{draft && selectedId === item.id ? draft.title || item.title : item.title}</strong><small>{item.format} · {draft && selectedId === item.id ? draft.status : item.status}</small></span><span className="feed-plan-dot" data-status={draft && selectedId === item.id ? draft.status : item.status} /></button>) : <div className="feed-plan-empty">Belum ada posting Instagram di bulan ini.</div>}</div>

      {selected && draft && <div className="feed-quick-editor"><div className="feed-editor-title"><strong>Edit cepat</strong><button className="button" onClick={() => onEditContent(draft ? { ...selected, ...draft, ...(coverFile ? { thumbnailUrl: selected.thumbnailUrl } : {}) } : selected)}>Detail lengkap</button></div><label className="field"><span>Judul</span><input className="input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><div className="feed-editor-row"><label className="field"><span>Tanggal</span><input className="input" type="date" value={draft.date} onChange={(event) => { setDraft({ ...draft, date: event.target.value }); setCalendarMonth(event.target.value.slice(0, 7)) }} /></label><label className="field"><span>Status</span><select className="select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{['Ideation', 'Brief Ready', 'Editing', 'Scheduling', 'Approval', 'Uploaded'].map((status) => <option key={status}>{status}</option>)}</select></label></div><label className="field"><span>Unggah foto cover</span><input className="input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ''; setCoverError(''); if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12_000_000) { setCoverError('Pilih foto JPG, PNG, atau WebP maksimal 12 MB.'); return } const previewUrl = URL.createObjectURL(file); setCoverFile(file); setCoverPreviewUrl(previewUrl); setCropY(50); setDraft({ ...draft, thumbnailUrl: previewUrl }) }} /></label>{coverFile && <><small className="field-hint">{coverFile.name} · foto akan dipotong dan dioptimalkan ke 4:5 saat disimpan.</small><label className="field feed-crop-control"><span>Geser posisi foto ke atas / bawah</span><input type="range" min="0" max="100" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} /><span className="feed-crop-labels"><small>Atas</small><small>Bawah</small></span></label></>}{coverError && <small className="error" role="alert">{coverError}</small>}<small className="field-hint">Pilih foto dari perangkat. Cover Reels 9:16 akan disesuaikan ke portrait feed 4:5; geser posisi crop sebelum menyimpan.</small><div className="feed-editor-actions"><button className="button" disabled={reviewBusy || !selected.thumbnailUrl.startsWith('/api/content-thumbnail')} onClick={() => void analyzeCover()}><Sparkles size={13} /> {reviewBusy ? 'Menganalisa…' : 'Saran visual AI'}</button><button className="button primary" disabled={busy || !draft.title.trim() || Boolean(coverError)} onClick={() => void saveDraft()}><Save size={13} /> {busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>{review && <div className="feed-ai-review"><Sparkles size={14} /><p>{review}</p></div>}<small className="field-hint">Untuk analisa visual, unggah cover di Detail lengkap. Cover yang diunggah tersimpan privat dan baru dikirim ke AI saat kamu menekan tombol saran.</small></div>}
      {error && <p className="error" role="alert">{error}</p>}
    </aside></div>
    <div className="feed-planner-footer"><div className="feed-planner-legend"><span><i className="feed-dot planned" /> Rencana / belum tayang</span><span><i className="feed-dot published" /> Uploaded / sudah tayang</span></div></div>
    <p className="field-hint">Preview hanya simulasi, bukan publikasi otomatis. Saran AI membantu menilai cover dan konsistensi visual, bukan menjamin performa atau viralitas.</p>
  </section>
}
export function InstagramProfilePlanner({ brands, contents, profiles, onSave, brandId, onBrandChange }: {
  brands: Brand[]; contents: Content[]; profiles: Profile[]; brandId: string; onBrandChange: (brandId: string) => void
  onSave: (values: { brandId: string } & ProfileForm) => Promise<void>
}) {
  const eligibleBrands = instagramBrands(brands, contents)
  const [form, setForm] = useState<ProfileForm>(emptyProfile)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pendingImages, setPendingImages] = useState(0)
  const handleAssetBusy = (busy: boolean) => setPendingImages((count) => Math.max(0, count + (busy ? 1 : -1)))
  useEffect(() => { if (eligibleBrands.length && !eligibleBrands.some((brand) => brand.id === brandId)) onBrandChange(eligibleBrands[0].id) }, [eligibleBrands, brandId, onBrandChange])
  useEffect(() => {
    const profile = profiles.find((item) => item.brandId === brandId)
    setForm(profile ? { profilePictureUrl: profile.profilePictureUrl, username: profile.username, displayName: profile.displayName, bio: profile.bio, highlights: profile.highlights, pinnedContentIds: profile.pinnedContentIds.slice(0, 3) } : emptyProfile)
    setError(''); setSaved(false)
  }, [brandId, profiles])
  const instagramContent = contents.filter((item) => item.brandId === brandId && item.platforms.includes('Instagram')).sort((a, b) => b.date.localeCompare(a.date) || (a.feedOrder ?? Number.MAX_SAFE_INTEGER) - (b.feedOrder ?? Number.MAX_SAFE_INTEGER) || a.postingTime.localeCompare(b.postingTime) || a.title.localeCompare(b.title, 'id'))
  const brand = brands.find((item) => item.id === brandId)
  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => ({ ...current, [key]: value }))
  const addHighlight = () => update('highlights', [...form.highlights, { id: crypto.randomUUID(), title: '', coverUrl: '', sortOrder: form.highlights.length }])
  const moveHighlight = (index: number, delta: number) => {
    const next = [...form.highlights]
    const destination = index + delta
    if (destination < 0 || destination >= next.length) return
    ;[next[index], next[destination]] = [next[destination], next[index]]
    update('highlights', next.map((item, sortOrder) => ({ ...item, sortOrder })))
  }
  const togglePinned = (id: string, checked: boolean) => {
    if (!checked) update('pinnedContentIds', form.pinnedContentIds.filter((value) => value !== id))
    else if (form.pinnedContentIds.length < 3) update('pinnedContentIds', [...form.pinnedContentIds, id])
  }
  const save = async () => {
    if (!brandId) return
    setBusy(true); setError(''); setSaved(false)
    try { await onSave({ brandId, ...form }); setSaved(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Profile Planner gagal disimpan.') }
    finally { setBusy(false) }
  }
  const pinned = form.pinnedContentIds.map((id) => instagramContent.find((item) => item.id === id)).filter((item): item is Content => Boolean(item))
  const grid = [...pinned, ...instagramContent.filter((item) => !form.pinnedContentIds.includes(item.id))].slice(0, 9)
  if (!eligibleBrands.length) return <PlannerBrandEmpty type="profile" />
  return <section className="card profile-planner-card"><div className="card-head"><div><div className="eyebrow">Profile preview</div><h3>Instagram Profile Planner</h3><p>Atur identitas, highlight, dan maksimal tiga pinned post untuk setiap brand secara terpisah.</p></div><label className="field"><span>Brand Instagram</span><select className="select" value={brandId} onChange={(event) => onBrandChange(event.target.value)}>{eligibleBrands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <div className="profile-planner-layout"><div className="profile-planner-editor">
      <section className="profile-editor-section"><div className="profile-section-head"><div><strong>Informasi profil</strong><small>Pratinjau memakai data yang kamu isi.</small></div></div><ProfileImageUpload key={brandId} label="Foto profil" value={form.profilePictureUrl} shape="circle" fit="contain" onChange={(value) => update('profilePictureUrl', value)} onBusyChange={handleAssetBusy} /><div className="form-grid"><label className="field"><span>Username Instagram</span><input className="input" value={form.username} onChange={(event) => update('username', event.target.value.replace(/^@/, ''))} placeholder="namaakun" /></label><label className="field"><span>Nama tampilan</span><input className="input" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder={brand?.name || 'Nama brand'} /></label></div><label className="field"><span>Bio</span><textarea className="textarea" maxLength={500} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Bio Instagram…" /></label></section>
      <section className="profile-editor-section"><div className="profile-section-head"><div><strong>Highlights</strong><small>Data tersimpan tanpa batas; preview menampilkan lima yang pertama.</small></div><button className="button" onClick={addHighlight}><Plus size={13} /> Tambah highlight</button></div>{form.highlights.length ? <div className="profile-highlight-editor">{form.highlights.map((item, index) => <div className="profile-highlight-edit-row" key={item.id}><div className="profile-highlight-order"><button className="icon-button" disabled={index === 0} aria-label="Geser highlight ke atas" onClick={() => moveHighlight(index, -1)}><ChevronUp size={14} /></button><button className="icon-button" disabled={index === form.highlights.length - 1} aria-label="Geser highlight ke bawah" onClick={() => moveHighlight(index, 1)}><ChevronDown size={14} /></button></div><input className="input" value={item.title} maxLength={40} aria-label="Nama highlight" placeholder="Nama highlight" onChange={(event) => update('highlights', form.highlights.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row))} /><ProfileImageUpload label={`Cover ${item.title || `Highlight ${index + 1}`}`} value={item.coverUrl} shape="circle" onChange={(value) => update('highlights', form.highlights.map((row) => row.id === item.id ? { ...row, coverUrl: value } : row))} onBusyChange={handleAssetBusy} /><button className="icon-button danger-action" aria-label={`Hapus highlight ${item.title || index + 1}`} onClick={() => update('highlights', form.highlights.filter((row) => row.id !== item.id))}><Trash2 size={14} /></button></div>)}</div> : <div className="profile-planner-empty">Belum ada highlight. Tambahkan nama dan unggah foto cover untuk mulai membuat preview.</div>}</section>
      <section className="profile-editor-section"><div className="profile-section-head"><div><strong>Pinned posts</strong><small>Pilih maksimal tiga konten Instagram milik brand ini.</small></div><span className="badge">{form.pinnedContentIds.length}/3</span></div>{instagramContent.length ? <div className="profile-pinned-list">{instagramContent.map((item) => <label className="profile-pinned-choice" key={item.id}><input type="checkbox" checked={form.pinnedContentIds.includes(item.id)} disabled={!form.pinnedContentIds.includes(item.id) && form.pinnedContentIds.length >= 3} onChange={(event) => togglePinned(item.id, event.target.checked)} /><span>{item.title}</span><small>{item.format} · {item.status}</small></label>)}</div> : <div className="profile-planner-empty">Belum ada konten berplatform Instagram untuk brand ini.</div>}</section>
      {error && <p className="client-document-error" role="alert">{error}</p>}{saved && <p className="client-document-notice" role="status">Profile Planner tersimpan.</p>}<button className="button primary" disabled={!brandId || busy || pendingImages > 0} onClick={() => void save()}><Save size={14} /> {pendingImages ? 'Memproses foto…' : busy ? 'Menyimpan…' : 'Simpan profile planner'}</button>
    </div><aside className="instagram-profile-preview"><div className="instagram-preview-brand"><div className="instagram-profile-avatar">{form.profilePictureUrl ? <img src={form.profilePictureUrl} alt="Foto profil" /> : <span>{(form.displayName || brand?.name || 'I').slice(0, 1).toUpperCase()}</span>}</div><div><strong>{form.username ? `@${form.username}` : '@username'}</strong><small>{form.displayName || brand?.name || 'Nama tampilan'}</small></div></div><p className="instagram-preview-bio">{form.bio || 'Bio profil akan tampil di sini.'}</p><div className="instagram-preview-section"><small>Highlights · preview 5 pertama</small><div className="instagram-highlight-preview">{form.highlights.slice(0, 5).map((item) => <div key={item.id}><span>{item.coverUrl ? <img src={item.coverUrl} alt="" /> : <span className="profile-highlight-placeholder">+</span>}</span><small>{item.title || 'Highlight'}</small></div>)}</div></div><div className="instagram-preview-section"><small>Feed mengikuti tanggal Content Hub · terbaru di atas</small><div className="instagram-profile-grid">{grid.map((item, index) => <button key={item.id} className={form.pinnedContentIds.includes(item.id) ? 'pinned' : ''} onClick={() => undefined} title={`${form.pinnedContentIds.includes(item.id) ? 'Pinned · ' : ''}${item.title} · ${item.date}`}><ProfileGridCover src={item.thumbnailUrl} title={item.title} />{form.pinnedContentIds.includes(item.id) && <i>{index + 1}</i>}</button>)}</div>{!grid.length && <div className="profile-planner-empty">Grid preview terisi otomatis dari konten Instagram.</div>}</div><p className="instagram-preview-note">Pinned post tetap di atas; konten lainnya mengikuti tanggal Content Hub. Preview ini simulasi, bukan data langsung Instagram.</p></aside></div>
  </section>
}

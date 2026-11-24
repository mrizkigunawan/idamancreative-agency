import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, FileDown, FilePlus2, FileText, LoaderCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import type { brands, clientDocuments, prospects, ClientDocumentTemplateKey } from '#/lib/schema'
import { deleteBrandDocument, deleteProspectDocument, getBrandDocuments, getProspectDocuments, saveBrandDocument } from '#/lib/server'
import { workspaceDocumentPrefix } from '#/lib/workspace-profile'
import { useWorkspaceProfile } from '#/components/workspace-identity'
import { makeSections, makeEnglishSections, normalizeMonthlyScope, workspaceNameToken } from '#/lib/client-document-templates'

type Brand = typeof brands.$inferSelect
type Prospect = typeof prospects.$inferSelect
type ClientDocument = typeof clientDocuments.$inferSelect
type DocumentType = 'offering' | 'agreement'
type Section = { heading: string; body: string }
type Draft = Omit<ClientDocument, 'id' | 'brandId' | 'prospectId' | 'createdAt' | 'updatedAt'> & { id?: string }
type TemplateField = { key: string; label: string; hint: string; required?: boolean; multiline?: boolean }
const statusLabels: Record<string, string> = { Draft: 'Draft', Sent: 'Terkirim', Approved: 'Disetujui', Signed: 'Ditandatangani', Declined: 'Ditolak', Archived: 'Arsip' }
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const docTypeLabel = (type: DocumentType) => type === 'offering' ? 'Offering Letter' : 'Work Agreement'
const standardDocumentTitle = (type: DocumentType, brandName: string) => `${docTypeLabel(type)} - ${brandName}`
const cleanDocumentTitle = (title: string) => title.replace(/^(Offering Letter|Work Agreement)(?: Bulanan| Produksi| Project)(?=\s*-)/i, '$1')
const templateFields: Record<Exclude<ClientDocumentTemplateKey, 'custom'>, TemplateField[]> = {
  'monthly-smm': [
    { key: 'serviceStart', label: 'Mulai layanan', hint: 'Contoh: 1 Desember 2026', required: true }, { key: 'serviceEnd', label: 'Akhir / periode layanan', hint: 'Contoh: 31 Desember 2026', required: true },
    { key: 'platforms', label: 'Platform yang dikelola', hint: 'Contoh: Instagram dan TikTok', required: true }, { key: 'totalPosts', label: 'Jumlah konten per platform', hint: 'Contoh:\nInstagram: 9 postingan\nTikTok: 10 postingan', required: true, multiline: true },
    { key: 'story', label: 'Story per bulan', hint: 'Jumlah konten', required: true }, { key: 'visits', label: 'Visit / shooting per bulan', hint: 'Contoh: 1 kali', required: true },
    { key: 'meetings', label: 'Meeting / brainstorming', hint: 'Contoh: 1 kali per bulan' }, { key: 'monthlyFee', label: 'Biaya bulanan (Rp)', hint: 'Contoh: 3.000.000', required: true },
    { key: 'invoiceDay', label: 'Tanggal invoice', hint: 'Contoh: tanggal 1 setiap bulan', required: true }, { key: 'paymentDueDays', label: 'Batas pembayaran', hint: 'Contoh: maksimal 5 hari setelah invoice', required: true },
    { key: 'revisionLimit', label: 'Batas revisi', hint: 'Contoh: 1 kali revisi minor per konten', required: true }, { key: 'feedbackDays', label: 'Batas waktu feedback client', hint: 'Contoh: 3 hari kerja' },
    { key: 'noticeDays', label: 'Pemberitahuan penghentian', hint: 'Contoh: 30 hari sebelumnya' }, { key: 'offerValidUntil', label: 'Penawaran berlaku sampai', hint: 'Isi tanggal berlaku', required: true, },
  ],
  'production-project': [
    { key: 'projectName', label: 'Nama project', hint: 'Contoh: Produksi konten Villa Hasian', required: true }, { key: 'shootLocation', label: 'Lokasi produksi', hint: 'Nama dan alamat lokasi', required: true },
    { key: 'shootDate', label: 'Tanggal shooting', hint: 'Tanggal atau rentang tanggal', required: true }, { key: 'shootDays', label: 'Jumlah hari shooting', hint: 'Contoh: 1 hari', required: true },
    { key: 'editedPhotos', label: 'Foto edit final', hint: 'Jumlah foto', required: true }, { key: 'editedVideos', label: 'Video edit final', hint: 'Jumlah video', required: true },
    { key: 'rawAssetHandover', label: 'Penyerahan raw asset', hint: 'Jelaskan format dan cara penyerahan', required: true }, { key: 'investment', label: 'Total investasi (Rp)', hint: 'Contoh: 3.000.000', required: true },
    { key: 'downPayment', label: 'Down payment (%)', hint: 'Contoh: 50', required: true }, { key: 'finalPayment', label: 'Pelunasan (%)', hint: 'Contoh: 50', required: true },
    { key: 'downPaymentDue', label: 'Kapan DP dibayar', hint: 'Contoh: setelah OL disetujui, sebelum shooting', required: true }, { key: 'finalPaymentDue', label: 'Kapan pelunasan dibayar', hint: 'Contoh: maksimal 3 hari setelah file final diterima', required: true },
    { key: 'deliveryDays', label: 'Estimasi waktu penyerahan', hint: 'Contoh: maksimal 7 hari kerja setelah shooting', required: true }, { key: 'revisionLimit', label: 'Batas revisi', hint: 'Contoh: 1 kali revisi minor per video', required: true },
    { key: 'travelCost', label: 'Biaya perjalanan / tambahan', hint: 'Contoh: termasuk / ditagihkan terpisah' }, { key: 'offerValidUntil', label: 'Penawaran berlaku sampai', hint: 'Isi tanggal berlaku', required: true },
  ],
}
const templateFieldList = (type: DocumentType, templateKey: ClientDocumentTemplateKey) => templateKey === 'custom' ? [] : templateFields[templateKey].filter((field) => type !== 'agreement' || field.key !== 'offerValidUntil')
const englishFieldValue = (value: string) => value
  .replace(/\bInstagram\s+dan\s+TikTok\b/gi, 'Instagram and TikTok')
  .replace(/\bper konten\b/gi, 'per post')
  .replace(/\b(\d+)\s*kali\s*per\s*bulan\b/gi, (_match, count: string) => `${count} ${count === '1' ? 'time' : 'times'} per month`)
  .replace(/\bper bulan\b/gi, 'per month')
  .replace(/\b(\d+)\s*kali\b/gi, (_match, count: string) => `${count} ${count === '1' ? 'time' : 'times'}`)
  .replace(/\bkali per month\b/gi, 'times per month')
  .replace(/\bpostingan\b/gi, 'posts')
  .replace(/\bkonten\b/gi, 'posts')
  .replace(/\brevisi minor\b/gi, 'minor revision')
  .replace(/\bhari kerja\b/gi, 'business days')
  .replace(/\bhari\b/gi, 'days')
  .replace(/\bmaksimal\b/gi, 'within a maximum of')
  .replace(/\bsetelah\b/gi, 'after')
  .replace(/\bsebelum\b/gi, 'before')
  .replace(/\bdan\b/gi, 'and')
  .replace(/\btanggal (\d+) setiap bulan\b/gi, (_match, day: string) => { const number = Number(day); const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th' : number % 10 === 1 ? 'st' : number % 10 === 2 ? 'nd' : number % 10 === 3 ? 'rd' : 'th'; return `the ${number}${suffix} of each month` })
  .replace(/\bJanuari\b/gi, 'January').replace(/\bFebruari\b/gi, 'February').replace(/\bMaret\b/gi, 'March').replace(/\bApril\b/gi, 'April').replace(/\bMei\b/gi, 'May').replace(/\bJuni\b/gi, 'June').replace(/\bJuli\b/gi, 'July').replace(/\bAgustus\b/gi, 'August').replace(/\bSeptember\b/gi, 'September').replace(/\bOktober\b/gi, 'October').replace(/\bNovember\b/gi, 'November').replace(/\bDesember\b/gi, 'December')
export function ClientDocumentsPanel({ brand, prospect }: { brand?: Brand; prospect?: Prospect }) {
  const ownerId = brand?.id ?? prospect?.id ?? ''
  const ownerName = brand?.name ?? prospect?.brandName ?? 'Prospek'
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const { name: workspaceName } = useWorkspaceProfile()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const [sectionNotice, setSectionNotice] = useState('')
  const sectionListRef = useRef<HTMLDivElement>(null)
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview?.url])
  useEffect(() => { if (!sectionNotice) return; const timer = window.setTimeout(() => setSectionNotice(''), 4200); return () => window.clearTimeout(timer) }, [sectionNotice])
  const fetchDocuments = () => brand ? getBrandDocuments({ data: brand.id }) : getProspectDocuments({ data: ownerId })
  const refresh = async () => setDocuments(await fetchDocuments() as ClientDocument[])
  useEffect(() => { let active = true; setLoading(true); fetchDocuments().then((rows) => { if (active) setDocuments(rows as ClientDocument[]) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Dokumen gagal dimuat.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [ownerId, brand])
  const createDraft = (type: DocumentType, templateKey: ClientDocumentTemplateKey, source?: ClientDocument) => {
    const date = today()
    setError(''); setNotice('')
    const activeTemplate = (source?.templateKey as ClientDocumentTemplateKey | undefined) ?? templateKey
    const templateValues: Record<string, string> = source?.templateFields ?? Object.fromEntries(templateFieldList(type, activeTemplate).map((field) => [field.key, '']))
    setDraft({ type, templateKey: activeTemplate, templateFields: templateValues, title: standardDocumentTitle(type, ownerName), documentNumber: `${workspaceDocumentPrefix(workspaceName)}-${type === 'offering' ? 'OL' : 'WA'}-${date.slice(0, 7).replace('-', '')}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`, issueDate: date, status: 'Draft', sections: (source && type !== 'agreement' ? source.sections.map((section) => ({ ...section })) : makeSections(type, ownerName, activeTemplate)) })
  }
  const editDraft = (document: ClientDocument) => { const type = document.type as DocumentType; const templateKey = document.templateKey as ClientDocumentTemplateKey; const templateValues = { ...(document.templateFields ?? {}) }; if (templateKey === 'monthly-smm' && !templateValues.totalPosts) { const oldCounts = ['reels', 'carousel', 'singlePost'].map((key) => templateValues[key]?.trim() ?? ''); if (oldCounts.every((value) => value !== '' && Number.isFinite(Number(value)))) templateValues.totalPosts = String(oldCounts.reduce((sum, value) => sum + Number(value), 0)) }; setDraft({ id: document.id, type, templateKey, templateFields: templateValues, title: cleanDocumentTitle(document.title), documentNumber: document.documentNumber, issueDate: document.issueDate, status: document.status, sections: normalizeMonthlyScope(document.sections.map((section) => ({ ...section })), templateKey) }); setError(''); setNotice('') }
  const updateDraft = (changes: Partial<Draft>) => setDraft((current) => current ? { ...current, ...changes } : current)
  const save = async () => {
    if (!draft || busy) return
    setBusy(true); setError(''); setNotice('')
    try { await saveBrandDocument({ data: { ...draft, brandId: brand?.id ?? null, prospectId: prospect?.id ?? null } }); setDraft(null); await refresh(); setNotice('Dokumen tersimpan. Kamu bisa membukanya lagi untuk mengubah isi atau status.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Dokumen gagal disimpan.') }
    finally { setBusy(false) }
  }
  const remove = async (document: ClientDocument) => {
    if (!window.confirm(`Hapus ${document.title}? Dokumen ini tidak dapat dipulihkan.`)) return
    setBusy(true); setError('')
    try { if (brand) await deleteBrandDocument({ data: { id: document.id, brandId: brand.id } }); else await deleteProspectDocument({ data: { id: document.id, prospectId: ownerId } }); await refresh(); if (draft?.id === document.id) setDraft(null); setNotice('Dokumen dihapus.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Dokumen gagal dihapus.') }
    finally { setBusy(false) }
  }
  const resolveDocument = (document: Pick<ClientDocument, 'type' | 'title' | 'documentNumber' | 'issueDate' | 'status' | 'sections'> & Partial<Pick<ClientDocument, 'templateKey' | 'templateFields'>>) => {
    const fields = { ...(document.templateFields ?? {}) }
    const englishVersion = fields.__language === 'en'
    if (englishVersion) for (const [key, value] of Object.entries(fields)) if (key !== '__language') fields[key] = englishFieldValue(value)
    if (document.templateKey === 'monthly-smm' && !fields.totalPosts?.trim()) {
      const oldCounts = ['reels', 'carousel', 'singlePost'].map((key) => fields[key]?.trim() ?? '')
      fields.totalPosts = oldCounts.every((value) => value !== '' && Number.isFinite(Number(value))) ? String(oldCounts.reduce((sum, value) => sum + Number(value), 0)) : ''
    }
    if (document.templateKey === 'monthly-smm' && fields.totalPosts?.trim()) {
      fields.totalPosts = fields.totalPosts.split(/\r?\n/).map((line) => line.trim().replace(/^[-•]\s*/, '')).filter(Boolean).map((line) => `- ${line}`).join('\n')
    }
    const allFields = [...templateFields['monthly-smm'], ...templateFields['production-project']]
    const labels = Object.fromEntries(allFields.map((field) => [field.key, field.label]))
    const required = new Set(allFields.filter((field) => field.required).map((field) => field.key))
    const templateKey = (document.templateKey === 'monthly-smm' || document.templateKey === 'production-project' || document.templateKey === 'custom' ? document.templateKey : 'custom') as ClientDocumentTemplateKey
    const sections = normalizeMonthlyScope(document.sections, templateKey)
    const sourceSections = makeSections(document.type as DocumentType, ownerName, templateKey)
    const translatedSections = makeEnglishSections(document.type as DocumentType, ownerName, templateKey)
    const localizedSections = englishVersion ? sections.map((section) => {
      const exactIndex = sourceSections.findIndex((source) => source.heading === section.heading && source.body === section.body)
      const headingIndex = sourceSections.findIndex((source) => source.heading === section.heading)
      return exactIndex >= 0 ? translatedSections[exactIndex]! : { ...section, heading: headingIndex >= 0 ? translatedSections[headingIndex]!.heading : section.heading }
    }) : sections
    const englishLabels: Record<string, string> = { platforms: 'Platforms managed', totalPosts: 'Content per platform', story: 'Stories per month', visits: 'Production visits per month', meetings: 'Meetings / brainstorming', monthlyFee: 'Monthly fee (IDR)', invoiceDay: 'Invoice date', paymentDueDays: 'Payment deadline', revisionLimit: 'Revision limit', feedbackDays: 'Client feedback period', noticeDays: 'Termination notice', offerValidUntil: 'Offer valid until', projectName: 'Project name', shootLocation: 'Shoot location', shootDate: 'Shoot date', shootDays: 'Number of shoot days', editedPhotos: 'Final edited photos', editedVideos: 'Final edited videos', rawAssetHandover: 'Raw asset handover', investment: 'Total investment (IDR)', downPayment: 'Deposit percentage', finalPayment: 'Final payment percentage', downPaymentDue: 'Deposit due date', finalPaymentDue: 'Final payment due date', deliveryDays: 'Delivery timeline', travelCost: 'Travel / additional costs' }
    return { ...document, language: englishVersion ? 'en' as const : 'id' as const, sections: localizedSections.map((section) => ({ ...section, body: section.body.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => key === 'workspaceName' ? workspaceNameToken : fields[key]?.trim() || (key === 'totalPosts' ? englishVersion ? '[Complete content quantity]' : '[Lengkapi jumlah konten]' : `${englishVersion ? required.has(key) ? '[Complete' : '[To be determined' : required.has(key) ? '[Lengkapi' : '[Belum ditentukan'}: ${englishVersion ? englishLabels[key] ?? key : labels[key] ?? key}]`)) })) }
  }
  const pdfBrand = () => brand ?? { id: ownerId, name: ownerName, industry: '', owner: prospect?.picName ?? '', phone: prospect?.contact ?? '', handle: '', retainer: prospect?.estimatedValue ?? 0, color: '#ef783c', address: '', notes: '', platformLinks: {}, handledPlatforms: [], canvaFeedUrl: '', canvaCoverUrl: '', canvaStoryUrl: '', customLinks: null, sowReels: 0, sowFeed: 0, sowStory: 0, sowVisit: 0, isActive: true, createdAt: Date.now() }
  const download = async (document: Pick<ClientDocument, 'type' | 'title' | 'documentNumber' | 'issueDate' | 'status' | 'sections'> & Partial<Pick<ClientDocument, 'templateKey' | 'templateFields'>>) => {
    try { const { downloadClientDocumentPdf } = await import('#/lib/client-document-pdf'); await downloadClientDocumentPdf(pdfBrand(), resolveDocument(document)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF gagal dibuat.') }
  }
  const openPreview = async (document: Pick<ClientDocument, 'type' | 'title' | 'documentNumber' | 'issueDate' | 'status' | 'sections'> & Partial<Pick<ClientDocument, 'templateKey' | 'templateFields'>>) => {
    setPreviewBusy(true); setError('')
    try {
      const { createClientDocumentPdf } = await import('#/lib/client-document-pdf')
      const bytes = await createClientDocumentPdf(pdfBrand(), resolveDocument(document))
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }))
      setPreview({ url, title: document.title })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Pratinjau PDF gagal dibuat.') }
    finally { setPreviewBusy(false) }
  }
  const updateSection = (index: number, changes: Partial<Section>) => updateDraft({ sections: draft?.sections.map((section, i) => i === index ? { ...section, ...changes } : section) ?? [] })
  const addSection = () => {
    if (!draft || draft.sections.length >= 24) return
    updateDraft({ sections: [...draft.sections, { heading: '', body: '' }] })
    setSectionNotice('Bagian baru ditambahkan di akhir. Isi judul dan ketentuannya.')
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const lastSection = sectionListRef.current?.lastElementChild as HTMLElement | null
      lastSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      lastSection?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    }))
  }
  const moveSection = (index: number, direction: -1 | 1) => {
    if (!draft) return
    const sections = [...draft.sections]; const target = index + direction
    if (target < 0 || target >= sections.length) return
    ;[sections[index], sections[target]] = [sections[target], sections[index]]
    updateDraft({ sections })
  }
  const templateButtonClass = (type: DocumentType, templateKey: ClientDocumentTemplateKey) => `button${draft?.type === type && draft.templateKey === templateKey ? ' primary' : ''}`
  const englishVersion = draft?.templateFields.__language === 'en'
  return <div className="client-documents">
    <section className="card client-documents-intro"><div><div className="eyebrow">Dokumen kerja sama · {ownerName}</div><h3>Pilih jenis dokumen</h3><p><strong>Offering Letter</strong> menjelaskan paket, hasil kerja, dan harga untuk diajukan kepada client. <strong>Work Agreement</strong> mencatat kesepakatan final setelah disetujui. Bulanan untuk layanan berulang; project produksi untuk pekerjaan satu kali.</p></div><div><div className="client-document-create-actions"><button className={templateButtonClass('offering', 'monthly-smm')} onClick={() => createDraft('offering', 'monthly-smm')}><Plus size={14} /> Offering Letter Bulanan</button><button className={templateButtonClass('offering', 'production-project')} onClick={() => createDraft('offering', 'production-project')}><Plus size={14} /> Offering Letter Produksi</button><button className={templateButtonClass('agreement', 'monthly-smm')} onClick={() => createDraft('agreement', 'monthly-smm')}><Plus size={14} /> Work Agreement Bulanan</button><button className={templateButtonClass('agreement', 'production-project')} onClick={() => createDraft('agreement', 'production-project')}><Plus size={14} /> Work Agreement Project</button><button className={templateButtonClass('offering', 'custom')} onClick={() => createDraft('offering', 'custom')}><FilePlus2 size={14} /> Mulai kosong</button></div><p className="client-document-action-hint"><strong>Mulai kosong</strong> membuka Offering Letter dengan kerangka panduan tanpa isian paket otomatis. Isi atau ubah teks panduan; pratinjau dan PDF akan mengikuti teks tersebut.</p></div></section>
    {notice && <div className="client-document-notice" role="status">{notice}</div>}{error && <div className="error client-document-error" role="alert">{error}</div>}
    <section className="card"><div className="card-head"><div><h3>Dokumen tersimpan</h3><p>Setiap dokumen punya isi dan status sendiri untuk {ownerName}.</p></div><span className="badge">{documents.length} dokumen</span></div>
      {loading ? <div className="empty"><LoaderCircle size={16} className="spin" /> Memuat dokumen…</div> : documents.length ? <div className="client-document-list">{documents.map((document) => <article className="client-document-row" key={document.id}><div className="client-document-icon"><FileText size={17} /></div><div className="client-document-info"><div className="client-document-title"><strong>{cleanDocumentTitle(document.title)}</strong><span className={`badge ${document.status === 'Signed' ? 'green' : document.status === 'Declined' ? 'red' : ''}`}>{statusLabels[document.status] ?? document.status}</span></div><p>{docTypeLabel(document.type as DocumentType)} · {document.documentNumber || 'Tanpa nomor'} · {document.issueDate}</p></div><div className="actions"><button className="icon-button" title="Lihat pratinjau" aria-label={`Lihat pratinjau ${document.title}`} onClick={() => void openPreview(document)}><Eye size={15} /></button><button className="icon-button" title="Unduh PDF" aria-label={`Unduh ${document.title}`} onClick={() => void download(document)}><FileDown size={15} /></button><button className="icon-button" title="Edit dokumen" aria-label={`Edit ${document.title}`} onClick={() => editDraft(document)}><Pencil size={14} /></button>{document.type === 'offering' && <button className="icon-button" title="Buat agreement dari dokumen ini" aria-label="Buat agreement dari offering letter" onClick={() => createDraft('agreement', (document.templateKey as ClientDocumentTemplateKey) || 'custom', document)}><FilePlus2 size={15} /></button>}<button className="icon-button" title="Hapus dokumen" aria-label={`Hapus ${document.title}`} onClick={() => void remove(document)}><Trash2 size={14} /></button></div></article>)}</div> : <div className="client-document-empty"><FileText size={20} /><strong>Belum ada dokumen</strong><span>Buat draft penawaran atau perjanjian untuk {ownerName}. Dokumen tersimpan khusus untuk {brand ? 'brand' : 'prospek'} ini.</span></div>}
    </section>
    {draft && <section className="card client-document-editor"><div className="card-head"><div><div className="eyebrow">{draft.id ? 'Edit dokumen' : 'Draft baru'}</div><h3>{docTypeLabel(draft.type as DocumentType)}</h3><p>Lengkapi isian yang ditandai wajib, lalu periksa PDF sebelum dikirim. Penanda {'{{workspaceName}}'} mengikuti nama workspace saat PDF dibuat.</p></div><button className="icon-button" aria-label="Tutup editor" onClick={() => setDraft(null)}><X size={17} /></button></div>
      <div className="client-document-language-row"><div><strong>Bahasa dokumen</strong><small>{englishVersion ? 'Versi English aktif untuk pratinjau dan PDF.' : 'Pilih English version untuk menyiapkan output berbahasa Inggris.'}</small></div><button type="button" className={`button${englishVersion ? ' primary' : ''}`} aria-pressed={englishVersion} onClick={() => updateDraft({ templateFields: { ...draft.templateFields, __language: englishVersion ? 'id' : 'en' } })}>{englishVersion ? 'English version · aktif' : 'English version'}</button></div>
      <div className="form-grid client-document-meta"><label className="field"><span>Judul dokumen</span><input className="input" value={draft.title} maxLength={180} onChange={(event) => updateDraft({ title: event.target.value })} /></label><label className="field"><span>Nomor dokumen</span><input className="input" value={draft.documentNumber} maxLength={80} onChange={(event) => updateDraft({ documentNumber: event.target.value })} /></label><label className="field"><span>Tanggal dokumen</span><input className="input" type="date" value={draft.issueDate} onChange={(event) => updateDraft({ issueDate: event.target.value })} /></label><label className="field"><span>Status</span><select className="select" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {englishVersion && <p className="field-hint client-document-language-hint">Naskah template akan diterjemahkan ke English. Bagian yang kamu tulis atau ubah sendiri tetap mengikuti teks yang kamu masukkan.</p>}
      {draft.templateKey !== 'custom' && <div className="client-document-template-fields"><div className="client-document-sections-head"><div><h4>Isian template</h4><p>Lengkapi kolom ini; angka dan jadwal akan masuk otomatis ke naskah dan PDF.</p></div><span className="badge">{draft.templateKey === 'monthly-smm' ? 'Social media bulanan' : 'Produksi project'}</span></div><div className="form-grid client-template-field-grid">{templateFieldList(draft.type as DocumentType, draft.templateKey as ClientDocumentTemplateKey).map((field) => <label className={`field${field.multiline ? ' template-field-multiline' : ''}`} key={field.key}><span>{field.label}{field.required ? ' · wajib' : ''}</span>{field.multiline ? <textarea className="textarea" rows={3} value={draft.templateFields[field.key] ?? ''} placeholder={field.hint} onChange={(event) => updateDraft({ templateFields: { ...draft.templateFields, [field.key]: event.target.value } })} /> : <input className="input" value={draft.templateFields[field.key] ?? ''} placeholder={field.hint} onChange={(event) => updateDraft({ templateFields: { ...draft.templateFields, [field.key]: event.target.value } })} />}</label>)}</div><p className="field-hint">Field wajib yang belum diisi akan ditandai di PDF sebagai “Lengkapi”. Isi 0 jika memang tidak ada output untuk kategori tersebut.</p></div>}
      <details className="client-document-optional-sections" open={draft.templateKey === 'custom'}><summary>{draft.templateKey === 'custom' ? 'Susun isi dokumen' : 'Sesuaikan naskah dan ketentuan (opsional)'}</summary><div className="client-document-sections-head"><div><h4>Isi dokumen</h4><p>Ubah, tambah, hapus, atau urutkan judul dan isi ketentuan. Perubahan ini akan tampil di pratinjau dan PDF; isian template di atas tetap masuk otomatis.</p></div><button className="button" disabled={draft.sections.length >= 24} onClick={addSection}><Plus size={14} /> Tambah bagian</button></div>
      <div className="client-document-sections" ref={sectionListRef}>{draft.sections.map((section, index) => <div className="client-document-section" key={`${draft.id ?? draft.type}-${index}`}><div className="client-document-section-toolbar"><span>Bagian {index + 1}</span><div className="actions"><button type="button" className="icon-button" title="Naikkan bagian" disabled={index === 0} onClick={() => moveSection(index, -1)}><ArrowUp size={14} /></button><button type="button" className="icon-button" title="Turunkan bagian" disabled={index === draft.sections.length - 1} onClick={() => moveSection(index, 1)}><ArrowDown size={14} /></button><button type="button" className="icon-button danger-action" title="Hapus bagian" onClick={() => updateDraft({ sections: draft.sections.filter((_, i) => i !== index) })}><Trash2 size={14} /></button></div></div><label className="field"><span>Judul bagian</span><input className="input" value={section.heading} maxLength={160} placeholder="Contoh: Ruang lingkup pekerjaan" onChange={(event) => updateSection(index, { heading: event.target.value })} /></label><label className="field"><span>Isi / ketentuan</span><textarea className="textarea client-document-body" value={section.body} maxLength={8000} placeholder="Tuliskan detail yang sudah disepakati dengan client…" onChange={(event) => updateSection(index, { body: event.target.value })} /></label></div>)}</div></details>
      <div className="client-document-editor-foot"><span>Draft tersimpan di workspace hanya setelah menekan Simpan.</span><div className="page-actions"><button className="button" disabled={previewBusy || busy} onClick={() => void openPreview(draft)}><Eye size={14} /> {previewBusy ? 'Menyiapkan…' : 'Lihat pratinjau'}</button><button className="button" disabled={busy} onClick={() => setDraft(null)}>Batal</button><button className="button primary" disabled={busy || !draft.title.trim() || !draft.issueDate} onClick={() => void save()}><Save size={14} /> {busy ? 'Menyimpan…' : 'Simpan dokumen'}</button></div></div>
    </section>}
    {preview && <div className="client-document-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null) }}><section className="client-document-preview" role="dialog" aria-modal="true" aria-label={`Pratinjau ${preview.title}`}><header><div><strong>Pratinjau dokumen</strong><span>{preview.title}</span></div><button className="icon-button" aria-label="Tutup pratinjau" onClick={() => setPreview(null)}><X size={17} /></button></header><iframe title={`Pratinjau PDF ${preview.title}`} src={preview.url} /></section></div>}
    {sectionNotice && <div className="client-document-toast" role="status"><FileText size={15} /> {sectionNotice}</div>}
  </div>
}

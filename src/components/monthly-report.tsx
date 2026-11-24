import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, Check, Eye, EyeOff, FileDown, GripVertical, Image as ImageIcon, Save, Sparkles, Trash2, TrendingUp, Upload, Users, Wallet } from 'lucide-react'
import { saveSocialReport } from '#/lib/server'
import { useWorkspaceProfile, WorkspaceLogo } from '#/components/workspace-identity'
import type { SocialReportPlatformMetrics } from '#/lib/schema'

const ReportCharts = lazy(() => import('#/components/report-charts').then((module) => ({ default: module.ReportCharts })))

const platformNames = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Threads', 'Lainnya'] as const
type AttachmentPlatform = string
type NumericMetricKey = Exclude<keyof SocialReportPlatformMetrics, 'salesValueHidden'>
const metricFields: { key: NumericMetricKey; label: string; currency?: boolean }[] = [
  { key: 'followersStart', label: 'Followers awal periode' }, { key: 'followersEnd', label: 'Followers akhir periode' },
  { key: 'views', label: 'Views akun (analytics)' }, { key: 'reach', label: 'Reach / jangkauan akun' },
  { key: 'profileVisits', label: 'Kunjungan profil' }, { key: 'linkClicks', label: 'Klik tautan / CTA' },
  { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Komentar' }, { key: 'shares', label: 'Shares' }, { key: 'saves', label: 'Saves' },
  { key: 'salesValue', label: 'Nilai penjualan (Rp)', currency: true }, { key: 'productsSold', label: 'Produk / voucher terjual' },
]
type MetricTotals = { [Key in NumericMetricKey]: number }
const emptyMetrics = (): SocialReportPlatformMetrics => ({ followersStart: null, followersEnd: null, views: null, reach: null, profileVisits: null, linkClicks: null, likes: null, comments: null, shares: null, saves: null, salesValue: null, productsSold: null, salesValueHidden: true })
const sumMetrics = (platforms: string[], values: Record<string, SocialReportPlatformMetrics> | undefined): MetricTotals => {
  const totals = Object.fromEntries(metricFields.map(({ key }) => [key, 0])) as MetricTotals
  for (const platform of platforms) for (const { key } of metricFields) totals[key] += values?.[platform]?.[key] ?? 0
  return totals
}
const requiredMetricKeys: NumericMetricKey[] = ['followersStart', 'followersEnd', 'views']
type ReportRow = { id: string; brandId: string; month: string; status: string; platforms: string[]; metrics: Record<string, SocialReportPlatformMetrics>; summary: string; insights: string; nextPlan: string; updatedAt: number }
function reportMonthLabel(month: string) { return new Date(`${month}-01T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }

export function MonthlyReport({ brandId, brandName, month, reports, contentRows, handledPlatforms, onSaved, onDeleteReport }: { brandId: string; brandName: string; month: string; reports: ReportRow[]; contentRows: { id: string; title: string; format: string; date: string; status: string; platforms: string[]; views: number; likes: number; comments: number; shares: number; saves: number }[]; handledPlatforms: string[]; onSaved: () => Promise<void>; onDeleteReport: (id: string) => Promise<void> }) {
  const existing = reports.find((report) => report.brandId === brandId && report.month === month)
  const { name: workspaceName } = useWorkspaceProfile()
  const [selected, setSelected] = useState<string[]>(handledPlatforms)
  const [metrics, setMetrics] = useState<Record<string, SocialReportPlatformMetrics>>({})
  const [summary, setSummary] = useState('')
  const [insights, setInsights] = useState('')
  const [nextPlan, setNextPlan] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Final'>('Draft')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [previewed, setPreviewed] = useState(false)
  const handledPlatformSignature = handledPlatforms.join('|')

  useEffect(() => { setSelected(handledPlatformSignature ? handledPlatformSignature.split('|') : []) }, [brandId, month, handledPlatformSignature])

  useEffect(() => {
    const storedMetrics = existing?.metrics ?? {}
    const preparedMetrics = Object.fromEntries(Object.entries(storedMetrics).map(([platform, value]) => {
      const legacyZeroDefaults = 'postsPublished' in value && value.followersStart === 0 && value.followersEnd === 0 && value.views === 0
      const prepared = legacyZeroDefaults ? { ...value, followersStart: null, followersEnd: null, views: null } : value
      return [platform, { ...prepared, salesValueHidden: prepared.salesValueHidden ?? (prepared.salesValue == null && prepared.productsSold == null) }]
    }))
    setMetrics(preparedMetrics)
    setSummary(existing?.summary ?? '')
    setInsights(existing?.insights ?? '')
    setNextPlan(existing?.nextPlan ?? '')
    setStatus(existing?.status === 'Final' ? 'Final' : 'Draft')
    setNotice('')
    setPreviewed(false)
  }, [brandId, month, existing?.updatedAt, handledPlatformSignature])

  const periodContent = contentRows.filter((item) => item.date.startsWith(month))
  const periodContentSignature = periodContent.map((item) => `${item.id}:${item.status}:${item.platforms.join(',')}`).join('|')
  useEffect(() => { setPreviewed(false) }, [periodContentSignature])
  const orderedSelected = [...platformNames.filter((platform) => selected.includes(platform)), ...selected.filter((platform) => !platformNames.includes(platform as typeof platformNames[number]))]
  const totals = useMemo(() => sumMetrics(selected, metrics), [selected, metrics])
  const publishedCount = (platform: string) => periodContent.filter((item) => item.status === 'Uploaded' && item.platforms.includes(platform)).length
  const contentPlanStats = (platform: string) => periodContent.filter((item) => item.status === 'Uploaded' && item.platforms.includes(platform)).reduce((sum, item) => ({ views: sum.views + item.views, engagement: sum.engagement + item.likes + item.comments + item.shares + item.saves }), { views: 0, engagement: 0 })
  const allProvided = (key: NumericMetricKey) => selected.length > 0 && selected.every((platform) => metrics[platform]?.[key] !== null && metrics[platform]?.[key] !== undefined)
  const completeCount = selected.reduce((sum, platform) => sum + requiredMetricKeys.filter((key) => metrics[platform]?.[key] !== null && metrics[platform]?.[key] !== undefined).length, 0)
  const requiredCount = selected.length * requiredMetricKeys.length
  const dataComplete = requiredCount > 0 && completeCount === requiredCount
  const engagement = totals.likes + totals.comments + totals.shares + totals.saves
  const engagementComplete = selected.length > 0 && selected.every((platform) => ['likes', 'comments', 'shares', 'saves', 'views'].every((key) => metrics[platform]?.[key as keyof SocialReportPlatformMetrics] !== null && metrics[platform]?.[key as keyof SocialReportPlatformMetrics] !== undefined))
  const engagementRate = engagementComplete && totals.views ? (engagement / totals.views) * 100 : null
  const isSalesValueHidden = (platform: string) => metrics[platform]?.salesValueHidden ?? (metrics[platform]?.salesValue == null && metrics[platform]?.productsSold == null)
  const followerChange = dataComplete ? totals.followersEnd - totals.followersStart : null

  const updateMetric = (platform: string, key: NumericMetricKey, value: number | null) => {
    setPreviewed(false)
    setMetrics((current) => ({ ...current, [platform]: { ...(current[platform] ?? emptyMetrics()), [key]: value } }))
  }
  const toggleSalesValue = (platform: string) => {
    setPreviewed(false)
    setMetrics((current) => {
      const row = current[platform] ?? emptyMetrics()
      const isHidden = row.salesValueHidden ?? (row.salesValue == null && row.productsSold == null)
      return { ...current, [platform]: { ...row, salesValueHidden: !isHidden } }
    })
  }
  const draftAnalysis = () => {
    const ranked = selected.map((platform) => ({ platform, value: metrics[platform] ?? emptyMetrics() })).sort((a, b) => (b.value.views ?? 0) - (a.value.views ?? 0))
    const best = ranked[0]
    const bestLabel = best?.value.views ? `${best.platform} mencatat views tertinggi (${best.value.views.toLocaleString('id-ID')})` : 'Belum ada data views untuk membandingkan performa antarplatform'
    const funnel = allProvided('profileVisits') && allProvided('linkClicks') && totals.profileVisits ? `Dari ${totals.profileVisits.toLocaleString('id-ID')} kunjungan profil, tercatat ${totals.linkClicks.toLocaleString('id-ID')} klik tautan (${(totals.linkClicks / totals.profileVisits * 100).toFixed(1)}%).` : 'Data kunjungan profil atau klik tautan belum lengkap, sehingga konversi belum dapat dihitung.'
    const rate = engagementRate !== null ? `Engagement terhitung ${engagement.toLocaleString('id-ID')} interaksi atau ${engagementRate.toFixed(2)}% dari views.` : 'Engagement rate belum dapat dihitung karena sebagian data interaksi atau views belum diisi.'
    setInsights([bestLabel, rate, funnel].join('\n'))
    const actions = []
    if (best?.value.views) actions.push(`Uji ulang format dan topik konten dengan performa tertinggi di ${best.platform} dalam beberapa variasi kreatif.`)
    if (allProvided('profileVisits') && allProvided('linkClicks') && (!totals.linkClicks || (totals.profileVisits && totals.linkClicks / totals.profileVisits < 0.02))) actions.push('Perjelas CTA pada caption dan akhir video, lalu pantau klik tautan pada periode berikutnya.')
    if (allProvided('saves') && allProvided('shares') && !totals.saves && !totals.shares) actions.push('Tambahkan konten yang berguna untuk disimpan atau dibagikan, lalu evaluasi saves dan shares.')
    if (followerChange !== null && followerChange < 0) actions.push('Tinjau topik dan konsistensi publikasi untuk membantu menahan penurunan followers.')
    if (!actions.length) actions.push('Lanjutkan pengujian konten secara teratur dan bandingkan metrik per platform pada laporan berikutnya.')
    setNextPlan(actions.join('\n'))
    setPreviewed(false)
    if (!summary) setSummary(`Periode ini mencatat ${allProvided('views') ? `${totals.views.toLocaleString('id-ID')} views` : 'data views belum lengkap'} dan ${engagementComplete ? `${engagement.toLocaleString('id-ID')} interaksi` : 'data engagement belum lengkap'}. ${followerChange !== null ? `Perubahan followers ${followerChange >= 0 ? '+' : ''}${followerChange.toLocaleString('id-ID')}.` : 'Data followers belum lengkap.'} Angka berdasarkan data yang dimasukkan.`)
  }
  const save = async (nextStatus: 'Draft' | 'Final') => {
    if (nextStatus === 'Final' && (!dataComplete || !previewed)) return
    setSaving(true); setNotice('')
    try {
      const savedMetrics = Object.fromEntries(selected.map((platform) => {
        const { postsPublished: _legacyCount, ...values } = (metrics[platform] ?? emptyMetrics()) as SocialReportPlatformMetrics & { postsPublished?: number }
        return [platform, values]
      }))
      await saveSocialReport({ data: { brandId, month, status: nextStatus, platforms: selected, metrics: savedMetrics, summary, insights, nextPlan } })
      setStatus(nextStatus); setNotice(nextStatus === 'Final' ? 'Laporan final tersimpan.' : 'Draft laporan tersimpan.')
      await onSaved()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Laporan gagal disimpan.') }
    finally { setSaving(false) }
  }
  const previewPdf = () => { setPreviewed(true); window.print() }
  return <div id="printable-report" className="monthly-report">
    <div className="report-print-header" aria-hidden="true"><WorkspaceLogo decorative /><strong>{workspaceName.toLocaleUpperCase('id-ID')} REPORT</strong></div>
    <div className="report-print-footer" aria-hidden="true">{workspaceName} · Agency workspace</div>
    <section className="card report-cover"><div><div className="eyebrow">{workspaceName} · Monthly Social Media Report</div><h2>{brandName}</h2><p>Periode {month}</p></div><span className={`badge ${status === 'Final' ? 'green' : 'orange'}`}>{status === 'Final' ? 'Final' : 'Draft'}</span></section>
    <section className="card report-builder no-print">
      <div className="card-head"><div><h3>Siapkan laporan · {reportMonthLabel(month)}</h3><p>Jumlah konten tayang tersinkron otomatis dari Content Plan untuk periode ini. Followers, reach, dan insight akun tetap diisi dari analytics tiap platform.</p></div><div className="page-actions"><button className="button" onClick={draftAnalysis}><Sparkles size={14} /> Buat draft analisis</button><button className="button" onClick={previewPdf}><FileDown size={14} /> Pratinjau / Simpan PDF</button>{existing && <button className="button danger" onClick={() => void onDeleteReport(existing.id)}><Trash2 size={14} /> Hapus laporan</button>}</div></div>
      <div className="report-platform-picker"><strong>Platform laporan</strong><div className="filters">{platformNames.map((platform) => <label key={platform} className="badge" style={{ cursor: 'pointer' }}><input type="checkbox" checked={selected.includes(platform)} onChange={(event) => { setPreviewed(false); setSelected((current) => event.target.checked ? [...current, platform] : current.filter((item) => item !== platform)) }} /> {platform}</label>)}{selected.filter((platform) => !platformNames.includes(platform as typeof platformNames[number])).map((platform) => <label key={platform} className="badge" style={{ cursor: 'pointer' }}><input type="checkbox" checked onChange={(event) => { setPreviewed(false); if (!event.target.checked) setSelected((current) => current.filter((item) => item !== platform)) }} /> {platform}</label>)}</div></div>
      <p className="field-hint">Pilih setidaknya satu platform. Analisis awal hanya merangkum angka yang kamu masukkan, bukan menebak penyebab performa.</p>
    </section>
    <section className={`card report-completeness ${dataComplete ? 'complete' : 'incomplete'}`}><div><strong>{dataComplete ? 'Data utama siap ditinjau' : 'Data utama belum lengkap'}</strong><p>{completeCount} dari {requiredCount} kolom utama terisi. Untuk tiap platform, isi followers awal, followers akhir, dan views. Ketik 0 jika nilai sebenarnya nol; biarkan kosong jika belum tersedia.</p></div><div className="report-platform-completeness">{orderedSelected.map((platform) => { const filled = requiredMetricKeys.filter((key) => metrics[platform]?.[key] !== null && metrics[platform]?.[key] !== undefined).length; return <span key={platform} className={`badge ${filled === requiredMetricKeys.length ? 'green' : 'orange'}`}>{platform} {filled}/{requiredMetricKeys.length}</span> })}</div></section>
    {selected.length === 0 && <section className="card"><p className="error">Pilih minimal satu platform untuk membuat laporan.</p></section>}
    <ReportAttachments brandId={brandId} month={month} ready={Boolean(existing)} platforms={orderedSelected}>
      {(renderVisual) => <div className="report-platform-output-list">{orderedSelected.map((platform) => { const row = metrics[platform] ?? emptyMetrics(); const platformInteractions = (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0) + (row.saves ?? 0); const completeInteractions = ['likes', 'comments', 'shares', 'views'].every((key) => row[key as keyof SocialReportPlatformMetrics] !== null && row[key as keyof SocialReportPlatformMetrics] !== undefined); const platformRate = completeInteractions && row.views ? platformInteractions / row.views * 100 : null; const platformFollowerChange = row.followersStart != null && row.followersEnd != null ? row.followersEnd - row.followersStart : null; const hasSalesData = !isSalesValueHidden(platform); const platformContent = periodContent.filter((item) => item.platforms.includes(platform)); const hasCrossPlatformContent = platformContent.some((item) => item.platforms.length > 1); return <article className="report-platform-group" key={platform}>
        <section className="card report-platform-card">
          <div className="card-head"><div><div className="eyebrow">1. Platform performance · {reportMonthLabel(month)}</div><h3>{platform}</h3><div className="report-source-summary"><span>Content Plan</span><strong>{contentPlanStats(platform).views.toLocaleString('id-ID')} views</strong><i>·</i><strong>{contentPlanStats(platform).engagement.toLocaleString('id-ID')} interaksi</strong></div></div><div className="page-actions"><span className="badge green">{publishedCount(platform)} konten tayang</span><span className="badge">Views insight: {row.views == null ? '—' : row.views.toLocaleString('id-ID')}</span><button className="button no-print" onClick={() => toggleSalesValue(platform)}>{isSalesValueHidden(platform) ? <Eye size={14} /> : <EyeOff size={14} />}{isSalesValueHidden(platform) ? ' Tampilkan data penjualan' : ' Sembunyikan data penjualan'}</button></div></div>
          <div className="report-metric-grid">{metricFields.filter(({ key }) => !(['salesValue', 'productsSold'] as NumericMetricKey[]).includes(key) || !isSalesValueHidden(platform)).map(({ key, label }) => { const required = requiredMetricKeys.includes(key); const filled = row[key] !== null && row[key] !== undefined; return <label className={`field ${required && !filled ? 'report-required-missing' : ''}`} key={key}><span>{label}{required ? ' · wajib' : ''}</span><input className="input" type="number" min="0" step="1" value={row[key] ?? ''} onChange={(event) => updateMetric(platform, key, event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0))} /></label> })}</div>
          <p className="field-hint report-engagement-hint">Engagement rate: {platformRate === null ? 'Isi data interaksi dan views untuk menghitung' : `${platformRate.toFixed(2)}% dari views`}</p>
        </section>
        <section className="report-platform-output"><div className="eyebrow">2. Ringkasan performa · {platform}</div><div className={`grid kpis report-kpis${hasSalesData ? '' : ' report-kpis-four'}`}>
          <ReportKpi label="Konten tayang" value={publishedCount(platform).toLocaleString('id-ID')} foot="Content Plan" icon={<Check size={16} />} />
          <ReportKpi label="Views akun" value={row.views == null ? '—' : row.views.toLocaleString('id-ID')} foot={contentPlanStats(platform).views ? `Total views per konten: ${contentPlanStats(platform).views.toLocaleString('id-ID')}` : 'Isi dari analytics platform'} icon={<Activity size={16} />} />
          <ReportKpi label="Engagement rate" value={platformRate === null ? '—' : `${platformRate.toFixed(2)}%`} foot={platformRate === null ? 'Isi views dan interaksi' : `${platformInteractions.toLocaleString('id-ID')} interaksi`} icon={<TrendingUp size={16} />} />
          <ReportKpi label="Pertumbuhan followers" value={platformFollowerChange === null ? '—' : `${platformFollowerChange >= 0 ? '+' : ''}${platformFollowerChange.toLocaleString('id-ID')}`} foot={row.followersStart != null && row.followersEnd != null ? `${row.followersStart.toLocaleString('id-ID')} → ${row.followersEnd.toLocaleString('id-ID')}` : 'Isi followers awal dan akhir'} icon={<Users size={16} />} />
          {hasSalesData && <ReportKpi label="Nilai penjualan" value={row.salesValue == null ? '—' : `Rp ${row.salesValue.toLocaleString('id-ID')}`} foot={row.productsSold == null ? 'Produk / voucher belum diisi' : `${row.productsSold.toLocaleString('id-ID')} produk / voucher`} icon={<Wallet size={16} />} />}
        </div></section>
        <section className="report-platform-chart"><Suspense fallback={<section className="card report-chart-loading">Memuat grafik performa…</section>}><ReportCharts content={periodContent} selectedPlatforms={[platform]} /></Suspense></section>
        <section className="card report-content-list"><div className="card-head"><div><div className="eyebrow">4. Content distribution · {platform}</div><h3>Konten {platform} · {reportMonthLabel(month)}</h3><p>{platformContent.length} konten pada Content Plan.</p></div></div>
          {platformContent.length ? <div className="table-wrap"><table><thead><tr><th>Konten</th><th>Tanggal</th><th>Status</th><th>Views</th><th>Engagement</th></tr></thead><tbody>{platformContent.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.date}</td><td>{item.status}</td><td>{item.views.toLocaleString('id-ID')}</td><td>{(item.likes + item.comments + item.shares + item.saves).toLocaleString('id-ID')}</td></tr>)}</tbody></table></div> : <div className="empty">Belum ada konten untuk {platform} pada periode ini.</div>}
          {hasCrossPlatformContent && <p className="field-hint">Metrik konten lintas platform mengikuti angka gabungan dari Content Hub.</p>}
        </section>
        {renderVisual(platform as AttachmentPlatform)}
      </article> })}</div>}
    </ReportAttachments>
    <section className="grid report-text-grid">
      <ReportTextField label="Ringkasan performa" hint="Ringkasan untuk klien." value={summary} onChange={(value) => { setPreviewed(false); setSummary(value) }} />
      <ReportTextField label="Temuan & analisis" hint="Apa yang terlihat dari data dan batasan datanya." value={insights} onChange={(value) => { setPreviewed(false); setInsights(value) }} />
      <ReportTextField label="Rencana bulan berikutnya" hint="Aksi yang akan diteruskan ke content plan." value={nextPlan} onChange={(value) => { setPreviewed(false); setNextPlan(value) }} />
    </section>
    <div className="report-savebar no-print"><span className={notice.includes('gagal') || notice.includes('Pilih') ? 'error' : 'field-hint'} role="status">{notice || (existing ? `Terakhir disimpan ${new Date(existing.updatedAt).toLocaleString('id-ID')}` : 'Belum disimpan')}</span><div><div className="page-actions"><button className="button" disabled={saving || !selected.length} onClick={() => save('Draft')}><Save size={14} /> Simpan draft</button><button className="button primary" disabled={saving || !selected.length || !dataComplete || !previewed} title={!dataComplete ? 'Lengkapi data utama dahulu' : !previewed ? 'Pratinjau laporan dahulu' : ''} onClick={() => save('Final')}><Check size={14} /> Tandai final</button></div>{!dataComplete && <div className="field-hint report-final-hint">Lengkapi data utama di semua platform untuk finalisasi.</div>}{dataComplete && !previewed && <div className="field-hint report-final-hint">Buka pratinjau PDF sebelum menandai final.</div>}</div></div>
  </div>
}

function ReportKpi({ label, value, foot, icon }: { label: string; value: string; foot: string; icon: React.ReactNode }) { return <section className="card kpi"><div className="kpi-label">{label}<span className="kpi-icon">{icon}</span></div><div className="kpi-value">{value}</div><div className="kpi-foot">{foot}</div></section> }
function ReportTextField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) { return <section className="card field"><label>{label}</label><textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder={hint} /><span className="field-hint">{hint}</span></section> }

type ReportAttachment = { id: string; title: string; platform: AttachmentPlatform; filename: string; mime: string; sizeBytes: number; sortOrder: number; cropX: number; cropY: number; cropWidth: number; cropHeight: number; imageWidth: number; imageHeight: number }
type Crop = Pick<ReportAttachment, 'cropX' | 'cropY' | 'cropWidth' | 'cropHeight' | 'imageWidth' | 'imageHeight'>
const attachmentEndpoint = '/api/social-report-image'
async function optimizeReportImage(file: File) {
  const image = await createImageBitmap(file)
  try {
    let scale = Math.min(1, 2200 / Math.max(image.width, image.height))
    for (const shrink of [1, 0.86, 0.72, 0.58, 0.46, 0.36, 0.28, 0.22, 0.17, 0.13, 0.1, 0.08]) {
      scale = Math.min(scale, shrink)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Gambar tidak dapat diproses di browser ini.')
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (blob && blob.size <= 1_650_000) return { file: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }), width: canvas.width, height: canvas.height }
      }
    }
    throw new Error('Gambar tidak dapat diproses menjadi format unggahan. Coba simpan sebagai JPG, PNG, atau WebP lalu unggah kembali.')
  } finally { image.close() }
}

function ReportCropEditor({ item, src, onCropCommit }: { item: ReportAttachment; src: string; onCropCommit: (crop: Crop) => void }) {
  const sourceRef = useRef<HTMLDivElement>(null)
  const savedCropRef = useRef<Crop>(item)
  const dragRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; crop: Crop; rect: DOMRect } | null>(null)
  const [liveCrop, setLiveCrop] = useState<Crop>(item)
  const [cropChanged, setCropChanged] = useState(false)
  useEffect(() => { savedCropRef.current = item; setLiveCrop(item); setCropChanged(false) }, [item.id])
  const update = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return null
    const dx = (event.clientX - drag.startX) / drag.rect.width * 100
    const dy = (event.clientY - drag.startY) / drag.rect.height * 100
    const minSize = 5
    const crop = drag.mode === 'move'
      ? { ...drag.crop, cropX: Math.round(Math.max(0, Math.min(100 - drag.crop.cropWidth, drag.crop.cropX + dx))), cropY: Math.round(Math.max(0, Math.min(100 - drag.crop.cropHeight, drag.crop.cropY + dy))) }
      : { ...drag.crop, cropWidth: Math.round(Math.max(minSize, Math.min(100 - drag.crop.cropX, drag.crop.cropWidth + dx))), cropHeight: Math.round(Math.max(minSize, Math.min(100 - drag.crop.cropY, drag.crop.cropHeight + dy))) }
    setLiveCrop(crop); setCropChanged(true); return crop
  }
  const begin = (event: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    event.preventDefault(); event.stopPropagation()
    const rect = sourceRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, crop: liveCrop, rect }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const finish = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    const crop = update(event); dragRef.current = null; if (crop) onCropCommit(crop)
  }
  const sourceAspect = item.imageWidth > 0 && item.imageHeight > 0 ? item.imageWidth / item.imageHeight : 16 / 9
  const width = Math.min(560, Math.max(200, 330 * sourceAspect))
  const previewAspect = sourceAspect * liveCrop.cropWidth / liveCrop.cropHeight
  const previewWidth = Math.min(560, Math.max(180, 290 * previewAspect))
  return <div className="report-attachment-editor no-print">
    <div className="report-crop-source-wrap"><div ref={sourceRef} className="report-crop-source" style={{ width: `min(100%, ${width}px)`, aspectRatio: String(sourceAspect) }}>
      <img src={src} alt="" draggable={false} onLoad={(event) => { const image = event.currentTarget; if (!item.imageWidth || !item.imageHeight) { const crop = { ...liveCrop, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight }; savedCropRef.current = crop; setLiveCrop(crop); onCropCommit(crop) } }} />
      <div className="report-crop-frame" style={{ left: `${liveCrop.cropX}%`, top: `${liveCrop.cropY}%`, width: `${liveCrop.cropWidth}%`, height: `${liveCrop.cropHeight}%` }} onPointerDown={(event) => begin(event, 'move')} onPointerMove={update} onPointerUp={finish} onPointerCancel={finish} aria-label="Geser area crop">
        <span className="report-crop-hint">Geser kotak · tarik sudut untuk ubah ukuran</span><button className="report-crop-resize" aria-label="Ubah ukuran crop" onPointerDown={(event) => begin(event, 'resize')} onPointerMove={update} onPointerUp={finish} onPointerCancel={finish} />
      </div>
    </div></div>
    <div className="report-crop-result"><div className="report-crop-result-head"><span>Hasil crop</span><button type="button" className="report-crop-reset" onClick={() => { const crop = { ...liveCrop, cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100 }; setLiveCrop(crop); setCropChanged(true) }}>Reset</button></div><div className="report-attachment-crop" style={{ width: `min(100%, ${previewWidth}px)`, aspectRatio: String(previewAspect) }}><img src={src} alt={item.title} style={{ width: `${10000 / liveCrop.cropWidth}%`, height: `${10000 / liveCrop.cropHeight}%`, left: `${-liveCrop.cropX / liveCrop.cropWidth * 100}%`, top: `${-liveCrop.cropY / liveCrop.cropHeight * 100}%` }} /></div><div className="report-crop-actions"><button type="button" className="button" disabled={!cropChanged} onClick={() => { setLiveCrop(savedCropRef.current); setCropChanged(false) }}>Batal</button><button type="button" className="button primary" disabled={!cropChanged} onClick={() => { savedCropRef.current = liveCrop; onCropCommit(liveCrop); setCropChanged(false) }}><Check size={13} /> Selesai crop</button></div></div>
  </div>
}

function ReportAttachments({ brandId, month, ready, platforms, children }: { brandId: string; month: string; ready: boolean; platforms: AttachmentPlatform[]; children: (renderPlatformAttachments: (platform: AttachmentPlatform) => React.ReactNode) => React.ReactNode }) {
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [imageVersion, setImageVersion] = useState(Date.now())
  const query = `brandId=${encodeURIComponent(brandId)}&month=${encodeURIComponent(month)}`
  const refresh = async () => {
    const response = await fetch(`${attachmentEndpoint}?${query}&list=1`)
    if (!response.ok) throw new Error('Lampiran laporan tidak dapat dimuat.')
    const result = await response.json() as { attachments: ReportAttachment[] }
    setAttachments(result.attachments)
  }
  useEffect(() => { let active = true; if (!ready) { setAttachments([]); return () => { active = false } }; fetch(`${attachmentEndpoint}?${query}&list=1`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ attachments: ReportAttachment[] }> }).then((result) => { if (active) setAttachments(result.attachments) }).catch(() => { if (active) setError('Lampiran laporan tidak dapat dimuat.') }); return () => { active = false } }, [brandId, month, ready])
  const uploadFiles = async (files: File[], platform: AttachmentPlatform) => {
    if (!ready || !files.length) return
    setBusy(true); setError(''); setMessage('')
    const failures: string[] = []
    let uploaded = 0
    try {
      for (const [index, source] of files.entries()) {
        setMessage(`Menyiapkan foto ${index + 1} dari ${files.length}…`)
        try {
          const optimized = await optimizeReportImage(source)
          const form = new FormData(); form.append('action', 'upload'); form.append('brandId', brandId); form.append('month', month); form.append('platform', platform); form.append('file', optimized.file); form.append('title', source.name.replace(/\.[^.]+$/, '').slice(0, 120)); form.append('imageWidth', String(optimized.width)); form.append('imageHeight', String(optimized.height))
          const response = await fetch(attachmentEndpoint, { method: 'POST', body: form })
          const result = await response.json() as { error?: string }
          if (!response.ok) throw new Error(result.error || 'Upload ditolak oleh server.')
          uploaded += 1
        } catch (cause) {
          failures.push(`${source.name}: ${cause instanceof Error ? cause.message : 'gagal diproses'}`)
        }
      }
      if (uploaded) { await refresh(); setImageVersion(Date.now()) }
      if (failures.length) setError(`${uploaded} dari ${files.length} foto berhasil diunggah ke ${platform}. ${failures.join(' · ')}`)
      else setMessage(`${uploaded} foto ditambahkan ke bagian ${platform}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Foto gagal diunggah.') }
    finally { setBusy(false) }
  }
  const saveLayout = async (next: ReportAttachment[]) => {
    setAttachments(next); setError('')
    try {
      const response = await fetch(attachmentEndpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId, month, attachments: next.map((item, index) => ({ id: item.id, title: item.title, platform: item.platform, cropX: item.cropX, cropY: item.cropY, cropWidth: item.cropWidth, cropHeight: item.cropHeight, imageWidth: item.imageWidth, imageHeight: item.imageHeight, sortOrder: index })) }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Susunan lampiran gagal disimpan.')
      setMessage('Susunan dan crop tersimpan.'); setImageVersion(Date.now())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Perubahan lampiran gagal disimpan.') }
  }
  const move = (itemId: string, direction: -1 | 1) => {
    const group = attachments.filter((row) => row.platform === attachments.find((item) => item.id === itemId)?.platform)
    const groupIndex = group.findIndex((row) => row.id === itemId)
    const target = groupIndex + direction
    if (target < 0 || target >= group.length) return
    const next = [...attachments]
    const from = next.findIndex((row) => row.id === itemId)
    const to = next.findIndex((row) => row.id === group[target]?.id)
    ;[next[from], next[to]] = [next[to]!, next[from]!]
    void saveLayout(next)
  }
  const remove = async (item: ReportAttachment) => {
    if (!window.confirm(`Hapus “${item.title}” dari lampiran laporan?`)) return
    const response = await fetch(`${attachmentEndpoint}?${query}&attachmentId=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    if (response.ok) { await refresh(); setMessage('Foto dihapus dari laporan.') }
    else setError('Foto tidak dapat dihapus.')
  }
  const commitCrop = (item: ReportAttachment, crop: Crop) => { const next = attachments.map((row) => row.id === item.id ? { ...row, ...crop } : row); void saveLayout(next) }
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const dropOn = (targetId: string) => { if (!draggedId) return; const platform = attachments.find((row) => row.id === draggedId)?.platform; const group = attachments.filter((row) => row.platform === platform); const sourceIndex = group.findIndex((row) => row.id === draggedId); const targetIndex = group.findIndex((row) => row.id === targetId); if (!platform || sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) { setDraggedId(null); return }; const reordered = [...group]; const [picked] = reordered.splice(sourceIndex, 1); reordered.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, picked!); let groupIndex = 0; const next = attachments.map((row) => row.platform === platform ? reordered[groupIndex++]! : row); setDraggedId(null); void saveLayout(next) }
  const renderPlatformAttachments = (platform: AttachmentPlatform) => { if (!platforms.includes(platform)) return null; const group = attachments.filter((item) => item.platform === platform); const attachmentColumns = group.length <= 2 ? Math.max(group.length, 1) : group.length <= 6 ? 3 : 4; return <section className={`card report-attachment-platform report-attachment-platform-${platform.toLowerCase()}${group.length ? '' : ' is-empty'}`} key={`visual-${platform}`}>
      <div className="report-attachment-platform-head"><div><div className="eyebrow">5. Visual laporan</div><h4>{platform}</h4><span>{group.length} foto</span></div><label className={`button primary report-attachment-upload no-print ${!ready || busy ? 'disabled' : ''}`}><Upload size={14} />{busy ? 'Memproses…' : `Unggah ${platform}`}<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple disabled={!ready || busy} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void uploadFiles(files, platform) }} /></label></div>
      {group.length ? <div className="report-attachment-grid" data-columns={attachmentColumns}>{group.map((item, groupIndex) => { const src = `${attachmentEndpoint}?${query}&attachmentId=${encodeURIComponent(item.id)}&v=${imageVersion}`; const sourceAspect = item.imageWidth > 0 && item.imageHeight > 0 ? item.imageWidth / item.imageHeight : 16 / 9; const aspect = sourceAspect * item.cropWidth / item.cropHeight; const previewWidth = Math.min(560, Math.max(180, 290 * aspect)); return <article className={`report-attachment-card${draggedId === item.id ? ' is-dragging' : ''}`} key={item.id} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(item.id)}><div className="report-attachment-title-row"><button className="icon-button report-attachment-drag no-print" draggable aria-label={`Seret untuk mengurutkan foto ${platform}`} onDragStart={() => setDraggedId(item.id)} onDragEnd={() => setDraggedId(null)}><GripVertical size={15} /></button><input className="input report-attachment-title no-print" aria-label="Judul lampiran" value={item.title} maxLength={120} onChange={(event) => setAttachments((current) => current.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row))} onBlur={() => void saveLayout(attachments)} /><div className="report-attachment-actions no-print"><button className="icon-button" aria-label="Naikkan urutan foto" disabled={groupIndex === 0 || busy} onClick={() => move(item.id, -1)}><ArrowUp size={14} /></button><button className="icon-button" aria-label="Turunkan urutan foto" disabled={groupIndex === group.length - 1 || busy} onClick={() => move(item.id, 1)}><ArrowDown size={14} /></button><button className="icon-button danger-action" aria-label="Hapus foto" onClick={() => void remove(item)}><Trash2 size={14} /></button></div></div><ReportCropEditor item={item} src={src} onCropCommit={(crop) => commitCrop(item, crop)} /><div className="report-attachment-print-crop" style={{ width: `min(100%, ${previewWidth}px)`, aspectRatio: String(aspect) }}><img src={src} alt={item.title} style={{ width: `${10000 / item.cropWidth}%`, height: `${10000 / item.cropHeight}%`, left: `${-item.cropX / item.cropWidth * 100}%`, top: `${-item.cropY / item.cropHeight * 100}%` }} /></div></article> })}</div> : <div className="report-attachment-empty no-print"><ImageIcon size={18} /><span>Belum ada lampiran {platform}.</span></div>}
    {!ready && <p className="field-hint no-print">Simpan draft laporan terlebih dahulu sebelum menambahkan foto.</p>}
    </section> }
  return <>{children(renderPlatformAttachments)}{(message || error) && <div className="report-attachment-status no-print">{message && <p className="report-attachment-message" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}</div>}</>
}

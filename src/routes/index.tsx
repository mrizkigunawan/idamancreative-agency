import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { AuthView } from '#/components/auth-view'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { addMonths, format, getDaysInMonth, getDay, parseISO, startOfMonth, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, FileDown, FilePlus2, FileText, Handshake, LayoutDashboard, Link2, Menu, MessageCircle, Package, PanelsTopLeft, Pencil, Plus, Power, Search, Sparkles, Trash2, TrendingUp, Upload, Wallet, X } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getImportantDates } from '#/lib/important-dates'
import { MonthlyReport } from '#/components/monthly-report'
import { BrandNotesPanel } from '#/components/brand-notes'
import { InventoryView } from '#/components/inventory-view'
import { ProfileDropdown } from '#/components/profile-dropdown'
import { ProfilePage } from '#/components/profile-page'
import { WorkspaceTheme } from '#/components/workspace-theme'
import type { WorkspaceAppearance } from '#/lib/workspace-theme'
import { readableBrandText } from '#/lib/workspace-theme'

import { ClientDocumentsPanel } from '#/components/client-documents'
import { analyzeInstagramCover, getAuthState, getPageData, moveProspectDocuments, removeRecord, saveBrandSocialProfile, saveInstagramFeedOrder, saveRecord, seedDemoData, setBrandActiveStatus } from '#/lib/server'
import { ContentPlanShareButton, InstagramFeedPlanner, InstagramProfilePlanner } from '#/components/content-planner'
import type { brandNotes, brandSocialProfiles, brands, contents, visits, prospects, transactions, socialReports, inventoryItems } from '#/lib/schema'
import { normalizeWorkspaceProfile, workspaceTitle } from '#/lib/workspace-profile'
import { WorkspaceBrand, WorkspaceProfileContext } from '#/components/workspace-identity'
import type { WorkspaceProfileDetails } from '#/lib/workspace-profile'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { page?: 'profile' } => search.page === 'profile' ? { page: 'profile' } : {},
  loader: () => getAuthState(),
  head: ({ loaderData }) => ({ meta: [{ title: workspaceTitle(normalizeWorkspaceProfile(loaderData?.workspace).name) }] }),
  component: Workspace,
})

type Kind = 'brand' | 'content' | 'visit' | 'brandNote' | 'prospect' | 'transaction'
type Brand = typeof brands.$inferSelect
type Content = typeof contents.$inferSelect
type Visit = typeof visits.$inferSelect
type BrandNote = typeof brandNotes.$inferSelect
type Prospect = typeof prospects.$inferSelect
type Transaction = typeof transactions.$inferSelect
type Report = typeof socialReports.$inferSelect
type InventoryItem = Omit<typeof inventoryItems.$inferSelect, 'receiptData'>
type SocialProfile = typeof brandSocialProfiles.$inferSelect
type Data = { brands: Brand[]; contents: Content[]; visits: Visit[]; brandNotes: BrandNote[]; prospects: Prospect[]; transactions: Transaction[]; reports: Report[]; inventory: InventoryItem[]; socialProfiles: SocialProfile[] }
type ModalState = { kind: Kind; item?: Record<string, unknown>; performanceOnly?: boolean } | null
const CashflowChart = lazy(() => import('#/components/cashflow-chart').then((module) => ({ default: module.CashflowChart })))
const money = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`
const today = () => format(new Date(), 'yyyy-MM-dd')
const monthNow = () => format(new Date(), 'yyyy-MM')
const idMonth = (month: string, short = false) => format(parseISO(`${month}-01`), short ? 'MMM yy' : 'MMMM yyyy', { locale: id })
const monthText = (month: string, language: AppLanguage, short = false) => format(parseISO(`${month}-01`), short ? 'MMM yy' : 'MMMM yyyy', language === 'id' ? { locale: id } : undefined)
const reminderDateLabel = (date: string | null) => !date ? 'Tanpa tanggal' : date < today() ? `Terlambat · ${format(parseISO(date), 'd MMM', { locale: id })}` : date === today() ? 'Jatuh tempo hari ini' : format(parseISO(date), 'd MMM yyyy', { locale: id })
const colors = ['#ef783c', '#5db5a2', '#8881b4', '#d19b43', '#507da2', '#ba6d78', '#8b9b55']
const contentStatuses = ['Ideation', 'Scheduling', 'Brief Ready', 'Editing', 'Approval', 'Uploaded'] as const
const contentStatusDescriptions: Record<(typeof contentStatuses)[number], string> = { Ideation: 'ide konten disiapkan', Scheduling: 'jadwal tayang ditetapkan', 'Brief Ready': 'brief siap diproduksi', Editing: 'sedang dikerjakan', Approval: 'menunggu persetujuan', Uploaded: 'berhasil tayang' }
const navItems = [
  { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard }, { id: 'calendar', label: 'Kalender & Visit', icon: CalendarDays }, { id: 'brands', label: 'Brand & SOW', icon: BriefcaseBusiness },
  { id: 'planner', label: 'Content Planner', icon: PanelsTopLeft }, { id: 'pipeline', label: 'Pitching CRM', icon: Handshake },
  { id: 'finance', label: 'Keuangan', icon: Wallet }, { id: 'inventory', label: 'Inventaris', icon: Package },
]
type AppLanguage = 'id' | 'en'
const useAppLanguage = (): AppLanguage => 'id'
const uiText = (_language: AppLanguage, text: string) => text
const stageClass: Record<string, string> = { Uploaded: 'uploaded', Scheduling: 'scheduled', 'Brief Ready': 'blue', Approval: 'orange', Editing: 'orange', Ideation: '', 'Belum Dibayar': 'red', Lunas: 'green', 'Negosiasi': 'orange', 'Pitching / Meeting': 'blue', 'Sent Proposal': '', Prospek: '' }

function Workspace() {
  const authState = Route.useLoaderData()
  const router = useRouter()
  const [user, setUser] = useState(authState.user)
  const [data, setData] = useState<Data>({ brands: [], contents: [], visits: [], brandNotes: [], prospects: [], transactions: [], reports: [], inventory: [], socialProfiles: [] })
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfileDetails>(() => normalizeWorkspaceProfile(authState.workspace))
  const [loading, setLoading] = useState(Boolean(authState.user))
  const { page } = Route.useSearch()
  const [workspaceView, setWorkspaceView] = useState('dashboard')
  const view = page === 'profile' ? 'profile' : workspaceView
  const setView = (nextView: string) => {
    if (nextView !== 'profile') setWorkspaceView(nextView)
    if (nextView === 'profile' || page === 'profile') void router.navigate({ to: '/', search: nextView === 'profile' ? { page: 'profile' } : {} })
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [month, setMonth] = useState(monthNow())
  const [modal, setModal] = useState<ModalState>(null)
  const [themePreview, setThemePreview] = useState<WorkspaceAppearance | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [brandTab, setBrandTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [progressSort, setProgressSort] = useState<'attention' | 'highest' | 'remaining' | 'name'>('attention')
  const [progressPlatform, setProgressPlatform] = useState('Semua platform')

  const [pendingProspectId, setPendingProspectId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const language: AppLanguage = 'id' as AppLanguage

  useEffect(() => { setUser(authState.user); setWorkspaceProfile(normalizeWorkspaceProfile(authState.workspace)) }, [authState])
  useEffect(() => { if (typeof document !== 'undefined') document.title = workspaceTitle(workspaceProfile.name) }, [workspaceProfile.name])
  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    getPageData().then((rows) => setData(rows as Data)).catch((error) => notify(error.message || 'Gagal memuat data.')).finally(() => setLoading(false))
  }, [user])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const reload = async () => setData(await getPageData() as Data)
  const toggleBrandActive = async (brand: Brand) => {
    try {
      await setBrandActiveStatus({ data: { brandId: brand.id, isActive: !brand.isActive } })
      await reload()
      notify(`${brand.name} ${brand.isActive ? 'dipindahkan ke nonaktif' : 'diaktifkan kembali'}`)
    } catch (error) { notify(error instanceof Error ? error.message : 'Status brand gagal diperbarui.') }
  }
  const toggleBrandNoteDone = async (note: BrandNote) => {
    try {
      await saveRecord({ data: { kind: 'brandNote', id: note.id, values: { brandId: note.brandId, title: note.title, category: note.category, details: note.details, dueDate: note.dueDate, isDone: !note.isDone } } } as never)
      await reload()
      notify(note.isDone ? 'Pengingat dibuka kembali' : 'Pengingat ditandai selesai')
    } catch (error) { notify(error instanceof Error ? error.message : 'Status pengingat gagal diperbarui.') }
  }
  const moveMonth = (amount: number) => setMonth(format(addMonths(parseISO(`${month}-01`), amount), 'yyyy-MM'))
  const currentBrand = data.brands.find((brand) => brand.id === selectedBrand)
  const monthContents = useMemo(() => data.contents.filter((item) => item.date.startsWith(month)), [data.contents, month])
  const monthVisits = useMemo(() => data.visits.filter((item) => item.date.startsWith(month)), [data.visits, month])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => item.date.startsWith(month)), [data.transactions, month])

  const save = async (kind: Kind, id: string | undefined, values: Record<string, unknown>, thumbnailFile?: File) => {
    const saved = await saveRecord({ data: { kind, ...(id ? { id } : {}), values } as never })
    let thumbnailUploadFailed = false
    if (kind === 'content' && thumbnailFile) {
      const body = new FormData(); body.set('contentId', saved.id); body.set('file', thumbnailFile)
      try { const response = await fetch('/api/content-thumbnail', { method: 'POST', body }); const result = await response.json() as { error?: string }; thumbnailUploadFailed = !response.ok; if (!response.ok) notify(result.error || 'Konten tersimpan, tetapi cover gagal diunggah.') }
      catch { thumbnailUploadFailed = true; notify('Konten tersimpan, tetapi cover gagal diunggah. Buka kembali kontennya untuk mencoba lagi.') }
    }
    if (kind === 'brand' && !id && pendingProspectId) { await moveProspectDocuments({ data: { prospectId: pendingProspectId, brandId: saved.id } }); await removeRecord({ data: { kind: 'prospect', id: pendingProspectId } }); setPendingProspectId(null) }
    setModal(null); await reload(); if (!thumbnailUploadFailed) notify(kind === 'brand' && pendingProspectId ? 'Brand dibuat dan prospek dipindahkan' : id ? 'Perubahan disimpan' : 'Data baru ditambahkan')
  }
  const savePlannerContent = async (item: Content, patch: Partial<Content>, coverFile?: File) => {
    const saved = await saveRecord({ data: { kind: 'content', id: item.id, values: { ...item, ...patch } } } as never)
    if (coverFile) {
      const body = new FormData(); body.set('contentId', saved.id); body.set('file', coverFile)
      const response = await fetch('/api/content-thumbnail', { method: 'POST', body })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Cover gagal diunggah. Coba simpan lagi.')
    }
    await reload()
    notify('Content Plan dan preview feed diperbarui.')
  }
  const saveSocialProfile = async (values: { brandId: string; profilePictureUrl: string; username: string; displayName: string; bio: string; highlights: { id: string; title: string; coverUrl: string; sortOrder: number }[]; pinnedContentIds: string[] }) => {
    await saveBrandSocialProfile({ data: values })
    await reload()
    notify('Planner profil Instagram disimpan')
  }
  const saveFeedOrder = async (brandId: string, contentIds: string[], dateAssignments: { contentId: string; date: string }[]) => {
    await saveInstagramFeedOrder({ data: { brandId, contentIds, dateAssignments } })
    await reload()
    notify('Susunan grid dan kalender disimpan')
  }
  const moveContentDate = async (item: Content, date: string) => {
    if (item.date === date) return
    try { await saveRecord({ data: { kind: 'content', id: item.id, values: { ...item, date } } } as never); await reload(); notify('Tanggal konten diperbarui') }
    catch (error) { notify(error instanceof Error ? error.message : 'Tanggal konten gagal dipindahkan.') }
  }
  const remove = async (kind: Kind | 'socialReport' | 'inventory', id: string, label: string) => {
    if (!window.confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return false
    try { await removeRecord({ data: { kind, id } }); if (selectedBrand === id) setSelectedBrand(null); await reload(); notify('Data berhasil dihapus'); return true } catch (error) { notify(error instanceof Error ? `Gagal menghapus: ${error.message}` : 'Data gagal dihapus. Coba lagi.'); return false }
  }

  if (loading) return <><WorkspaceTheme appearance={workspaceProfile} /><div className="loading">Memuat workspace…</div></>
  if (!user) return <WorkspaceProfileContext.Provider value={workspaceProfile}><WorkspaceTheme appearance={workspaceProfile} /><AuthView needsSetup={authState.needsSetup} onComplete={async () => { await router.invalidate(); const state = await getAuthState(); setUser(state.user); setWorkspaceProfile(normalizeWorkspaceProfile(state.workspace)) }} /></WorkspaceProfileContext.Provider>

  const addRecord = (kind: Kind, defaults?: Record<string, unknown>, performanceOnly = false) => {

    setModal({ kind, item: defaults, ...(performanceOnly ? { performanceOnly: true } : {}) })
  }
  const heading = view === 'profile' ? 'Profil pribadi' : navItems.find((item) => item.id === view)?.label ?? 'Beranda'
  const navEnglish: Record<string, string> = { Beranda: 'Dashboard', 'Kalender & Visit': 'Calendar & Visits', 'Brand & SOW': 'Brands & SOW', 'Content Planner': 'Content Planner', 'Pitching CRM': 'Prospect Pipeline', Keuangan: 'Finance', Inventaris: 'Inventory' }
  const currentMonthLabel = monthText(month, language)
  const activeBrands = data.brands.filter((brand) => brand.isActive)

  const activeBrandIds = new Set(activeBrands.map((brand) => brand.id))
  const activeMonthContents = monthContents.filter((item) => activeBrandIds.has(item.brandId))
  const openBrandNotes = data.brandNotes.filter((note) => !note.isDone).sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.createdAt - b.createdAt)
  const contentDone = activeMonthContents.filter((item) => item.status === 'Uploaded').length
  const contentSowTarget = activeBrands.reduce((sum, brand) => sum + brand.sowReels + brand.sowFeed + brand.sowStory, 0)
  const totalIncome = monthTransactions.filter((item) => item.type === 'income' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const outstandingInvoices = data.transactions.filter((item) => item.type === 'income' && item.status === 'Belum Dibayar' && item.date.slice(0, 7) <= month)
  const unpaid = outstandingInvoices.reduce((sum, item) => sum + item.amount, 0)
  const spending = monthTransactions.filter((item) => item.type === 'expense' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const financialChart = Array.from({ length: getDaysInMonth(parseISO(`${month}-01`)) }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const rows = monthTransactions.filter((item) => item.date === `${month}-${day}`)
    return { day: index + 1, Masuk: rows.filter((item) => item.type === 'income' && item.status === 'Lunas').reduce((n, x) => n + x.amount, 0), Keluar: rows.filter((item) => item.type === 'expense' && item.status === 'Lunas').reduce((n, x) => n + x.amount, 0) }
  })
  const dashboardContents = data.contents.filter((item) => activeBrandIds.has(item.brandId) && item.status !== 'Uploaded').sort((a, b) => {
    const aOverdue = a.date < today(), bOverdue = b.date < today()
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    return a.date.localeCompare(b.date)
  }).slice(0, 6)
  const dashboardVisits = data.visits.filter((visit) => activeBrandIds.has(visit.brandId) && visit.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
  const dashboardProgress = activeBrands.map((brand) => {
    const brandContents = activeMonthContents.filter((item) => item.brandId === brand.id)
    const list = progressPlatform === 'Semua platform' ? brandContents : brandContents.filter((item) => item.platforms.includes(progressPlatform))
    const done = list.filter((item) => item.status === 'Uploaded').length
    const statusCounts = contentStatuses.map((status) => ({ status, count: list.filter((item) => item.status === status).length })).filter((entry) => entry.count > 0)
    const target = progressPlatform === 'Semua platform' ? brand.sowReels + brand.sowFeed + brand.sowStory : list.length
    const platformCounts = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Lainnya'].map((platform) => ({ platform, count: list.filter((item) => item.status === 'Uploaded' && item.platforms.includes(platform)).length })).filter((item) => item.count > 0)
    return { brand, done, target, statusCounts, platformCounts, pct: target ? Math.min(100, Math.round(done / target * 100)) : 0, remaining: Math.max(0, target - done) }
  }).sort((a, b) => {
    if (progressSort === 'name') return a.brand.name.localeCompare(b.brand.name, 'id')
    if (!a.target || !b.target) return Number(!a.target) - Number(!b.target) || a.brand.name.localeCompare(b.brand.name, 'id')
    if (progressSort === 'highest') return b.pct - a.pct || a.remaining - b.remaining || a.brand.name.localeCompare(b.brand.name, 'id')
    if (progressSort === 'remaining') return b.remaining - a.remaining || a.pct - b.pct || a.brand.name.localeCompare(b.brand.name, 'id')
    return (a.target ? a.pct : 101) - (b.target ? b.pct : 101) || b.remaining - a.remaining || a.brand.name.localeCompare(b.brand.name, 'id')
  })

  const profileDropdown = <ProfileDropdown user={user}
    onEditProfile={() => { setMobileOpen(false); setThemePreview(null); setView('profile') }}
    onSignOut={async () => {
      const result = await authClient.signOut()
      if (result.error) throw new Error(result.error.message || 'Gagal keluar. Coba lagi.')
      setUser(null)
      setToast('')
    }} />

  return <WorkspaceProfileContext.Provider value={workspaceProfile}><>
    <WorkspaceTheme appearance={view === 'profile' && themePreview ? themePreview : workspaceProfile} />
    <header className="mobile-header">
      <WorkspaceBrand />
      <div className="mobile-account-actions">{profileDropdown}<button className="icon-button" aria-label="Buka menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button></div>
    </header>
    {mobileOpen && <div className="mobile-shade" onClick={() => setMobileOpen(false)} />}
    <div className="shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <WorkspaceBrand />
        <nav className="nav" aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSelectedBrand(null); setMobileOpen(false) }}><Icon size={17} /><span>{language === 'en' ? navEnglish[label] : label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="period-card"><strong>{language === 'en' ? 'Private workspace' : 'Workspace privat'}</strong><p>{language === 'en' ? 'Data is securely stored in the database. Admin access only.' : 'Data tersimpan aman di database. Akses hanya untuk admin.'}</p></div></div>
      </aside>
      <main className="main">
        <div className="topbar"><span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{workspaceProfile.name} <span style={{ color: 'var(--muted)' }}>/</span> {language === 'en' ? navEnglish[heading] ?? heading : heading}</span><div className="top-actions">{profileDropdown}</div></div>

        {view === 'profile' && <ProfilePage user={user} workspaceProfile={workspaceProfile}
          onUpdateUser={async (name, image) => {
            const result = await authClient.updateUser({ name, image })
            if (result.error) throw new Error(result.error.message || 'Profil gagal disimpan.')
          }}
          onWorkspaceProfileSaved={setWorkspaceProfile}
          onSaved={(name, image) => { setUser((current) => current ? { ...current, name, image } : current); notify('Profil berhasil diperbarui'); void router.invalidate() }}
          onBack={() => setView(workspaceView)} onThemePreview={setThemePreview} onChangePassword={() => setPasswordOpen(true)} />}

        {view === 'dashboard' && <>
          <div className="pagehead dashboard-pagehead"><div><div className="eyebrow">Ringkasan workspace</div><h1>{language === 'en' ? 'Dashboard' : 'Beranda'}</h1><p>{language === 'en' ? `Track content, visits, and cash flow for ${activeBrands.length} active brands.` : `Pantau konten, jadwal visit, dan arus kas untuk ${activeBrands.length} brand aktif.`}</p></div><div className="page-actions"><div className="month-switch"><button aria-label={language === 'en' ? 'Previous month' : 'Bulan sebelumnya'} onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><span className="badge" style={{ minWidth: 110, justifyContent: 'center' }}>{currentMonthLabel}</span><button aria-label={language === 'en' ? 'Next month' : 'Bulan berikutnya'} onClick={() => moveMonth(1)}><ChevronRight size={17} /></button></div><button className="button" onClick={() => addRecord('content')}><Plus size={15} /> {language === 'en' ? 'New content' : 'Konten Baru'}</button><button className="button primary" onClick={() => addRecord('brand')}><Plus size={15} /> {language === 'en' ? 'New brand' : 'Brand Baru'}</button></div></div>
          <div className="grid kpis dashboard-kpis">
            <KPI label={`${language === 'en' ? 'Published content' : 'Konten tayang'} · ${idMonth(month, true)}`} value={contentSowTarget ? `${contentDone} / ${contentSowTarget}` : `${contentDone} ${language === 'en' ? 'published' : 'tayang'}`} foot={contentSowTarget ? (language === 'en' ? `SOW target across brands · ${monthContents.length} planned` : `Target SOW seluruh brand · ${monthContents.length} konten terencana`) : (language === 'en' ? 'SOW target not set' : 'Target SOW belum diatur')} icon={<ClipboardList size={16} />} />
            <KPI label={language === 'en' ? 'Income received' : 'Pendapatan diterima'} value={money(totalIncome)} foot={`${monthTransactions.filter((x) => x.type === 'income' && x.status === 'Lunas').length} ${language === 'en' ? 'invoices paid' : 'invoice lunas'}`} icon={<TrendingUp size={16} />} color="mint" />
            <KPI label={language === 'en' ? 'Unpaid receivables' : 'Piutang belum dibayar'} value={money(unpaid)} foot={`${outstandingInvoices.length} ${language === 'en' ? 'invoices carried through' : 'invoice terbawa hingga'} ${idMonth(month, true)}`} icon={<ArrowDownLeft size={16} />} color="blue" />
            <KPI label={language === 'en' ? 'Expenses' : 'Pengeluaran'} value={money(spending)} foot={`${language === 'en' ? 'Net profit' : 'Laba bersih'} ${money(totalIncome - spending)}`} icon={<Banknote size={16} />} color="warm" />
          </div>
          <div className="grid dashboard-analytics-stack">
            <section className="card dashboard-cashflow-card"><div className="card-head"><div><h2>{language === 'en' ? 'Daily cash flow' : 'Arus kas harian'}</h2><p>{currentMonthLabel}</p></div><span className="badge green"><i className="status-dot" /> {language === 'en' ? 'Data saved' : 'Data tersimpan'}</span></div>
              {monthTransactions.length ? <div className="chart-wrap"><Suspense fallback={<div className="chart-empty">Memuat grafik…</div>}><CashflowChart data={financialChart} /></Suspense></div> : <div className="chart-empty cashflow-empty"><span>Belum ada transaksi pada bulan ini.</span><button className="button" onClick={() => addRecord('transaction')}><Plus size={14} /> Catat transaksi</button></div>}
            </section>
            <section className="card"><div className="card-head dashboard-progress-head"><div><h2>Progres konten per brand</h2><p>{currentMonthLabel} · {progressPlatform === 'Semua platform' ? 'konten tayang dibanding target SOW' : `progres konten ${progressPlatform} berdasarkan rencana bulan ini`}</p></div><div className="dashboard-progress-controls"><label className="sr-only" htmlFor="progress-platform">Filter platform</label><select id="progress-platform" className="select" value={progressPlatform} onChange={(event) => setProgressPlatform(event.target.value)}><option>Semua platform</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select><label className="sr-only" htmlFor="progress-sort">Urutkan brand</label><select id="progress-sort" className="select" value={progressSort} onChange={(event) => setProgressSort(event.target.value as typeof progressSort)}><option value="attention">Paling perlu perhatian</option><option value="highest">Progress tertinggi</option><option value="remaining">Sisa target terbanyak</option><option value="name">Nama A–Z</option></select><button className="icon-button" onClick={() => setView('brands')} aria-label="Buka brand"><ArrowRight size={16} /></button></div></div><div className="bar-list">{dashboardProgress.length ? dashboardProgress.slice(0, 7).map(({ brand, done, target, statusCounts, platformCounts, pct }) => <div className="dashboard-progress-row" key={brand.id}><div className="bar-row"><span className="brand-progress-label"><span className="table-title">{brand.name}</span><span className="brand-status-counts">{statusCounts.map(({ status, count }) => <span key={status} className={`badge ${stageClass[status] ?? ''}`}>{status} {count}</span>)}</span>{progressPlatform === 'Semua platform' && platformCounts.length > 0 && <span className="brand-platform-progress">{platformCounts.map(({ platform, count }) => <span key={platform}>{platform} {count}</span>)}</span>}</span><div className="bar-track" role="progressbar" aria-label={`Progres SOW ${brand.name}`} aria-valuemin={0} aria-valuemax={target || 100} aria-valuenow={target ? Math.min(done, target) : 0}><div className={`bar-fill ${pct >= 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }} /></div><span className="bar-value">{target ? <><strong>{done}/{target}</strong><small>{pct}%</small></> : <small>{progressPlatform === 'Semua platform' ? `${done} tayang · target belum diatur` : `0 konten · belum ada rencana ${progressPlatform}`}</small>}</span></div></div>) : <div className="empty">Belum ada brand aktif. Aktifkan brand dari menu Brand & SOW.</div>}</div><p className="dashboard-progress-note">{progressPlatform === 'Semua platform' ? <>Setiap angka menunjukkan jumlah konten per status bulan ini; Uploaded berarti berhasil tayang dan dihitung ke target SOW.</> : <>Filter platform menghitung konten yang ditandai untuk {progressPlatform}; angka target adalah jumlah rencana konten platform tersebut pada bulan ini.</>}</p><div className="dashboard-status-legend" aria-label="Keterangan warna status konten">{contentStatuses.map((status) => <span key={status} className="dashboard-status-legend-item"><i className={`legend-dot ${stageClass[status] ?? 'ideation'}`} /><span><strong>{status}</strong> · {contentStatusDescriptions[status]}</span></span>)}</div></section>
          </div>
          <div className="grid split">
            <section className="card"><div className="card-head"><div><h2>Jadwal konten berikutnya</h2><p>Konten belum tayang dari semua brand aktif; jadwal terlewat ditampilkan lebih dulu.</p></div><button className="button ghost" onClick={() => setView('calendar')}>Kalender <ArrowRight size={14} /></button></div>{dashboardContents.length ? dashboardContents.map((item) => <ContentRow key={item.id} item={item} brand={data.brands.find((x) => x.id === item.brandId)} overdue={item.date < today()} onClick={() => addRecord('content', item as unknown as Record<string, unknown>)} onDelete={() => remove('content', item.id, item.title)} />) : <EmptyAction text="Tidak ada konten yang menunggu tayang dari brand aktif." button="Rencanakan konten" onClick={() => addRecord('content')} />}</section>
            <section className="card"><div className="card-head"><div><h2>Visit berikutnya</h2><p>Semua kunjungan mendatang untuk brand aktif</p></div><button className="button ghost" onClick={() => addRecord('visit')}><Plus size={14} /> Visit</button></div>{dashboardVisits.map((visit) => <VisitRow key={visit.id} item={visit} brand={data.brands.find((x) => x.id === visit.brandId)} onClick={() => addRecord('visit', visit as unknown as Record<string, unknown>)} onDelete={() => remove('visit', visit.id, `visit ${visit.date}`)} />)}{!dashboardVisits.length && <EmptyAction text="Belum ada visit mendatang untuk brand aktif." button="Jadwalkan visit" onClick={() => addRecord('visit')} />}</section>
          </div>
          <section className="card dashboard-reminders"><div className="card-head"><div><div className="eyebrow">Follow-up klien</div><h2>Catatan & pengingat brand</h2><p>{openBrandNotes.length} catatan belum selesai · add-on, event, permintaan, dan tindak lanjut</p></div><button className="button" onClick={() => addRecord('brandNote')}><Plus size={14} /> Tambah catatan</button></div>{openBrandNotes.length ? <div className="dashboard-reminder-list">{openBrandNotes.slice(0, 6).map((note) => { const brand = data.brands.find((item) => item.id === note.brandId); const overdue = Boolean(note.dueDate && note.dueDate < today()); return <div className="dashboard-reminder-row" key={note.id}><button className="dashboard-reminder-main" onClick={() => { setSelectedBrand(note.brandId); setBrandTab('notes'); setView('brands') }}><span className={`reminder-dot ${overdue ? 'overdue' : ''}`} /><span className="dashboard-reminder-copy"><strong>{note.title}</strong><small>{brand ? brand.name : 'Brand'} · {note.category}{brand && !brand.isActive ? ' · Nonaktif' : ''}</small></span><span className={`badge ${overdue ? 'red' : note.dueDate === today() ? 'orange' : 'neutral'}`}>{reminderDateLabel(note.dueDate)}</span></button><button className="icon-button reminder-done" aria-label="Tandai pengingat selesai" title="Tandai selesai" onClick={() => void toggleBrandNoteDone(note)}><Check size={15} /></button></div> })}</div> : <div className="empty">Belum ada catatan aktif. Catat permintaan penting agar muncul di sini.</div>}</section>
          {!data.brands.length && <section className="card" style={{ marginTop: 14, background: 'var(--accent-soft)' }}><div className="card-head" style={{ alignItems: 'center', marginBottom: 0 }}><div><h2>Mulai dari data contoh prototype</h2><p>Muat 6 brand, 15 konten, 5 visit, 3 prospek, dan 11 transaksi dari prototype. Data contoh hanya bisa dimuat ke workspace kosong.</p></div><button className="button primary" onClick={async () => { try { await seedDemoData(); await reload(); notify('Data contoh berhasil dimuat') } catch (error) { notify((error as Error).message) } }}>Muat data contoh</button></div></section>}
        </>}

        {view === 'calendar' && <CalendarView month={month} moveMonth={moveMonth} onToday={() => setMonth(monthNow())} contents={data.contents} visits={monthVisits} brands={data.brands} onMoveContent={moveContentDate} onAddContent={(date) => addRecord('content', date ? { date } : undefined)} onAddVisit={(date) => addRecord('visit', date ? { date } : undefined)} onEditContent={(item) => addRecord('content', item as unknown as Record<string, unknown>)} onEditVisit={(item) => addRecord('visit', item as unknown as Record<string, unknown>)} />}
        {view === 'planner' && <ContentPlannerMenu brands={data.brands} contents={data.contents} profiles={data.socialProfiles} onEditContent={(item) => addRecord('content', item as unknown as Record<string, unknown>)} onAddContent={(date, brandId) => addRecord('content', { ...(date ? { date } : {}), ...(brandId ? { brandId } : {}) })} onSaveContent={savePlannerContent} onSaveOrder={saveFeedOrder} onAnalyzeCover={async (contentId) => (await analyzeInstagramCover({ data: { contentId } })).review} onSaveProfile={saveSocialProfile} />}

        {view === 'brands' && (currentBrand ? <BrandDetail brand={currentBrand} tab={brandTab} setTab={setBrandTab} month={month} moveMonth={moveMonth} data={data} onBack={() => setSelectedBrand(null)} onToggleActive={() => toggleBrandActive(currentBrand)} onEdit={() => addRecord('brand', currentBrand as unknown as Record<string, unknown>)} onSaveBrand={(values) => save('brand', currentBrand.id, values)} onAddContent={(date) => addRecord('content', { brandId: currentBrand.id, ...(date ? { date } : {}) })} onEditContent={(item) => addRecord('content', item as unknown as Record<string, unknown>)} onEditPerformance={(item) => addRecord('content', item as unknown as Record<string, unknown>, true)} onDeleteContent={(item) => remove('content', item.id, item.title)} onAddNote={() => addRecord('brandNote', { brandId: currentBrand.id })} onEditNote={(item) => addRecord('brandNote', item as unknown as Record<string, unknown>)} onDeleteNote={(item) => remove('brandNote', item.id, item.title)} onToggleNoteDone={toggleBrandNoteDone} onDeleteReport={async (id) => { await remove('socialReport', id, `laporan ${brandNameForDelete(currentBrand, month)}`) }} onReload={reload} onSaveContent={savePlannerContent} onSaveFeedOrder={saveFeedOrder} onAnalyzeCover={async (contentId) => (await analyzeInstagramCover({ data: { contentId } })).review} onSaveProfile={saveSocialProfile} /> : <BrandList brands={data.brands} data={data} month={month} search={search} setSearch={setSearch} onOpen={(brand) => { setSelectedBrand(brand.id); setBrandTab('overview') }} onAdd={() => addRecord('brand')} onEdit={(brand) => addRecord('brand', brand as unknown as Record<string, unknown>)} onDelete={(brand) => remove('brand', brand.id, brand.name)} onToggleActive={toggleBrandActive} />)}

        {view === 'pipeline' && <PipelineView prospects={data.prospects} onAdd={() => addRecord('prospect')} onEdit={(item) => addRecord('prospect', item as unknown as Record<string, unknown>)} onDelete={(item) => remove('prospect', item.id, item.brandName)} onConvert={(item) => { setPendingProspectId(item.id); setView('brands'); addRecord('brand', { name: item.brandName, industry: '', owner: item.picName, phone: item.contact, handle: '', retainer: item.estimatedValue, color: colors[data.brands.length % colors.length], address: '', notes: item.notes, sowReels: 0, sowFeed: 0, sowStory: 0, sowVisit: 0 }) }} />}

        {view === 'finance' && <FinanceView transactions={data.transactions} inventory={data.inventory} brands={data.brands} month={month} moveMonth={moveMonth} onAdd={() => addRecord('transaction')} onEdit={(item) => addRecord('transaction', item as unknown as Record<string, unknown>)} onDelete={(item) => remove('transaction', item.id, item.title)} />}
        {view === 'inventory' && <InventoryView items={data.inventory} onReload={reload} onDelete={(item) => remove('inventory', item.id, item.name)} />}
        <footer className="workspace-footer"><span>{workspaceProfile.name}</span><small>{workspaceProfile.tagline}</small></footer>
      </main>
    </div>
    <RecordDialog key={modal ? `${modal.kind}-${String(modal.item?.id ?? 'new')}-${modal.performanceOnly ? 'performance' : 'full'}` : 'closed'} modal={modal} data={data} onClose={() => { setModal(null); setPendingProspectId(null) }} onSave={save} onDelete={remove} />
    <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onSuccess={() => { setPasswordOpen(false); notify('Password berhasil diganti') }} />
    {toast && <div className="toast" role="status">{toast}</div>}
  </></WorkspaceProfileContext.Provider>
}

function KPI({ label, value, foot, icon, color = 'orange' }: { label: string; value: string; foot: string; icon: ReactNode; color?: string }) {
  const language = useAppLanguage()
  return <section className="card kpi"><div className="kpi-label">{uiText(language, label)}<span className={`kpi-icon ${color}`}>{icon}</span></div><div className="kpi-value">{value.startsWith('Rp ') ? <><span className="kpi-currency">Rp</span><span>{value.slice(3)}</span></> : value}</div><div className="kpi-foot">{uiText(language, foot)}</div></section>
}

function EmptyAction({ text, button, onClick }: { text: string; button: string; onClick: () => void }) { const language = useAppLanguage(); return <div className="empty">{uiText(language, text)}<br /><button className="button" style={{ marginTop: 11 }} onClick={onClick}><Plus size={14} />{uiText(language, button)}</button></div> }
function ContentRow({ item, brand, onClick, onDelete, overdue = false }: { item: Content; brand?: Brand; onClick?: () => void; onDelete?: () => void; overdue?: boolean }) {
  const language = useAppLanguage()
  return <div className="content-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}><div className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM yy', { locale: language === 'id' ? id : undefined })}</small></div><div><div className="title">{item.title}</div><p>{brand ? brand.name : 'Brand'} · {item.format} · {item.platforms.join(', ') || uiText(language, 'Platform belum dipilih')}</p></div><div className="actions" onClick={(event) => event.stopPropagation()}>{overdue && <span className="badge red">{uiText(language, 'Lewat jadwal')}</span>}<span className={`badge ${stageClass[item.status] ?? ''}`}>{uiText(language, item.status)}</span><button className="icon-button" aria-label={language === 'en' ? 'Delete content' : 'Hapus konten'} title={uiText(language, 'Hapus konten')} onClick={onDelete}><Trash2 size={13} /></button></div></div>
}
function VisitRow({ item, brand, onClick, onDelete }: { item: Visit; brand?: Brand; onClick?: () => void; onDelete?: () => void }) {
  return <div className="content-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}><div className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></div><div><div className="title">{brand ? brand.name : 'Brand'} · {item.time}</div><p>{item.location || item.notes}</p></div><div className="actions" onClick={(event) => event.stopPropagation()}><WhatsAppButton phone={brand?.phone ?? ''} compact /><CalendarDays size={16} color="var(--accent)" /><button className="icon-button" aria-label="Hapus visit" title="Hapus visit" onClick={onDelete}><Trash2 size={13} /></button></div></div>
}

function BrandList({ brands, data, month, search, setSearch, onOpen, onAdd, onEdit, onDelete, onToggleActive }: { brands: Brand[]; data: Data; month: string; search: string; setSearch: (value: string) => void; onOpen: (item: Brand) => void; onAdd: () => void; onEdit: (item: Brand) => void; onDelete: (item: Brand) => void; onToggleActive: (item: Brand) => Promise<void> }) {
  const language = useAppLanguage()
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [sort, setSort] = useState<'attention' | 'name' | 'retainer'>('attention')
  const [pendingBrandId, setPendingBrandId] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase('id')
  const visibleBrands = brands.filter((item) => (statusFilter === 'all' || item.isActive === (statusFilter === 'active')) && (!normalizedSearch || Object.values(item).some((value) => String(value ?? '').toLocaleLowerCase('id').includes(normalizedSearch)))).map((brand) => {
    const rows = data.contents.filter((item) => item.brandId === brand.id && item.date.startsWith(month))
    const done = rows.filter((item) => item.status === 'Uploaded').length
    const target = brand.sowReels + brand.sowFeed + brand.sowStory
    const pct = target ? Math.min(100, done / target * 100) : 0
    const platformCounts = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Lainnya'].map((platform) => ({ platform, count: rows.filter((item) => item.status === 'Uploaded' && item.platforms.includes(platform)).length })).filter((item) => item.count > 0)
    return { brand, done, target, pct, platformCounts }
  }).sort((a, b) => {
    if (sort === 'name') return a.brand.name.localeCompare(b.brand.name, 'id')
    if (sort === 'retainer') return b.brand.retainer - a.brand.retainer || a.brand.name.localeCompare(b.brand.name, 'id')
    return Number(b.brand.isActive) - Number(a.brand.isActive) || (a.target ? a.pct : 101) - (b.target ? b.pct : 101) || b.target - a.target || a.brand.name.localeCompare(b.brand.name, 'id')
  })
  const changeStatus = async (brand: Brand) => {
    setPendingBrandId(brand.id)
    try { await onToggleActive(brand) } finally { setPendingBrandId(null) }
  }
  const activeCount = brands.filter((brand) => brand.isActive).length
  const inactiveCount = brands.length - activeCount
  return <><div className="pagehead"><div><div className="eyebrow">Client workspace</div><h1>{language === 'en' ? 'Brands & SOW' : 'Brand & SOW'}</h1><p>{language === 'en' ? 'Manage active clients and keep past relationships for future opportunities.' : 'Kelola klien aktif dan simpan relasi lama untuk peluang pitching ulang.'}</p></div><button className="button primary" onClick={onAdd}><Plus size={15} /> Brand Baru</button></div>
    <section className="card brand-toolbar"><div className="brand-toolbar-search"><label className="brand-search-field"><Search size={15} /><input className="input" placeholder="Cari nama, kategori, kontak, tanggal, nominal, atau catatan…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button className="icon-button brand-search-clear" type="button" aria-label="Hapus pencarian brand" onClick={() => setSearch('')}><X size={14} /></button>}</label><span className="badge">{visibleBrands.length} hasil</span><span className="badge green">{activeCount} aktif</span><span className="badge neutral">{inactiveCount} nonaktif</span></div><div className="brand-toolbar-filters"><label><span>Status</span><select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="active">Brand aktif ({activeCount})</option><option value="inactive">Nonaktif ({inactiveCount})</option><option value="all">Semua brand ({brands.length})</option></select></label><label><span>Urutkan</span><select className="select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="attention">Perlu perhatian</option><option value="name">Nama A–Z</option><option value="retainer">Retainer tertinggi</option></select></label></div></section>

    {visibleBrands.length ? <div className="grid brand-grid">{visibleBrands.map(({ brand, done, target, pct, platformCounts }) => { const shownName = brand.name; return <article className={`card brand-card ${brand.isActive ? '' : 'inactive'}`} key={brand.id} onClick={() => onOpen(brand)}><div className="brand-card-top"><div className={`brand-dot ${data.socialProfiles.find((profile) => profile.brandId === brand.id)?.profilePictureUrl ? 'brand-list-logo' : ''}`} style={{ background: brand.color, color: readableBrandText(brand.color) }}>{data.socialProfiles.find((profile) => profile.brandId === brand.id)?.profilePictureUrl ? <img src={data.socialProfiles.find((profile) => profile.brandId === brand.id)?.profilePictureUrl} alt={`Logo ${shownName}`} /> : shownName.slice(0, 1).toUpperCase()}</div><div className="brand-card-identity"><h2 className="brand-card-name">{shownName}</h2><div className="brand-card-statusrow"><span className={`badge ${brand.isActive ? 'green' : 'neutral'}`}>{brand.isActive ? 'Aktif' : 'Nonaktif'}</span><div className="muted">{brand.industry || 'Industri belum ditentukan'}</div></div></div><div className="actions brand-card-actions" onClick={(event) => event.stopPropagation()}><button className={`icon-button brand-power ${brand.isActive ? 'on' : 'off'}`} disabled={pendingBrandId === brand.id} aria-label={brand.isActive ? `Nonaktifkan ${shownName}` : `Aktifkan ${shownName}`} title={brand.isActive ? 'Nonaktifkan brand' : 'Aktifkan kembali'} onClick={() => void changeStatus(brand)}><Power size={14} /></button><button className="icon-button" aria-label={`Edit ${shownName}`} title="Edit" onClick={() => onEdit(brand)}><Pencil size={14} /></button><button className="icon-button" aria-label={`Hapus ${shownName}`} title="Hapus permanen" onClick={() => onDelete(brand)}><Trash2 size={14} /></button></div></div><div className="brand-meta"><span className="brand-card-contact">{brand.handle || brand.owner || 'Kontak belum diisi'}<WhatsAppButton phone={brand.phone} compact /></span><strong>{money(brand.retainer)}<span className="muted"> / bln</span></strong></div><div className="brand-progress"><i className={pct >= 100 ? 'complete' : ''} style={{ width: `${pct}%`, background: pct >= 100 ? undefined : brand.color }} /></div><div className="brand-meta brand-progress-meta"><span>{target ? <><strong>{done}/{target} tayang</strong><small>Target SOW · {idMonth(month)}</small></> : <><strong>{done} tayang</strong><small>Target SOW belum diatur</small></>}</span><span className="brand-open-label">Buka workspace <ArrowRight size={12} /></span></div>{platformCounts.length > 0 && <div className="brand-platform-progress">{platformCounts.map(({ platform, count }) => <span key={platform}>{platform} {count}</span>)}</div>}</article> })}</div> : <section className="card"><div className="brand-empty"><strong>{brands.length ? 'Tidak ada brand untuk filter ini.' : 'Belum ada brand di workspace.'}</strong><p>{brands.length ? 'Coba ubah status, urutan, atau kata pencarian.' : 'Tambahkan brand untuk mulai mengelola SOW dan konten.'}</p>{!brands.length && <button className="button primary" onClick={onAdd}><Plus size={14} /> Buat brand</button>}</div></section>}
  </>
}

function BrandDetail({ brand, tab, setTab, month, moveMonth, data, onBack, onToggleActive, onEdit, onSaveBrand, onAddContent, onEditContent, onEditPerformance, onDeleteContent, onAddNote, onEditNote, onDeleteNote, onToggleNoteDone, onDeleteReport, onReload, onSaveContent, onSaveFeedOrder, onAnalyzeCover, onSaveProfile }: { brand: Brand; tab: string; setTab: (value: string) => void; month: string; moveMonth: (delta: number) => void; data: Data; onBack: () => void; onToggleActive: () => Promise<void>; onEdit: () => void; onSaveBrand: (values: Record<string, unknown>) => Promise<void>; onAddContent: (date?: string, brandId?: string) => void; onEditContent: (item: Content) => void; onEditPerformance: (item: Content) => void; onDeleteContent: (item: Content) => void; onAddNote: () => void; onEditNote: (item: BrandNote) => void; onDeleteNote: (item: BrandNote) => void; onToggleNoteDone: (item: BrandNote) => Promise<void>; onDeleteReport: (id: string) => Promise<void>; onReload: () => Promise<void>; onSaveContent: (item: Content, patch: Partial<Content>, coverFile?: File) => Promise<void>; onSaveFeedOrder: (brandId: string, contentIds: string[], dateAssignments: { contentId: string; date: string }[]) => Promise<void>; onAnalyzeCover: (contentId: string) => Promise<string>; onSaveProfile: (values: { brandId: string; profilePictureUrl: string; username: string; displayName: string; bio: string; highlights: { id: string; title: string; coverUrl: string; sortOrder: number }[]; pinnedContentIds: string[] }) => Promise<void> }) {
  const language = useAppLanguage()
  const [contentHubView, setContentHubView] = useState<'list' | 'feed' | 'profile'>('list')
  const [sowPlatform, setSowPlatform] = useState('Semua platform')
  useEffect(() => setSowPlatform('Semua platform'), [brand.id])
  const shownName = brand.name
  const socialProfile = data.socialProfiles.find((profile) => profile.brandId === brand.id)
  const content = data.contents.filter((item) => item.brandId === brand.id && item.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))
  const reportPlatformOptions = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Threads', 'Lainnya']
  const contentPlatforms = [...new Set(content.flatMap((item) => item.platforms))].filter((platform) => reportPlatformOptions.includes(platform))
  const linkedPlatforms = Object.keys(brand.platformLinks ?? {}).map((name) => reportPlatformOptions.find((platform) => platform.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'))).filter((platform): platform is string => Boolean(platform))
  const handledPlatforms = [...new Set([...(brand.handledPlatforms ?? []), ...linkedPlatforms, ...contentPlatforms])]
  const done = content.filter((item) => item.status === 'Uploaded').length
  return <><div className="pagehead"><div><button className="button ghost" onClick={onBack} style={{ paddingLeft: 0, marginBottom: 12 }}><ChevronLeft size={15} /> {language === 'en' ? 'All brands' : 'Semua brand'}</button><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>{socialProfile?.profilePictureUrl ? <div className="brand-dot brand-profile-logo"><img src={socialProfile.profilePictureUrl} alt={`Logo profil ${shownName}`} /></div> : <div className="brand-dot" style={{ background: brand.color, color: readableBrandText(brand.color) }}>{shownName.slice(0, 1)}</div>}<div className="brand-heading-copy"><div className="brand-detail-title"><h1>{shownName}</h1><span className={`badge ${brand.isActive ? 'green' : 'neutral'}`}>{brand.isActive ? (language === 'en' ? 'Active' : 'Aktif') : (language === 'en' ? 'Inactive' : 'Nonaktif')}</span></div></div></div></div><div className="page-actions"><><button className={`button ${brand.isActive ? '' : 'primary'}`} onClick={() => void onToggleActive()}><Power size={14} /> {brand.isActive ? (language === 'en' ? 'Deactivate' : 'Nonaktifkan') : (language === 'en' ? 'Reactivate' : 'Aktifkan kembali')}</button><button className="button" onClick={onEdit}><Pencil size={14} /> {language === 'en' ? 'Edit profile' : 'Edit profil'}</button></></div></div>
    <div className="tabs">{[['overview', 'Profil & SOW'], ['content', 'Content Hub'], ['assets', 'Links & Assets'], ['notes', 'Catatan'], ['documents', 'Dokumen'], ['report', 'Analisa & Laporan']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{uiText(language, label)}{id === 'notes' && data.brandNotes.some((note) => note.brandId === brand.id && !note.isDone) ? <span className="tab-count">{data.brandNotes.filter((note) => note.brandId === brand.id && !note.isDone).length}</span> : null}</button>)}</div>
    {(tab === 'assets') && <BrandAssets key={brand.id} brand={brand} onSaveBrand={onSaveBrand} />}
    {tab === 'notes' && <BrandNotesPanel brand={brand} notes={data.brandNotes.filter((note) => note.brandId === brand.id)} onAdd={onAddNote} onEdit={onEditNote} onDelete={(note) => onDeleteNote(note)} onToggleDone={onToggleNoteDone} />}
    {(tab === 'documents') && <ClientDocumentsPanel key={brand.id} brand={brand} />}
    {tab === 'overview' && <div className="grid split"><section className="card"><div className="card-head"><div><h2>{uiText(language, 'Informasi klien')}</h2><p>{uiText(language, 'Kontak, retainer, dan panduan brand')}</p></div></div><div className="grid client-info-grid"><Info label="PIC" value={brand.owner} /><ContactInfo phone={brand.phone} /><Info label="Akun sosial" value={brand.handle} /><Info label="Alamat" value={brand.address} /><Info label="Retainer bulanan" value={money(brand.retainer)} /><Info label="Industri" value={brand.industry} /><Info label="Panduan brand" value={brand.notes} wide /></div></section><section className="card"><div className="card-head"><div><h2>{language === 'en' ? 'SOW obligations' : 'Kewajiban SOW'} · {monthText(month, language)}</h2><p>{sowPlatform === 'Semua platform' ? uiText(language, 'Target deliverable bulanan seluruh brand') : language === 'en' ? `${sowPlatform} content performance this month` : `Performa konten ${sowPlatform} bulan ini`}</p></div><MonthControl month={month} moveMonth={moveMonth} /></div><div className="content-planner-tabs brand-sow-platform-tabs" role="tablist" aria-label="Filter platform SOW"><button type="button" role="tab" aria-selected={sowPlatform === 'Semua platform'} className={sowPlatform === 'Semua platform' ? 'active' : ''} onClick={() => setSowPlatform('Semua platform')}>{uiText(language, 'Semua platform')}</button>{handledPlatforms.map((platform) => <button type="button" role="tab" aria-selected={sowPlatform === platform} className={sowPlatform === platform ? 'active' : ''} key={platform} onClick={() => setSowPlatform(platform)}>{platform}</button>)}</div>{sowPlatform === 'Semua platform' ? [['Reels', brand.sowReels], ['Feed', brand.sowFeed], ['Story', brand.sowStory], ['Visit', brand.sowVisit]].map(([label, target]) => { const actual = label === 'Visit' ? data.visits.filter((item) => item.brandId === brand.id && item.date.startsWith(month)).length : content.filter((item) => { const formatValue = item.format.trim().toLowerCase(); const isFeed = label === 'Feed' ? ['feed', 'carousel', 'single post'].includes(formatValue) : formatValue === String(label).toLowerCase(); return isFeed && item.status === 'Uploaded' }).length; return <div key={String(label)} style={{ marginBottom: 18 }}><div className="bar-row" style={{ gridTemplateColumns: '1fr auto auto' }}><strong>{label}</strong><span className="muted">{actual} / {target}</span><span className="badge">{target ? Math.min(100, Math.round(actual / Number(target) * 100)) : 0}%</span></div><div className="brand-progress"><i style={{ width: `${target ? Math.min(100, actual / Number(target) * 100) : 0}%` }} /></div></div> }) : (['Reels', 'Feed', 'Story'] as const).map((label) => { const rows = content.filter((item) => item.platforms.includes(sowPlatform) && (label === 'Feed' ? ['feed', 'carousel', 'single post'].includes(item.format.trim().toLowerCase()) : item.format.trim().toLowerCase() === label.toLowerCase())); const planned = rows.length; const uploaded = rows.filter((item) => item.status === 'Uploaded').length; const percent = planned ? Math.round(uploaded / planned * 100) : 0; return <div key={label} style={{ marginBottom: 18 }}><div className="bar-row" style={{ gridTemplateColumns: '1fr auto auto' }}><strong>{label}</strong><span className="muted">{uploaded} / {planned} konten tayang</span><span className="badge">{percent}%</span></div><div className="brand-progress"><i style={{ width: `${percent}%` }} /></div></div> })}{sowPlatform !== 'Semua platform' && <p className="field-hint" style={{ marginBottom: 0 }}>Per platform dihitung dari konten Content Hub yang direncanakan dan berstatus Uploaded. Target kontrak tetap ditampilkan di tab Semua platform.</p>}</section></div>}
    {tab === 'content' && <><div className="content-planner-tabs brand-content-tabs" role="tablist" aria-label="Content Hub"><button role="tab" aria-selected={contentHubView === 'list'} className={contentHubView === 'list' ? 'active' : ''} onClick={() => setContentHubView('list')}>Daftar Konten</button><button role="tab" aria-selected={contentHubView === 'feed'} className={contentHubView === 'feed' ? 'active' : ''} onClick={() => setContentHubView('feed')}>Feed Planner</button><button role="tab" aria-selected={contentHubView === 'profile'} className={contentHubView === 'profile' ? 'active' : ''} onClick={() => setContentHubView('profile')}>Profile Planner</button></div>{contentHubView === 'feed' ? <InstagramFeedPlanner brands={[brand]} contents={data.contents} brandId={brand.id} onBrandChange={() => {}} onEditContent={onEditContent} onAddContent={(date) => onAddContent(date, brand.id)} onAnalyzeCover={onAnalyzeCover} onSaveContent={onSaveContent} onSaveOrder={onSaveFeedOrder} /> : contentHubView === 'profile' ? <InstagramProfilePlanner key={brand.id} brands={[brand]} contents={data.contents} profiles={data.socialProfiles} brandId={brand.id} onBrandChange={() => {}} onSave={onSaveProfile} /> : <section className="card"><div className="card-head"><div><h2>Content plan</h2><p>{content.length} konten · {done} sudah tayang</p></div><div className="page-actions"><MonthControl month={month} moveMonth={moveMonth} /><ContentPlanShareButton brandId={brand.id} brandName={brand.name} month={month} hasContent={content.length > 0} /><button className="button primary" disabled={!brand.isActive} title={!brand.isActive ? 'Aktifkan brand untuk menambah konten baru' : undefined} onClick={() => onAddContent()}><Plus size={14} /> {brand.isActive ? 'Tambah konten' : 'Brand nonaktif'}</button></div></div>{!brand.isActive && <p className="field-hint">Brand ini diarsipkan untuk pitching ulang. Konten dan laporan lama tetap tersimpan; aktifkan kembali brand jika ingin membuat rencana baru.</p>}{content.length ? content.map((item) => <div className="content-card" key={item.id}><div className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></div><div><div className="title">{item.title}</div><p>{item.format} · {item.platforms.join(', ')} · {item.views.toLocaleString('id-ID')} views</p></div><div className="actions"><select className={`select content-status-select ${stageClass[item.status] ?? ''}`} aria-label={`Status konten ${item.title}`} value={item.status} onChange={(event) => { const status = event.target.value; void onSaveContent(item, { status }).catch((error) => window.alert(error instanceof Error ? error.message : 'Status konten gagal diperbarui.')) }}><option value="Ideation">Ideation</option><option value="Scheduling">Scheduling</option><option value="Brief Ready">Brief Ready</option><option value="Editing">Editing</option><option value="Approval">Approval</option><option value="Uploaded">Uploaded</option></select>{item.status === 'Uploaded' && <button className="icon-button" aria-label={`Statistik ${item.title}`} title="Lihat views, likes, dan statistik lainnya" onClick={() => onEditPerformance(item)}><TrendingUp size={15} /></button>}<button className="icon-button" aria-label={`Edit ${item.title}`} onClick={() => onEditContent(item)}><Pencil size={14} /></button><button className="icon-button" aria-label={`Hapus ${item.title}`} onClick={() => onDeleteContent(item)}><Trash2 size={14} /></button></div></div>) : brand.isActive ? <EmptyAction text="Belum ada konten untuk bulan ini." button="Tambah konten" onClick={() => onAddContent()} /> : <div className="empty">Data lama tetap tersedia di bulan yang pernah ditangani.</div>}</section>}</>}
    {(tab === 'report') && <><div className="page-actions no-print" style={{ justifyContent: 'flex-end', marginBottom: 12 }}><MonthControl month={month} moveMonth={moveMonth} /></div><MonthlyReport key={`${brand.id}-${month}`} brandId={brand.id} brandName={brand.name} month={month} reports={data.reports} contentRows={content} handledPlatforms={handledPlatforms} onSaved={onReload} onDeleteReport={(id) => onDeleteReport(id)} /></>}
  </>
}

type BrandLink = { id: string; group: 'social' | 'canva' | 'other'; title: string; url: string }
function safeExternalLink(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : '' } catch { return '' }
}
function linksForBrand(brand: Brand): BrandLink[] {
  if (brand.customLinks !== null && brand.customLinks !== undefined) return brand.customLinks
  const rows: BrandLink[] = []
  Object.entries(brand.platformLinks ?? {}).forEach(([title, url], index) => rows.push({ id: `social-${index}-${title}`, group: 'social', title, url }))
  ;[
    ['Design Feed', brand.canvaFeedUrl], ['Design Cover', brand.canvaCoverUrl], ['Design Story', brand.canvaStoryUrl],
  ].forEach(([title, url], index) => { if (url) rows.push({ id: `canva-${index}-${title}`, group: 'canva', title: String(title), url: String(url) }) })
  return rows
}
function BrandAssets({ brand, onSaveBrand }: { brand: Brand; onSaveBrand: (values: Record<string, unknown>) => Promise<void> }) {
  const [links, setLinks] = useState<BrandLink[]>([])
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [savedLinks, setSavedLinks] = useState<BrandLink[]>(() => linksForBrand(brand))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [decks, setDecks] = useState<{ id: string; filename: string; sizeBytes: number; uploadedAt: number }[]>([])
  useEffect(() => { setLinks([]); setEditingLinkId(null); setSavedLinks(linksForBrand(brand)); setError('') }, [brand.id])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/brand-decks?brandId=${encodeURIComponent(brand.id)}&info=1`).then(async (response) => {
      if (!response.ok) return null
      return response.json() as Promise<{ decks: { id: string; filename: string; sizeBytes: number; uploadedAt: number }[] }>
    }).then((value) => { if (!cancelled) setDecks(value?.decks ?? []) }).catch(() => { if (!cancelled) setDecks([]) })
    return () => { cancelled = true }
  }, [brand.id])

  const updateLink = (id: string, key: keyof BrandLink, value: string) => setLinks((current) => current.map((link) => link.id === id ? { ...link, [key]: value } : link))
  const persistLinks = async (collection: BrandLink[]) => {
    const platformLinks = Object.fromEntries(collection.filter((link) => link.group === 'social' && link.url).slice(0, 10).map((link) => [link.title.slice(0, 30), link.url]))
    const canvaUrl = (title: string) => collection.find((link) => link.group === 'canva' && link.title.toLowerCase() === title.toLowerCase())?.url ?? ''
    await onSaveBrand({
      name: brand.name, industry: brand.industry, owner: brand.owner, phone: brand.phone, handle: brand.handle,
      retainer: brand.retainer, color: brand.color, address: brand.address, notes: brand.notes,
      sowReels: brand.sowReels, sowFeed: brand.sowFeed, sowStory: brand.sowStory, sowVisit: brand.sowVisit,
      platformLinks, canvaFeedUrl: canvaUrl('Design Feed'), canvaCoverUrl: canvaUrl('Design Cover'), canvaStoryUrl: canvaUrl('Design Story'), customLinks: collection,
    })
    setSavedLinks(collection)
  }
  const saveLinks = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const normalized = links.filter((link) => link.title.trim() || link.url.trim()).map((link) => ({ ...link, title: link.title.trim(), url: link.url.trim() }))
      if (!normalized.length) throw new Error('Tambahkan tautan terlebih dahulu.')
      if (normalized.some((link) => !link.title)) throw new Error('Isi judul untuk setiap tautan.')
      if (normalized.some((link) => link.url && !safeExternalLink(link.url))) throw new Error('Gunakan URL HTTPS yang valid.')
      const next = editingLinkId
        ? [...savedLinks.map((saved) => normalized.find((link) => link.id === saved.id) ?? saved), ...normalized.filter((link) => !savedLinks.some((saved) => saved.id === link.id))]
        : [...savedLinks, ...normalized.filter((link) => !savedLinks.some((saved) => saved.id === link.id))]
      if (next.length > 50) throw new Error('Maksimal 50 tautan per brand.')
      await persistLinks(next)
      setLinks([]); setEditingLinkId(null); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tautan gagal disimpan.') }
    finally { setSaving(false) }
  }
  const editSavedLink = (link: BrandLink) => {
    setEditingLinkId(link.id); setLinks([{ ...link }])
    window.setTimeout(() => document.getElementById('brand-link-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  const deleteSavedLink = async (link: BrandLink) => {
    if (!window.confirm(`Hapus tautan ${link.title}?`)) return
    setSaving(true); setError('')
    try {
      const next = savedLinks.filter((saved) => saved.id !== link.id)
      await persistLinks(next)
      if (editingLinkId === link.id) { setLinks([]); setEditingLinkId(null) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tautan gagal dihapus.') }
    finally { setSaving(false) }
  }
  const deleteDeck = async (deck: { id: string; filename: string }) => {
    if (!window.confirm(`Hapus deck ${deck.filename}?`)) return
    setUploading(true); setError('')
    try { const response = await fetch(`/api/brand-decks?deckId=${encodeURIComponent(deck.id)}`, { method: 'DELETE' }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || 'Deck gagal dihapus.'); setDecks((current) => current.filter((item) => item.id !== deck.id)); setSelectedFile(null) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Deck gagal dihapus.') } finally { setUploading(false) }
  }
  const uploadDeck = async () => {
    if (!selectedFile) return
    setUploading(true); setError('')
    try {
      const form = new FormData(); form.append('brandId', brand.id); form.append('file', selectedFile)
      const response = await fetch('/api/brand-decks', { method: 'POST', body: form })
      const result = await response.json() as { id?: string; filename?: string; sizeBytes?: number; uploadedAt?: number; error?: string }
      if (!response.ok) throw new Error(result.error || 'Deck gagal diunggah.')
      setDecks((current) => [{ id: result.id!, filename: result.filename!, sizeBytes: result.sizeBytes!, uploadedAt: result.uploadedAt! }, ...current]); setSelectedFile(null)
      const input = document.getElementById('brand-deck-file') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Deck gagal diunggah.') }
    finally { setUploading(false) }
  }
  const addLink = (group: BrandLink['group']) => { const newLink = { id: crypto.randomUUID(), group, title: '', url: '' }; setEditingLinkId(null); setLinks((current) => [...current.filter((link) => link.id !== editingLinkId), newLink]) }
  return <div className="brand-assets-grid">
    <div className="brand-links-column"><div className="brand-asset-library"><div className="card-head"><div><div className="eyebrow">Siap dibuka</div><h2>Tautan tersimpan</h2><p>Klik tombol untuk langsung membuka tautan yang sudah kamu simpan.</p></div><span className="badge">{savedLinks.filter((link) => safeExternalLink(link.url)).length} link</span></div>{savedLinks.some((link) => safeExternalLink(link.url)) ? <div className="brand-saved-link-buttons">{savedLinks.filter((link) => safeExternalLink(link.url)).map((link) => <div className={`brand-saved-link-item ${link.group}`} key={link.id}><a className={`brand-saved-link-button ${link.group}`} href={safeExternalLink(link.url)} target="_blank" rel="noreferrer"><span className="brand-saved-link-icon"><Link2 size={15} /></span><span><strong>{link.title}</strong><small>{link.group === 'social' ? 'Akun sosial' : link.group === 'canva' ? 'Template Canva' : 'Tautan lainnya'}</small></span><ArrowUpRight size={15} /></a><div className="brand-saved-link-actions"><button className="icon-button" type="button" title={`Edit ${link.title}`} aria-label={`Edit ${link.title}`} onClick={() => editSavedLink(link)}><Pencil size={13} /></button><button className="icon-button danger-action" type="button" title={`Hapus ${link.title}`} aria-label={`Hapus ${link.title}`} onClick={() => void deleteSavedLink(link)}><Trash2 size={13} /></button></div></div>)}</div> : <div className="brand-saved-link-empty">Simpan tautan terlebih dahulu; tombol buka akan tampil di sini.</div>}</div>
    <form id="brand-link-editor" className="card brand-assets-card brand-link-editor" onSubmit={(event) => void saveLinks(event)}>
      <div className="card-head"><div><div className="eyebrow">Kelola tautan</div><h2>{editingLinkId ? 'Edit tautan' : 'Tambah tautan baru'}</h2><p>Setelah disimpan, tautan berpindah ke daftar tombol di atas dan area ini kembali kosong.</p></div><Link2 size={18} /></div>
      {links.length ? <div className="brand-link-list">{links.map((link) => {
        const href = safeExternalLink(link.url)
        return <article className="brand-link-row brand-link-editable" key={link.id}>
          <div className="brand-link-inputs"><label className="field"><span>Judul tautan</span><input className="input" maxLength={80} placeholder="Contoh: Instagram utama, Canva Story…" value={link.title} onChange={(event) => updateLink(link.id, 'title', event.target.value)} /></label><label className="field"><span>Jenis</span><select className="select" value={link.group} onChange={(event) => updateLink(link.id, 'group', event.target.value as BrandLink['group'])}><option value="social">Akun sosial</option><option value="canva">Template Canva</option><option value="other">Lainnya</option></select></label><label className="field brand-link-url"><span>URL</span><input className="input" type="url" placeholder="https://…" value={link.url} onChange={(event) => updateLink(link.id, 'url', event.target.value)} /></label></div>
          <div className="brand-link-controls">{href ? <a className="button brand-open-link" href={href} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> Buka</a> : <span className="brand-link-empty">{link.url ? 'Periksa URL' : 'Belum ada link'}</span>}<button className="icon-button danger-action" type="button" title={`Hapus ${link.title || 'tautan'}`} aria-label={`Hapus tautan ${link.title}`} onClick={() => setLinks((current) => current.filter((row) => row.id !== link.id))}><Trash2 size={14} /></button></div>
        </article>
      })}</div> : <div className="brand-link-empty-state"><Link2 size={20} /><strong>Belum ada tautan tersimpan</strong><span>Tambahkan akun sosial, template Canva, atau link penting lainnya.</span></div>}
      <div className="brand-links-toolbar"><div className="page-actions"><button className="button" type="button" onClick={() => addLink('social')}><Plus size={14} /> Akun sosial</button><button className="button" type="button" onClick={() => addLink('canva')}><Plus size={14} /> Template Canva</button><button className="button" type="button" onClick={() => addLink('other')}><Plus size={14} /> Link lainnya</button></div><button className="button primary" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingLinkId ? 'Simpan perubahan' : 'Simpan tautan'}</button>{editingLinkId && <button className="button" type="button" onClick={() => { setLinks([]); setEditingLinkId(null) }}>Batal edit</button>}</div>
      {error && <p className="error" role="alert">{error}</p>}
    </form></div>
    <section className="card brand-assets-card">
      <div className="card-head"><div><h2>Assets</h2><p>Simpan panduan, strategi, dan materi brand dalam PDF.</p></div><FileText size={18} /></div>
      {decks.length ? <div className="brand-deck-list">{decks.map((deck) => <div className="brand-deck-file-row" key={deck.id}><a className="brand-deck-file" href={`/api/brand-decks?deckId=${encodeURIComponent(deck.id)}`} target="_blank" rel="noreferrer"><FileText size={18} /><span><strong>{deck.filename}</strong><small>{(deck.sizeBytes / 1_000_000).toFixed(2)} MB · diunggah {format(new Date(deck.uploadedAt), 'd MMM yyyy', { locale: id })}</small></span><ArrowUpRight size={16} /></a><button className="icon-button danger-action" type="button" disabled={uploading} title={`Hapus ${deck.filename}`} aria-label={`Hapus ${deck.filename}`} onClick={() => void deleteDeck(deck)}><Trash2 size={14} /></button></div>)}</div> : <div className="brand-deck-empty">Belum ada PDF yang diunggah.</div>}
      <label className="field"><span>Tambah file PDF</span><input id="brand-deck-file" className="input" type="file" accept="application/pdf,.pdf" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /></label>
      <p className="field-hint">Setiap unggahan menjadi file baru. File lama tetap tersimpan sampai kamu menghapusnya. PDF maksimal 1,8 MB.</p>
      <button className="button primary" type="button" disabled={!selectedFile || uploading} onClick={() => void uploadDeck()}><Upload size={15} /> {uploading ? 'Mengunggah…' : 'Tambah asset'}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  </div>
}

function normalizeWhatsAppPhone(phone: string) {
  let digits = phone.replace(/\D/g, '')
  const international = phone.trim().startsWith('+') || phone.trim().startsWith('00')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (!international && /^[89]/.test(digits) && digits.length <= 12) digits = `62${digits}`
  return digits.length >= 8 && digits.length <= 15 ? digits : ''
}
function WhatsAppButton({ phone, compact = false, message }: { phone: string; compact?: boolean; message?: string }) {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) return null
  return <a className={`whatsapp-link ${compact ? 'compact' : ''}`} href={`https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ''}`} target="_blank" rel="noreferrer" aria-label={message ? 'Kirim pengingat tagihan melalui WhatsApp' : 'Buka chat WhatsApp'} title={message ? 'Tagih melalui WhatsApp' : 'Chat melalui WhatsApp'} onClick={(event) => event.stopPropagation()}><MessageCircle size={compact ? 14 : 15} />{!compact && <span>{message ? 'Tagih' : 'WhatsApp'}</span>}</a>
}
function ContactInfo({ phone }: { phone: string }) { const language = useAppLanguage(); return <div><div className="eyebrow" style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>{uiText(language, 'Telepon / WhatsApp')}</div><div className="contact-info-value"><span style={{ fontSize: 'var(--text-sm)' }}>{phone || '—'}</span><WhatsAppButton phone={phone} /></div></div> }

function Info({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) { const language = useAppLanguage(); return <div className={wide ? 'wide' : ''}><div className="eyebrow" style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>{uiText(language, label)}</div><div style={{ fontSize: 'var(--text-sm)', marginTop: 5, lineHeight: 1.5 }}>{value || '—'}</div></div> }
function brandNameForDelete(brand: Brand, month: string) { return `${brand.name} · ${idMonth(month)}` }
function MonthControl({ month, moveMonth }: { month: string; moveMonth: (delta: number) => void }) { const language = useAppLanguage(); return <div className="month-switch"><button aria-label={language === 'en' ? 'Previous month' : 'Bulan sebelumnya'} onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><span className="badge" style={{ minWidth: 105, justifyContent: 'center' }}>{monthText(month, language, true)}</span><button aria-label={language === 'en' ? 'Next month' : 'Bulan berikutnya'} onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div> }

function ContentPlannerMenu({ brands, contents, profiles, onEditContent, onAddContent, onSaveContent, onSaveOrder, onAnalyzeCover, onSaveProfile }: { brands: Brand[]; contents: Content[]; profiles: SocialProfile[]; onEditContent: (item: Content) => void; onAddContent: (date?: string, brandId?: string) => void; onSaveContent: (item: Content, patch: Partial<Content>, coverFile?: File) => Promise<void>; onSaveOrder: (brandId: string, contentIds: string[], dateAssignments: { contentId: string; date: string }[]) => Promise<void>; onAnalyzeCover: (contentId: string) => Promise<string>; onSaveProfile: (values: { brandId: string; profilePictureUrl: string; username: string; displayName: string; bio: string; highlights: { id: string; title: string; coverUrl: string; sortOrder: number }[]; pinnedContentIds: string[] }) => Promise<void> }) {
  const language = useAppLanguage()
  const [plannerTab, setPlannerTab] = useState<'feed' | 'profile'>('feed')
  const [plannerBrandId, setPlannerBrandId] = useState('')
  return <>
    <div className="pagehead"><div><div className="eyebrow">{language === 'en' ? 'Visual planning' : 'Perencanaan visual'}</div><h1>Content Planner</h1><p>{language === 'en' ? 'Arrange your Instagram feed and prepare content before scheduling.' : 'Atur tampilan feed Instagram dan pastikan rencana konten siap sebelum dijadwalkan.'}</p></div></div>
    <div className="content-planner-tabs" role="tablist" aria-label="Menu Content Planner"><button role="tab" aria-selected={plannerTab === 'feed'} className={plannerTab === 'feed' ? 'active' : ''} onClick={() => setPlannerTab('feed')}>Feed Planner</button><button role="tab" aria-selected={plannerTab === 'profile'} className={plannerTab === 'profile' ? 'active' : ''} onClick={() => setPlannerTab('profile')}>Profile Planner</button></div>
    {plannerTab === 'feed' ? <InstagramFeedPlanner brands={brands} contents={contents} brandId={plannerBrandId} onBrandChange={setPlannerBrandId} onEditContent={onEditContent} onAddContent={onAddContent} onSaveContent={onSaveContent} onSaveOrder={onSaveOrder} onAnalyzeCover={onAnalyzeCover} /> : <InstagramProfilePlanner brands={brands} contents={contents} profiles={profiles} brandId={plannerBrandId} onBrandChange={setPlannerBrandId} onSave={onSaveProfile} />}
  </>
}

function CalendarView({ month, moveMonth, onToday, contents, visits, brands, onMoveContent, onAddContent, onAddVisit, onEditContent, onEditVisit }: { month: string; moveMonth: (delta: number) => void; onToday: () => void; contents: Content[]; visits: Visit[]; brands: Brand[]; onMoveContent: (item: Content, date: string) => Promise<void>; onAddContent: (date?: string) => void; onAddVisit: (date?: string) => void; onEditContent: (item: Content) => void; onEditVisit: (item: Visit) => void }) {
  const language = useAppLanguage()
  const [activeTab, setActiveTab] = useState<'posting' | 'visit'>('posting')
  const [statusFilter, setStatusFilter] = useState('Semua status')
  const [showAllAgenda, setShowAllAgenda] = useState(false)
  const [agendaBrandFilter, setAgendaBrandFilter] = useState('Semua brand')
  const [platformFilter, setPlatformFilter] = useState('Semua platform')
  const [draggedContentId, setDraggedContentId] = useState<string | null>(null)
  const [agendaSort, setAgendaSort] = useState<'date-asc' | 'date-desc'>('date-asc')
  const [openAgendaBrandId, setOpenAgendaBrandId] = useState<string | null>(null)
  const [openAgendaDate, setOpenAgendaDate] = useState<string | null>(null)
  const [openOverflowDate, setOpenOverflowDate] = useState<string | null>(null)
  const start = startOfMonth(parseISO(`${month}-01`))
  const days = getDaysInMonth(start)
  const offset = (getDay(start) + 6) % 7
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1)
  const importantDates = getImportantDates(month)
  const label = (brandId: string) => (brands.find((item) => item.id === brandId)?.name || 'Brand')
  const scheduleDate = (day: number) => `${month}-${String(day).padStart(2, '0')}`
  const monthContents = contents.filter((item) => item.date.startsWith(month))
  const isPosting = activeTab === 'posting'
  const visibleContents = monthContents.filter((item) => (statusFilter === 'Semua status' || item.status === statusFilter) && (agendaBrandFilter === 'Semua brand' || item.brandId === agendaBrandFilter) && (platformFilter === 'Semua platform' || item.platforms.includes(platformFilter)))
  const eventCount = isPosting ? visibleContents.length : visits.length
  const filteredAgendaContents = visibleContents
  const sortedAgendaContents = [...filteredAgendaContents].sort((a, b) => (agendaSort === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.title.localeCompare(b.title, 'id'))
  const sortedAgendaVisits = [...visits].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const agendaItems = isPosting ? sortedAgendaContents : sortedAgendaVisits
  const agendaVisibleItems = showAllAgenda ? agendaItems : agendaItems.slice(0, 5)
  const postingGroups = Array.from(sortedAgendaContents.reduce((groups, item) => {
    const group = groups.get(item.brandId) ?? []
    group.push(item)
    groups.set(item.brandId, group)
    return groups
  }, new Map<string, Content[]>()).entries()).map(([brandId, posts]) => ({ brandId, posts }))
  const selectedPostingGroup = postingGroups.find((group) => group.brandId === openAgendaBrandId)
  const selectedPostingDetails = selectedPostingGroup?.posts.filter((item) => !openAgendaDate || item.date === openAgendaDate) ?? []
  const visiblePostingGroups = showAllAgenda ? postingGroups : postingGroups.slice(0, 5)
  const overflowContentItems = openOverflowDate ? visibleContents.filter((item) => item.date === openOverflowDate).sort((a, b) => a.title.localeCompare(b.title, 'id')) : []
  const overflowVisitItems = openOverflowDate ? visits.filter((item) => item.date === openOverflowDate).sort((a, b) => a.time.localeCompare(b.time)) : []
  return <>
    <div className="pagehead calendar-pagehead"><div><div className="eyebrow">{language === 'en' ? 'Work calendar' : 'Kalender kerja'}</div><h1>{language === 'en' ? 'Calendar & Visits' : 'Kalender & Visit'}</h1><p>{language === 'en' ? 'Manage brand posting and visit schedules in one calendar.' : 'Atur jadwal posting dan kunjungan brand dalam tampilan kalender.'}</p></div></div>
    <section className="card calendar-card">
      <div className="calendar-toolbar"><div className="calendar-month-nav"><button className="button" aria-label={language === 'en' ? 'Previous month' : 'Bulan sebelumnya'} onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><button className="button calendar-today" onClick={onToday}>{language === 'en' ? 'Today' : 'Hari ini'}</button><button className="button" aria-label={language === 'en' ? 'Next month' : 'Bulan berikutnya'} onClick={() => moveMonth(1)}><ChevronRight size={16} /></button><h2>{monthText(month, language)}</h2></div><div className="calendar-toolbar-actions"><div className="calendar-tabs" role="tablist" aria-label={language === 'en' ? 'Schedule type' : 'Jenis jadwal'}><button role="tab" aria-selected={isPosting} className={isPosting ? 'active posting' : ''} onClick={() => { setActiveTab('posting'); setShowAllAgenda(false) }}><span className="calendar-tab-dot posting-dot" />{language === 'en' ? 'Posts' : 'Posting'} <span className="calendar-tab-count">{contents.length}</span></button><button role="tab" aria-selected={!isPosting} className={!isPosting ? 'active visit' : ''} onClick={() => { setActiveTab('visit'); setShowAllAgenda(false) }}><span className="calendar-tab-dot visit-dot" />Visit <span className="calendar-tab-count">{visits.length}</span></button></div>{isPosting ? <button className="button primary" onClick={() => onAddContent()}><Plus size={15} /> {language === 'en' ? 'Add post' : 'Posting'}</button> : <button className="button primary" onClick={() => onAddVisit()}><Plus size={15} /> {language === 'en' ? 'Schedule visit' : 'Jadwalkan visit'}</button>}</div></div>
      <div className="calendar-summary"><span>{eventCount} {isPosting ? 'jadwal posting' : 'visit'} · {idMonth(month)}</span><span className="calendar-legend"><i className={isPosting ? 'posting-dot' : 'visit-dot'} />{isPosting ? 'Posting' : 'Visit'} · Klik item untuk detail dan aksi</span></div>
      <div className="calendar-scroll"><div className="calendar-weekdays">{(language === 'en' ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']).map((day) => <div key={day}>{day}</div>)}</div><div className="calendar-grid calendar-google">{cells.map((day, index) => {
        const actual = day >= 1 && day <= days
        const date = actual ? scheduleDate(day) : ''
        const holidayItems = isPosting && actual ? importantDates.filter((item) => item.date === date) : []
        const dayContents = isPosting ? visibleContents.filter((item) => item.date === date).sort((a, b) => a.title.localeCompare(b.title)) : []
        const dayContentGroups = Array.from(dayContents.reduce((groups, item) => {
          const group = groups.get(item.brandId) ?? []
          group.push(item)
          groups.set(item.brandId, group)
          return groups
        }, new Map<string, Content[]>()).entries()).map(([brandId, posts]) => ({ brandId, posts }))
        const dayVisits = isPosting ? [] : visits.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time))
        const total = holidayItems.length + dayContentGroups.length + dayVisits.length
        const slots = Math.max(0, 4 - holidayItems.length)
        return <div className={`calendar-day calendar-cell ${actual ? '' : 'outside'} ${actual && date === today() ? 'today' : ''}`} key={index} onDragOver={(event) => { if (actual && draggedContentId) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); const moving = contents.find((item) => item.id === draggedContentId); if (actual && moving) void onMoveContent(moving, date); setDraggedContentId(null) }}><div className="calendar-day-head"><span className="calendar-day-number">{actual ? day : day < 1 ? getDaysInMonth(subMonths(start, 1)) + day : day - days}</span>{actual && <button className="calendar-add" aria-label={`Tambah ${isPosting ? 'posting' : 'visit'} tanggal ${day}`} title={`Tambah ${isPosting ? 'posting' : 'visit'}`} onClick={() => isPosting ? onAddContent(date) : onAddVisit(date)}><Plus size={14} /></button>}</div><div className="calendar-events">{holidayItems.map((item) => <div className="calendar-event important" title={`${item.title} · ${item.note}`} key={item.date + item.title}><span className="calendar-event-title">{item.title}</span><span className="calendar-event-meta">Hari penting</span></div>)}{dayContentGroups.slice(0, slots).map(({ brandId, posts }) => <button className="calendar-event posting calendar-brand-event" draggable={posts.length === 1} onDragStart={() => posts.length === 1 && setDraggedContentId(posts[0].id)} onDragEnd={() => setDraggedContentId(null)} title={`${label(brandId)} · ${posts.length} postingan · klik untuk detail`} aria-label={`${label(brandId)}, ${posts.length} postingan pada ${date}`} key={brandId} onClick={() => { setOpenAgendaBrandId(brandId); setOpenAgendaDate(date) }}><span className="calendar-event-title">{label(brandId)}</span>{posts.length > 1 && <span className="calendar-event-meta">{posts.length} postingan</span>}</button>)}{dayVisits.slice(0, slots).map((item) => <button className="calendar-event visit" title={`Buka detail visit ${item.time} · ${label(item.brandId)}`} key={item.id} onClick={() => onEditVisit(item)}><span className="calendar-event-title">{item.time} · {label(item.brandId)}</span><span className="calendar-event-meta">{item.location || 'Kunjungan produksi'}</span></button>)}{total > 4 && <button className="calendar-more" type="button" onClick={() => setOpenOverflowDate(date)} aria-label={`Lihat ${total - 4} jadwal lainnya tanggal ${day}`}>+{total - 4} lainnya · lihat agenda</button>}</div></div>
      })}</div></div>
    </section>
    <section id="calendar-agenda" className="card calendar-agenda"><div className="card-head"><div><h2>Agenda {isPosting ? 'posting' : 'visit'}</h2><p>{isPosting ? `${visibleContents.length} postingan · ${postingGroups.length} brand` : `${agendaItems.length} jadwal ditampilkan`} · {idMonth(month)} · {isPosting ? 'pilih brand untuk melihat detail' : 'buka item untuk mengedit atau menghapus'}</p></div><div className="calendar-agenda-controls">{isPosting && <><label className="calendar-sort-label">Brand<select className="select" aria-label="Filter agenda berdasarkan brand" value={agendaBrandFilter} onChange={(event) => { setAgendaBrandFilter(event.target.value); setShowAllAgenda(false) }}><option value="Semua brand">Semua brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label className="calendar-sort-label">Platform<select className="select" aria-label="Filter posting berdasarkan platform" value={platformFilter} onChange={(event) => { setPlatformFilter(event.target.value); setShowAllAgenda(false) }}><option>Semua platform</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></label><label className="calendar-sort-label">Status<select className="select" aria-label="Filter posting berdasarkan status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setShowAllAgenda(false) }}><option>Semua status</option>{contentStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="calendar-sort-label">Urutkan<select className="select" aria-label="Urutkan agenda posting" value={agendaSort} onChange={(event) => setAgendaSort(event.target.value as typeof agendaSort)}><option value="date-asc">Tanggal terdekat</option><option value="date-desc">Tanggal terjauh</option></select></label></>}{(isPosting ? postingGroups.length : agendaItems.length) > 5 && <button className="button" onClick={() => setShowAllAgenda((show) => !show)}>{showAllAgenda ? 'Tampilkan lebih sedikit' : isPosting ? `Lihat semua brand (${postingGroups.length})` : `Lihat semua detail (${agendaItems.length})`}</button>}</div></div>{(isPosting ? postingGroups.length : agendaItems.length) ? <div className="calendar-agenda-list">{isPosting ? visiblePostingGroups.map(({ brandId, posts }) => <article className="calendar-agenda-item posting-agenda-item" key={brandId}><div className="date-box"><strong>{posts.length}</strong><small>postingan</small></div><div className="calendar-agenda-copy" onClick={() => { setOpenAgendaBrandId(brandId); setOpenAgendaDate(null) }} role="button" tabIndex={0} title={`Lihat ${posts.length} postingan ${label(brandId)}`} onKeyDown={(event) => { if (event.key === 'Enter') { setOpenAgendaBrandId(brandId); setOpenAgendaDate(null) } }}><strong>{label(brandId)}</strong><p>{posts.map((item) => format(parseISO(item.date), 'd MMM', { locale: id })).join(', ')}</p></div><button className="button calendar-brand-details" onClick={() => { setOpenAgendaBrandId(brandId); setOpenAgendaDate(null) }}>Lihat detail</button></article>) : (agendaVisibleItems as Visit[]).map((item) => <article className="calendar-agenda-item visit-agenda-item" key={item.id}><div className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></div><div className="calendar-agenda-copy" onClick={() => onEditVisit(item)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onEditVisit(item)}><strong>{label(item.brandId)} · {item.time}</strong><p>{item.location || item.notes || 'Lokasi belum diisi'}</p></div><span className="badge green">Visit</span></article>)}</div> : <EmptyAction text={`Tidak ada jadwal ${isPosting ? 'posting' : 'visit'} yang cocok dengan filter.`} button={isPosting ? 'Tambah posting' : 'Jadwalkan visit'} onClick={() => isPosting ? onAddContent() : onAddVisit()} />}</section>
    {isPosting && <Dialog.Root open={Boolean(selectedPostingGroup)} onOpenChange={(open) => { if (!open) { setOpenAgendaBrandId(null); setOpenAgendaDate(null) } }}><Dialog.Portal><Dialog.Overlay className="modal-backdrop" /><Dialog.Content className="modal calendar-postings-dialog" aria-describedby="calendar-postings-description"><div className="modal-head"><div><Dialog.Title asChild><h2>{selectedPostingGroup ? label(selectedPostingGroup.brandId) : 'Detail posting'}</h2></Dialog.Title><Dialog.Description id="calendar-postings-description" className="muted">{selectedPostingDetails.length} postingan{openAgendaDate ? ` · ${format(parseISO(openAgendaDate), 'd MMMM yyyy', { locale: id })}` : ` · ${idMonth(month)}`}</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Tutup"><X size={18} /></button></Dialog.Close></div><div className="calendar-post-details-list">{selectedPostingDetails.map((item) => <button className="calendar-post-detail" key={item.id} onClick={() => { setOpenAgendaBrandId(null); setOpenAgendaDate(null); onEditContent(item) }}><span className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></span><span className="calendar-post-detail-copy"><strong>{item.title}</strong><small>{item.postingTime} · {item.platforms.join(', ') || 'Platform belum dipilih'} · {item.format}</small></span><span className={`badge ${stageClass[item.status] ?? ''}`}>{item.status}</span></button>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>}
    <Dialog.Root open={Boolean(openOverflowDate)} onOpenChange={(open) => !open && setOpenOverflowDate(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content className="modal calendar-postings-dialog" aria-describedby="calendar-overflow-description">
          <div className="modal-head"><div><Dialog.Title asChild><h2>Jadwal {openOverflowDate ? format(parseISO(openOverflowDate), 'd MMMM yyyy', { locale: id }) : ''}</h2></Dialog.Title><Dialog.Description id="calendar-overflow-description" className="muted">Semua jadwal pada tanggal ini</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Tutup"><X size={18} /></button></Dialog.Close></div>
          <div className="calendar-post-details-list">
            {isPosting ? overflowContentItems.map((item) => <button className="calendar-post-detail" key={item.id} onClick={() => { setOpenOverflowDate(null); onEditContent(item) }}><span className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></span><span className="calendar-post-detail-copy"><strong>{label(item.brandId)} · {item.title}</strong><small>{item.postingTime} · {item.platforms.join(', ') || 'Platform belum dipilih'} · {item.format}</small></span><span className={`badge ${stageClass[item.status] ?? ''}`}>{item.status}</span></button>) : overflowVisitItems.map((item) => <button className="calendar-post-detail" key={item.id} onClick={() => { setOpenOverflowDate(null); onEditVisit(item) }}><span className="date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></span><span className="calendar-post-detail-copy"><strong>{label(item.brandId)} · {item.time}</strong><small>{item.location || item.notes || 'Lokasi belum diisi'}</small></span><span className="badge green">Visit</span></button>)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {isPosting && <section className="card important-dates"><div className="card-head"><div><div className="eyebrow">Story inspiration</div><h2>Hari besar & ide Story</h2><p>Pengingat tanggal dan inspirasi konten untuk {idMonth(month)}.</p></div><span className="badge">{importantDates.length} catatan</span></div>{importantDates.length ? importantDates.map((item) => <article className="important-date-row" key={item.date + item.title}><div className="date-box important-date-box"><strong>{format(parseISO(item.date), 'dd')}</strong><small>{format(parseISO(item.date), 'MMM', { locale: id })}</small></div><div className="important-date-copy"><strong>{item.title}</strong><p>{item.note}</p><div><Sparkles size={12} /> Ide Story: {item.storyIdea}</div></div></article>) : <div className="empty">Belum ada catatan hari besar untuk bulan ini.</div>}<p className="important-date-footnote">Catatan lokal Indonesia dan Bali. Tanggal keagamaan mengikuti acuan resmi 2026–2027; konfirmasi kembali menjelang publikasi.</p></section>}
  </>
}

function PipelineView({ prospects, onAdd, onEdit, onDelete, onConvert }: { prospects: Prospect[]; onAdd: () => void; onEdit: (item: Prospect) => void; onDelete: (item: Prospect) => void; onConvert: (item: Prospect) => void }) {
  const language = useAppLanguage()
  const [prospectSearch, setProspectSearch] = useState('')
  const [documentProspect, setDocumentProspect] = useState<Prospect | null>(null)
  const normalizedSearch = prospectSearch.trim().toLocaleLowerCase(language === 'en' ? 'en' : 'id')
  const visibleProspects = prospects.filter((item) => !normalizedSearch || [item.brandName, item.picName, item.contact, item.status, item.nextAction, item.sow, item.estimatedValue].some((value) => String(value ?? '').toLocaleLowerCase(language === 'en' ? 'en' : 'id').includes(normalizedSearch)))
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' })
  return <><div className="pagehead"><div><div className="eyebrow">Client acquisition</div><h1>{language === 'en' ? 'Prospect Pipeline' : 'Pitching CRM'}</h1><p>{language === 'en' ? 'Manage prospects, prepare proposals, and track decisions.' : 'Kelola prospek, siapkan dokumen penawaran, dan lacak keputusan client.'}</p></div><button className="button primary" onClick={onAdd}><Plus size={15} /> {language === 'en' ? 'Add prospect' : 'Tambah prospek'}</button></div><div className="grid kpis"><KPI label={language === 'en' ? 'Total prospects' : 'Total prospek'} value={String(prospects.length)} foot={language === 'en' ? 'In pipeline' : 'Dalam pipeline'} icon={<Sparkles size={16} />} /><KPI label={language === 'en' ? 'Pipeline value' : 'Nilai pipeline'} value={money(prospects.reduce((sum, item) => sum + item.estimatedValue, 0))} foot={language === 'en' ? 'Potential monthly retainer' : 'Potensi retainer bulanan'} icon={<TrendingUp size={16} />} color="mint" /><KPI label={language === 'en' ? 'Negotiation / meeting' : 'Negosiasi / meeting'} value={String(prospects.filter((item) => ['Negosiasi', 'Pitching / Meeting'].includes(item.status)).length)} foot={language === 'en' ? 'Needs follow-up' : 'Perlu tindak lanjut'} icon={<ArrowUpRight size={16} />} color="blue" /><KPI label={language === 'en' ? 'Proposals sent' : 'Proposal terkirim'} value={String(prospects.filter((item) => item.status === 'Sent Proposal').length)} foot={language === 'en' ? 'Awaiting decision' : 'Menunggu keputusan'} icon={<FileText size={16} />} color="warm" /></div><section className="card"><div className="card-head"><div><h2>{language === 'en' ? 'Prospect pipeline' : 'Pipeline prospek'}</h2><p>{language === 'en' ? 'Contacts, follow-ups, and prospect documents.' : 'Kontak, tindak lanjut, dan dokumen calon brand.'}</p></div><label className="brand-search-field prospect-search"><Search size={15} /><input className="input" aria-label={language === 'en' ? 'Search prospects' : 'Cari prospek'} placeholder={language === 'en' ? 'Search brand, contact, status, or SOW…' : 'Cari brand, kontak, status, atau SOW…'} value={prospectSearch} onChange={(event) => setProspectSearch(event.target.value)} />{prospectSearch && <button className="icon-button brand-search-clear" type="button" aria-label={language === 'en' ? 'Clear search' : 'Hapus pencarian'} onClick={() => setProspectSearch('')}><X size={14} /></button>}</label></div>{visibleProspects.length ? <div className="table-wrap"><table><thead><tr><th>{language === 'en' ? 'Prospect brand' : 'Brand prospek'}</th><th>{language === 'en' ? 'Contact' : 'PIC / Kontak'}</th><th>{language === 'en' ? 'Retainer value' : 'Nilai retainer'}</th><th>{language === 'en' ? 'Status' : 'Status'}</th><th>{language === 'en' ? 'Follow-up' : 'Tindak lanjut'}</th><th>{language === 'en' ? 'SOW plan' : 'Rencana SOW'}</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{visibleProspects.map((item) => { const overdue = Boolean(item.nextFollowUpDate && item.nextFollowUpDate < today && !['Won', 'Lost'].includes(item.status)); return <tr key={item.id}><td><div className="table-title">{item.brandName}</div></td><td><div className="table-title">{item.picName || '—'}</div><div className="pipeline-contact"><div className="table-sub">{item.contact || '—'}</div><WhatsAppButton phone={item.contact} compact /></div></td><td>{money(item.estimatedValue)}</td><td><span className={`badge ${stageClass[item.status] ?? ''}`}>{item.status}</span></td><td style={{ maxWidth: 220 }}><div className="table-title">{item.nextFollowUpDate ? new Date(`${item.nextFollowUpDate}T12:00:00`).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : language === 'en' ? 'Not scheduled' : 'Belum dijadwalkan'}{overdue && <span className="badge orange" style={{ marginLeft: 6 }}>{language === 'en' ? 'Overdue' : 'Terlambat'}</span>}</div><div className="table-sub">{item.nextAction || (language === 'en' ? 'No action yet' : 'Belum ada aksi')}</div></td><td style={{ maxWidth: 260 }}>{item.sow || '—'}</td><td><div className="actions"><button className="icon-button" title="Draft Offering Letter and Work Agreement" aria-label={`Pitch documents ${item.brandName}`} onClick={() => setDocumentProspect(item)}><FilePlus2 size={14} /></button><button className="icon-button" title="Convert to brand" onClick={() => onConvert(item)}><ArrowRight size={14} /></button><button className="icon-button" title="Edit" onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="icon-button" title="Delete" onClick={() => onDelete(item)}><Trash2 size={14} /></button></div></td></tr> })}</tbody></table></div> : prospects.length ? <div className="empty">{language === 'en' ? 'No prospects match your search.' : 'Tidak ada prospek yang cocok dengan pencarian.'}</div> : <EmptyAction text={language === 'en' ? 'No prospects yet. Add your first prospect to get started.' : 'Belum ada prospek. Catat calon klien pertama untuk memulai pipeline.'} button={language === 'en' ? 'Add prospect' : 'Tambah prospek'} onClick={onAdd} />}</section>{documentProspect && <section className="pipeline-documents"><div className="card-head"><div><h2>{language === 'en' ? 'Pitch documents' : 'Dokumen Pitching'} · {documentProspect.brandName}</h2><p>{language === 'en' ? 'Prepare an Offering Letter or Work Agreement draft. It stays attached if you convert this prospect to a brand.' : 'Siapkan draft Offering Letter atau Work Agreement untuk prospek ini. Draft ikut tersimpan jika prospek dijadikan brand.'}</p></div><button className="button" onClick={() => setDocumentProspect(null)}><X size={14} /> {language === 'en' ? 'Close' : 'Tutup'}</button></div><ClientDocumentsPanel key={documentProspect.id} prospect={documentProspect} /></section>}</>
}

function FinanceView({ transactions, inventory, brands, month, moveMonth, onAdd, onEdit, onDelete }: { transactions: Transaction[]; inventory: InventoryItem[]; brands: Brand[]; month: string; moveMonth: (delta: number) => void; onAdd: () => void; onEdit: (item: Transaction) => void; onDelete: (item: Transaction) => void }) {
  const language = useAppLanguage()
  const [transactionSort, setTransactionSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
  const [financeSearch, setFinanceSearch] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState('')
  const monthRows = transactions.filter((item) => item.date.startsWith(month))
  const carriedReceivables = transactions.filter((item) => item.type === 'income' && item.status === 'Belum Dibayar' && item.date.slice(0, 7) < month)
  const rows = [...new Map([...monthRows, ...carriedReceivables].map((item) => [item.id, item])).values()].sort((a, b) => transactionSort === 'date-asc' ? a.date.localeCompare(b.date) : transactionSort === 'amount-desc' ? b.amount - a.amount : transactionSort === 'amount-asc' ? a.amount - b.amount : b.date.localeCompare(a.date))
  const normalizedFinanceSearch = financeSearch.trim().toLocaleLowerCase('id')
  const filteredRows = rows.filter((item) => {
    if (!normalizedFinanceSearch) return true
    const brand = brands.find((candidate) => candidate.id === item.brandId)
    const relatedAsset = inventory.find((asset) => asset.id === item.inventoryItemId)
    const invoiceDescriptions = item.items.map((line) => line.description).join(' ')
    return [item.title, item.category, item.date, item.status, item.amount, item.notes, invoiceDescriptions, item.manualClientName, item.manualClientPhone, item.manualClientAddress, item.paymentAccountName, item.paymentBankName, item.paymentAccountNumber, brand?.name, brand?.owner, brand?.handle, relatedAsset?.name, relatedAsset?.brand, relatedAsset?.model, relatedAsset?.category].some((value) => String(value ?? '').toLocaleLowerCase('id').includes(normalizedFinanceSearch))
  })
  const resultIncome = filteredRows.filter((item) => item.type === 'income' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const resultReceivable = filteredRows.filter((item) => item.type === 'income' && item.status === 'Belum Dibayar').reduce((sum, item) => sum + item.amount, 0)
  const resultExpense = filteredRows.filter((item) => item.type === 'expense' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const resultUnpaidExpense = filteredRows.filter((item) => item.type === 'expense' && item.status === 'Belum Dibayar').reduce((sum, item) => sum + item.amount, 0)
  const resultNet = resultIncome - resultExpense
  const resultIncomeTotal = resultIncome + resultReceivable
  const resultExpenseTotal = resultExpense + resultUnpaidExpense
  const hasFinanceSearch = Boolean(normalizedFinanceSearch)
  const income = monthRows.filter((item) => item.type === 'income' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const outstanding = transactions.filter((item) => item.type === 'income' && item.status === 'Belum Dibayar' && item.date.slice(0, 7) <= month)
  const receivable = outstanding.reduce((sum, item) => sum + item.amount, 0)
  const expense = monthRows.filter((item) => item.type === 'expense' && item.status === 'Lunas').reduce((sum, item) => sum + item.amount, 0)
  const unpaidExpenses = monthRows.filter((item) => item.type === 'expense' && item.status === 'Belum Dibayar').reduce((sum, item) => sum + item.amount, 0)
  const net = income - expense
  const margin = income ? (net / income) * 100 : 0
  const incomeToMonth = transactions.filter((item) => item.type === 'income' && item.status === 'Lunas' && item.date.slice(0, 4) === month.slice(0, 4) && item.date.slice(0, 7) <= month).reduce((sum, item) => sum + item.amount, 0)
  const downloadReport = async () => {
    setReportBusy(true); setReportError('')
    try {
      const { downloadFinanceReportPdf } = await import('#/lib/finance-report-pdf')
      const reportRows = rows.map((item) => ({
        id: item.id, category: item.category, type: item.type as 'income' | 'expense', amount: item.amount, date: item.date, status: item.status,
        brandName: item.brandId ? (brands.find((brand) => brand.id === item.brandId)?.name ?? '') : (item.manualClientName || ''),
        title: item.title, notes: item.notes,
        paymentAccountName: item.paymentAccountName, paymentBankName: item.paymentBankName, paymentAccountNumber: item.paymentAccountNumber,
        items: item.items,
      }))
      await downloadFinanceReportPdf(month, reportRows, incomeToMonth)
    } catch { setReportError('Laporan PDF gagal dibuat. Coba lagi.') }
    finally { setReportBusy(false) }
  }
  return <><div className="pagehead"><div><div className="eyebrow">Finance tracker</div><h1>{language === 'en' ? 'Finance' : 'Keuangan'}</h1><p>Piutang dan tagihan yang belum dibayar tetap tercatat hingga statusnya lunas.</p></div><div className="page-actions"><MonthControl month={month} moveMonth={moveMonth} /><button className="button" onClick={() => void downloadReport()} disabled={reportBusy}><FileDown size={14} /> {reportBusy ? 'Menyiapkan PDF…' : 'Unduh laporan PDF'}</button><button className="button primary" onClick={onAdd}><Plus size={15} /> Catat transaksi</button></div></div>{reportError && <p className="error" role="alert">{reportError}</p>}<section className="card finance-pl-summary"><div className="card-head"><div><div className="eyebrow">Ringkasan bulanan</div><h2>Laba rugi · {idMonth(month)}</h2><p>Ringkasan kas: pemasukan dan pengeluaran yang sudah lunas pada bulan ini.</p></div><div className="finance-pl-notes"><span className="badge blue">Piutang: {money(receivable)}</span><span className="badge orange">Tagihan belum dibayar: {money(unpaidExpenses)}</span></div></div><div className="finance-pl-grid"><div><span>Pendapatan diterima · bulan ini</span><strong className="finance-income">{money(income)}</strong></div><div><span>Pengeluaran dibayar</span><strong className="finance-expense">{money(expense)}</strong></div><div className={net >= 0 ? 'finance-net positive' : 'finance-net negative'}><span>{net >= 0 ? 'Laba bersih' : 'Rugi bersih'}</span><strong>{money(Math.abs(net))}</strong><small>Margin {margin.toFixed(1)}%</small></div><div><span>Pendapatan total s.d. {idMonth(month)}</span><strong className="finance-income">{money(incomeToMonth)}</strong><small>Akumulasi tahun {month.slice(0, 4)}</small></div></div></section><section className="card"><div className="card-head"><div><h2>Transaksi · {idMonth(month)}</h2><p>Piutang lama tetap tercantum di sini sampai statusnya Lunas.</p></div><div className="finance-table-controls"><label className="calendar-sort-label">Urutkan<select className="select" aria-label="Urutkan transaksi keuangan" value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as typeof transactionSort)}><option value="date-desc">Tanggal terbaru</option><option value="date-asc">Tanggal terlama</option><option value="amount-desc">Jumlah terbesar</option><option value="amount-asc">Jumlah terkecil</option></select></label><span className="badge">{filteredRows.length} transaksi</span></div></div><label className="finance-search"><Search size={15} /><input className="input" value={financeSearch} onChange={(event) => setFinanceSearch(event.target.value)} placeholder="Cari deskripsi, kategori, brand, tanggal, jumlah, rekening, bank, atau barang…" />{financeSearch && <button className="icon-button" type="button" aria-label="Hapus pencarian transaksi" onClick={() => setFinanceSearch('')}><X size={14} /></button>}</label><div className="finance-result-summary" aria-live="polite" hidden={!hasFinanceSearch}><div><small>Transaksi ditemukan</small><strong>{filteredRows.length}</strong></div><div><small>Total pemasukan hasil</small><strong className="finance-income">{money(resultIncomeTotal)}</strong></div><div><small>Total pengeluaran hasil</small><strong className="finance-expense">{money(resultExpenseTotal)}</strong></div><div><small>{resultNet >= 0 ? 'Saldo bersih lunas' : 'Defisit lunas'}</small><strong className={resultNet >= 0 ? 'finance-income' : 'finance-expense'}>{money(Math.abs(resultNet))}</strong></div></div>{hasFinanceSearch && (resultReceivable > 0 || resultUnpaidExpense > 0) && <div className="finance-result-notes">{resultReceivable > 0 && <span className="badge blue">Piutang di hasil: {money(resultReceivable)}</span>}{resultUnpaidExpense > 0 && <span className="badge orange">Tagihan belum dibayar: {money(resultUnpaidExpense)}</span>}</div>}{filteredRows.length ? <div className="table-wrap"><table><thead><tr><th>Transaksi</th><th>Brand</th><th>Kategori</th><th>Tanggal invoice</th><th>Status</th><th>Jumlah</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{filteredRows.map((item) => {
    const brand = item.brandId ? brands.find((candidate) => candidate.id === item.brandId) : undefined
    const isOutstanding = item.type === 'income' && item.status === 'Belum Dibayar'
    const reminder = brand ? `Halo ${brand.name}, kami ingin mengingatkan invoice “${item.title}” untuk bulan ${idMonth(item.date.slice(0, 7))} sebesar ${money(item.amount)} masih berstatus belum dibayar. Mohon kabari jika pembayaran sudah dilakukan. Terima kasih.` : undefined
    const relatedAsset = inventory.find((asset) => asset.id === item.inventoryItemId)
    return <tr key={item.id}><td><div className="table-title">{item.title.trim() || (item.type === 'income' ? `Invoice · ${item.category}` : item.category)}</div>{relatedAsset && <div className="table-sub">Inventaris: {relatedAsset.name}</div>}{isOutstanding && <div className="table-sub receivable-origin">Piutang sejak {idMonth(item.date.slice(0, 7))}</div>}</td><td><span>{brand ? brand.name : item.type === 'income' ? (item.manualClientName || 'Pilih brand') : '—'}</span>{(brand?.phone || item.manualClientPhone) && <WhatsAppButton phone={brand?.phone || item.manualClientPhone} compact />}</td><td>{item.category}</td><td>{format(parseISO(item.date), 'dd MMM yyyy', { locale: id })}</td><td><span className={`badge ${stageClass[item.status] ?? ''}`}>{item.status}</span>{isOutstanding && <div className="table-sub receivable-origin">Belum ditagih lunas</div>}</td><td className="money-cell" style={{ color: item.type === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{item.type === 'income' ? '+' : '−'} {money(item.amount)}</td><td><div className="actions">{isOutstanding && brand?.phone && <WhatsAppButton phone={brand.phone} compact message={reminder} />}<span title={item.type === 'income' && !brand?.phone ? 'Tambahkan nomor WhatsApp pada detail brand untuk menagih' : undefined}>{(item.type === 'income') && <InvoicePdfButton item={item} brand={brand} />}</span><button className="icon-button" title="Edit transaksi" onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="icon-button" title="Hapus transaksi" onClick={() => onDelete(item)}><Trash2 size={14} /></button></div></td></tr>
  })}</tbody></table></div> : <EmptyAction text={rows.length ? 'Tidak ada transaksi yang cocok dengan pencarian.' : 'Belum ada transaksi pada bulan ini.'} button={rows.length ? 'Hapus pencarian' : 'Catat transaksi'} onClick={rows.length ? () => setFinanceSearch('') : onAdd} />}</section></>
}

function InvoicePdfButton({ item, brand }: { item: Transaction; brand?: Brand }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const download = async () => {
    const invoiceClient = brand ?? (item.manualClientName ? { name: item.manualClientName, phone: item.manualClientPhone || '', address: item.manualClientAddress || '' } : undefined)
    if (!invoiceClient) return
    setBusy(true); setError('')
    try {
      const { downloadInvoicePdf } = await import('#/lib/invoice-pdf')
      await downloadInvoicePdf(invoiceClient, item)
    } catch { setError('PDF gagal dibuat.') }
    finally { setBusy(false) }
  }
  return <span className="invoice-download-wrap"><button className="icon-button" title={brand || item.manualClientName ? 'Unduh invoice PDF' : 'Edit transaksi dan pilih atau isi klien terlebih dahulu'} aria-label={brand || item.manualClientName ? 'Unduh invoice PDF' : 'Pilih atau isi klien untuk membuat invoice'} disabled={(!brand && !item.manualClientName) || busy} onClick={() => void download()}><FileDown size={14} /></button>{error && <span className="invoice-error" role="alert">{error}</span>}</span>
}

function RecordField({ form, name, label, type = 'text', wide = false, placeholder = '', options }: { form: UseFormReturn<Record<string, any>>; name: string; label: string; type?: string; wide?: boolean; placeholder?: string; options?: string[] }) {
  const language = useAppLanguage()
  const { register, formState: { errors } } = form
  return <div className={`field ${wide ? 'wide' : ''}`}><label htmlFor={name}>{uiText(language, label)}</label>{options ? <select className="select" style={{ width: '100%' }} id={name} {...register(name)}>{options.map((option) => <option key={option} value={option}>{uiText(language, option)}</option>)}</select> : type === 'textarea' ? <textarea className="textarea" id={name} placeholder={language === 'en' ? uiText(language, placeholder) : placeholder} {...register(name)} /> : <input className="input" id={name} type={type} min={type === 'number' ? 0 : undefined} placeholder={language === 'en' ? uiText(language, placeholder) : placeholder} {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)} />}{errors[name] && <span className="error">{String(errors[name]?.message || (language === 'en' ? 'Please check this field.' : 'Periksa isian ini.'))}</span>}</div>
}

const schemaByKind: Record<Kind, z.ZodTypeAny> = {
  brand: z.object({ name: z.string().trim().min(1, 'Nama wajib diisi'), industry: z.string(), owner: z.string(), phone: z.string(), handle: z.string(), handledPlatforms: z.array(z.string()).max(6), retainer: z.coerce.number().int().min(0), color: z.string(), address: z.string(), notes: z.string(), sowReels: z.coerce.number().int().min(0), sowFeed: z.coerce.number().int().min(0), sowStory: z.coerce.number().int().min(0), sowVisit: z.coerce.number().int().min(0) }),
  content: z.object({ brandId: z.string().min(1, 'Pilih brand'), title: z.string().trim().min(1, 'Judul wajib diisi'), format: z.string().min(1), date: z.string().min(10), status: z.string().min(1), platforms: z.array(z.string()), inspo: z.string(), hook: z.string(), brief: z.string(), caption: z.string(), pillar: z.string(), funnel: z.string(), objective: z.string(), sceneBreakdown: z.string(), hashtags: z.string(), cta: z.string(), postingTime: z.string(), thumbnailUrl: z.string(), internalNotes: z.string(), views: z.coerce.number().int().min(0), likes: z.coerce.number().int().min(0), comments: z.coerce.number().int().min(0), shares: z.coerce.number().int().min(0), saves: z.coerce.number().int().min(0) }),
  visit: z.object({ brandId: z.string().min(1, 'Pilih brand'), date: z.string().min(10), time: z.string(), location: z.string(), notes: z.string() }),
  brandNote: z.object({ brandId: z.string().min(1, 'Pilih brand'), title: z.string().trim().min(1, 'Judul wajib diisi'), category: z.enum(['Add-on', 'Event', 'Permintaan brand', 'Follow-up', 'Lainnya']), details: z.string(), dueDate: z.string().nullable().optional(), isDone: z.boolean().optional() }),
  prospect: z.object({ brandName: z.string().trim().min(1, 'Nama brand wajib diisi'), picName: z.string(), contact: z.string(), estimatedValue: z.coerce.number().int().min(0), status: z.string(), sow: z.string(), notes: z.string(), nextFollowUpDate: z.union([z.string().date(), z.literal('')]).transform((value) => value || null), nextAction: z.string() }),
  transaction: z.object({
    type: z.enum(['income', 'expense']), brandId: z.string().nullable().optional(),
    manualClientName: z.string().trim().max(120).optional(), manualClientPhone: z.string().trim().max(40).optional(), manualClientAddress: z.string().trim().max(300).optional(),
    inventory: z.object({ name: z.string(), category: z.string(), brand: z.string(), model: z.string(), serialNumber: z.string(), buyerName: z.string(), purchaseDate: z.string().nullable(), purchaseMethod: z.string(), purchaseDetails: z.string(), purchasePrice: z.coerce.number().int().min(0), quantity: z.coerce.number().int().min(1), condition: z.string(), status: z.string(), location: z.string(), notes: z.string() }).optional(),
    title: z.string().trim().max(180).optional().default(''), category: z.string().min(1, 'Pilih kategori'),
    amount: z.coerce.number().int().positive('Total harus lebih dari 0'),
    items: z.array(z.object({ description: z.string().trim().max(180), quantity: z.coerce.number().int().min(1), unitPrice: z.coerce.number().int().min(0) })).max(8).optional(),
    paymentAccountName: z.string().trim().max(120).optional(), paymentBankName: z.string().trim().max(120).optional(), paymentAccountNumber: z.string().trim().max(80).optional(),
    date: z.string().min(10), status: z.enum(['Lunas', 'Belum Dibayar']), notes: z.string(),
  }).superRefine((value, ctx) => {
    if (value.type === 'income') {
      if (!value.brandId && !value.manualClientName?.trim()) ctx.addIssue({ code: 'custom', path: ['manualClientName'], message: 'Pilih brand atau isi nama klien manual.' })
      if (!value.items?.length || value.items.some((line) => !line.description.trim())) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Isi nama item dan tambahkan item invoice.' })
      if (!value.paymentAccountName?.trim()) ctx.addIssue({ code: 'custom', path: ['paymentAccountName'], message: 'Isi nama pemilik rekening tujuan.' })
      if (!value.paymentBankName?.trim()) ctx.addIssue({ code: 'custom', path: ['paymentBankName'], message: 'Isi nama bank tujuan.' })
      if (!value.paymentAccountNumber?.trim()) ctx.addIssue({ code: 'custom', path: ['paymentAccountNumber'], message: 'Isi nomor rekening tujuan.' })
      const total = value.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0
      if (value.amount !== total) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Total harus sama dengan jumlah item invoice.' })
    }
    if (value.type === 'expense' && !value.title.trim()) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Deskripsi pengeluaran wajib diisi.' })
    if (value.type === 'expense' && value.category === 'Inventaris') {
      if (!value.inventory || !value.inventory.name.trim()) ctx.addIssue({ code: 'custom', path: ['inventory'], message: 'Isi nama barang inventaris.' })
      if (!value.inventory || value.inventory.purchasePrice <= 0) ctx.addIssue({ code: 'custom', path: ['inventory'], message: 'Harga per unit harus lebih dari 0.' })
      if (value.inventory && value.inventory.purchasePrice > 0 && value.amount !== value.inventory.purchasePrice * value.inventory.quantity) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Total harus sama dengan harga satuan × jumlah unit.' })
    }
  }),
}
const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Threads', 'Lainnya']
const handledPlatformOptions = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Threads', 'Lainnya']

function RecordDialog({ modal, data, onClose, onSave, onDelete }: { modal: ModalState; data: Data; onClose: () => void; onSave: (kind: Kind, id: string | undefined, values: Record<string, unknown>, thumbnailFile?: File) => Promise<void>; onDelete: (kind: Kind, id: string, label: string) => Promise<boolean> }) {
  const language = useAppLanguage()
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailError, setThumbnailError] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentListOpen, setPaymentListOpen] = useState(false)
  const item = modal?.item || {}
  const idValue = typeof item.id === 'string' ? item.id : undefined
  const linkedInventory = typeof item.inventoryItemId === 'string' ? data.inventory.find((asset) => asset.id === item.inventoryItemId) : undefined
  const activeBrands = data.brands.filter((brand) => brand.isActive)
  const defaultBrandId = activeBrands.length === 1 ? activeBrands[0].id : ''
  const existingHandledPlatforms = Array.isArray(item.handledPlatforms) ? item.handledPlatforms.filter((value): value is string => typeof value === 'string') : []
  const customHandledPlatform = existingHandledPlatforms.find((value) => !handledPlatformOptions.includes(value)) ?? ''
  const base: Record<Kind, Record<string, unknown>> = {
    brand: { name: '', industry: '', owner: '', phone: '', handle: '', handledPlatforms: [], otherPlatformName: '', retainer: 0, color: colors[data.brands.length % colors.length], address: '', notes: '', sowReels: 0, sowFeed: 0, sowStory: 0, sowVisit: 0 },
    content: { brandId: defaultBrandId, title: '', format: 'Reels', date: today(), status: 'Ideation', platforms: ['Instagram'], inspo: '', hook: '', brief: '', caption: '', pillar: '', funnel: '', objective: '', sceneBreakdown: '', hashtags: '', cta: '', postingTime: '09:00', thumbnailUrl: '', internalNotes: '', views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    visit: { brandId: defaultBrandId, date: today(), time: '09:00', location: '', notes: '' },
    brandNote: { brandId: defaultBrandId || (data.brands[0]?.id ?? ''), title: '', category: 'Follow-up', details: '', dueDate: '', isDone: false },
    prospect: { brandName: '', picName: '', contact: '', estimatedValue: 0, status: 'Prospek', sow: '', notes: '', nextFollowUpDate: '', nextAction: '' },
    transaction: { type: 'income', brandId: data.brands.length === 1 ? data.brands[0].id : '', manualClientName: '', manualClientPhone: '', manualClientAddress: '', title: '', category: 'Retainer Client', amount: 0, items: [{ description: '', quantity: 1, unitPrice: 0 }], paymentAccountName: '', paymentBankName: '', paymentAccountNumber: '', date: today(), status: 'Lunas', notes: '', inventory: { name: '', category: '', brand: '', model: '', serialNumber: '', buyerName: '', purchaseDate: '', purchaseMethod: '', purchaseDetails: '', purchasePrice: 0, quantity: 1, condition: 'Baru', status: 'Digunakan', location: '', notes: '' } },
  }
  const form = useForm<Record<string, any>>({ resolver: zodResolver(schemaByKind[modal?.kind || 'brand'] as never) as never, defaultValues: { ...base[modal?.kind || 'brand'], ...item, ...(modal?.kind === 'brand' ? { handledPlatforms: customHandledPlatform ? [...existingHandledPlatforms.filter((value) => value !== customHandledPlatform), 'Lainnya'] : existingHandledPlatforms, otherPlatformName: customHandledPlatform } : {}), ...(modal?.kind === 'transaction' && item.manualClientName ? { brandId: '__manual__' } : {}), ...(modal?.kind === 'content' ? { caption: [item.caption, item.cta ? `CTA: ${item.cta}` : '', item.hashtags ? `Hashtag: ${item.hashtags}` : ''].filter((value) => typeof value === 'string' && value.trim()).join('\n\n'), hook: [item.hook, item.brief].filter((value) => typeof value === 'string' && value.trim()).join('\n\n'), brief: '', hashtags: '', cta: '' } : {}), ...(linkedInventory ? { inventory: { name: linkedInventory.name, category: linkedInventory.category, brand: linkedInventory.brand, model: linkedInventory.model, serialNumber: linkedInventory.serialNumber, buyerName: linkedInventory.buyerName, purchaseDate: linkedInventory.purchaseDate ?? '', purchaseMethod: linkedInventory.purchaseMethod, purchaseDetails: linkedInventory.purchaseDetails, purchasePrice: linkedInventory.purchasePrice, quantity: linkedInventory.quantity, condition: linkedInventory.condition, status: linkedInventory.status, location: linkedInventory.location, notes: linkedInventory.notes } } : {}) } })
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form
  const invoiceItemArray = useFieldArray({ control, name: 'items' })
  const kind = modal?.kind
  const transactionType = watch('type')
  const transactionCategory = watch('category')
  const selectedBrandId = String(watch('brandId') || '')
  const transactionManualClient = kind === 'transaction' && selectedBrandId === '__manual__'
  const paymentBankName = String(watch('paymentBankName') || '')
  const paymentAccountNumber = String(watch('paymentAccountNumber') || '')
  const savedCustomPayments = data.transactions
    .filter((tx) => tx.paymentAccountName?.trim() && tx.paymentBankName?.trim() && tx.paymentAccountNumber?.trim())
    .filter((tx, index, rows) => rows.findIndex((candidate) => candidate.paymentAccountName === tx.paymentAccountName && candidate.paymentBankName === tx.paymentBankName && candidate.paymentAccountNumber === tx.paymentAccountNumber) === index)
    .map((tx, index) => ({ ...tx, choiceId: `saved-custom-${index}` }))
  const selectedSavedPayment = savedCustomPayments.find((account) => account.paymentBankName === paymentBankName && account.paymentAccountNumber === paymentAccountNumber && account.paymentAccountName === String(watch('paymentAccountName') || ''))
  const paymentDestination = selectedSavedPayment?.choiceId ?? 'other'
  const paymentChoices = [
    ...savedCustomPayments.map((account) => ({ id: account.choiceId, label: `${account.paymentAccountName} · ${account.paymentBankName} · ${account.paymentAccountNumber}` })),
    { id: 'other', label: 'Input rekening manual' },
  ]
  const paymentChoiceLabel = paymentChoices.find((choice) => choice.id === paymentDestination)?.label ?? 'Input rekening manual'
  const filteredPaymentChoices = paymentChoices.filter((choice) => choice.label.toLocaleLowerCase().includes(paymentSearch.trim().toLocaleLowerCase()))
  const brandOptions = kind === 'content' || kind === 'visit' ? data.brands.filter((brand) => brand.isActive || brand.id === selectedBrandId) : data.brands
  const watchedInvoiceItems = watch('items') as Array<{ description?: string; quantity?: number; unitPrice?: number }> | undefined
  const invoiceTotal = watchedInvoiceItems?.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0) || 0
  const watchedAmount = watch('amount')
  const inventoryUnitPrice = Number(watch('inventory.purchasePrice') || 0)
  const inventoryQuantity = Number(watch('inventory.quantity') || 0)
  const inventoryTotal = inventoryUnitPrice * inventoryQuantity
  const selectPaymentDestination = (presetId: string) => {
    const savedAccount = savedCustomPayments.find((account) => account.choiceId === presetId)
    const destination = savedAccount ? { accountName: savedAccount.paymentAccountName, bankName: savedAccount.paymentBankName, accountNumber: savedAccount.paymentAccountNumber } : undefined
    setValue('paymentAccountName', destination?.accountName ?? '', { shouldValidate: true })
    setValue('paymentBankName', destination?.bankName ?? '', { shouldValidate: true })
    setValue('paymentAccountNumber', destination?.accountNumber ?? '', { shouldValidate: true })
    setPaymentSearch('')
  }
  useEffect(() => {
    if (kind === 'transaction' && transactionType === 'income' && invoiceItemArray.fields.length === 0) {
      invoiceItemArray.append({ description: String(watch('title') || ''), quantity: 1, unitPrice: Number(watch('amount') || 0) })
    }
  }, [kind, transactionType, invoiceItemArray.fields.length, invoiceItemArray.append, watch])
  useEffect(() => {
    if (kind === 'transaction' && transactionType === 'income' && Number(watchedAmount) !== invoiceTotal) {
      setValue('amount', invoiceTotal, { shouldValidate: true })
    }
  }, [kind, transactionType, invoiceTotal, watchedAmount, setValue])
  useEffect(() => {
    if (kind === 'transaction' && transactionType === 'expense' && transactionCategory === 'Inventaris' && Number(watchedAmount) !== inventoryTotal) {
      setValue('amount', inventoryTotal, { shouldValidate: true })
    }
  }, [kind, transactionType, transactionCategory, inventoryTotal, watchedAmount, setValue])
  const title = !modal ? '' : modal.performanceOnly ? uiText(language, 'Performa konten') : idValue ? uiText(language, `Edit ${modal.kind === 'brand' ? 'brand' : modal.kind === 'content' ? 'konten' : modal.kind === 'visit' ? 'visit' : modal.kind === 'brandNote' ? 'catatan brand' : modal.kind === 'prospect' ? 'prospek' : 'transaksi'}`) : uiText(language, `Tambah ${modal.kind === 'brand' ? 'brand' : modal.kind === 'content' ? 'konten' : modal.kind === 'visit' ? 'visit' : modal.kind === 'brandNote' ? 'catatan brand' : modal.kind === 'prospect' ? 'prospek' : 'transaksi'}`)

  const brandSelect = <div className="field"><label htmlFor="brandId">Brand</label><select id="brandId" className="select" style={{ width: '100%' }} {...register('brandId')}><option value="">Pilih brand</option>{kind === 'transaction' && <option value="__manual__">Input manual</option>}{brandOptions.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.isActive ? '' : ' · Nonaktif (historis)'}</option>)}</select>{errors.brandId && <span className="error">{String(errors.brandId.message)}</span>}</div>
  return <Dialog.Root open={Boolean(modal)} onOpenChange={(open) => !open && onClose()}><Dialog.Portal><Dialog.Overlay className="modal-backdrop" /><Dialog.Content className="modal" aria-describedby="record-description"><div className="modal-head"><div><Dialog.Title asChild><h2>{title}</h2></Dialog.Title><Dialog.Description id="record-description" className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>{modal?.performanceOnly ? 'Catat hasil setelah konten tayang.' : kind === 'content' ? 'Isi informasi utama. Detail lain bisa ditambahkan nanti.' : 'Perubahan disimpan setelah kamu memilih Simpan.'}</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Tutup"><X size={18} /></button></Dialog.Close></div>{modal && kind && <form className="modal-body" onSubmit={handleSubmit(async (values) => { setSubmissionError(''); try { const clean = kind === 'content' && modal.performanceOnly ? { ...item, ...values } : { ...values }; if (kind === 'brand') { const selectedPlatforms = Array.isArray(clean.handledPlatforms) ? clean.handledPlatforms as string[] : []; const manualPlatform = String(clean.otherPlatformName || '').trim(); clean.handledPlatforms = [...new Set(selectedPlatforms.filter((platform) => platform !== 'Lainnya'))]; if (selectedPlatforms.includes('Lainnya') && manualPlatform) clean.handledPlatforms = [...new Set([...clean.handledPlatforms, manualPlatform])]; delete clean.otherPlatformName } if (kind === 'content') clean.platforms = Array.isArray(clean.platforms) ? clean.platforms : []; if (kind === 'content' || kind === 'visit') clean.brandId = String(clean.brandId).split('::')[0]; if (kind === 'brandNote') clean.dueDate = clean.dueDate || null; if (kind === 'prospect') clean.nextFollowUpDate = clean.nextFollowUpDate || null; if (kind === 'transaction' && clean.type === 'income') { if (clean.brandId === '__manual__') clean.brandId = null; else { clean.manualClientName = ''; clean.manualClientPhone = ''; clean.manualClientAddress = '' } clean.amount = (clean.items as Array<{ quantity: number; unitPrice: number }>).reduce((sum, line) => sum + line.quantity * line.unitPrice, 0); clean.inventory = undefined } if (kind === 'transaction' && clean.type === 'expense') { clean.brandId = null; clean.items = []; if (clean.category === 'Inventaris') { const inventory = clean.inventory as Record<string, unknown>; inventory.purchaseDate = inventory.purchaseDate || null; clean.amount = Number(inventory.purchasePrice) * Number(inventory.quantity) } else clean.inventory = undefined } await onSave(kind, idValue, clean, kind === 'content' ? thumbnailFile ?? undefined : undefined) } catch (cause) { setSubmissionError(cause instanceof Error ? cause.message : 'Data gagal disimpan.') } })}>
    <div className="form-grid">
      {kind === 'brand' && <><RecordField form={form} name="name" label="Nama brand" placeholder="Contoh: Senja Ubud Villas" /><RecordField form={form} name="industry" label="Industri" placeholder="Hospitality, F&B, beauty…" /><RecordField form={form} name="owner" label="PIC / pemilik" /><RecordField form={form} name="phone" label="Telepon / WhatsApp" /><RecordField form={form} name="handle" label="Akun sosial" placeholder="@namabrand" /><div className="field wide"><label>Platform yang di-handle</label><Controller name="handledPlatforms" control={control} render={({ field }) => <div className="filters">{handledPlatformOptions.map((platform) => <label key={platform} className="badge" style={{ cursor: 'pointer' }}><input type="checkbox" checked={(field.value || []).includes(platform)} onChange={(event) => field.onChange(event.target.checked ? [...(field.value || []), platform] : (field.value || []).filter((value: string) => value !== platform))} /> {platform === 'Lainnya' ? 'Lainnya (manual)' : platform}</label>)}</div>} />{(watch('handledPlatforms') || []).includes('Lainnya') && <label className="field" style={{ marginTop: 10 }}><span>Nama platform lainnya</span><input className="input" maxLength={60} required value={String(watch('otherPlatformName') || '')} onChange={(event) => setValue('otherPlatformName', event.target.value, { shouldDirty: true })} placeholder="Contoh: Pinterest" /></label>}<span className="field-hint">Pilih platform yang kamu tangani. Instagram akan membuka brand ini di Feed Planner dan Profile Planner.</span></div><RecordField form={form} name="retainer" label="Retainer bulanan (Rp)" type="number" /><RecordField form={form} name="color" label="Warna brand" type="color" /><RecordField form={form} name="address" label="Alamat" /><RecordField form={form} name="sowReels" label="Target Reels / bln" type="number" /><RecordField form={form} name="sowFeed" label="Target Feed / bln" type="number" /><RecordField form={form} name="sowStory" label="Target Story / bln" type="number" /><RecordField form={form} name="sowVisit" label="Target Visit / bln" type="number" /><RecordField form={form} name="notes" label="Panduan, tujuan, dan catatan brand" type="textarea" wide /></>}
      {kind === 'content' && (modal.performanceOnly ? <><div className="content-form-section">Performa konten</div><RecordField form={form} name="views" label="Views" type="number" /><RecordField form={form} name="likes" label="Likes" type="number" /><RecordField form={form} name="comments" label="Komentar" type="number" /><RecordField form={form} name="shares" label="Shares" type="number" /><RecordField form={form} name="saves" label="Saves" type="number" /></> : <>
        <div className="content-form-section">Rencana posting</div>
        {brandSelect}<RecordField form={form} name="title" label="Judul konten" /><RecordField form={form} name="format" label="Format" options={['Reels', 'Carousel', 'Single Post', 'Feed', 'Story', 'TikTok Video', 'Video', 'Lainnya']} /><RecordField form={form} name="date" label="Tanggal tayang" type="date" /><RecordField form={form} name="status" label="Status" options={[...contentStatuses]} />
        <div className="field wide"><label>Platform</label><Controller name="platforms" control={control} render={({ field }) => <div className="filters">{platforms.map((platform) => <label key={platform} className="badge" style={{ cursor: 'pointer' }}><input type="checkbox" checked={(field.value || []).includes(platform)} onChange={(event) => field.onChange(event.target.checked ? [...field.value, platform] : field.value.filter((value: string) => value !== platform))} /> {platform}</label>)}</div>} /></div>
        <div className="content-form-section">Materi publikasi</div>
        <RecordField form={form} name="pillar" label="Pillar konten" placeholder="Edukasi, inspirasi, promosi…" />
        <RecordField form={form} name="funnel" label="Marketing funnel" options={['', 'TOFU · Awareness', 'MOFU · Consideration', 'BOFU · Conversion']} />
        <RecordField form={form} name="inspo" label="Link inspo" placeholder="https://…" wide />
        <RecordField form={form} name="hook" label="Brief (talking head)" type="textarea" wide />
        <RecordField form={form} name="sceneBreakdown" label="Details shoot" type="textarea" wide />
        <RecordField form={form} name="caption" label="Caption · CTA · Hashtag" type="textarea" wide />
        <input type="hidden" {...register('objective')} /><input type="hidden" {...register('brief')} /><input type="hidden" {...register('hashtags')} /><input type="hidden" {...register('cta')} /><input type="hidden" {...register('postingTime')} />
        <label className="field wide"><span>Cover konten (JPG, PNG, WebP · maks. 1,6 MB)</span><input className="input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setThumbnailFile(file); setThumbnailError(file && file.size > 1_600_000 ? 'Ukuran cover maksimal 1,6 MB.' : '') }} />{thumbnailError && <small className="error">{thumbnailError}</small>}{typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.startsWith('/api/content-thumbnail') && !thumbnailFile && <small className="field-hint">Cover tersimpan. Unggah file baru untuk menggantinya.</small>}</label>
        <input type="hidden" {...register('thumbnailUrl')} />
        <RecordField form={form} name="internalNotes" label="Notes internal" type="textarea" wide />
        {watch('status') === 'Uploaded' ? <details open className="content-advanced-fields content-performance-fields"><summary>Performa konten</summary><div className="form-grid"><RecordField form={form} name="views" label="Views" type="number" /><RecordField form={form} name="likes" label="Likes" type="number" /><RecordField form={form} name="comments" label="Komentar" type="number" /><RecordField form={form} name="shares" label="Shares" type="number" /><RecordField form={form} name="saves" label="Saves" type="number" /></div></details> : (['views', 'likes', 'comments', 'shares', 'saves'] as const).map((field) => <input key={field} type="hidden" {...register(field)} />)}
      </>)}
      {kind === 'visit' && <>{brandSelect}<RecordField form={form} name="date" label="Tanggal" type="date" /><RecordField form={form} name="time" label="Jam" type="time" /><RecordField form={form} name="location" label="Lokasi" /><RecordField form={form} name="notes" label="Agenda / catatan" type="textarea" wide /></>}
      {kind === 'brandNote' && <>{brandSelect}<RecordField form={form} name="title" label="Judul catatan" placeholder="Contoh: Add-on extra visit" /><RecordField form={form} name="category" label="Kategori" options={['Add-on', 'Event', 'Permintaan brand', 'Follow-up', 'Lainnya']} /><RecordField form={form} name="dueDate" label="Tanggal pengingat" type="date" /><RecordField form={form} name="details" label="Detail / hal yang perlu diingat" type="textarea" wide /></>}
      {kind === 'prospect' && <><RecordField form={form} name="brandName" label="Nama brand" /><RecordField form={form} name="picName" label="PIC" /><RecordField form={form} name="contact" label="Telepon / kontak" /><RecordField form={form} name="estimatedValue" label="Estimasi retainer (Rp)" type="number" /><RecordField form={form} name="status" label="Status" options={['Prospek', 'Pitching / Meeting', 'Sent Proposal', 'Negosiasi', 'Won', 'Lost']} /><RecordField form={form} name="nextFollowUpDate" label="Tanggal follow-up" type="date" /><RecordField form={form} name="nextAction" label="Aksi berikutnya" placeholder="Contoh: hubungi PIC untuk membahas proposal" /><RecordField form={form} name="sow" label="Rencana SOW" type="textarea" wide /><RecordField form={form} name="notes" label="Catatan" type="textarea" wide /></>}
      {kind === 'transaction' && <><RecordField form={form} name="type" label="Jenis transaksi" options={['income', 'expense']} />{transactionType === 'income' && <><RecordField form={form} name="title" label="Judul internal · opsional" placeholder="Kosongkan jika tidak perlu" /><RecordField form={form} name="category" label="Jenis pemasukan" options={['Retainer Client', 'Project', 'Add-on', 'Reimburse', 'Lainnya']} />{brandSelect}{transactionManualClient && <><RecordField form={form} name="manualClientName" label="Nama klien" placeholder="Nama customer / klien" /><RecordField form={form} name="manualClientPhone" label="Telepon / WhatsApp" placeholder="Opsional" /><RecordField form={form} name="manualClientAddress" label="Alamat" placeholder="Opsional" /></>}<div className="field wide invoice-items-field"><div className="invoice-items-heading"><strong>Rincian invoice</strong><span>Retainer, visit satu kali, dan project</span></div>{invoiceItemArray.fields.map((line, index) => <div className="invoice-item-row" key={line.id}><label><span>Item</span><input className="input" placeholder="Retainer bulanan, Visit / shooting 1x…" {...register(`items.${index}.description`)} /></label><label><span>Qty</span><input className="input" type="number" min="1" step="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} /></label><label><span>Harga satuan</span><input className="input" type="number" min="0" step="1000" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} /></label><button type="button" className="icon-button invoice-item-remove" title="Hapus item" disabled={invoiceItemArray.fields.length <= 1} onClick={() => invoiceItemArray.remove(index)}><Trash2 size={14} /></button></div>)}<div className="invoice-items-footer"><div className="actions"><button type="button" className="button" disabled={invoiceItemArray.fields.length >= 8} onClick={() => invoiceItemArray.append({ description: '', quantity: 1, unitPrice: 0 })}><Plus size={14} /> Tambah item</button></div><strong>Total {money(invoiceTotal)}</strong></div>{errors.items && <span className="error">Isi nama item, qty, dan harga. Maksimal 8 item per invoice.</span>}<input type="hidden" {...register('amount')} />{errors.amount && <span className="error">{String(errors.amount.message || 'Periksa total invoice.')}</span>}</div><div className="field wide invoice-items-field"><div className="invoice-items-heading"><strong>Rekening tujuan pembayaran</strong><span>Detail ini dicetak di invoice</span></div><label className="field"><span>Pilih rekening</span><div className="payment-account-picker"><input className="input" value={paymentListOpen ? paymentSearch : paymentChoiceLabel} placeholder="Cari nama, bank, atau nomor rekening" onFocus={() => { setPaymentSearch(''); setPaymentListOpen(true) }} onBlur={() => window.setTimeout(() => setPaymentListOpen(false), 140)} onChange={(event) => { setPaymentSearch(event.target.value); setPaymentListOpen(true) }} />{paymentListOpen && <div className="payment-account-options" role="listbox" aria-label="Daftar rekening">{filteredPaymentChoices.length ? filteredPaymentChoices.map((choice) => <button type="button" className="payment-account-option" key={choice.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { selectPaymentDestination(choice.id); setPaymentListOpen(false) }}>{choice.label}</button>) : <span className="payment-account-empty">Tidak ada rekening yang cocok.</span>}</div>}</div></label><div className="form-grid"><RecordField form={form} name="paymentAccountName" label="Atas nama" placeholder="Nama pemilik rekening" /><RecordField form={form} name="paymentBankName" label="Nama bank" placeholder="Contoh: Bank Mandiri" /><RecordField form={form} name="paymentAccountNumber" label="Nomor rekening" placeholder="Masukkan nomor rekening" /></div></div></>}{transactionType === 'expense' && <><RecordField form={form} name="title" label="Deskripsi" placeholder="Contoh: Pembelian perlengkapan" /><RecordField form={form} name="category" label="Kategori" options={['Operasional Visit', 'Gaji Tim / Freelancer', 'Langganan Software', 'Transportasi', 'Marketing / Iklan / Ads', 'Inventaris', 'Peralatan', 'Pajak', 'Saving', 'Lainnya']} />{transactionCategory === 'Inventaris' && <div className="field wide invoice-items-field"><div className="invoice-items-heading"><strong>Detail barang inventaris</strong><span>Data tersimpan sekaligus ke Inventaris</span></div><div className="form-grid"><RecordField form={form} name="inventory.name" label="Nama barang *" placeholder="Contoh: Kamera mirrorless" /><RecordField form={form} name="inventory.category" label="Kategori inventaris" placeholder="Kamera, audio, komputer…" /><RecordField form={form} name="inventory.brand" label="Merek" /><RecordField form={form} name="inventory.model" label="Tipe / model" /><RecordField form={form} name="inventory.purchasePrice" label="Harga per unit (Rp)" type="number" /><RecordField form={form} name="inventory.quantity" label="Jumlah unit" type="number" /><RecordField form={form} name="inventory.purchaseDate" label="Tanggal pembelian · opsional" type="date" /><RecordField form={form} name="inventory.buyerName" label="Nama pembeli" /><RecordField form={form} name="inventory.purchaseMethod" label="Dibeli melalui" options={['', 'Marketplace online', 'COD', 'Facebook Marketplace', 'Toko fisik', 'Lainnya']} /><RecordField form={form} name="inventory.purchaseDetails" label="Nama marketplace / toko / lokasi" placeholder="Shopee · Toko Kamera Bali" /><RecordField form={form} name="inventory.condition" label="Kondisi" options={['Baru', 'Sangat baik', 'Baik', 'Perlu servis']} /><RecordField form={form} name="inventory.location" label="Lokasi penyimpanan" /><RecordField form={form} name="inventory.notes" label="Catatan barang" type="textarea" wide /></div><div className="invoice-items-footer"><span>Total pengeluaran otomatis dihitung dari harga per unit × jumlah</span><strong>{money(inventoryTotal)}</strong></div>{errors.inventory && <span className="error">Lengkapi data barang inventaris.</span>}</div>}<RecordField form={form} name="amount" label="Jumlah (Rp)" type="number" /></>}<RecordField form={form} name="date" label="Tanggal" type="date" /><RecordField form={form} name="status" label="Status pembayaran" options={['Lunas', 'Belum Dibayar']} /><RecordField form={form} name="notes" label="Catatan" type="textarea" wide /></>}
  </div>{submissionError && <div className="error" role="alert">{submissionError}</div>}<div className="modal-foot">{idValue && !modal.performanceOnly && (kind === 'content' || kind === 'visit') && <button type="button" className="button danger" onClick={async () => { const label = kind === 'content' ? String(item.title || 'konten') : `visit ${String(item.date || '')}`; if (await onDelete(kind, idValue, label)) onClose() }}><Trash2 size={14} /> Hapus {kind === 'content' ? 'konten' : 'visit'}</button>}<button type="button" className="button" onClick={onClose}>{uiText(language, 'Batal')}</button><button type="submit" className="button primary" disabled={isSubmitting || Boolean(thumbnailFile && thumbnailFile.size > 1_600_000)}>{isSubmitting ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
  </form>}</Dialog.Content></Dialog.Portal></Dialog.Root>
}

function PasswordDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const language = useAppLanguage()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      if (result.error) throw new Error('Password saat ini salah atau password baru tidak valid.')
      setCurrentPassword(''); setNewPassword(''); onSuccess()
    } catch { setError('Password saat ini salah atau password baru tidak valid.') }
    finally { setBusy(false) }
  }
  return <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}><Dialog.Portal><Dialog.Overlay className="modal-backdrop" /><Dialog.Content className="modal" style={{ maxWidth: 440 }}><div className="modal-head"><div><Dialog.Title asChild><h2>{uiText(language, 'Ganti password admin')}</h2></Dialog.Title><Dialog.Description className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>{uiText(language, 'Password baru harus berisi minimal 8 karakter.')}</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Tutup"><X size={18} /></button></Dialog.Close></div><form className="modal-body" onSubmit={submit}><div className="field" style={{ marginBottom: 14 }}><label>{uiText(language, 'Password saat ini')}</label><input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div><div className="field"><label>{uiText(language, 'Password baru')}</label><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><span className="field-hint">{uiText(language, 'Gunakan password unik. Sesi lain akan dikeluarkan setelah password diganti.')}</span></div>{error && <div className="error" role="alert" style={{ marginTop: 12 }}>{error}</div>}<div className="modal-foot"><button type="button" className="button" onClick={onClose}>{uiText(language, 'Batal')}</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Ganti password'}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
}

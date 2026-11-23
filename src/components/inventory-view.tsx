import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { Banknote, Download, FileText, Package, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { inventoryItems } from '#/lib/schema'
import { saveInventoryItem } from '#/lib/server'
import { z } from 'zod'

type InventoryItem = Omit<typeof inventoryItems.$inferSelect, 'receiptData'>
const statuses = ['Digunakan', 'Disimpan', 'Perlu Upgrade', 'Dijual', 'Terjual', 'Rusak'] as const
const conditions = ['Baru', 'Sangat baik', 'Baik', 'Perlu servis'] as const
const purchaseMethods = ['Marketplace online', 'COD', 'Facebook Marketplace', 'Toko fisik', 'Lainnya'] as const
const schema = z.object({
  name: z.string().trim().min(1, 'Nama barang wajib diisi.').max(150), brand: z.string().trim().max(100), model: z.string().trim().max(150),
  category: z.string().trim().max(80), serialNumber: z.string().trim().max(120), buyerName: z.string().trim().max(120), purchaseDate: z.string(),
  purchaseMethod: z.enum(purchaseMethods).or(z.literal('')), purchaseDetails: z.string().trim().max(180),
  purchasePrice: z.number().int().min(0, 'Harga tidak boleh negatif.').max(1_000_000_000_000), quantity: z.number().int().min(1).max(10000),
  condition: z.enum(conditions), status: z.enum(statuses), location: z.string().trim().max(160), notes: z.string().trim().max(3000),
})
type FormValues = z.infer<typeof schema>
const blank: FormValues = { name: '', brand: '', model: '', category: '', serialNumber: '', buyerName: '', purchaseDate: '', purchaseMethod: '', purchaseDetails: '', purchasePrice: 0, quantity: 1, condition: 'Baik', status: 'Digunakan', location: '', notes: '' }
const rupiah = (amount: number) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`

export function InventoryView({ items, onReload, onDelete }: { items: InventoryItem[]; onReload: () => Promise<void>; onDelete: (item: InventoryItem) => Promise<boolean> }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Semua status')
  const [sort, setSort] = useState('updated-desc')
  const [editor, setEditor] = useState<InventoryItem | null | 'new'>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase('id')
  const rows = items.filter((item) => (statusFilter === 'Semua status' || item.status === statusFilter) && Object.values(item).some((value) => String(value ?? '').toLocaleLowerCase('id').includes(normalizedSearch))).sort((a, b) => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name, 'id')
    if (sort === 'name-desc') return b.name.localeCompare(a.name, 'id')
    if (sort === 'brand-asc') return a.brand.localeCompare(b.brand, 'id') || a.name.localeCompare(b.name, 'id')
    if (sort === 'purchase-asc') return (a.purchaseDate ?? '9999').localeCompare(b.purchaseDate ?? '9999')
    if (sort === 'purchase-desc') return (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? '')
    if (sort === 'price-desc') return b.purchasePrice - a.purchasePrice
    return b.updatedAt - a.updatedAt
  })
  const units = rows.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = rows.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)
  return <>
    <div className="pagehead"><div><div className="eyebrow">Asset tracker</div><h1>Inventaris</h1><p>Catat perlengkapan, detail pembelian, kondisi, dan nota agar mudah diperiksa saat upgrade atau dijual.</p></div><button className="button primary" onClick={() => setEditor('new')}><Plus size={15} /> Tambah barang</button></div>
    <div className="grid inventory-kpis"><section className="card kpi"><div className="kpi-label">Barang ditemukan<span className="kpi-icon"><Package size={16} /></span></div><div className="kpi-value">{rows.length}</div><div className="kpi-foot">dari {items.length} jenis barang tersimpan</div></section><section className="card kpi"><div className="kpi-label">Total unit<span className="kpi-icon" style={{ background: '#edf7f3', color: '#5b9f8b' }}><Package size={16} /></span></div><div className="kpi-value">{units}</div><div className="kpi-foot">Jumlah unit pada hasil saat ini</div></section><section className="card kpi"><div className="kpi-label">Biaya pembelian<span className="kpi-icon" style={{ background: '#f8f2e7', color: '#bd8b3e' }}><Banknote size={16} /></span></div><div className="kpi-value">{rupiah(totalValue)}</div><div className="kpi-foot">Harga per unit × jumlah unit · hasil saat ini</div></section><section className="card kpi"><div className="kpi-label">Perlu upgrade<span className="kpi-icon" style={{ background: '#eff4f8', color: '#6689a4' }}><RotateCcw size={16} /></span></div><div className="kpi-value">{rows.filter((item) => item.status === 'Perlu Upgrade').length}</div><div className="kpi-foot">Barang dalam hasil yang dipilih</div></section></div>
    <section className="card inventory-toolbar"><label className="inventory-search"><Search size={15} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari semua detail: nama, merek, toko, harga, status, catatan…" />{search && <button className="icon-button inventory-clear-search" type="button" aria-label="Hapus pencarian" title="Hapus pencarian" onClick={() => setSearch('')}><X size={14} /></button>}</label><label className="inventory-control"><span>Status</span><select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Semua status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="inventory-control"><span>Urutkan</span><select className="select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated-desc">Terakhir diperbarui</option><option value="name-asc">Nama A–Z</option><option value="name-desc">Nama Z–A</option><option value="brand-asc">Merek A–Z</option><option value="purchase-desc">Tanggal beli terbaru</option><option value="purchase-asc">Tanggal beli terlama</option><option value="price-desc">Harga beli tertinggi</option></select></label><div className="inventory-results-count" aria-live="polite"><strong>{rows.length}</strong><span>barang ditemukan{normalizedSearch ? <> untuk <b>“{search.trim()}”</b></> : null}</span><small>dari {items.length} barang tersimpan</small></div></section>
    <section className="card inventory-table-card"><div className="card-head"><div><h3>Daftar barang</h3><p>Pilih “Detail” untuk melihat spesifikasi, informasi pembelian, dan catatan lengkap.</p></div></div>{rows.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>Barang</th><th>Merek & tipe</th><th>Tanggal beli</th><th>Jumlah</th><th>Status</th><th>Nota</th><th>Aksi</th></tr></thead><tbody>{rows.map((item) => <InventoryRow key={item.id} item={item} expanded={expanded === item.id} onToggle={() => setExpanded((current) => current === item.id ? null : item.id)} onEdit={() => setEditor(item)} onDelete={() => void onDelete(item)} />)}</tbody></table></div> : <div className="inventory-empty"><span className="inventory-empty-icon"><Package size={20} /></span><strong>{items.length ? 'Tidak ada barang yang cocok.' : 'Inventaris masih kosong.'}</strong><p>{items.length ? 'Coba ubah kata pencarian atau filter status.' : 'Tambahkan kamera, laptop, perlengkapan produksi, atau aset agensi lainnya.'}</p>{!items.length && <button className="button primary" onClick={() => setEditor('new')}><Plus size={14} /> Catat barang pertama</button>}</div>}</section>
    {editor && <InventoryEditor key={editor === 'new' ? 'new' : editor.id} item={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); await onReload() }} />}
  </>
}

function InventoryRow({ item, expanded, onToggle, onEdit, onDelete }: { item: InventoryItem; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const statusClass = item.status === 'Terjual' || item.status === 'Digunakan' ? 'green' : item.status === 'Perlu Upgrade' ? 'orange' : item.status === 'Rusak' ? 'red' : 'neutral'
  return <>
    <tr><td><div className="table-title">{item.name}</div><div className="table-sub">{item.category || 'Kategori belum diisi'}</div></td><td><div className="table-title">{item.brand || '—'}</div><div className="table-sub">{item.model || 'Tipe belum diisi'}</div></td><td>{item.purchaseDate ? format(parseISO(item.purchaseDate), 'd MMM yyyy', { locale: id }) : <span className="muted">Tidak dicatat</span>}</td><td>{item.quantity}</td><td><span className={`badge ${statusClass}`}>{item.status}</span></td><td>{item.receiptFilename ? <a className="inventory-receipt-link" href={`/api/inventory-receipt?inventoryId=${encodeURIComponent(item.id)}`}><Download size={13} /> Unduh</a> : <span className="muted">Belum ada</span>}</td><td><div className="actions inventory-row-actions"><button className="button inventory-detail-button" onClick={onToggle}>{expanded ? 'Tutup detail' : 'Detail'}</button><button className="icon-button" title="Edit barang" aria-label={`Edit ${item.name}`} onClick={onEdit}><Pencil size={14} /></button><button className="icon-button danger-action" title="Hapus barang" aria-label={`Hapus ${item.name}`} onClick={onDelete}><Trash2 size={14} /></button></div></td></tr>
    {expanded && <tr className="inventory-expanded-row"><td colSpan={7}><div className="inventory-detail-grid"><div><small>Nomor seri</small><strong>{item.serialNumber || 'Belum diisi'}</strong></div><div><small>Nama pembeli</small><strong>{item.buyerName || 'Belum diisi'}</strong></div><div><small>Dibeli melalui</small><strong>{item.purchaseMethod || 'Belum dicatat'}</strong></div><div><small>Marketplace / toko / lokasi</small><strong>{item.purchaseDetails || 'Belum dicatat'}</strong></div><div><small>Tanggal pembelian</small><strong>{item.purchaseDate ? format(parseISO(item.purchaseDate), 'd MMM yyyy', { locale: id }) : 'Tidak dicatat'}</strong></div><div><small>Harga pembelian</small><strong>{item.purchasePrice ? rupiah(item.purchasePrice) : 'Belum diisi'}</strong></div><div><small>Kondisi</small><strong>{item.condition}</strong></div><div><small>Lokasi penyimpanan</small><strong>{item.location || 'Belum diisi'}</strong></div><div><small>Terakhir diperbarui</small><strong>{format(new Date(item.updatedAt), 'd MMM yyyy, HH:mm', { locale: id })}</strong></div>{item.notes && <div className="inventory-detail-notes"><small>Catatan</small><p>{item.notes}</p></div>}</div></td></tr>}
  </>
}

function InventoryEditor({ item, onClose, onSaved }: { item?: InventoryItem; onClose: () => void; onSaved: () => Promise<void> }) {
  const [savedId, setSavedId] = useState(item?.id)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptExists, setReceiptExists] = useState(Boolean(item?.receiptFilename))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: item ? { name: item.name, brand: item.brand, model: item.model, category: item.category, serialNumber: item.serialNumber, buyerName: item.buyerName, purchaseDate: item.purchaseDate ?? '', purchaseMethod: item.purchaseMethod as FormValues['purchaseMethod'], purchaseDetails: item.purchaseDetails, purchasePrice: item.purchasePrice, quantity: item.quantity, condition: item.condition as FormValues['condition'], status: item.status as FormValues['status'], location: item.location, notes: item.notes } : blank })
  const { register, handleSubmit, formState: { errors } } = form
  const submit = handleSubmit(async (values) => {
    setBusy(true); setError('')
    try {
      const saved = await saveInventoryItem({ data: { ...values, id: savedId, purchaseDate: values.purchaseDate || null } })
      setSavedId(saved.id)
      if (receipt) {
        const body = new FormData(); body.set('inventoryId', saved.id); body.set('file', receipt)
        const response = await fetch('/api/inventory-receipt', { method: 'POST', body })
        const result = await response.json() as { error?: string }
        if (!response.ok) { setError(result.error || 'Barang tersimpan, tetapi nota gagal diunggah. Coba lagi.'); return }
      }
      await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Barang gagal disimpan.') }
    finally { setBusy(false) }
  })
  const clearReceipt = async () => {
    if (!item) return
    setBusy(true); setError('')
    try { const response = await fetch(`/api/inventory-receipt?inventoryId=${encodeURIComponent(item.id)}`, { method: 'DELETE' }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || 'Nota gagal dihapus.'); setReceiptExists(false); setReceipt(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Nota gagal dihapus.') }
    finally { setBusy(false) }
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose() }}><Dialog.Portal><Dialog.Overlay className="modal-backdrop" /><Dialog.Content className="modal inventory-modal"><div className="modal-head"><div><Dialog.Title>{item ? 'Edit barang inventaris' : 'Tambah barang inventaris'}</Dialog.Title><Dialog.Description>Isi detail yang kamu ketahui. Tanggal pembelian dan nota boleh ditambahkan belakangan.</Dialog.Description></div><button className="icon-button" disabled={busy} aria-label="Tutup" onClick={onClose}><X size={17} /></button></div><form onSubmit={(event) => void submit(event)}><div className="modal-body"><div className="form-grid inventory-form-grid">
    <InventoryField name="name" label="Nama barang *" register={register} error={errors.name?.message} placeholder="Contoh: Kamera mirrorless" />
    <InventoryField name="category" label="Kategori" register={register} placeholder="Contoh: Kamera, audio, komputer" />
    <InventoryField name="brand" label="Merek / brand" register={register} placeholder="Contoh: Sony" />
    <InventoryField name="model" label="Tipe / model lengkap" register={register} placeholder="Contoh: Alpha A7 IV body" />
    <InventoryField name="serialNumber" label="Nomor seri / identitas" register={register} />
    <InventoryField name="buyerName" label="Nama pembeli (atas nama nota)" register={register} />
    <label className="field"><span>Dibeli melalui</span><select className="select" {...register('purchaseMethod')}><option value="">Belum dicatat</option>{purchaseMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
    <InventoryField name="purchaseDetails" label="Nama marketplace / toko / akun / lokasi" register={register} placeholder="Contoh: Shopee · Toko Kamera Bali" />
    <InventoryField name="purchaseDate" label="Tanggal pembelian · opsional" register={register} type="date" />
    <InventoryField name="purchasePrice" label="Harga pembelian (Rp)" register={register} type="number" />
    <InventoryField name="quantity" label="Jumlah unit" register={register} type="number" />
    <label className="field"><span>Kondisi</span><select className="select" {...register('condition')}>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
    <label className="field"><span>Status barang</span><select className="select" {...register('status')}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    <InventoryField name="location" label="Lokasi penyimpanan" register={register} />
    <label className="field wide"><span>Nota pembelian · PDF atau foto, maksimal 1,8 MB</span><input className="input inventory-file-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setReceipt(file); setError(file && file.size > 1_800_000 ? 'File nota maksimal 1,8 MB.' : '') }} />{receiptExists && item && <span className="inventory-existing-receipt"><FileText size={14} /><span>{item.receiptFilename}</span><a className="button" href={`/api/inventory-receipt?inventoryId=${encodeURIComponent(item.id)}`}><Download size={13} /> Unduh nota</a><button type="button" className="button danger" disabled={busy} onClick={() => void clearReceipt()}>Hapus nota</button></span>}<small className="field-hint">Nota tersimpan privat bersama data barang. Format PDF, JPG, PNG, atau WebP.</small></label>
    <label className="field wide"><span>Catatan tambahan</span><textarea className="textarea" {...register('notes')} placeholder="Garansi, kelengkapan, rencana upgrade, atau detail lainnya…" /></label>
    </div>{error && <div className="inventory-error" role="alert">{error}</div>}<div className="modal-foot"><button type="button" className="button" disabled={busy} onClick={onClose}>Batal</button><button type="submit" className="button primary" disabled={busy || Boolean(receipt && receipt.size > 1_800_000)}>{busy ? 'Menyimpan…' : 'Simpan barang'}</button></div></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function InventoryField({ name, label, register, error, placeholder, type = 'text' }: { name: keyof FormValues; label: string; register: ReturnType<typeof useForm<FormValues>>['register']; error?: string; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><input className="input" type={type} placeholder={placeholder} {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)} />{error && <small className="error">{error}</small>}</label>
}

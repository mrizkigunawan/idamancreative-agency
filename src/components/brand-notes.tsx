import { Bell, CalendarDays, Check, Circle, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { brandNotes, brands } from '#/lib/schema'
import { useBrandPrivacy } from '#/components/brand-privacy'

type Note = typeof brandNotes.$inferSelect
type Brand = typeof brands.$inferSelect
const dateLabel = (value: string | null) => {
  if (!value) return 'Tanpa tanggal'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function BrandNotesPanel({ brand, notes, onAdd, onEdit, onDelete, onToggleDone }: { brand: Brand; notes: Note[]; onAdd: () => void; onEdit: (note: Note) => void; onDelete: (note: Note) => void; onToggleDone: (note: Note) => Promise<void> }) {
  const { enabled, aliases, maskText } = useBrandPrivacy()
  const brandLabel = enabled ? aliases[brand.id] ?? 'Brand' : brand.name
  const sorted = [...notes].sort((a, b) => Number(a.isDone) - Number(b.isDone) || (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'))
  const today = new Date().toISOString().slice(0, 10)
  return <section className="brand-notes-panel">
    <div className="card-head"><div><div className="eyebrow">Pengingat & tindak lanjut</div><h3>Catatan {brandLabel}</h3><p>Simpan add-on, event, permintaan khusus, dan hal yang perlu ditindaklanjuti.</p></div>{!enabled && <button className="button primary" onClick={onAdd}><Plus size={14} /> Tambah catatan</button>}</div>
    {sorted.length ? <div className="brand-note-list">{sorted.map((note) => {
      const overdue = !note.isDone && Boolean(note.dueDate && note.dueDate < today)
      return <article className={`brand-note-card ${note.isDone ? 'done' : ''}`} key={note.id}>
        <div className="brand-note-icon">{note.isDone ? <Check size={16} /> : overdue ? <Bell size={16} /> : <Circle size={14} />}</div>
        <div className="brand-note-content"><div className="brand-note-heading"><h4>{maskText(note.title)}</h4><span className={`badge ${note.isDone ? 'neutral' : overdue ? 'red' : 'orange'}`}>{note.isDone ? 'Selesai' : overdue ? 'Terlambat' : note.category}</span></div>{note.details && <p>{enabled ? 'Isi catatan disamarkan' : maskText(note.details)}</p>}<small><CalendarDays size={13} /> {dateLabel(note.dueDate)}{!note.isDone && note.dueDate && note.dueDate === today ? ' · Hari ini' : ''}</small></div>
        {!enabled && <div className="actions"><button className="icon-button" title={note.isDone ? 'Buka kembali' : 'Tandai selesai'} aria-label={note.isDone ? 'Buka kembali catatan' : 'Tandai catatan selesai'} onClick={() => void onToggleDone(note)}>{note.isDone ? <RotateCcw size={14} /> : <Check size={14} />}</button><button className="icon-button" title="Edit catatan" aria-label="Edit catatan" onClick={() => onEdit(note)}><Pencil size={14} /></button><button className="icon-button" title="Hapus catatan" aria-label="Hapus catatan" onClick={() => onDelete(note)}><Trash2 size={14} /></button></div>}
      </article>
    })}</div> : <div className="empty"><Bell size={19} /><p>Belum ada catatan untuk brand ini.</p><button className="button" onClick={onAdd}><Plus size={14} /> Catat pengingat pertama</button></div>}
  </section>
}

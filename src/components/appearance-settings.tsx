import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { accentOptions } from '#/lib/workspace-theme'
import type { WorkspaceAppearance } from '#/lib/workspace-theme'

export function AppearanceSettings({ value, onChange }: { value: WorkspaceAppearance; onChange: (value: WorkspaceAppearance) => void }) {
  return <section className="card profile-page-card appearance-card" aria-labelledby="appearance-heading">
    <div className="card-head"><div><h2 id="appearance-heading">Tampilan workspace</h2><p>Sesuaikan warna dan mode tampilan untuk seluruh workspace.</p></div></div>
    <fieldset className="appearance-group"><legend>Warna aksen</legend><div className="accent-options">
      {accentOptions.map((option) => <label className={`accent-choice${value.themeAccent === option.value ? ' selected' : ''}`} key={option.value}>
        <input className="sr-only" type="radio" name="themeAccent" value={option.value} checked={value.themeAccent === option.value} onChange={() => onChange({ ...value, themeAccent: option.value })} />
        <span className="accent-swatch" style={{ background: option.swatch }} aria-hidden="true" />
        <span><strong>{option.label}</strong><small>{option.description}</small></span>
        {value.themeAccent === option.value && <Check size={16} className="accent-check" aria-hidden="true" />}
      </label>)}
    </div></fieldset>
    <fieldset className="appearance-group"><legend>Mode tampilan</legend><div className="mode-options">
      {([{ value: 'light', label: 'Terang', icon: Sun }, { value: 'dark', label: 'Gelap', icon: Moon }, { value: 'system', label: 'Ikuti sistem', icon: Monitor }] as const).map(({ value: mode, label, icon: Icon }) => <label className={`mode-choice${value.themeMode === mode ? ' selected' : ''}`} key={mode}>
        <input className="sr-only" type="radio" name="themeMode" value={mode} checked={value.themeMode === mode} onChange={() => onChange({ ...value, themeMode: mode })} />
        <Icon size={18} aria-hidden="true" /><span>{label}</span>
      </label>)}
    </div></fieldset>
    <p className="field-hint appearance-note">Pratinjau langsung terlihat di halaman ini. Simpan semua perubahan untuk menerapkan pilihanmu. Warna status dan identitas klien tetap dibedakan.</p>
  </section>
}

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { ProfileImageUpload } from './content-planner'
import { defaultWorkspaceLogo, normalizeWorkspaceProfile } from '#/lib/workspace-profile'
import type { WorkspaceProfileDetails } from '#/lib/workspace-profile'

type ProfilePageProps = {
  user: { name: string; email: string; image?: string | null }
  workspaceProfile: WorkspaceProfileDetails
  onUpdateUser: (name: string, image: string | null) => Promise<void>
  onWorkspaceProfileSaved: (profile: WorkspaceProfileDetails) => void
  onSaved: (name: string, image: string | null) => void
  onBack: () => void
  onChangePassword: () => void
}

export function ProfilePage({ user, workspaceProfile, onUpdateUser, onWorkspaceProfileSaved, onSaved, onBack, onChangePassword }: ProfilePageProps) {
  const [name, setName] = useState(user.name)
  const [image, setImage] = useState(user.image || '')
  const [businessProfile, setBusinessProfile] = useState(workspaceProfile)
  const [workspaceLogo, setWorkspaceLogo] = useState('')
  const [workspaceLogoChanged, setWorkspaceLogoChanged] = useState(false)
  const [workspaceLogoReset, setWorkspaceLogoReset] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    let active = true
    const loadProfile = fetch('/api/workspace-profile', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Profil workspace gagal dimuat. Muat ulang halaman sebelum menyimpan.')
      const profile = await response.json() as WorkspaceProfileDetails
      if (active) setBusinessProfile(normalizeWorkspaceProfile(profile))
    })
    const loadLogo = fetch('/api/workspace-logo', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) {
        if (active) setWorkspaceLogo(defaultWorkspaceLogo)
        return
      }
      const blob = await response.blob()
      await new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (active) setWorkspaceLogo(typeof reader.result === 'string' ? reader.result : defaultWorkspaceLogo)
          resolve()
        }
        reader.onerror = () => { if (active) setWorkspaceLogo(defaultWorkspaceLogo); resolve() }
        reader.readAsDataURL(blob)
      })
    }).catch(() => { if (active) setWorkspaceLogo(defaultWorkspaceLogo) })
    Promise.all([loadProfile, loadLogo]).catch((cause: unknown) => {
      if (active) { setLoadFailed(true); setError(cause instanceof Error ? cause.message : 'Profil gagal dimuat.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || loadFailed || busy || photoBusy || logoBusy) return
    setBusy(true)
    setError('')
    try {
      await onUpdateUser(name.trim(), image.trim() || null)
      const profileResponse = await fetch('/api/workspace-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: businessProfile.name.trim(), ownerName: businessProfile.ownerName.trim() }) })
      const profileResult = await profileResponse.json() as WorkspaceProfileDetails & { error?: string }
      if (!profileResponse.ok) throw new Error(profileResult.error || 'Nama brand gagal disimpan.')
      if (workspaceLogoReset) {
        const response = await fetch('/api/workspace-logo', { method: 'DELETE' })
        if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error || 'Logo default gagal dipulihkan.')
      } else if (workspaceLogoChanged && workspaceLogo) {
        const blob = await (await fetch(workspaceLogo)).blob()
        const form = new FormData()
        form.set('file', new File([blob], 'workspace-logo.jpg', { type: blob.type || 'image/jpeg' }))
        const response = await fetch('/api/workspace-logo', { method: 'POST', body: form })
        if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error || 'Logo workspace gagal disimpan.')
      }
      setWorkspaceLogoChanged(false)
      setWorkspaceLogoReset(false)
      setBusinessProfile(normalizeWorkspaceProfile(profileResult))
      onWorkspaceProfileSaved(normalizeWorkspaceProfile(profileResult))
      onSaved(name.trim(), image.trim() || null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Profil gagal disimpan.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="profile-page">
    <div className="pagehead">
      <div><button type="button" className="profile-back" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> Kembali ke workspace</button><h1 ref={titleRef} tabIndex={-1}>Profil pribadi</h1><p>Kelola identitas akun dan tampilan workspace.</p></div>
    </div>
    <form onSubmit={submit} aria-label="Edit profil" aria-busy={busy || loading}>
      {loading && <p className="muted" role="status">Memuat profil…</p>}
      {error && <p className="error profile-page-error" role="alert">{error}</p>}
      <fieldset className="profile-page-fields" disabled={loading || loadFailed || busy}>
        <section className="card profile-page-card" aria-labelledby="account-heading">
          <div className="card-head"><div><h2 id="account-heading">Informasi akun</h2><p>Nama dan foto yang ditampilkan pada profilmu.</p></div></div>
          <div className="personal-photo-field"><ProfileImageUpload label="Foto profil" value={image} fit="cover" onChange={setImage} onBusyChange={setPhotoBusy} onRemove={() => setImage('')} /></div>
          <div className="personal-profile-fields">
            <label className="field"><span>Nama tampilan</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} pattern=".*\S.*" required /></label>
            <label className="field"><span>Email akun</span><input className="input" value={user.email} readOnly /><small className="field-hint">Email digunakan untuk masuk dan tidak dapat diubah di sini.</small></label>
          </div>
        </section>
        <section className="card profile-page-card" aria-labelledby="workspace-heading">
          <div className="card-head"><div><h2 id="workspace-heading">Identitas workspace</h2><p>Nama brand dan logo agensi.</p></div></div>
          <label className="field"><span>Nama brand</span><input className="input" maxLength={120} value={businessProfile.name} onChange={(event) => setBusinessProfile({ ...businessProfile, name: event.target.value })} pattern=".*\S.*" required /></label>
          <label className="field"><span>Penanggung jawab</span><input className="input" maxLength={120} value={businessProfile.ownerName} onChange={(event) => setBusinessProfile({ ...businessProfile, ownerName: event.target.value })} /><small className="field-hint">Nama penanda tangan dokumen. Kosongkan untuk menggunakan nama workspace.</small></label>
          <div className="workspace-brand-upload"><ProfileImageUpload label="Logo workspace" value={workspaceLogo} fit="contain" onChange={(value) => { setWorkspaceLogo(value); setWorkspaceLogoChanged(true); setWorkspaceLogoReset(false) }} onBusyChange={setLogoBusy} /></div>
          <button type="button" className="button" onClick={() => { setWorkspaceLogoReset(true); setWorkspaceLogoChanged(false); setWorkspaceLogo(defaultWorkspaceLogo) }}>Gunakan logo default</button>
          {workspaceLogoReset && <small className="field-hint">Logo default akan diterapkan saat kamu menyimpan perubahan.</small>}
        </section>
        <div className="profile-page-save"><button type="button" className="button" onClick={onBack}>Batal</button><button className="button primary" type="submit" disabled={loading || busy || photoBusy || logoBusy}>{busy ? 'Menyimpan…' : photoBusy || logoBusy ? 'Memproses gambar…' : 'Simpan semua perubahan'}</button></div>
      </fieldset>
    </form>
    <section className="card profile-page-security" aria-labelledby="security-heading"><div><h2 id="security-heading">Keamanan akun</h2><p>Perbarui kata sandi untuk menjaga keamanan akun admin.</p></div><button type="button" className="button" onClick={onChangePassword} disabled={busy}><KeyRound size={15} aria-hidden="true" /> Ganti password</button></section>
  </div>
}

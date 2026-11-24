import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from '#/lib/auth-client'
import { setupUnavailableMessage } from '#/lib/admin-setup'
import { WorkspaceLogo, useWorkspaceProfile } from './workspace-identity'

type Activation = { email: string; expiresAt: number }

export function AuthView({ needsSetup, onComplete }: { needsSetup: boolean; onComplete: () => Promise<void> }) {
  const identity = useWorkspaceProfile()
  const [activation, setActivation] = useState<Activation | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const inspected = useRef(false)
  const inspectionVersion = useRef(0)
  const [now, setNow] = useState(Date.now)
  const expired = Boolean(activation && now >= activation.expiresAt)

  useEffect(() => {
    // The fragment never reaches the server or referrer. Exchange it for an HttpOnly
    // cookie so refreshing the form works without persisting the link in JS storage.
    const inspect = () => {
      const version = ++inspectionVersion.current
      setChecking(true)
      const fragment = new URLSearchParams(window.location.hash.slice(1))
      const hasToken = fragment.has('activate')
      const token = fragment.get('activate') ?? undefined
      if (hasToken) {
        setActivation(null)
        setError('')
        fragment.delete('activate')
        const remaining = fragment.toString()
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${remaining ? `#${remaining}` : ''}`)
      }
      fetch('/api/auth/admin-setup/inspect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(token === undefined ? {} : { token }),
      }).then(async (response) => {
        if (!response.ok) throw new Error(response.status === 429 ? 'Terlalu banyak percobaan. Tunggu sebentar, lalu muat ulang halaman.' : 'Aktivasi belum dapat diperiksa. Buka kembali tautan aktivasi untuk mencoba lagi.')
        const result = await response.json() as { available: boolean; invalid?: boolean; email?: string; expiresAt?: number }
        if (inspectionVersion.current !== version) return
        if (result.available && result.email && result.expiresAt) {
          setActivation({ email: result.email, expiresAt: result.expiresAt })
          setEmail(result.email)
          setNow(Date.now())
        } else if (hasToken || result.invalid) setError(setupUnavailableMessage)
      }).catch((cause: unknown) => { if (inspectionVersion.current === version) setError(cause instanceof Error ? cause.message : 'Aktivasi belum dapat diperiksa.') })
        .finally(() => { if (inspectionVersion.current === version) setChecking(false) })
    }
    const onHashChange = () => { if (new URLSearchParams(window.location.hash.slice(1)).has('activate')) inspect() }
    window.addEventListener('hashchange', onHashChange)
    if (!inspected.current) { inspected.current = true; inspect() }
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!activation) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activation])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || checking || expired) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (activation) {
        const response = await fetch('/api/auth/admin-setup/activate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), password }),
        })
        const result = await response.json() as { activated?: boolean; signedIn?: boolean; message?: string }
        if (!response.ok || !result.activated) throw new Error(response.status === 429 ? 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.' : result.message || 'Aktivasi belum berhasil. Coba lagi sebelum tautan kedaluwarsa.')
        setActivation(null)
        setPassword('')
        if (!result.signedIn) { setNotice('Akun berhasil diaktifkan. Masuk dengan email dan password yang baru kamu buat.'); return }
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) throw new Error(result.error.status === 429 ? 'Terlalu banyak percobaan masuk. Tunggu sebentar, lalu coba lagi.' : 'Email atau password tidak cocok. Periksa kembali kredensial admin.')
      }
      try { await onComplete() } catch { setNotice('Akun sudah masuk. Muat ulang halaman untuk membuka workspace.') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Permintaan gagal. Coba lagi.') }
    finally { setBusy(false) }
  }

  const loginInstead = () => { setActivation(null); setPassword(''); setError('') }
  return <main className="auth-page">
    <section className="auth-art">
      <div className="brand-logo-panel"><WorkspaceLogo className="auth-art-logo" /></div>
      <div><div className="eyebrow">Creative work, in good order.</div><h2>Satu ruang kerja untuk semua sisi agensi.</h2><p className="quote">Rencanakan konten, jaga hubungan klien, dan pahami kondisi bisnis dari satu workspace yang privat.</p></div>
      <span className="brand-sub">Social media &amp; agency workspace</span>
    </section>
    <section className="auth-form-wrap"><div className="auth-box">
      <WorkspaceLogo className="auth-logo" /><strong className="auth-workspace-name">{identity.name}</strong>
      <div className="eyebrow">{activation ? 'Aktivasi workspace' : 'Admin workspace'}</div>
      <h1>{activation ? 'Mulai workspace kamu' : 'Selamat datang kembali'}</h1>
      <p>{activation ? 'Isi nama dan buat password untuk mengaktifkan akun admin kamu.' : 'Masuk dengan akun admin untuk membuka workspace.'}</p>
      {checking && <p className="muted" role="status">Memeriksa akses…</p>}
      {activation && <div className={`activation-status${expired ? ' expired' : ''}`} role="status"><ShieldCheck size={18} aria-hidden="true" /><div><strong>{expired ? 'Tautan sudah kedaluwarsa' : 'Akses aktivasi terkonfirmasi'}</strong><p>{expired ? 'Minta tautan baru dari pengelola instalasi.' : `Berlaku sampai ${new Date(activation.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} di perangkat ini. Akun hanya dibuat setelah kamu menekan tombol aktivasi.`}</p></div></div>}
      <form onSubmit={submit} aria-label={activation ? 'Aktivasi admin' : 'Masuk admin'} aria-busy={busy || checking}>
        <fieldset className="auth-fields" disabled={busy || checking || expired}>
          {activation && <div className="field"><label htmlFor="auth-name">Nama kamu</label><input id="auth-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} pattern=".*\S.*" placeholder="Nama yang ditampilkan di workspace" /></div>}
          <div className="field"><label htmlFor="auth-email">Email akun</label><input id="auth-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" readOnly={Boolean(activation)} required />{activation && <small className="field-hint">Email ini sudah ditentukan untuk pemilik workspace.</small>}</div>
          <div className="field"><label htmlFor="auth-password">{activation ? 'Buat password' : 'Password'}</label><div className="auth-password-control"><input id="auth-password" className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={activation ? 'new-password' : 'current-password'} minLength={activation ? 8 : undefined} maxLength={128} aria-describedby={activation ? 'auth-password-hint' : undefined} required /><button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{activation && <small id="auth-password-hint" className="field-hint">Minimal 8 karakter. Gunakan password unik dan simpan di password manager.</small>}</div>
          <button className="button primary" type="submit">{busy ? 'Memproses…' : activation ? 'Aktifkan workspace' : 'Masuk ke workspace'}<ArrowRight size={16} aria-hidden="true" /></button>
        </fieldset>
        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="activation-notice" role="status">{notice}</div>}
      </form>
      {activation ? <button className="button ghost auth-switch" type="button" disabled={busy} onClick={loginInstead}>Sudah punya akun? Masuk</button> : needsSetup && !checking && <p className="auth-setup-help">Belum mengaktifkan akun? Buka tautan aktivasi dari pengelola instalasi.</p>}
    </div></section>
  </main>
}

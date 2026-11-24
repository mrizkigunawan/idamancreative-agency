import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'

type ProfileDropdownProps = {
  user: { name: string; email: string; image?: string | null }
  onEditProfile: () => void
  onSignOut: () => Promise<void>
}

export function ProfileDropdown({ user, onEditProfile, onSignOut }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const initial = user.name.trim().slice(0, 1).toUpperCase() || 'A'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const selectAction = (action: () => void) => {
    setOpen(false)
    triggerRef.current?.focus()
    action()
  }

  const signOut = async () => {
    setSigningOut(true)
    setError('')
    try {
      await onSignOut()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal keluar. Coba lagi.')
    } finally {
      setSigningOut(false)
    }
  }

  return <div className="profile-dropdown" ref={rootRef} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button type="button" className="profile-trigger" ref={triggerRef} aria-label={`Profil akun: ${user.name}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)}>
      <span className="profile-avatar" aria-hidden="true">{user.image ? <img src={user.image} alt="" /> : initial}</span>
      <span className="profile-trigger-name">{user.name}</span>
      <ChevronDown size={14} className="profile-chevron" aria-hidden="true" />
    </button>
    {open && <section className="profile-panel" id={panelId} aria-label="Profil akun">
      <div className="profile-summary">
        <span className="profile-avatar" aria-hidden="true">{user.image ? <img src={user.image} alt="" /> : initial}</span>
        <div><strong>{user.name}</strong><span>{user.email}</span><small>Admin · Workspace privat</small></div>
      </div>
      <div className="profile-actions">
        <button type="button" disabled={signingOut} onClick={() => selectAction(onEditProfile)}><UserRound size={16} aria-hidden="true" /> Edit profil</button>
      </div>
      <div className="profile-signout">
        {error && <p className="error" role="alert">{error}</p>}
        <button type="button" disabled={signingOut} aria-busy={signingOut} onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" />{signingOut ? 'Keluar…' : 'Keluar'}</button>
      </div>
    </section>}
  </div>
}

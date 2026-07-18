// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import {
  useState, useEffect, useRef, useCallback,
  type DragEvent, type ChangeEvent,
} from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage } from '@/aurantir-front-kit/lib/storage'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import type { AttachmentMeta } from '@/aurantir-front-kit/types/database.types'
import {
  User, Lock, Bell, Palette, Building2, Shield, Save,
  Eye, EyeOff, CheckCircle, Upload, Trash2, FileText,
  ImageIcon, Loader2, X, Paperclip, FolderOpen, Image,
  Laptop, Smartphone, LogOut, MapPin, RefreshCw,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
type Tab = 'profil' | 'organisation' | 'securite' | 'notifications' | 'apparence'

interface UserSession {
  id:           string
  session_id:   string
  ip_address:   string | null
  user_agent:   string | null
  city:         string | null
  country:      string | null
  last_seen_at: string
  created_at:   string
}

interface PendingUpload {
  uid: string
  file: File
  path: string
  status: 'uploading' | 'done' | 'error'
  localPreview?: string
  errorMsg?: string
}

// ── Constants ──────────────────────────────────────────────────
const ACCEPTED_MIMES = ['application/pdf', 'image/png', 'image/jpeg']
const ACCEPTED_EXT   = '.pdf,.png,.jpg,.jpeg'
const MAX_BYTES      = 5 * 1024 * 1024

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profil',        label: 'Profil',        icon: <User      size={14} /> },
  { id: 'organisation',  label: 'Organisation',  icon: <Building2 size={14} /> },
  { id: 'securite',      label: 'Sécurité',      icon: <Lock      size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell      size={14} /> },
  { id: 'apparence',     label: 'Apparence',     icon: <Palette   size={14} /> },
]

const TIMEZONES = ['Africa/Dakar', 'Europe/Paris', 'UTC', 'America/New_York', 'Asia/Dubai']
const LANGUES   = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]

// ── Helpers ────────────────────────────────────────────────────
function sanitizeFilename(name: string): string {
  const parts  = name.split('.')
  const ext    = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : ''
  const base   = parts.join('.')
  const clean  = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'fichier'
  return clean + ext
}

function formatBytes(n: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

// ── FileRow ────────────────────────────────────────────────────
function FileRow({
  nom, taille, mime, previewSrc, uploading = false, uploadError, onRemove,
}: {
  nom: string; taille: number; mime: string
  previewSrc?: string | null
  uploading?: boolean
  uploadError?: string
  onRemove?: () => void
}) {
  const isImage = mime.startsWith('image/')
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-150 group ${
      uploadError ? 'border-red/30 bg-red/5' : 'border-slate-800 bg-background-elevated hover:border-slate-700'
    }`}>
      {/* Preview / icon */}
      <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center bg-surface flex-shrink-0 border border-slate-800">
        {previewSrc
          ? <img src={previewSrc} alt={nom} className="w-full h-full object-cover" />
          : isImage
            ? <Image size={14} className="text-violet" />
            : <FileText size={14} className="text-blue" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{nom}</p>
        <p className="text-2xs text-text-muted">
          {uploadError ? (
            <span className="text-red">{uploadError}</span>
          ) : (
            formatBytes(taille)
          )}
        </p>
      </div>

      {/* Status */}
      {uploading ? (
        <Loader2 size={13} className="text-blue animate-spin flex-shrink-0" />
      ) : !uploadError && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-md text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Retirer ce fichier"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  )
}

// ── FileUploadZone ─────────────────────────────────────────────
function FileUploadZone({
  bucket, basePath, files, onChange, onNewUpload, disabled = false, singleFile = false,
}: {
  bucket: string
  basePath: string
  files: AttachmentMeta[]
  onChange: (files: AttachmentMeta[]) => void
  onNewUpload: (path: string) => void
  disabled?: boolean
  singleFile?: boolean
}) {
  const [dragging, setDragging]   = useState(false)
  const [queue,    setQueue]      = useState<PendingUpload[]>([])
  const [errors,   setErrors]     = useState<string[]>([])
  const inputRef                  = useRef<HTMLInputElement>(null)
  const supabase                  = createClient()

  function validate(f: File): string | null {
    if (!ACCEPTED_MIMES.includes(f.type))
      return `"${f.name}" : format non accepté (PDF, PNG, JPG uniquement)`
    if (f.size > MAX_BYTES)
      return `"${f.name}" : fichier trop lourd — ${formatBytes(f.size)} (max 5 Mo)`
    return null
  }

  async function processFiles(rawFiles: FileList | File[]) {
    const list = Array.from(rawFiles)
    const errs: string[] = []
    const valid: File[]  = []
    for (const f of list) {
      const e = validate(f)
      e ? errs.push(e) : valid.push(f)
    }
    setErrors(errs)
    if (!valid.length) return

    const toProcess = singleFile ? [valid[valid.length - 1]] : valid
    let currentFiles = singleFile ? [] : [...files]

    for (const file of toProcess) {
      const uid        = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const safeName   = sanitizeFilename(file.name)
      const path       = `${basePath}/${Date.now()}-${safeName}`
      const localPreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

      const pending: PendingUpload = { uid, file, path, status: 'uploading', localPreview }
      setQueue(q => [...q, pending])

      const { storedPath, error } = await uploadToStorage(supabase, bucket, path, file, {
        cacheControl: '3600', upsert: false,
      })

      if (error) {
        setQueue(q => q.map(p => p.uid === uid ? { ...p, status: 'error', errorMsg: error.message } : p))
        setTimeout(() => setQueue(q => q.filter(p => p.uid !== uid)), 4000)
        continue
      }

      const newFile: AttachmentMeta = { nom: file.name, path: storedPath, taille: file.size, mime: file.type }
      onNewUpload(storedPath)
      currentFiles = [...currentFiles, newFile]
      onChange(currentFiles)

      setQueue(q => q.map(p => p.uid === uid ? { ...p, status: 'done' } : p))
      if (localPreview) setTimeout(() => URL.revokeObjectURL(localPreview), 2000)
      setTimeout(() => setQueue(q => q.filter(p => p.uid !== uid)), 1500)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false)
    if (!disabled) processFiles(Array.from(e.dataTransfer.files))
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function removeFile(path: string) {
    onChange(files.filter(f => f.path !== path))
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-xl border border-dashed transition-all duration-150',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          dragging
            ? 'border-blue/60 bg-blue/5 scale-[1.01]'
            : 'border-slate-700 bg-background-elevated hover:bg-slate-900/50 hover:border-slate-600',
        ].join(' ')}
      >
        <div className={`p-2 rounded-xl transition-colors ${dragging ? 'bg-blue/10' : 'bg-surface'}`}>
          <Upload size={16} className={dragging ? 'text-blue' : 'text-text-muted'} />
        </div>
        <p className="text-xs text-text-muted text-center leading-relaxed">
          <span className="text-text-secondary font-medium">Cliquez pour parcourir</span>
          {' '}ou glissez vos fichiers ici
        </p>
        <p className="text-2xs text-text-muted/70">PDF · PNG · JPG · 5 Mo max</p>
        <input
          ref={inputRef}
          type="file"
          multiple={!singleFile}
          accept={ACCEPTED_EXT}
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
      </div>

      {/* Validation errors */}
      {errors.map((err, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red/5 border border-red/20">
          <X size={11} className="text-red mt-0.5 flex-shrink-0" />
          <p className="text-2xs text-red leading-relaxed">{err}</p>
        </div>
      ))}

      {/* In-progress uploads */}
      {queue.filter(p => p.status === 'uploading').map(p => (
        <FileRow
          key={p.uid}
          nom={p.file.name}
          taille={p.file.size}
          mime={p.file.type}
          previewSrc={p.localPreview}
          uploading
        />
      ))}
      {queue.filter(p => p.status === 'error').map(p => (
        <FileRow
          key={p.uid}
          nom={p.file.name}
          taille={p.file.size}
          mime={p.file.type}
          uploadError={p.errorMsg || 'Erreur d\'upload'}
        />
      ))}

      {/* Saved files */}
      {files.map(f => (
        <FileRow
          key={f.path}
          nom={f.nom}
          taille={f.taille}
          mime={f.mime}
          onRemove={() => removeFile(f.path)}
        />
      ))}
    </div>
  )
}

// ── Présence ──────────────────────────────────────────────────
function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000
}

// ── UA parser ─────────────────────────────────────────────────
function parseUA(ua: string | null): { label: string; isMobile: boolean } {
  if (!ua) return { label: 'Appareil inconnu', isMobile: false }

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua)

  let browser = 'Navigateur'
  if (/Edg\//.test(ua))                                    browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua))                        browser = 'Opera'
  else if (/Firefox\//.test(ua))                          browser = 'Firefox'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua))  browser = 'Chrome'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua))    browser = 'Safari'

  let os = ''
  if (/iPhone/.test(ua))                         os = 'iPhone'
  else if (/iPad/.test(ua))                      os = 'iPad'
  else if (/Android/.test(ua))                   os = 'Android'
  else if (/Windows NT/.test(ua))                os = 'Windows'
  else if (/Mac OS X/.test(ua))                  os = 'macOS'
  else if (/Linux/.test(ua))                     os = 'Linux'

  return { label: os ? `${browser} sur ${os}` : browser, isMobile }
}

// ── SectionHeader helper ───────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex items-center gap-2 text-text-muted">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex-1 h-px bg-surface-border" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const { user, entiteActive, setTheme } = useAppStore()
  const [tab,    setTab]       = useState<Tab>('profil')
  const [saving, setSaving]    = useState(false)
  const [saved,  setSaved]     = useState(false)
  const supabase               = createClient()

  // Orphan tracking — paths uploaded but not yet committed to DB
  const orphanRef = useRef<string[]>([])

  // Cleanup orphans on unmount
  useEffect(() => {
    return () => {
      if (orphanRef.current.length > 0) {
        const sb = createClient()
        sb.storage.from('settings').remove([...orphanRef.current])
      }
    }
  }, [])

  // ── Profil state ───────────────────────────────────────────
  const [profil, setProfil] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    timezone: 'Africa/Dakar', langue: 'fr',
  })
  const [profilDocs,      setProfilDocs]      = useState<AttachmentMeta[]>([])
  const [savedProfilDocs, setSavedProfilDocs] = useState<AttachmentMeta[]>([])
  const profilToDelete = useRef<string[]>([])

  // ── Organisation state ────────────────────────────────────
  const [org, setOrg] = useState({
    nom: '', email_contact: '', telephone: '',
    adresse: '', ninea: '', rc: '', capital_social: '',
  })
  const [orgLogo,        setOrgLogo]        = useState<AttachmentMeta | null>(null)
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
  const [orgDocs,        setOrgDocs]        = useState<AttachmentMeta[]>([])
  const [savedOrgLogo,   setSavedOrgLogo]   = useState<AttachmentMeta | null>(null)
  const [savedOrgDocs,   setSavedOrgDocs]   = useState<AttachmentMeta[]>([])
  const orgToDelete = useRef<string[]>([])

  // ── Sécurité state ────────────────────────────────────────
  const [mdp, setMdp]           = useState({ nouveau: '', confirmation: '' })
  const [showMdp, setShowMdp]   = useState(false)
  const [mdpError, setMdpError] = useState('')

  // ── Sessions state ────────────────────────────────────────
  const [sessions,         setSessions]         = useState<UserSession[]>([])
  const [sessionsLoading,  setSessionsLoading]  = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [revokingId,       setRevokingId]       = useState<string | null>(null)
  const [revokingAll,      setRevokingAll]       = useState(false)

  // ── Notifications state ───────────────────────────────────
  const [notifs, setNotifs] = useState({
    email_factures: true, email_projets: true, email_rapports: false,
    email_membres: false, push_messages: true, push_alertes: true, push_mentions: true,
  })

  // ── Apparence state ───────────────────────────────────────
  const [apparence, setApparence] = useState({ theme: 'sombre', densite: 'confortable' })

  // ── Load profil ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setProfil({
      prenom:    user.prenom || '',
      nom:       user.nom || '',
      email:     user.email || '',
      telephone: (user as never as { telephone?: string }).telephone || '',
      timezone:  user.timezone || 'Africa/Dakar',
      langue:    user.langue || 'fr',
    })
    const t = (user.theme || 'sombre') as 'sombre' | 'clair'
    setApparence({
      theme:   t,
      densite: (user as never as { densite?: string }).densite || 'confortable',
    })
    setTheme(t)
    const docs = Array.isArray(user.documents_justificatifs) ? user.documents_justificatifs : []
    setProfilDocs(docs)
    setSavedProfilDocs(docs)
  }, [user])

  // ── Load organisation ─────────────────────────────────────
  const loadOrg = useCallback(async () => {
    if (!entiteActive?.id) return
    const { data } = await supabase
      .from('entites_legales')
      .select('*')
      .eq('id', entiteActive.id)
      .single()
    if (!data) return

    setOrg({
      nom:            data.nom || '',
      email_contact:  data.email_contact || '',
      telephone:      data.telephone || '',
      adresse:        data.adresse || '',
      ninea:          data.ninea || '',
      rc:             data.rc || '',
      capital_social: data.capital_social?.toString() || '',
    })

    const logo = data.logo_url ? { nom: 'Logo', path: data.logo_url, taille: 0, mime: 'image/png' } : null
    setOrgLogo(logo)
    setSavedOrgLogo(logo)
    if (data.logo_url) {
      const { data: signed } = await supabase.storage.from('settings').createSignedUrl(data.logo_url, 3600)
      if (signed?.signedUrl) setOrgLogoPreview(signed.signedUrl)
    }

    const docs = data.documents_legaux || []
    setOrgDocs(docs)
    setSavedOrgDocs(docs)
  }, [entiteActive?.id])

  useEffect(() => { if (tab === 'organisation') loadOrg() }, [tab, loadOrg])

  // ── Load sessions on securite tab ─────────────────────────
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res  = await fetch('/api/sessions')
      const json = await res.json()
      if (json.sessions) setSessions(json.sessions)
      if (json.currentSessionId) setCurrentSessionId(json.currentSessionId)
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => { if (tab === 'securite') loadSessions() }, [tab, loadSessions])

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } finally {
      setRevokingId(null)
    }
  }

  const revokeAllOthers = async () => {
    setRevokingAll(true)
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'others' }),
      })
      setSessions(prev => prev.filter(s => s.session_id === currentSessionId))
    } finally {
      setRevokingAll(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'fondateur'
  const hasUnsavedFiles = Array.isArray(profilDocs) && profilDocs.some(d => !savedProfilDocs.find(s => s.path === d.path))

  // ── Save profil ───────────────────────────────────────────
  async function saveProfil() {
    setSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setSaving(false); return }

    // Delete removed files from storage
    const removed = savedProfilDocs.filter(d => !profilDocs.find(p => p.path === d.path))
    if (removed.length) await supabase.storage.from('settings').remove(removed.map(d => d.path))

    await supabase.from('users').update({
      prenom:    profil.prenom,
      nom:       profil.nom,
      telephone: profil.telephone,
      timezone:  profil.timezone,
      langue:    profil.langue,
      documents_justificatifs: JSON.stringify(profilDocs),
    }).eq('auth_user_id', authUser.id)

    // Confirm orphans
    orphanRef.current = orphanRef.current.filter(p => !profilDocs.find(d => d.path === p))
    profilToDelete.current = []
    setSavedProfilDocs([...profilDocs])
    setSaving(false); flashSaved()
  }

  // Cancel profil file changes
  async function cancelProfilDocs() {
    // Delete orphan uploads
    const toClean = orphanRef.current.filter(p => profilDocs.find(d => d.path === p))
    if (toClean.length) await supabase.storage.from('settings').remove(toClean)
    orphanRef.current = orphanRef.current.filter(p => !toClean.includes(p))
    setProfilDocs([...savedProfilDocs])
  }

  // ── Save organisation ─────────────────────────────────────
  async function saveOrg() {
    if (!entiteActive?.id) return
    setSaving(true)

    // Delete removed files from storage
    const removedDocs = savedOrgDocs.filter(d => !orgDocs.find(p => p.path === d.path))
    if (removedDocs.length) await supabase.storage.from('settings').remove(removedDocs.map(d => d.path))
    if (savedOrgLogo && !orgLogo) await supabase.storage.from('settings').remove([savedOrgLogo.path])
    else if (savedOrgLogo && orgLogo && savedOrgLogo.path !== orgLogo.path) {
      await supabase.storage.from('settings').remove([savedOrgLogo.path])
    }

    await supabase.from('entites_legales').update({
      nom:            org.nom,
      email_contact:  org.email_contact || null,
      telephone:      org.telephone || null,
      adresse:        org.adresse || null,
      ninea:          org.ninea || null,
      rc:             org.rc || null,
      capital_social: org.capital_social ? parseFloat(org.capital_social) : null,
      logo_url:       orgLogo?.path || null,
      documents_legaux: JSON.stringify(orgDocs),
    }).eq('id', entiteActive.id)

    // Confirm orphans
    orphanRef.current = orphanRef.current.filter(p =>
      !orgDocs.find(d => d.path === p) && orgLogo?.path !== p
    )
    orgToDelete.current = []
    setSavedOrgLogo(orgLogo ? { ...orgLogo } : null)
    setSavedOrgDocs([...orgDocs])
    setSaving(false); flashSaved()
  }

  // ── Save mdp ──────────────────────────────────────────────
  async function saveMdp() {
    setMdpError('')
    if (mdp.nouveau.length < 8) { setMdpError('Minimum 8 caractères'); return }
    if (mdp.nouveau !== mdp.confirmation) { setMdpError('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: mdp.nouveau })
    setSaving(false)
    if (error) { setMdpError(error.message); return }
    setMdp({ nouveau: '', confirmation: '' }); flashSaved()
  }

  async function saveNotifs() {
    setSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) await supabase.from('users').update({ preferences_notifications: notifs }).eq('auth_user_id', authUser.id)
    setSaving(false); flashSaved()
  }

  async function saveApparence() {
    setSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) await supabase.from('users').update({ theme: apparence.theme, densite: apparence.densite }).eq('auth_user_id', authUser.id)
    setTheme(apparence.theme as 'sombre' | 'clair')
    setSaving(false); flashSaved()
  }

  const inputCls   = "w-full bg-background-elevated border border-slate-800 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue/50 transition-colors"
  const labelCls   = "text-xs font-medium text-text-muted"
  const fieldCls   = "space-y-1.5"

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Gérez votre compte et les préférences de la plateforme</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-green text-xs animate-fade-in">
            <CheckCircle size={14} /> Enregistré
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-surface-border rounded-xl p-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-background-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Profil ──────────────────────────────────────────── */}
      {tab === 'profil' && (
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue/15 flex items-center justify-center text-blue text-xl font-bold border border-blue/20 flex-shrink-0">
              {profil.prenom?.[0]?.toUpperCase()}{profil.nom?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{profil.prenom} {profil.nom}</p>
              <p className="text-xs text-text-muted">{profil.email}</p>
              <p className="text-2xs text-text-disabled capitalize mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="h-px bg-surface-border" />

          <div className="grid grid-cols-2 gap-4">
            <div className={fieldCls}>
              <label className={labelCls}>Prénom</label>
              <input className={inputCls} value={profil.prenom} onChange={e => setProfil({ ...profil, prenom: e.target.value })} />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Nom</label>
              <input className={inputCls} value={profil.nom} onChange={e => setProfil({ ...profil, nom: e.target.value })} />
            </div>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Email</label>
            <input value={profil.email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
            <p className="text-2xs text-text-muted">L&apos;email ne peut pas être modifié depuis ici.</p>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Téléphone</label>
            <input className={inputCls} type="tel" value={profil.telephone}
              onChange={e => setProfil({ ...profil, telephone: e.target.value })}
              placeholder="+221 XX XXX XX XX" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={fieldCls}>
              <label className={labelCls}>Fuseau horaire</label>
              <select className={inputCls} value={profil.timezone} onChange={e => setProfil({ ...profil, timezone: e.target.value })}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Langue</label>
              <select className={inputCls} value={profil.langue} onChange={e => setProfil({ ...profil, langue: e.target.value })}>
                {LANGUES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Documents justificatifs ── */}
          <SectionHeader icon={<Paperclip size={13} />} label="Documents justificatifs" />
          <p className="text-xs text-text-muted -mt-1">
            Carte d&apos;identité, contrat de travail, diplômes… (PDF ou image, 5 Mo max)
          </p>
          <FileUploadZone
            bucket="settings"
            basePath={`profil/${user?.id}`}
            files={profilDocs}
            onChange={setProfilDocs}
            onNewUpload={path => { orphanRef.current.push(path) }}
          />

          <div className="flex items-center gap-2 pt-1">
            <Button icon={<Save size={14} />} loading={saving} onClick={saveProfil}>
              Enregistrer le profil
            </Button>
            {hasUnsavedFiles && (
              <button
                type="button"
                onClick={cancelProfilDocs}
                className="text-xs text-text-muted hover:text-red transition-colors px-2 py-1.5 rounded-lg hover:bg-red/5"
              >
                Annuler les fichiers
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Organisation ────────────────────────────────────── */}
      {tab === 'organisation' && (
        <div className="space-y-4">
          {!isAdmin ? (
            <div className="bg-surface border border-surface-border rounded-xl p-6 text-center space-y-2">
              <Shield size={28} className="mx-auto text-text-muted opacity-40" />
              <p className="text-sm text-text-secondary font-medium">Accès restreint</p>
              <p className="text-xs text-text-muted">Seuls les fondateurs et super-admins peuvent modifier les informations de l&apos;organisation.</p>
            </div>
          ) : (
            <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-5">
              {/* Infos générales */}
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Building2 size={14} className="text-blue" /> Informations générales
              </h3>

              <div className={fieldCls}>
                <label className={labelCls}>Nom de la structure</label>
                <input className={inputCls} value={org.nom} onChange={e => setOrg({ ...org, nom: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>Email de contact</label>
                  <input className={inputCls} type="email" value={org.email_contact}
                    onChange={e => setOrg({ ...org, email_contact: e.target.value })}
                    placeholder="contact@societe.sn" />
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Téléphone</label>
                  <input className={inputCls} type="tel" value={org.telephone}
                    onChange={e => setOrg({ ...org, telephone: e.target.value })}
                    placeholder="+221 33 XXX XX XX" />
                </div>
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Adresse</label>
                <input className={inputCls} value={org.adresse}
                  onChange={e => setOrg({ ...org, adresse: e.target.value })}
                  placeholder="Rue, Ville, Pays" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className={fieldCls}>
                  <label className={labelCls}>NINEA</label>
                  <input className={inputCls} value={org.ninea}
                    onChange={e => setOrg({ ...org, ninea: e.target.value })}
                    placeholder="XXXXXXXXX" />
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Registre Commercial</label>
                  <input className={inputCls} value={org.rc}
                    onChange={e => setOrg({ ...org, rc: e.target.value })}
                    placeholder="SN-DKR-XXXX" />
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Capital social (FCFA)</label>
                  <input className={inputCls} type="number" min="0" value={org.capital_social}
                    onChange={e => setOrg({ ...org, capital_social: e.target.value })}
                    placeholder="1 000 000" />
                </div>
              </div>

              {/* ── Logo officiel ── */}
              <SectionHeader icon={<ImageIcon size={13} />} label="Logo officiel" />
              <p className="text-xs text-text-muted -mt-1">Format PNG ou JPG recommandé, fond transparent idéal · 5 Mo max</p>

              {orgLogo ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background-elevated border border-slate-800">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface border border-slate-800 flex items-center justify-center flex-shrink-0">
                    {orgLogoPreview
                      ? <img src={orgLogoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                      : <Image size={20} className="text-text-muted" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary">Logo actuel</p>
                    <p className="text-2xs text-text-muted mt-0.5">Cliquez sur Remplacer pour changer le logo</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label
                      className="px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface border border-slate-800 text-text-secondary hover:bg-surface-hover hover:text-text-primary cursor-pointer transition-colors"
                      title="Remplacer le logo"
                    >
                      Remplacer
                      <input type="file" accept=".png,.jpg,.jpeg" className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            const f = e.target.files[0]
                            if (f.size > MAX_BYTES) return
                            if (!['image/png','image/jpeg'].includes(f.type)) return
                            const safeName = sanitizeFilename(f.name)
                            const path = `organisation/${entiteActive?.id}/logo/${Date.now()}-${safeName}`
                            const preview = URL.createObjectURL(f)
                            setOrgLogoPreview(preview)
                            const newLogo: AttachmentMeta = { nom: f.name, path, taille: f.size, mime: f.type }
                            uploadToStorage(supabase, 'settings', path, f, { upsert: false }).then(({ error }) => {
                              if (!error) { setOrgLogo(newLogo); orphanRef.current.push(path) }
                            })
                          }
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setOrgLogo(null); setOrgLogoPreview(null) }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors"
                      title="Supprimer le logo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <FileUploadZone
                  bucket="settings"
                  basePath={`organisation/${entiteActive?.id}/logo`}
                  files={[]}
                  singleFile
                  onChange={files => {
                    const f = files[0]
                    if (!f) return
                    setOrgLogo(f)
                    if (f.mime.startsWith('image/')) {
                      supabase.storage.from('settings').createSignedUrl(f.path, 3600)
                        .then(({ data }: any) => { if (data?.signedUrl) setOrgLogoPreview(data.signedUrl) })
                    }
                  }}
                  onNewUpload={path => { orphanRef.current.push(path) }}
                />
              )}

              {/* ── Documents légaux ── */}
              <SectionHeader icon={<FolderOpen size={13} />} label="Documents légaux" />
              <p className="text-xs text-text-muted -mt-1">
                Statuts, RCCM, NINEA officiel, contrats-types… (PDF ou image · 5 Mo max)
              </p>
              <FileUploadZone
                bucket="settings"
                basePath={`organisation/${entiteActive?.id}/documents`}
                files={orgDocs}
                onChange={setOrgDocs}
                onNewUpload={path => { orphanRef.current.push(path) }}
              />

              <div className="pt-1">
                <Button icon={<Save size={14} />} loading={saving} onClick={saveOrg}>
                  Enregistrer l&apos;organisation
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sécurité ─────────────────────────────────────────── */}
      {tab === 'securite' && (
        <div className="space-y-4">
          <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Lock size={14} className="text-blue" /> Changer le mot de passe
            </h3>
            <div className="space-y-3">
              <div className={`${fieldCls} relative`}>
                <label className={labelCls}>Nouveau mot de passe</label>
                <div className="relative">
                  <input className={`${inputCls} pr-10`} type={showMdp ? 'text' : 'password'}
                    value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowMdp(!showMdp)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    {showMdp ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-2xs text-text-muted">8 caractères minimum</p>
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Confirmer le mot de passe</label>
                <input className={inputCls} type="password" value={mdp.confirmation}
                  onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} placeholder="••••••••" />
              </div>
              {mdpError && <p className="text-xs text-red">{mdpError}</p>}
            </div>
            {mdp.nouveau && (
              <div className="space-y-1">
                <p className="text-2xs text-text-muted">Force du mot de passe</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(n => {
                    const force = [
                      mdp.nouveau.length >= 8,
                      /[A-Z]/.test(mdp.nouveau),
                      /[0-9]/.test(mdp.nouveau),
                      /[^a-zA-Z0-9]/.test(mdp.nouveau),
                    ].filter(Boolean).length
                    return <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= force ? force >= 4 ? 'bg-green' : force >= 2 ? 'bg-amber' : 'bg-red' : 'bg-surface-border'}`} />
                  })}
                </div>
              </div>
            )}
            <Button icon={<Shield size={14} />} loading={saving} onClick={saveMdp} disabled={!mdp.nouveau}>
              Mettre à jour le mot de passe
            </Button>
          </div>

          <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Shield size={14} className="text-amber" /> Double authentification
            </h3>
            <p className="text-xs text-text-muted">La 2FA ajoute une couche de sécurité supplémentaire.</p>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-text-secondary">Authentification par application</p>
                <p className="text-2xs text-text-muted">Google Authenticator, Authy…</p>
              </div>
              <div className="w-10 h-5 bg-surface-border rounded-full relative cursor-not-allowed opacity-40">
                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
              </div>
            </div>
            <p className="text-2xs text-text-muted">Fonctionnalité à venir.</p>
          </div>

          {/* ── Sessions actives ──────────────────────────────── */}
          <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Shield size={14} className="text-violet" />
                Sessions actives &amp; appareils
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSessions}
                  disabled={sessionsLoading}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw size={13} className={sessionsLoading ? 'animate-spin' : ''} />
                </button>
                {sessions.filter(s => s.session_id !== currentSessionId).length > 0 && (
                  <button
                    onClick={revokeAllOthers}
                    disabled={revokingAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-2xs font-medium rounded-lg border border-red/30 text-red/70 hover:bg-red/10 hover:text-red transition-colors disabled:opacity-50"
                  >
                    {revokingAll
                      ? <Loader2 size={11} className="animate-spin" />
                      : <LogOut size={11} />
                    }
                    Déconnecter les autres
                  </button>
                )}
              </div>
            </div>

            <p className="text-2xs text-text-muted -mt-1">
              Appareils actuellement connectés à votre compte. Déconnectez les sessions que vous ne reconnaissez pas.
            </p>

            {/* Skeleton */}
            {sessionsLoading && sessions.length === 0 ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-background-elevated border border-surface-border animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-surface-border flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-border rounded w-1/2" />
                      <div className="h-2.5 bg-surface-border rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">
                Aucune session active trouvée.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => {
                  const isCurrent = s.session_id === currentSessionId
                  const { label: deviceLabel, isMobile } = parseUA(s.user_agent)
                  const location = [s.city, s.country].filter(Boolean).join(', ')
                  const isRevoking = revokingId === s.session_id

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'bg-emerald-900/10 border-emerald-800/40'
                          : 'bg-background-elevated border-surface-border hover:border-slate-700'
                      }`}
                    >
                      {/* Device icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCurrent ? 'bg-emerald-900/30 text-emerald-400' : 'bg-surface text-text-muted'
                      }`}>
                        {isMobile
                          ? <Smartphone size={15} />
                          : <Laptop size={15} />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-text-primary truncate">{deviceLabel}</p>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Cet appareil
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {s.ip_address && (
                            <span className="text-2xs text-text-muted font-mono">
                              {s.ip_address}
                            </span>
                          )}
                          {location && (
                            <span className="flex items-center gap-1 text-2xs text-text-muted">
                              <MapPin size={10} />
                              {location}
                            </span>
                          )}
                          {isCurrent ? (
                            <span className="flex items-center gap-1 text-2xs text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              En ligne
                            </span>
                          ) : isOnline(s.last_seen_at) ? (
                            <span className="flex items-center gap-1 text-2xs text-emerald-500/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                              En ligne
                            </span>
                          ) : (
                            <span className="text-2xs text-text-disabled">
                              Vu {formatRelativeTime(s.last_seen_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Revoke (only non-current sessions) */}
                      {!isCurrent && (
                        <button
                          onClick={() => revokeSession(s.session_id)}
                          disabled={isRevoking}
                          title="Déconnecter cet appareil"
                          className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors flex-shrink-0 disabled:opacity-50"
                        >
                          {isRevoking
                            ? <Loader2 size={14} className="animate-spin" />
                            : <LogOut size={14} />
                          }
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Notifications ────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Bell size={14} className="text-blue" /> Préférences de notification
          </h3>
          {[
            { titre: 'Par email', items: [
              { key: 'email_factures', label: 'Factures',  desc: 'Nouvelles factures et rappels d\'échéance' },
              { key: 'email_projets',  label: 'Projets',   desc: 'Mises à jour des projets assignés' },
              { key: 'email_rapports', label: 'Rapports',  desc: 'Publication de nouveaux rapports' },
              { key: 'email_membres',  label: 'Membres',   desc: 'Nouveaux membres et changements de rôle' },
            ]},
            { titre: 'In-app', items: [
              { key: 'push_messages', label: 'Messages', desc: 'Nouveaux messages dans la messagerie' },
              { key: 'push_alertes',  label: 'Alertes',  desc: 'Alertes de sécurité et système' },
              { key: 'push_mentions', label: 'Mentions', desc: 'Quand quelqu\'un vous mentionne' },
            ]},
          ].map(group => (
            <div key={group.titre}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{group.titre}</p>
              <div className="space-y-3">
                {group.items.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">{label}</p>
                      <p className="text-2xs text-text-muted">{desc}</p>
                    </div>
                    <button onClick={() => setNotifs({ ...notifs, [key]: !notifs[key as keyof typeof notifs] })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${notifs[key as keyof typeof notifs] ? 'bg-blue' : 'bg-surface-border'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${notifs[key as keyof typeof notifs] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              {group.titre === 'Par email' && <div className="h-px bg-surface-border mt-4" />}
            </div>
          ))}
          <Button icon={<Save size={14} />} loading={saving} onClick={saveNotifs}>Enregistrer</Button>
        </div>
      )}

      {/* ── Apparence ────────────────────────────────────────── */}
      {tab === 'apparence' && (
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Palette size={14} className="text-violet" /> Apparence
          </h3>
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Thème</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'sombre', label: 'Sombre', preview: 'bg-[#0A0D14] border-white/10' },
                { value: 'clair',  label: 'Clair',  preview: 'bg-white border-gray-200' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setApparence({ ...apparence, theme: opt.value })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${apparence.theme === opt.value ? 'border-blue' : 'border-surface-border hover:border-blue/30'}`}>
                  <div className={`h-16 rounded-lg border ${opt.preview} mb-2 flex items-end p-2 gap-1`}>
                    <div className={`w-1/3 h-2 rounded ${opt.value === 'sombre' ? 'bg-white/20' : 'bg-gray-200'}`} />
                    <div className={`w-1/2 h-3 rounded ${opt.value === 'sombre' ? 'bg-blue/40' : 'bg-blue/20'}`} />
                  </div>
                  <p className="text-xs font-medium text-text-primary">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Densité de l&apos;interface</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'confortable', label: 'Confortable', desc: 'Plus d\'espacement entre les éléments' },
                { value: 'compact',     label: 'Compact',     desc: 'Affichage condensé, plus d\'infos à l\'écran' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setApparence({ ...apparence, densite: opt.value })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${apparence.densite === opt.value ? 'border-blue bg-blue/5' : 'border-surface-border hover:border-blue/30'}`}>
                  <p className="text-xs font-semibold text-text-primary">{opt.label}</p>
                  <p className="text-2xs text-text-muted mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button icon={<Save size={14} />} loading={saving} onClick={saveApparence}>Enregistrer</Button>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  Folder, File, FileText, Image, Archive,
  Search, ChevronRight, Lock, Eye, EyeOff,
  Download, Upload, Grid, List, X,
  Home, FolderPlus, Key, Trash2, Users, Globe, ShieldAlert, Briefcase,
  Bell, Check, UserPlus, MessageSquare, ChevronDown,
} from 'lucide-react'

// ── Interfaces ─────────────────────────────────────────────────
type Classification = 'public' | 'sensible' | 'projet'

interface Dossier {
  id: string
  nom: string
  description?: string
  parent_id?: string
  entite_id: string
  est_protege: boolean
  couleur?: string
  ordre: number
  created_by?: string
  created_at: string
  classification?: Classification
}

interface Ressource {
  id: string
  nom: string
  type: string
  taille?: number
  dossier_id?: string
  entite_id: string
  url_stockage?: string
  description?: string
  tags?: string[]
  created_at: string
  uploadeur?: { prenom: string; nom: string }
}

interface DossierStats {
  nb_fichiers: number
  taille_totale: number
}

// ── Helpers ────────────────────────────────────────────────────
function formatTaille(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`
}

function formatTailleStats(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Ko'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`
}

function mimeToType(mime: string): string {
  if (mime.includes('pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.includes('word') || mime.includes('document') || mime.includes('opendocument.text')) return 'doc'
  if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('opendocument.spreadsheet')) return 'xls'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed') || mime.includes('tar')) return 'zip'
  return 'autre'
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:   <FileText size={14} className="text-red" />,
  image: <Image size={14} className="text-blue" />,
  video: <File size={14} className="text-violet" />,
  doc:   <FileText size={14} className="text-blue" />,
  xls:   <FileText size={14} className="text-green" />,
  zip:   <Archive size={14} className="text-amber" />,
  autre: <File size={14} className="text-text-muted" />,
}

// ── Main Page ─────────────────────────────────────────────────
export default function BibliothequePage() {
  const { user, entiteActive } = useAppStore()
  // isAdmin : opérations générales (changer mdp de n'importe quel dossier, supprimer fichiers…)
  const isAdmin = user?.role === 'super_admin' || user?.role === 'fondateur'
  // canBypassLock : seul super_admin entre sans mot de passe dans les dossiers protégés
  const canBypassLock = user?.role === 'super_admin'

  const [dossiers,    setDossiers]    = useState<Dossier[]>([])
  const [ressources,  setRessources]  = useState<Ressource[]>([])
  const [statsMap,    setStatsMap]    = useState<Record<string, DossierStats>>({})
  const [dossierActif, setDossierActif] = useState<Dossier | null>(null)
  const [breadcrumb,  setBreadcrumb]  = useState<Dossier[]>([])
  const [loading,     setLoading]     = useState(true)
  const [viewMode,    setViewMode]    = useState<'grid' | 'list'>('grid')
  const [search,      setSearch]      = useState('')
  const [showNewFolder,     setShowNewFolder]     = useState(false)
  const [showUpload,        setShowUpload]        = useState(false)
  const [preloadedFiles,    setPreloadedFiles]    = useState<File[]>([])
  const [passwordPrompt,      setPasswordPrompt]      = useState<Dossier | null>(null)
  const [changePwdTarget,     setChangePwdTarget]     = useState<Dossier | null>(null)
  const [manageAccessTarget,  setManageAccessTarget]  = useState<Dossier | null>(null)
  const [requestAccessTarget, setRequestAccessTarget] = useState<Dossier | null>(null)
  const [showPendingRequests, setShowPendingRequests] = useState(false)
  const [pendingCount,        setPendingCount]        = useState(0)
  const [accessibleProjetIds, setAccessibleProjetIds] = useState<Set<string>>(new Set())
  const [unlockedFolders,     setUnlockedFolders]     = useState<Set<string>>(new Set())
  const [dragActive,        setDragActive]        = useState(false)
  const dragCountRef = useRef(0)
  const supabase = createClient()

  useEffect(() => { loadRoot() }, [entiteActive?.id])

  async function loadRoot() {
    setLoading(true)
    setDossierActif(null)
    setBreadcrumb([])
    let q = supabase.from('dossiers').select('*').is('parent_id', null).order('ordre')
    if (entiteActive?.id) q = q.eq('entite_id', entiteActive.id)
    const { data: dossiersData } = await q

    let rq = supabase.from('ressources')
      .select('*, uploadeur:users!created_by(prenom, nom)')
      .is('dossier_id', null)
      .order('created_at', { ascending: false })
    if (entiteActive?.id) rq = rq.eq('entite_id', entiteActive.id)
    const { data: rd } = await rq

    const d = (dossiersData || []) as Dossier[]
    setDossiers(d)
    setRessources((rd || []) as Ressource[])
    await fetchStats(d.map(x => x.id))

    // Accès projet (non-admins seulement)
    if (!isAdmin && user?.id) {
      const { data: acces } = await supabase
        .from('acces_dossier').select('dossier_id').eq('user_id', user.id)
      setAccessibleProjetIds(new Set((acces || []).map((a: { dossier_id: string }) => a.dossier_id)))
    }

    // Compteur demandes en attente (admins)
    if (isAdmin && entiteActive?.id) {
      const { data: pending } = await supabase
        .from('demandes_acces_dossier').select('id').eq('statut', 'en_attente')
      setPendingCount((pending || []).length)
    }

    setLoading(false)
  }

  async function navigateToDossier(dossier: Dossier) {
    setLoading(true)
    setDossierActif(dossier)
    setBreadcrumb(prev => {
      const idx = prev.findIndex(d => d.id === dossier.id)
      if (idx >= 0) return prev.slice(0, idx + 1)
      return [...prev, dossier]
    })

    const [{ data: subs }, { data: files }] = await Promise.all([
      supabase.from('dossiers').select('*').eq('parent_id', dossier.id).order('ordre'),
      supabase.from('ressources')
        .select('*, uploadeur:users!created_by(prenom, nom)')
        .eq('dossier_id', dossier.id)
        .order('created_at', { ascending: false }),
    ])
    const d = (subs || []) as Dossier[]
    setDossiers(d)
    setRessources((files || []) as Ressource[])
    await fetchStats(d.map(x => x.id))
    setLoading(false)
  }

  async function fetchStats(dossierIds: string[]) {
    if (dossierIds.length === 0) { setStatsMap({}); return }
    const { data } = await supabase
      .from('ressources')
      .select('dossier_id, taille')
      .in('dossier_id', dossierIds)

    const map: Record<string, DossierStats> = {}
    for (const id of dossierIds) map[id] = { nb_fichiers: 0, taille_totale: 0 }
    for (const row of data || []) {
      if (!row.dossier_id) continue
      map[row.dossier_id] = {
        nb_fichiers:   (map[row.dossier_id]?.nb_fichiers || 0) + 1,
        taille_totale: (map[row.dossier_id]?.taille_totale || 0) + (row.taille || 0),
      }
    }
    setStatsMap(map)
  }

  async function openDossier(dossier: Dossier) {
    if (dossier.classification === 'projet' && !isAdmin && !accessibleProjetIds.has(dossier.id)) {
      setRequestAccessTarget(dossier)
      return
    }
    if (dossier.est_protege && !canBypassLock && !unlockedFolders.has(dossier.id)) {
      setPasswordPrompt(dossier)
      return
    }
    await navigateToDossier(dossier)
  }

  function navigateBreadcrumb(index: number) {
    if (index === -1) { loadRoot(); return }
    const target = breadcrumb[index]
    setBreadcrumb(breadcrumb.slice(0, index + 1))
    navigateToDossier(target)
  }

  // ── Drag & Drop ──────────────────────────────────────────────
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCountRef.current++
    if (dossierActif) setDragActive(true)
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCountRef.current--
    if (dragCountRef.current <= 0) { dragCountRef.current = 0; setDragActive(false) }
  }
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCountRef.current = 0
    setDragActive(false)
    if (!dossierActif) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) { setPreloadedFiles(files); setShowUpload(true) }
  }

  const searchLow = search.toLowerCase()
  const allFiltered = dossiers.filter(d => !search || d.nom.toLowerCase().includes(searchLow))
  // Les dossiers sensibles ont leur propre section (fondateurs uniquement)
  const filteredDossiers   = allFiltered.filter(d => d.classification !== 'sensible')
  const filteredSensible   = isAdmin ? allFiltered.filter(d => d.classification === 'sensible') : []
  const filteredRessources = ressources.filter(r => !search || r.nom.toLowerCase().includes(searchLow))

  return (
    <div
      className="space-y-6 animate-fade-up"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bibliothèque</h1>
          <p className="page-subtitle">Ressources et documents partagés</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowPendingRequests(true)}
              className="relative p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
              title="Demandes d'accès en attente"
            >
              <Bell size={16} />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-white text-2xs flex items-center justify-center font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          )}
          <Button variant="secondary" size="sm" icon={<FolderPlus size={14} />} onClick={() => setShowNewFolder(true)}>
            Nouveau dossier
          </Button>
          <Button size="sm" icon={<Upload size={14} />} onClick={() => { setPreloadedFiles([]); setShowUpload(true) }}>
            Uploader
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 py-1.5 text-sm w-full"
          />
        </div>
        <div className="flex items-center border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Breadcrumb + classification change */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-text-muted overflow-x-auto no-scrollbar">
          <button
            onClick={() => navigateBreadcrumb(-1)}
            className="flex items-center gap-1 hover:text-blue transition-colors flex-shrink-0"
          >
            <Home size={12} /> Bibliothèque
          </button>
          {breadcrumb.map((d, i) => (
            <span key={d.id} className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight size={10} />
              <button
                onClick={() => navigateBreadcrumb(i)}
                className={`hover:text-blue transition-colors ${i === breadcrumb.length - 1 ? 'text-text-primary font-medium' : ''}`}
              >
                {d.nom}
              </button>
            </span>
          ))}
        </div>
        {dossierActif && isAdmin && (
          <ClassificationSelect
            value={dossierActif.classification || 'public'}
            onChange={async (val) => {
              const res = await fetch('/api/bibliotheque/update-classification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dossierId: dossierActif.id, classification: val }),
              })
              if (res.ok) {
                setDossierActif(prev => prev ? { ...prev, classification: val as Classification } : null)
                setBreadcrumb(prev => prev.map(d => d.id === dossierActif.id ? { ...d, classification: val as Classification } : d))
              }
            }}
          />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`skeleton rounded-xl ${viewMode === 'grid' ? 'h-24' : 'h-10'}`} />
          ))}
        </div>
      ) : (
        <>
          {/* Dossiers */}
          {filteredDossiers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-3">Dossiers ({filteredDossiers.length})</p>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredDossiers.map(d => (
                    <DossierCard
                      key={d.id}
                      dossier={d}
                      stats={statsMap[d.id] || { nb_fichiers: 0, taille_totale: 0 }}
                      isAdmin={isAdmin}
                      canChangePwd={canBypassLock}
                      hasAccess={isAdmin || d.classification !== 'projet' || accessibleProjetIds.has(d.id)}
                      currentUserId={user?.id}
                      onClick={() => openDossier(d)}
                      onChangePassword={() => setChangePwdTarget(d)}
                      onManageAccess={() => setManageAccessTarget(d)}
                    />
                  ))}
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>Nom</th><th>Fichiers</th><th>Classification</th><th>Protection</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredDossiers.map(d => {
                        const st = statsMap[d.id] || { nb_fichiers: 0, taille_totale: 0 }
                        const classif = d.classification || 'public'
                        const cfg = CLASSIF_CONFIG[classif]
                        return (
                          <tr key={d.id} className="cursor-pointer" onClick={() => openDossier(d)}>
                            <td className="flex items-center gap-2">
                              {d.est_protege
                                ? <Lock size={13} className="text-amber" />
                                : <Folder size={13} className="text-blue" />
                              }
                              <span className="text-sm text-text-primary">{d.nom}</span>
                            </td>
                            <td className="text-xs text-text-muted">
                              {st.nb_fichiers} fichier{st.nb_fichiers !== 1 ? 's' : ''} — {formatTailleStats(st.taille_totale)}
                            </td>
                            <td>
                              <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                                {cfg.icon}{cfg.label}
                              </span>
                            </td>
                            <td>{d.est_protege ? <span className="badge badge-amber">Protégé</span> : <span className="text-text-muted text-xs">—</span>}</td>
                            <td className="text-xs text-text-muted">{formatRelativeTime(d.created_at)}</td>
                            <td className="flex items-center gap-1">
                              {d.est_protege && canBypassLock && (
                                <button
                                  onClick={e => { e.stopPropagation(); setChangePwdTarget(d) }}
                                  className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-blue transition-colors"
                                  title="Changer le mot de passe"
                                >
                                  <Key size={12} />
                                </button>
                              )}
                              {classif === 'projet' && isAdmin && (
                                <button
                                  onClick={e => { e.stopPropagation(); setManageAccessTarget(d) }}
                                  className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-purple transition-colors"
                                  title="Gérer les accès"
                                >
                                  <Users size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Fichiers */}
          {filteredRessources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-3">Fichiers ({filteredRessources.length})</p>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredRessources.map(r => (
                    <FichierCard
                      key={r.id}
                      ressource={r}
                      isAdmin={isAdmin}
                      currentUserId={user?.id}
                      onRefresh={() => dossierActif ? navigateToDossier(dossierActif) : loadRoot()}
                    />
                  ))}
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>Nom</th><th>Type</th><th>Taille</th><th>Uploadé par</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredRessources.map(r => (
                        <tr key={r.id}>
                          <td className="flex items-center gap-2">
                            {FILE_ICONS[r.type] || FILE_ICONS.autre}
                            <span className="text-sm text-text-primary">{r.nom}</span>
                          </td>
                          <td><span className="text-xs text-text-muted uppercase">{r.type}</span></td>
                          <td className="text-xs text-text-muted">{formatTaille(r.taille)}</td>
                          <td className="text-xs text-text-muted">
                            {r.uploadeur ? `${r.uploadeur.prenom} ${r.uploadeur.nom}` : '—'}
                          </td>
                          <td className="text-xs text-text-muted">{formatRelativeTime(r.created_at)}</td>
                          <td>
                            {r.url_stockage && (
                              <button
                                className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-blue transition-colors"
                                onClick={async () => {
                                  const sb = createClient()
                                  await downloadFromStorage(sb, 'bibliotheque', r.url_stockage!, r.nom || r.url_stockage!, 300)
                                }}
                              >
                                <Download size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section Fondateurs — dossiers sensibles */}
          {filteredSensible.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={13} className="text-amber" />
                <p className="text-xs font-medium text-amber">Fondateurs ({filteredSensible.length})</p>
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredSensible.map(d => (
                    <DossierCard
                      key={d.id}
                      dossier={d}
                      stats={statsMap[d.id] || { nb_fichiers: 0, taille_totale: 0 }}
                      isAdmin={isAdmin}
                      canChangePwd={canBypassLock}
                      hasAccess={true}
                      currentUserId={user?.id}
                      onClick={() => openDossier(d)}
                      onChangePassword={() => setChangePwdTarget(d)}
                      onManageAccess={() => setManageAccessTarget(d)}
                    />
                  ))}
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Nom</th><th>Fichiers</th><th>Protection</th><th>Date</th><th></th></tr></thead>
                    <tbody>
                      {filteredSensible.map(d => {
                        const st = statsMap[d.id] || { nb_fichiers: 0, taille_totale: 0 }
                        return (
                          <tr key={d.id} className="cursor-pointer" onClick={() => openDossier(d)}>
                            <td className="flex items-center gap-2">
                              <ShieldAlert size={13} className="text-amber" />
                              <span className="text-sm text-text-primary">{d.nom}</span>
                            </td>
                            <td className="text-xs text-text-muted">{st.nb_fichiers} fichier{st.nb_fichiers !== 1 ? 's' : ''}</td>
                            <td>{d.est_protege ? <span className="badge badge-amber">Protégé</span> : <span className="text-text-muted text-xs">—</span>}</td>
                            <td className="text-xs text-text-muted">{formatRelativeTime(d.created_at)}</td>
                            <td>
                              {d.est_protege && canBypassLock && (
                                <button onClick={e => { e.stopPropagation(); setChangePwdTarget(d) }} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-blue transition-colors">
                                  <Key size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {filteredDossiers.length === 0 && filteredRessources.length === 0 && filteredSensible.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <Folder size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? 'Aucun résultat' : 'Dossier vide'}</p>
              {!search && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button onClick={() => setShowNewFolder(true)} className="text-blue text-xs hover:underline">Créer un dossier</button>
                  <span className="text-text-muted text-xs">ou</span>
                  <button onClick={() => { setPreloadedFiles([]); setShowUpload(true) }} className="text-blue text-xs hover:underline">uploader un fichier</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Drag & Drop Overlay */}
      {dragActive && dossierActif && (
        <div className="fixed inset-0 z-40 bg-blue/5 backdrop-blur-[2px] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
          <div className="px-12 py-10 rounded-2xl border-2 border-dashed border-blue/60 bg-surface/95 text-center shadow-2xl">
            <Upload size={36} className="mx-auto mb-3 text-blue" />
            <p className="text-base font-semibold text-blue">Déposez vos fichiers ici pour les uploader</p>
            <p className="text-xs text-blue/60 mt-1.5">Relâchez pour commencer l&apos;envoi</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {passwordPrompt && (
        <PasswordModal
          dossier={passwordPrompt}
          onSuccess={() => {
            setUnlockedFolders(prev => new Set([...prev, passwordPrompt.id]))
            navigateToDossier(passwordPrompt)
            setPasswordPrompt(null)
          }}
          onClose={() => setPasswordPrompt(null)}
        />
      )}

      {showNewFolder && (
        <NewFolderModal
          parentId={dossierActif?.id}
          entiteId={entiteActive?.id || ''}
          onClose={() => setShowNewFolder(false)}
          onSuccess={() => {
            setShowNewFolder(false)
            if (dossierActif) navigateToDossier(dossierActif)
            else loadRoot()
          }}
        />
      )}

      {changePwdTarget && (
        <ChangePasswordModal
          dossier={changePwdTarget}
          onClose={() => setChangePwdTarget(null)}
          onSuccess={() => {
            setChangePwdTarget(null)
            setUnlockedFolders(prev => { const s = new Set(prev); s.delete(changePwdTarget.id); return s })
          }}
        />
      )}

      {manageAccessTarget && (
        <ManageAccessModal
          dossier={manageAccessTarget}
          entiteId={entiteActive?.id || ''}
          onClose={() => setManageAccessTarget(null)}
        />
      )}

      {requestAccessTarget && (
        <RequestAccessModal
          dossier={requestAccessTarget}
          alreadyRequested={false}
          onClose={() => setRequestAccessTarget(null)}
          onSuccess={() => setRequestAccessTarget(null)}
        />
      )}

      {showPendingRequests && (
        <PendingRequestsModal
          entiteId={entiteActive?.id || ''}
          onClose={() => { setShowPendingRequests(false); loadRoot() }}
        />
      )}

      {showUpload && (
        <UploadModal
          dossierActif={dossierActif}
          entiteId={entiteActive?.id || ''}
          preloadedFiles={preloadedFiles}
          onClose={() => { setShowUpload(false); setPreloadedFiles([]) }}
          onSuccess={() => {
            setShowUpload(false)
            setPreloadedFiles([])
            if (dossierActif) navigateToDossier(dossierActif)
            else loadRoot()
          }}
        />
      )}
    </div>
  )
}

// ── Classification helpers ─────────────────────────────────────
const CLASSIF_CONFIG: Record<Classification, { label: string; color: string; icon: React.ReactNode }> = {
  public:   { label: 'Public',   color: 'text-blue/70',  icon: <Globe size={9} /> },
  sensible: { label: 'Sensible', color: 'text-amber/80', icon: <ShieldAlert size={9} /> },
  projet:   { label: 'Projet',   color: 'text-purple/80',icon: <Briefcase size={9} /> },
}

// ── DossierCard ───────────────────────────────────────────────
function DossierCard({
  dossier, stats, isAdmin, canChangePwd, hasAccess, currentUserId, onClick, onChangePassword, onManageAccess,
}: {
  dossier: Dossier
  stats: DossierStats
  isAdmin: boolean
  canChangePwd: boolean
  hasAccess: boolean
  currentUserId?: string
  onClick: () => void
  onChangePassword: () => void
  onManageAccess: () => void
}) {
  const couleur = dossier.couleur || '#3B82F6'
  const classif = dossier.classification || 'public'
  const cfg = CLASSIF_CONFIG[classif]
  const restricted = !hasAccess && classif === 'projet'

  return (
    <div className={`group relative rounded-xl border bg-surface transition-all duration-200 h-[132px] ${restricted ? 'border-surface-border opacity-60 hover:opacity-80' : 'border-surface-border hover:border-blue/30 hover:bg-surface-hover'}`}>
      {/* Admin actions — top-right on hover */}
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all duration-200">
          {dossier.est_protege && canChangePwd && (
            <button
              onClick={e => { e.stopPropagation(); onChangePassword() }}
              className="p-1 rounded hover:bg-blue/10 text-text-muted hover:text-blue transition-colors"
              title="Changer le mot de passe"
            >
              <Key size={11} />
            </button>
          )}
          {classif === 'projet' && (
            <button
              onClick={e => { e.stopPropagation(); onManageAccess() }}
              className="p-1 rounded hover:bg-purple/10 text-text-muted hover:text-purple transition-colors"
              title="Gérer les accès"
            >
              <Users size={11} />
            </button>
          )}
        </div>
      )}

      {/* Main clickable zone */}
      <button onClick={onClick} className="w-full h-full p-3 text-left flex flex-col">
        <div className="flex items-start justify-between">
          <Folder size={20} style={{ color: restricted ? '#6B7280' : couleur }} />
          {dossier.est_protege && <Lock size={11} className="text-amber/80 mt-0.5" />}
          {restricted && !dossier.est_protege && <UserPlus size={12} className="text-purple/70 mt-0.5" />}
        </div>

        <div className="mt-2 flex-1 min-h-0">
          <p className="text-xs font-semibold text-text-primary truncate">{dossier.nom}</p>
          {dossier.description && (
            <p className="text-2xs text-text-muted mt-0.5 truncate">{dossier.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-2xs text-text-muted truncate">
            {stats.nb_fichiers} fichier{stats.nb_fichiers !== 1 ? 's' : ''} — {formatTailleStats(stats.taille_totale)}
          </p>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-medium border border-current/20 bg-current/5 flex-shrink-0 ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
        </div>
      </button>
    </div>
  )
}

// ── FichierCard ───────────────────────────────────────────────
function FichierCard({
  ressource, isAdmin, currentUserId, onRefresh,
}: {
  ressource: Ressource
  isAdmin: boolean
  currentUserId?: string
  onRefresh: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const supabase = createClient()
  const canDelete = isAdmin || ressource.uploadeur !== undefined // rough check; server enforces

  async function handleDownload() {
    if (!ressource.url_stockage) return
    await downloadFromStorage(supabase, 'bibliotheque', ressource.url_stockage, ressource.nom || ressource.url_stockage, 300)
  }

  async function handleDelete() {
    const { data: chemin } = await supabase.rpc('supprimer_ressource_biblio', { p_id: ressource.id })
    if (chemin) await supabase.storage.from('bibliotheque').remove([chemin])
    onRefresh()
  }

  return (
    <div className="group p-3 rounded-xl border border-surface-border bg-surface hover:border-blue/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-background-elevated flex items-center justify-center">
          {FILE_ICONS[ressource.type] || FILE_ICONS.autre}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {ressource.url_stockage && (
            <button onClick={handleDownload} className="p-0.5 hover:text-blue text-text-muted transition-colors">
              <Download size={11} />
            </button>
          )}
          {canDelete && (
            confirmDel ? (
              <span className="flex items-center gap-0.5">
                <button onClick={handleDelete} className="text-2xs text-red hover:underline">Suppr.</button>
                <button onClick={() => setConfirmDel(false)} className="text-2xs text-text-muted hover:underline ml-1">✕</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="p-0.5 hover:text-red text-text-muted transition-colors">
                <Trash2 size={11} />
              </button>
            )
          )}
        </div>
      </div>
      <p className="text-xs font-medium text-text-primary truncate">{ressource.nom}</p>
      <p className="text-2xs text-text-muted mt-0.5">{formatTaille(ressource.taille)}</p>
    </div>
  )
}

// ── PasswordModal ─────────────────────────────────────────────
function PasswordModal({
  dossier, onSuccess, onClose, onSetPassword,
}: {
  dossier: Dossier
  onSuccess: () => void
  onClose: () => void
  onSetPassword?: () => void
}) {
  const [password, setPassword]     = useState('')
  const [showPwd,  setShowPwd]      = useState(false)
  const [error,    setError]        = useState('')
  const [loading,  setLoading]      = useState(false)
  const [noHash,   setNoHash]       = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!password.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/bibliotheque/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId: dossier.id, password }),
    })
    const json = await res.json()
    if (json.noPassword) {
      // Dossier protégé mais aucun mot de passe configuré en base
      setNoHash(true)
      setLoading(false)
      return
    }
    if (json.ok) { onSuccess() }
    else { setError('Mot de passe incorrect'); setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
            <Lock size={18} className="text-amber" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Dossier protégé</h3>
            <p className="text-xs text-text-muted">{dossier.nom}</p>
          </div>
        </div>
        {noHash ? (
          <div className="space-y-3">
            <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
              Ce dossier est protégé mais aucun mot de passe n&apos;a encore été défini. Contactez un administrateur pour configurer l&apos;accès.
            </p>
            <Button variant="secondary" className="w-full" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoFocus
                className="input pr-10"
                placeholder="Mot de passe..."
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && <p className="text-xs text-red">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={loading} disabled={!password.trim()}>Accéder</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── NewFolderModal ────────────────────────────────────────────
type MemberOption = { id: string; prenom: string; nom: string; email: string; role?: string; isAdmin?: boolean }

function NewFolderModal({
  parentId, entiteId, onClose, onSuccess,
}: { parentId?: string; entiteId: string; onClose: () => void; onSuccess: () => void }) {
  const [form,           setForm]           = useState({ nom: '', description: '', est_protege: false, couleur: '#3B82F6', classification: 'public' as Classification })
  const [password,       setPassword]       = useState('')
  const [confirm,        setConfirm]        = useState('')
  const [showPwd,        setShowPwd]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [membres,        setMembres]        = useState<MemberOption[]>([])
  const [autoriseIds,    setAutoriseIds]    = useState<Set<string>>(new Set())

  useEffect(() => {
    if (form.classification !== 'projet') return
    fetch(`/api/bibliotheque/manage-access?dossierId=new&entiteId=${entiteId}`)
      .then(r => r.json())
      .then(d => setMembres(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [form.classification, entiteId])

  const pwdMismatch = form.est_protege && password.length > 0 && confirm.length > 0 && password !== confirm
  const canSubmit   = form.nom.trim() && (!form.est_protege || (password.length >= 4 && password === confirm))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true); setError('')

    const res = await fetch('/api/bibliotheque/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:            form.nom.trim(),
        description:    form.description || null,
        entiteId,
        parentId:       parentId || null,
        couleur:        form.couleur,
        estProtege:     form.est_protege,
        motDePasse:     form.est_protege ? password : undefined,
        classification: form.classification,
        autoriseIds:    form.classification === 'projet' ? Array.from(autoriseIds) : [],
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Erreur'); return }
    onSuccess()
  }

  const COULEURS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6B7280']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Nouveau dossier</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Nom</label>
            <input
              type="text" className="input" autoFocus required
              placeholder="Nom du dossier"
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Description</label>
            <input
              type="text" className="input"
              placeholder="Optionnel"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Couleur</label>
            <div className="flex items-center gap-2">
              {COULEURS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm({ ...form, couleur: c })}
                  className={`w-6 h-6 rounded-full transition-all ${form.couleur === c ? 'ring-2 ring-offset-2 ring-offset-background-DEFAULT ring-white/50' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-1.5">
            <label className="label">Visibilité</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'public',   label: 'Public',   desc: 'Tous les membres',      icon: <Globe size={14} />,       color: 'text-blue' },
                { value: 'sensible', label: 'Sensible', desc: 'Fondateurs uniquement', icon: <ShieldAlert size={14} />, color: 'text-amber' },
                { value: 'projet',   label: 'Projet',   desc: 'Sur autorisation',      icon: <Briefcase size={14} />,  color: 'text-purple' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, classification: opt.value })}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                    form.classification === opt.value
                      ? 'border-blue/50 bg-blue/5'
                      : 'border-surface-border hover:border-surface-border/80 hover:bg-surface-hover'
                  }`}
                >
                  <span className={form.classification === opt.value ? opt.color : 'text-text-muted'}>{opt.icon}</span>
                  <span className={`text-2xs font-semibold ${form.classification === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                  <span className="text-2xs text-text-muted leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User picker — projet uniquement */}
          {form.classification === 'projet' && (
            <div className="space-y-1.5">
              <label className="label flex items-center gap-1.5">
                <Users size={12} className="text-purple" /> Accès autorisés à la création
              </label>
              {membres.length === 0 ? (
                <p className="text-2xs text-text-muted italic">Chargement…</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {membres.map(m => (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors ${autoriseIds.has(m.id) ? 'bg-blue/5 border border-blue/20' : 'hover:bg-surface-hover border border-transparent'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={autoriseIds.has(m.id)}
                          onChange={e => {
                            const s = new Set(autoriseIds)
                            e.target.checked ? s.add(m.id) : s.delete(m.id)
                            setAutoriseIds(s)
                          }}
                          className="rounded border-surface-border flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs text-text-primary">{m.prenom} {m.nom}</span>
                          {m.isAdmin && <span className="ml-1 text-2xs text-amber">(admin)</span>}
                        </div>
                      </div>
                      <span className="text-2xs text-text-muted truncate max-w-[100px]">{m.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Protection */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.est_protege}
              onChange={e => { setForm({ ...form, est_protege: e.target.checked }); setPassword(''); setConfirm('') }}
              className="rounded border-surface-border"
            />
            <span className="text-xs text-text-secondary flex items-center gap-1.5">
              <Lock size={12} className="text-amber" /> Protéger par mot de passe
            </span>
          </label>

          {/* Password fields — shown only when protection enabled */}
          {form.est_protege && (
            <div className="space-y-2 animate-fade-up">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10 text-sm"
                  placeholder="Mot de passe (min. 4 caractères)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required={form.est_protege}
                  minLength={4}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                className={`input text-sm transition-colors ${pwdMismatch ? 'border-red/50 focus:border-red' : ''}`}
                placeholder="Confirmer le mot de passe"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required={form.est_protege}
              />
              {pwdMismatch && (
                <p className="text-xs text-red flex items-center gap-1">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving} disabled={!canSubmit}>Créer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ChangePasswordModal ───────────────────────────────────────
function ChangePasswordModal({
  dossier, onClose, onSuccess,
}: { dossier: Dossier; onClose: () => void; onSuccess: () => void }) {
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const pwdMismatch = newPwd.length > 0 && confirmPwd.length > 0 && newPwd !== confirmPwd
  const canSubmit   = newPwd.length >= 4 && newPwd === confirmPwd

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true); setError('')

    const res = await fetch('/api/bibliotheque/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId: dossier.id, nouveauMotDePasse: newPwd }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Erreur'); return }
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center">
            <Key size={18} className="text-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Changer le mot de passe</h3>
            <p className="text-xs text-text-muted">{dossier.nom}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              className="input pr-10 text-sm"
              placeholder="Nouveau mot de passe (min. 4 caractères)"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              autoFocus
              required
              minLength={4}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          <input
            type={showPwd ? 'text' : 'password'}
            className={`input text-sm transition-colors ${pwdMismatch ? 'border-red/50 focus:border-red' : ''}`}
            placeholder="Confirmer le nouveau mot de passe"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            required
          />
          {pwdMismatch && <p className="text-xs text-red">Les mots de passe ne correspondent pas</p>}
          {error && <p className="text-xs text-red">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving} disabled={!canSubmit}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── UploadModal ───────────────────────────────────────────────
type FileStatus = 'pending' | 'uploading' | 'done' | 'error'
interface FileItem { file: File; status: FileStatus; error?: string }

function UploadModal({
  dossierActif, entiteId, preloadedFiles, onClose, onSuccess,
}: {
  dossierActif: Dossier | null
  entiteId: string
  preloadedFiles: File[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [items,     setItems]     = useState<FileItem[]>(() => preloadedFiles.map(f => ({ file: f, status: 'pending' as FileStatus })))
  const [uploading, setUploading] = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function addFiles(files: File[]) {
    setItems(prev => [...prev, ...files.map(f => ({ file: f, status: 'pending' as FileStatus }))])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    if (items.length === 0 || !entiteId) return
    setUploading(true)
    // Variable locale — ne pas lire items (état React stale dans la closure)
    let hasAnyError = false

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'done') continue
      setItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'uploading' } : it))

      const file = items[i].file
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${entiteId}/${dossierActif?.id || 'root'}/${Date.now()}_${sanitized}`
      const fileType = mimeToType(file.type)

      const { storedPath, error: storageErr } = await uploadToStorage(supabase, 'bibliotheque', path, file, { upsert: false })

      if (storageErr) {
        hasAnyError = true
        setItems(prev => prev.map((it, j) => j === i
          ? { ...it, status: 'error', error: `Storage : ${storageErr.message}` }
          : it))
        continue
      }

      const { error: rpcErr } = await supabase.rpc('creer_ressource_biblio', {
        p_nom:          file.name,
        p_entite_id:    entiteId,
        p_url_stockage: storedPath,
        p_dossier_id:   dossierActif?.id || null,
        p_taille:       file.size,
        p_type:         fileType,
      })

      if (rpcErr) {
        hasAnyError = true
        await supabase.storage.from('bibliotheque').remove([storedPath])
        setItems(prev => prev.map((it, j) => j === i
          ? { ...it, status: 'error', error: `DB : ${rpcErr.message}` }
          : it))
      } else {
        setItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'done' } : it))
      }
    }

    setUploading(false)
    if (!hasAnyError) onSuccess()
  }

  const allDone = items.length > 0 && items.every(it => it.status === 'done')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Uploader des fichiers</h3>
          {dossierActif && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Folder size={11} style={{ color: dossierActif.couleur || '#3B82F6' }} />
              {dossierActif.nom}
            </span>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragOver ? 'border-blue bg-blue/5' : 'border-surface-border hover:border-blue/40 hover:bg-surface-hover'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm text-text-secondary">Glisser des fichiers ou <span className="text-blue">parcourir</span></p>
          <p className="text-xs text-text-muted mt-1">Max 100 Mo par fichier</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => addFiles(Array.from(e.target.files || []))}
          />
        </div>

        {/* File list */}
        {items.length > 0 && (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {items.map((it, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2.5 px-3 py-2 border rounded-lg transition-colors ${
                  it.status === 'error'
                    ? 'bg-red/5 border-red/30'
                    : it.status === 'done'
                    ? 'bg-green/5 border-green/20'
                    : 'bg-surface-elevated border-surface-border'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {FILE_ICONS[mimeToType(it.file.type)] || FILE_ICONS.autre}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{it.file.name}</p>
                  {it.status === 'error'
                    ? <p className="text-2xs text-red truncate">{it.error}</p>
                    : <p className="text-2xs text-text-muted">{formatTaille(it.file.size)}</p>
                  }
                </div>
                <div className="flex-shrink-0">
                  {it.status === 'pending'   && !uploading && (
                    <button onClick={() => removeItem(idx)} className="p-0.5 text-text-muted hover:text-red transition-colors">
                      <X size={12} />
                    </button>
                  )}
                  {it.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
                  )}
                  {it.status === 'done'  && <span className="text-green text-xs font-semibold">✓</span>}
                  {it.status === 'error' && <span className="text-red text-xs font-semibold">✕</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.some(it => it.status === 'error') && !uploading && (
          <p className="text-xs text-red px-1">
            Certains fichiers n&apos;ont pas pu être uploadés. Vérifiez que la migration 051 est bien appliquée dans Supabase.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>
            {allDone ? 'Fermer' : 'Annuler'}
          </Button>
          {!allDone && (
            <Button
              type="button"
              className="flex-1"
              loading={uploading}
              disabled={items.length === 0 || uploading}
              onClick={handleUpload}
              icon={<Upload size={13} />}
            >
              {uploading
                ? 'Envoi…'
                : items.some(it => it.status === 'error')
                ? 'Réessayer'
                : `Uploader${items.length > 0 ? ` (${items.length})` : ''}`
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ManageAccessModal ─────────────────────────────────────────
type MemberAccess = { id: string; prenom: string; nom: string; role: string; email: string; hasAccess: boolean }

function ManageAccessModal({
  dossier, entiteId, onClose,
}: { dossier: Dossier; entiteId: string; onClose: () => void }) {
  const [members,  setMembers]  = useState<MemberAccess[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/bibliotheque/manage-access?dossierId=${dossier.id}&entiteId=${entiteId}`)
      .then(r => r.json())
      .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dossier.id, entiteId])

  async function toggle(member: MemberAccess) {
    setSaving(member.id); setError('')
    const res = await fetch('/api/bibliotheque/manage-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: dossier.id,
        userId: member.id,
        action: member.hasAccess ? 'revoke' : 'grant',
      }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, hasAccess: !m.hasAccess } : m))
    } else {
      const json = await res.json()
      setError(json.error || 'Erreur')
    }
    setSaving(null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
            <Users size={18} className="text-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Gérer les accès</h3>
            <p className="text-xs text-text-muted">{dossier.nom}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">Aucun membre à autoriser</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background-elevated">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{m.prenom} {m.nom}</p>
                  <p className="text-2xs text-text-muted truncate">{m.email}</p>
                </div>
                <button
                  onClick={() => toggle(m)}
                  disabled={saving === m.id}
                  className={`ml-3 flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                    m.hasAccess ? 'bg-blue' : 'bg-surface-border'
                  } ${saving === m.id ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    m.hasAccess ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red">{error}</p>}
        <Button variant="secondary" className="w-full" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  )
}

// ── ClassificationSelect ──────────────────────────────────────
function ClassificationSelect({ value, onChange }: { value: Classification; onChange: (v: string) => void }) {
  const cfg = CLASSIF_CONFIG[value]
  return (
    <div className="relative flex-shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none text-xs bg-background-elevated border border-surface-border rounded-lg pl-2 pr-6 py-1 cursor-pointer focus:outline-none focus:border-blue/50"
      >
        <option value="public">Public</option>
        <option value="sensible">Sensible</option>
        <option value="projet">Projet</option>
      </select>
      <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${cfg.color}`}>
        <ChevronDown size={10} />
      </span>
    </div>
  )
}

// ── RequestAccessModal ────────────────────────────────────────
function RequestAccessModal({
  dossier, onClose, onSuccess,
}: { dossier: Dossier; alreadyRequested: boolean; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setError('')
    const res = await fetch('/api/bibliotheque/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId: dossier.id, message }),
    })
    setSending(false)
    if (res.ok) { setSent(true); setTimeout(onSuccess, 1800) }
    else { const j = await res.json(); setError(j.error || 'Erreur') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
            <UserPlus size={18} className="text-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Demander l&apos;accès</h3>
            <p className="text-xs text-text-muted">{dossier.nom}</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-3 space-y-2">
            <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mx-auto">
              <Check size={20} className="text-green" />
            </div>
            <p className="text-xs text-text-secondary">Demande envoyée aux administrateurs</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-text-muted">
              Ce dossier est réservé aux membres autorisés. Tu peux envoyer une demande d&apos;accès aux administrateurs.
            </p>
            <textarea
              className="input text-sm resize-none h-20"
              placeholder="Message optionnel (motif, contexte...)"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            {error && <p className="text-xs text-red">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={sending}>Envoyer</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── PendingRequestsModal ──────────────────────────────────────
type PendingRequest = {
  id: string
  message: string | null
  created_at: string
  dossier: { id: string; nom: string }
  demandeur: { id: string; prenom: string; nom: string; email: string }
}

function PendingRequestsModal({
  entiteId, onClose,
}: { entiteId: string; onClose: () => void }) {
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [handling, setHandling] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bibliotheque/request-access?entiteId=${entiteId}`)
      .then(r => r.json())
      .then(d => { setRequests(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [entiteId])

  async function handle(requestId: string, action: 'accepte' | 'refuse') {
    setHandling(requestId)
    const res = await fetch('/api/bibliotheque/handle-access-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    })
    if (res.ok) setRequests(prev => prev.filter(r => r.id !== requestId))
    setHandling(null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center">
            <Bell size={18} className="text-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Demandes d&apos;accès</h3>
            <p className="text-xs text-text-muted">{requests.length} en attente</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">Aucune demande en attente</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {requests.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-surface-border bg-background-elevated space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary">{r.demandeur.prenom} {r.demandeur.nom}</p>
                    <p className="text-2xs text-text-muted">{r.demandeur.email}</p>
                    <p className="text-2xs text-purple mt-0.5 flex items-center gap-1">
                      <Briefcase size={9} />{r.dossier.nom}
                    </p>
                  </div>
                  <span className="text-2xs text-text-muted flex-shrink-0">{formatRelativeTime(r.created_at)}</span>
                </div>
                {r.message && (
                  <p className="text-2xs text-text-secondary bg-surface rounded px-2 py-1 flex items-start gap-1">
                    <MessageSquare size={9} className="mt-0.5 flex-shrink-0" />{r.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handle(r.id, 'refuse')}
                    disabled={handling === r.id}
                    className="flex-1 py-1 text-2xs font-medium rounded-lg border border-red/30 text-red hover:bg-red/5 transition-colors disabled:opacity-50"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => handle(r.id, 'accepte')}
                    disabled={handling === r.id}
                    className="flex-1 py-1 text-2xs font-medium rounded-lg bg-blue/10 border border-blue/20 text-blue hover:bg-blue/20 transition-colors disabled:opacity-50"
                  >
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  )
}
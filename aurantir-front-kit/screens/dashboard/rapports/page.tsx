// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatRelativeTime, exportToCSV } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage } from '@/aurantir-front-kit/lib/storage'
import {
  FileText, Plus, Search, Filter, ChevronDown, Eye, Download,
  Globe, Lock, Users, Building2, X, Calendar, TrendingUp,
  UserCheck, BookOpen, BarChart2, Briefcase, Clock, Tag, Trash2, Paperclip,
} from 'lucide-react'

type RapportStatut = 'brouillon' | 'publie' | 'archive'
type RapportVisibilite = 'prive' | 'equipe' | 'fondateurs' | 'public'

interface Rapport {
  id: string
  numero: string
  titre: string
  type: string
  statut: RapportStatut
  visibilite: RapportVisibilite
  entite_id: string
  redacteur_id: string
  resume?: string
  contenu?: string
  membres_concernes?: string[]
  projet_id?: string
  created_at: string
  published_at?: string
  redacteur?: { prenom: string; nom: string; avatar_url?: string }
  entite?: { nom: string; couleur: string }
  projet?: { titre: string }
}

interface MembreLite {
  id: string
  prenom: string
  nom: string
  role?: string
}

interface Filtres {
  search: string
  entite_id: string
  statut: string
  visibilite: string
  date_debut: string
  date_fin: string
}

const STATUT_CONFIG: Record<RapportStatut, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-surface text-text-muted border-surface-border' },
  publie:    { label: 'Publié',    className: 'bg-green/10 text-green border-green/20' },
  archive:   { label: 'Archivé',  className: 'bg-surface text-text-disabled border-surface-border' },
}

const VISIBILITE_CONFIG: Record<RapportVisibilite, { label: string; icon: React.ReactNode; className: string }> = {
  prive:      { label: 'Privé',      icon: <Lock size={10} />,      className: 'bg-red/10 text-red border-red/20' },
  equipe:     { label: 'Équipe',     icon: <Users size={10} />,     className: 'bg-blue/10 text-blue border-blue/20' },
  fondateurs: { label: 'Fondateurs', icon: <Building2 size={10} />, className: 'bg-violet/10 text-violet border-violet/20' },
  public:     { label: 'Public',     icon: <Globe size={10} />,     className: 'bg-green/10 text-green border-green/20' },
}

const TYPE_OPTIONS = [
  { value: 'rapport_activite',  label: 'Rapport d\'activité', icon: <BarChart2 size={13} /> },
  { value: 'rapport_financier', label: 'Rapport financier',   icon: <TrendingUp size={13} /> },
  { value: 'rapport_projet',    label: 'Rapport projet',      icon: <Briefcase size={13} /> },
  { value: 'rapport_commercial',label: 'Rapport commercial',  icon: <UserCheck size={13} /> },
  { value: 'rapport_hebdo',     label: 'Hebdomadaire',        icon: <Clock size={13} /> },
  { value: 'bilan',             label: 'Bilan',               icon: <BookOpen size={13} /> },
  { value: 'note_interne',      label: 'Note interne',        icon: <Tag size={13} /> },
  { value: 'autre',             label: 'Autre',               icon: <FileText size={13} /> },
]

const VISIBILITE_OPTIONS: { value: RapportVisibilite; label: string; description: string; icon: React.ReactNode; className: string }[] = [
  { value: 'prive',      label: 'Privé',      description: 'Visible uniquement par vous',          icon: <Lock size={13} />,      className: 'border-red/30 bg-red/5 text-red' },
  { value: 'equipe',     label: 'Équipe',     description: 'Toute l\'équipe peut consulter',        icon: <Users size={13} />,     className: 'border-blue/30 bg-blue/5 text-blue' },
  { value: 'fondateurs', label: 'Fondateurs', description: 'Réservé aux fondateurs',                icon: <Building2 size={13} />, className: 'border-violet/30 bg-violet/5 text-violet' },
  { value: 'public',     label: 'Public',     description: 'Accessible à tous les collaborateurs',  icon: <Globe size={13} />,     className: 'border-green/30 bg-green/5 text-green' },
]

export default function RapportsPage() {
  const { entiteActive, user } = useAppStore()
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRapport, setEditingRapport] = useState<Rapport | null>(null)
  const [filtres, setFiltres] = useState<Filtres>({
    search: '', entite_id: '', statut: '', visibilite: '', date_debut: '', date_fin: '',
  })
  const supabase = createClient()

  const loadRapports = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('rapports')
      .select('*, redacteur:users!redacteur_id(prenom, nom, avatar_url), entite:entites_legales(nom, couleur), projet:projets(titre)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtres.entite_id) query = query.eq('entite_id', filtres.entite_id)
    else if (entiteActive?.id) query = query.eq('entite_id', entiteActive.id)

    if (filtres.statut) query = query.eq('statut', filtres.statut)
    if (filtres.visibilite) query = query.eq('visibilite', filtres.visibilite)
    if (filtres.date_debut) query = query.gte('created_at', filtres.date_debut)
    if (filtres.date_fin) query = query.lte('created_at', filtres.date_fin + 'T23:59:59')
    if (filtres.search) query = query.ilike('titre', `%${filtres.search}%`)

    const { data } = await query
    let list = (data || []) as Rapport[]

    // Brouillon security: only show brouillons authored by current user
    if (user?.id) {
      list = list.filter(r => r.statut !== 'brouillon' || r.redacteur_id === user.id)
    } else {
      list = list.filter(r => r.statut !== 'brouillon')
    }

    setRapports(list)
    setLoading(false)
  }, [filtres, entiteActive?.id, user?.id])

  useEffect(() => { loadRapports() }, [loadRapports])

  const filtresActifs = Object.values(filtres).filter(Boolean).length

  const stats = {
    total:      rapports.length,
    publies:    rapports.filter(r => r.statut === 'publie').length,
    brouillons: rapports.filter(r => r.statut === 'brouillon').length,
    archives:   rapports.filter(r => r.statut === 'archive').length,
  }

  function handleExport() {
    exportToCSV(
      `rapports-${new Date().toISOString().split('T')[0]}.csv`,
      ['Numéro', 'Titre', 'Type', 'Statut', 'Visibilité', 'Entité', 'Rédacteur', 'Créé le', 'Publié le'],
      rapports.map(r => [
        r.numero,
        r.titre,
        r.type,
        r.statut,
        r.visibilite,
        (r as any).entite?.nom || '',
        (r as any).redacteur ? `${(r as any).redacteur.prenom} ${(r as any).redacteur.nom}` : '',
        r.created_at ? r.created_at.split('T')[0] : '',
        r.published_at ? r.published_at.split('T')[0] : '',
      ])
    )
  }

  function resetFiltres() {
    setFiltres({ search: '', entite_id: '', statut: '', visibilite: '', date_debut: '', date_fin: '' })
  }

  async function handleDeleteRapport(rapportId: string) {
    const { error } = await supabase.rpc('supprimer_rapport', { p_id: rapportId })
    if (!error) loadRapports()
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">Base de connaissance collaborative de l'équipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={loading || rapports.length === 0}>Exporter</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingRapport(null); setShowForm(true) }}>Nouveau rapport</Button>
        </div>
      </div>

      {/* KPI Cards — compact, icônes nues */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Total',      value: stats.total,      icon: <FileText size={13} />, color: 'text-blue',         num: 'text-text-primary' },
          { label: 'Publiés',    value: stats.publies,    icon: <Globe size={13} />,    color: 'text-green',        num: 'text-green' },
          { label: 'Brouillons', value: stats.brouillons, icon: <Lock size={13} />,     color: 'text-amber',        num: 'text-amber' },
          { label: 'Archivés',   value: stats.archives,   icon: <TrendingUp size={13} />, color: 'text-text-muted', num: 'text-text-muted' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between px-4 py-3 bg-surface border border-surface-border rounded-lg">
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums leading-none ${s.num}`}>{loading ? '—' : s.value}</p>
            </div>
            <div className={`${s.color} opacity-50`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter bar — hauteurs uniformes */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un rapport..."
            value={filtres.search}
            onChange={e => setFiltres(f => ({ ...f, search: e.target.value }))}
            className="h-8 w-full rounded-md border border-surface-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue/40 focus:ring-1 focus:ring-blue/20 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-8 flex items-center gap-1.5 px-3 rounded-md border text-xs transition-all ${
            filtresActifs > 0
              ? 'border-blue/40 bg-blue/5 text-blue'
              : 'border-surface-border bg-surface text-text-muted hover:text-text-primary hover:border-surface-hover'
          }`}
        >
          <Filter size={12} />
          Filtres
          {filtresActifs > 0 && <span className="px-1.5 py-0.5 rounded-full bg-blue text-white text-2xs leading-none">{filtresActifs}</span>}
          <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {filtresActifs > 0 && (
          <button onClick={resetFiltres} className="h-8 flex items-center gap-1 px-2 text-text-muted hover:text-text-primary text-xs transition-colors">
            <X size={11} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="p-4 animate-scale-in">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="label">Entité</label>
              <select className="input py-1.5 text-xs" value={filtres.entite_id} onChange={e => setFiltres(f => ({ ...f, entite_id: e.target.value }))}>
                <option value="">Toutes</option>
                <option value="a0000000-0000-0000-0000-000000000001">Sama Digital</option>
                <option value="a0000000-0000-0000-0000-000000000002">Aurantir</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Statut</label>
              <select className="input py-1.5 text-xs" value={filtres.statut} onChange={e => setFiltres(f => ({ ...f, statut: e.target.value }))}>
                <option value="">Tous</option>
                <option value="brouillon">Brouillon</option>
                <option value="publie">Publié</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Visibilité</label>
              <select className="input py-1.5 text-xs" value={filtres.visibilite} onChange={e => setFiltres(f => ({ ...f, visibilite: e.target.value }))}>
                <option value="">Toutes</option>
                <option value="prive">Privé</option>
                <option value="equipe">Équipe</option>
                <option value="fondateurs">Fondateurs</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Date début</label>
              <input type="date" className="input py-1.5 text-xs" value={filtres.date_debut} onChange={e => setFiltres(f => ({ ...f, date_debut: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="label">Date fin</label>
              <input type="date" className="input py-1.5 text-xs" value={filtres.date_fin} onChange={e => setFiltres(f => ({ ...f, date_fin: e.target.value }))} />
            </div>
          </div>
        </Card>
      )}

      {/* Reports list — mode rangées Linear */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="divide-y divide-surface-border/50">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-none" />)}
          </div>
        ) : rapports.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun rapport trouvé</p>
            {filtresActifs > 0 && (
              <button onClick={resetFiltres} className="text-blue text-xs mt-2 hover:underline">Effacer les filtres</button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {rapports.map(rapport => (
              <RapportRow
                key={rapport.id}
                rapport={rapport}
                isOwn={rapport.redacteur_id === user?.id}
                canDelete={rapport.redacteur_id === user?.id || user?.role === 'super_admin' || user?.role === 'fondateur'}
                onEdit={() => { setEditingRapport(rapport); setShowForm(true) }}
                onDelete={() => handleDeleteRapport(rapport.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <RapportModal
          entiteId={entiteActive?.id || 'a0000000-0000-0000-0000-000000000001'}
          reportData={editingRapport}
          onClose={() => { setShowForm(false); setEditingRapport(null) }}
          onSuccess={() => { setShowForm(false); setEditingRapport(null); loadRapports() }}
        />
      )}
    </div>
  )
}

// ── Rangée Linear style ──────────────────────────────────────────────────────
function RapportRow({ rapport, isOwn, canDelete, onEdit, onDelete }: {
  rapport: Rapport
  isOwn: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statut     = STATUT_CONFIG[rapport.statut]     ?? STATUT_CONFIG.brouillon
  const visibilite = VISIBILITE_CONFIG[rapport.visibilite] ?? VISIBILITE_CONFIG.equipe
  const entiteColor = (rapport as any).entite?.couleur || '#3B82F6'
  const entiteNom   = (rapport as any).entite?.nom || '—'
  const typeLabel   = TYPE_OPTIONS.find(t => t.value === rapport.type)?.label || rapport.type
  const redacteur   = (rapport as any).redacteur
  const projet      = (rapport as any).projet

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-all duration-200 cursor-pointer">
      {/* Icône nue */}
      <FileText size={14} className="text-text-muted/40 flex-shrink-0" />

      {/* Numéro + Titre */}
      <Link href={`/rapports/${rapport.id}`} className="flex items-center gap-2 flex-1 min-w-0">
        {rapport.numero && (
          <span className="hidden sm:block text-2xs font-mono text-text-muted/35 flex-shrink-0 w-36 truncate">
            {rapport.numero}
          </span>
        )}
        <span className="text-sm text-text-primary font-medium truncate">{rapport.titre}</span>
        {rapport.resume && (
          <span className="hidden lg:block text-xs text-text-muted truncate max-w-xs">{rapport.resume}</span>
        )}
      </Link>

      {/* Badges — centre/droite */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 leading-none">
        <span
          className="px-1.5 py-px rounded text-2xs font-medium border"
          style={{ color: entiteColor, borderColor: entiteColor + '30', background: entiteColor + '12' }}
        >
          {entiteNom}
        </span>
        <span className={`px-1.5 py-px rounded text-2xs font-medium border ${statut.className}`}>
          {statut.label}
        </span>
        <span className={`flex items-center gap-0.5 px-1.5 py-px rounded text-2xs font-medium border ${visibilite.className}`}>
          {visibilite.icon}{visibilite.label}
        </span>
        <span className="px-1.5 py-px rounded text-2xs text-text-muted border border-surface-border bg-surface">
          {typeLabel}
        </span>
      </div>

      {/* Métadonnées — extrême droite */}
      <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-2xs text-text-muted/60 ml-2">
        {redacteur && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-violet/20 flex items-center justify-center text-2xs font-bold text-violet">
              {redacteur.prenom?.[0]}
            </div>
            <span className="hidden lg:block">{redacteur.prenom} {redacteur.nom}</span>
          </div>
        )}
        {projet && (
          <div className="hidden lg:flex items-center gap-1">
            <Briefcase size={9} />{projet.titre}
          </div>
        )}
        <span className="whitespace-nowrap">{formatRelativeTime(rapport.created_at)}</span>
      </div>

      {/* Actions — apparaissent au hover */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        {isOwn && rapport.statut === 'brouillon' && (
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-amber transition-colors" title="Modifier">
            <FileText size={12} />
          </button>
        )}
        <Link href={`/rapports/${rapport.id}`} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-blue transition-colors" title="Consulter" onClick={e => e.stopPropagation()}>
          <Eye size={12} />
        </Link>
        {canDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1 bg-surface border border-red/20 rounded px-2 py-1 ml-1">
              <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-2xs text-red font-medium hover:underline">Oui</button>
              <span className="text-text-muted text-2xs">·</span>
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(false) }} className="text-2xs text-text-muted hover:underline">Non</button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} className="p-1.5 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors" title="Supprimer">
              <Trash2 size={12} />
            </button>
          )
        )}
      </div>
    </div>
  )
}

function RapportModal({
  entiteId,
  reportData,
  onClose,
  onSuccess,
}: {
  entiteId: string
  reportData: Rapport | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAppStore()
  const isEdit = !!reportData

  const [form, setForm] = useState({
    entite_id:          reportData?.entite_id   || entiteId || 'a0000000-0000-0000-0000-000000000001',
    titre:              reportData?.titre        || '',
    type:               reportData?.type         || 'rapport_activite',
    visibilite:         (reportData?.visibilite  || 'equipe') as RapportVisibilite,
    resume:             reportData?.resume        || '',
    contenu:            reportData?.contenu       || '',
    projet_id:          reportData?.projet_id    || '',
    membres_concernes:  reportData?.membres_concernes || [] as string[],
  })

  const [projets,   setProjets]   = useState<{ id: string; titre: string }[]>([])
  const [membres,   setMembres]   = useState<MembreLite[]>([])
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [files,     setFiles]     = useState<File[]>([])
  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(f => [...f, ...selected.filter(s => !f.find(x => x.name === s.name))])
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(f => [...f, ...dropped.filter(s => !f.find(x => x.name === s.name))])
  }

  async function uploadFiles(rapportId: string) {
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
      const path = `${rapportId}/${Date.now()}_${safe}`
      const { storedPath, error: upErr } = await uploadToStorage(supabase, 'rapports', path, file)
      if (!upErr) {
        await supabase.rpc('ajouter_piece_jointe', {
          p_rapport_id: rapportId,
          p_nom:        file.name,
          p_chemin:     storedPath,
          p_taille:     file.size,
          p_type_mime:  file.type || null,
        })
      }
    }
  }

  useEffect(() => {
    supabase.from('users').select('id, prenom, nom, role').order('prenom')
      .then(({ data }) => setMembres(data || []))

    supabase.from('projets').select('id, titre')
      .eq('entite_id', form.entite_id)
      .order('titre')
      .then(({ data }) => setProjets(data || []))
  }, [form.entite_id])

  function toggleMembre(id: string) {
    setForm(f => ({
      ...f,
      membres_concernes: f.membres_concernes.includes(id)
        ? f.membres_concernes.filter(m => m !== id)
        : [...f.membres_concernes, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre.trim()) { setError('Le titre est requis.'); return }
    setError('')
    setSaving(true)

    if (isEdit && reportData) {
      const { error: rpcError } = await supabase.rpc('update_rapport', {
        p_id:               reportData.id,
        p_titre:            form.titre,
        p_type:             form.type,
        p_visibilite:       form.visibilite,
        p_resume:           form.resume || null,
        p_contenu:          form.contenu || null,
        p_membres_concernes: form.membres_concernes.length ? form.membres_concernes : null,
      })
      if (rpcError) { setSaving(false); setError(rpcError.message); return }
      if (files.length > 0) { setUploading(true); await uploadFiles(reportData.id); setUploading(false) }
      setSaving(false)
      onSuccess()
      return
    }

    const { data: rapportId, error: rpcError } = await supabase.rpc('creer_rapport', {
      p_entite_id:         form.entite_id,
      p_titre:             form.titre,
      p_type:              form.type,
      p_visibilite:        form.visibilite,
      p_resume:            form.resume || null,
      p_contenu:           form.contenu || null,
      p_projet_id:         form.projet_id || null,
      p_membres_concernes: form.membres_concernes.length ? form.membres_concernes : [],
    })

    if (rpcError) { setSaving(false); setError(rpcError.message); return }
    if (files.length > 0 && rapportId) { setUploading(true); await uploadFiles(rapportId as string); setUploading(false) }
    setSaving(false)
    onSuccess()
  }

  const fieldCls = 'input text-sm'
  const sectionCls = 'space-y-4'
  const labelCls = 'label'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal w-full max-w-3xl mx-4 p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {isEdit ? 'Modifier le rapport' : 'Nouveau rapport'}
            </h3>
            <p className="text-2xs text-text-muted mt-0.5">
              {isEdit ? 'Modifier les informations du brouillon' : 'Créer un nouveau rapport de connaissance'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <form id="rapport-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red/10 border border-red/20">
                <p className="text-xs text-red">{error}</p>
              </div>
            )}

            {/* Section 1 — Identification */}
            <div className={sectionCls}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue/15 text-blue text-2xs flex items-center justify-center font-bold">1</span>
                Identification
              </h4>

              {!isEdit && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Entité</label>
                  <select className={fieldCls} value={form.entite_id} onChange={e => setForm({ ...form, entite_id: e.target.value, projet_id: '' })}>
                    <option value="a0000000-0000-0000-0000-000000000001">Sama Digital</option>
                    <option value="a0000000-0000-0000-0000-000000000002">Aurantir</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={labelCls}>Titre <span className="text-red">*</span></label>
                <input
                  type="text"
                  className={fieldCls}
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  required
                  placeholder="Ex : Bilan Q2 2026 — Sama Digital"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Type de rapport</label>
                  <select className={fieldCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {!isEdit && (
                  <div className="space-y-1.5">
                    <label className={labelCls}>Projet associé <span className="text-2xs text-text-muted font-normal">(optionnel)</span></label>
                    <select className={fieldCls} value={form.projet_id} onChange={e => setForm({ ...form, projet_id: e.target.value })}>
                      <option value="">Aucun projet lié</option>
                      {projets.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2 — Visibilité */}
            <div className={sectionCls}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue/15 text-blue text-2xs flex items-center justify-center font-bold">2</span>
                Visibilité &amp; diffusion
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {VISIBILITE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, visibilite: opt.value })}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      form.visibilite === opt.value
                        ? opt.className
                        : 'border-surface-border bg-surface hover:border-surface-hover text-text-muted'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{opt.icon}</div>
                    <div>
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-2xs opacity-70 mt-0.5 leading-tight">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3 — Contenu */}
            <div className={sectionCls}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue/15 text-blue text-2xs flex items-center justify-center font-bold">3</span>
                Contenu du rapport
              </h4>

              <div className="space-y-1.5">
                <label className={labelCls}>Résumé exécutif <span className="text-2xs text-text-muted font-normal">(points clés, pour affichage en liste)</span></label>
                <textarea
                  className={fieldCls}
                  rows={3}
                  value={form.resume}
                  onChange={e => setForm({ ...form, resume: e.target.value })}
                  placeholder="Résumé en 2-3 phrases des points clés..."
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Corps du rapport <span className="text-2xs text-text-muted font-normal">(contenu complet, markdown supporté)</span></label>
                <textarea
                  className={fieldCls}
                  rows={12}
                  value={form.contenu}
                  onChange={e => setForm({ ...form, contenu: e.target.value })}
                  placeholder="Rédigez ici le contenu complet du rapport...&#10;&#10;## Section 1&#10;&#10;..."
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: '1.6' }}
                />
              </div>
            </div>

            {/* Section 4 — Membres concernés */}
            {membres.length > 0 && (
              <div className={sectionCls}>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue/15 text-blue text-2xs flex items-center justify-center font-bold">4</span>
                  Membres concernés <span className="font-normal normal-case tracking-normal text-text-disabled ml-1">(optionnel)</span>
                </h4>

                <div className="flex flex-wrap gap-2">
                  {membres.map(m => {
                    const selected = form.membres_concernes.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMembre(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${
                          selected
                            ? 'bg-violet/10 text-violet border-violet/30 font-medium'
                            : 'bg-surface text-text-muted border-surface-border hover:border-violet/30 hover:text-violet'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0 ${
                          selected ? 'bg-violet text-white' : 'bg-surface-elevated text-text-muted'
                        }`}>
                          {m.prenom[0]}
                        </span>
                        {m.prenom} {m.nom}
                        {selected && <span className="ml-0.5 text-violet">✓</span>}
                      </button>
                    )
                  })}
                </div>
                {form.membres_concernes.length > 0 && (
                  <p className="text-2xs text-text-muted">{form.membres_concernes.length} membre{form.membres_concernes.length > 1 ? 's' : ''} sélectionné{form.membres_concernes.length > 1 ? 's' : ''}</p>
                )}
              </div>
            )}

            {/* Section 5 — Pièces jointes */}
            <div className={sectionCls}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue/15 text-blue text-2xs flex items-center justify-center font-bold">5</span>
                Pièces jointes <span className="font-normal normal-case tracking-normal text-text-disabled ml-1">(optionnel)</span>
              </h4>

              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue bg-blue/5' : 'border-surface-border hover:border-blue/40'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Paperclip size={18} className="mx-auto mb-1.5 text-text-muted opacity-50" />
                <p className="text-xs text-text-muted">
                  Glisser des fichiers ici ou{' '}
                  <span className="text-blue hover:underline">parcourir</span>
                </p>
                <p className="text-2xs text-text-disabled mt-1">PDF, images, documents — 50 MB max par fichier</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg">
                      <FileText size={13} className="text-blue flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate">{f.name}</p>
                        <p className="text-2xs text-text-muted">{formatFileSize(f.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-text-muted hover:text-red transition-colors flex-shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border flex-shrink-0 bg-surface">
          <p className="text-2xs text-text-muted">
            {isEdit ? 'Le rapport restera en brouillon jusqu\'à publication' : 'Sera créé en statut Brouillon — publiez depuis la page de détail'}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" form="rapport-form" loading={saving || uploading}>
              {uploading ? `Envoi des fichiers…` : isEdit ? 'Enregistrer' : 'Créer le brouillon'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
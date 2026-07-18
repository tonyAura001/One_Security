// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Badge, StatutProjetBadge, EntiteBadge, RoleBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { formatDate, formatMontant, pourcentage, initiales, formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import type { Projet, Tache, MembreProjet } from '@/aurantir-front-kit/types/database.types'
import {
  ArrowLeft, FolderKanban, Calendar, Users, TrendingUp,
  Edit, MoreHorizontal, Plus, CheckCircle2, Clock,
  AlertTriangle, Briefcase, FileText, BookOpen, Flag,
  ChevronRight, Zap, Target, Layers, Building2, X, Check, FileSignature, FolderTree,
  StickyNote, Lock, ShieldCheck, Eye, Paperclip, Download, Pin,
  ThumbsUp, ThumbsDown, MessageCircle, Reply, Send, Trash2, Loader2, Upload,
} from 'lucide-react'

const EV_COULEURS: Record<string, string> = {
  planification: '#6366F1', reunion: '#3B82F6', deadline: '#EF4444',
  presentation: '#8B5CF6', formation: '#10B981', conge: '#F59E0B',
  tache_kanban: '#0EA5E9', jalon: '#F97316', rappel: '#A78BFA', autre: '#6B7280',
}
const EV_LABELS: Record<string, string> = {
  planification: 'Planification', reunion: 'Réunion', deadline: 'Deadline',
  presentation: 'Présentation', formation: 'Formation', conge: 'Congé',
  tache_kanban: 'Tâche', jalon: 'Jalon', rappel: 'Rappel', autre: 'Autre',
}

interface Evenement {
  id: string; titre: string; type: string; date_debut: string
  date_fin?: string; lieu?: string; couleur?: string
}

interface NoteItem {
  id: string; titre: string; contenu: string; couleur: string
  visibilite: string; est_epinglee: boolean; updated_at: string
  pieces_jointes?: { nom: string; url_stockage: string; taille: number; type: string }[]
  auteur?: { id: string; prenom: string; nom: string }
  client?: { id: string; nom_entreprise: string } | null
}

export default function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAppStore()
  const canManageTeam = user?.role === 'super_admin' || user?.role === 'fondateur'
  const isClientExterne = user?.role === 'client_externe'
  const [projet, setProjet] = useState<Projet | null>(null)
  const [taches, setTaches] = useState<Tache[]>([])
  const [membres, setMembres] = useState<MembreProjet[]>([])
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [viewNote, setViewNote] = useState<NoteItem | null>(null)
  const [sousProjets, setSousProjets] = useState<{ id: string; titre: string; statut: string; avancement: number; date_fin_prevue?: string }[]>([])
  const [chemin, setChemin] = useState<{ id: string; titre: string; niveau: number }[]>([])
  const [clientsAssocies, setClientsAssocies] = useState<{ id: string; nom_entreprise: string }[]>([])
  const [allClients, setAllClients] = useState<{ id: string; nom_entreprise: string }[]>([])
  const [allContrats, setAllContrats] = useState<{ id: string; numero: string; titre: string }[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; prenom: string; nom: string; role: string }[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<{
    titre: string; description: string; statut: string; priorite: string
    date_debut: string; date_fin_prevue: string; budget_prevu: string
    heures_prevues: string; chef_projet_id: string; depot_git: string; lien_design: string
  } | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [showContratPicker, setShowContratPicker] = useState(false)
  const [showAddMembre, setShowAddMembre] = useState(false)
  const [addingMembre, setAddingMembre] = useState(false)
  const [changingType, setChangingType] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingPJ, setUploadingPJ] = useState(false)
  const [pjError, setPjError] = useState('')
  const pjInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadProjet() }, [id])

  useEffect(() => {
    if (!canManageTeam) return
    supabase.from('users').select('id, prenom, nom, role')
      .in('role', ['super_admin', 'fondateur', 'manager', 'employe_interne'])
      .eq('statut', 'actif').order('prenom')
      .then(({ data }) => setAllUsers(data || []))
  }, [canManageTeam])

  async function loadProjet() {
    setLoading(true)
    const [{ data: projetData }, { data: tachesData }, { data: membresData }, { data: evData }, { data: pcData }, { data: notesData }, { data: spData }, { data: cheminData }] = await Promise.all([
      supabase
        .from('projets')
        .select('*, entite:entites_legales(*), client:entreprises_clientes(*), responsable:users!responsable_id(prenom, nom, avatar_url), contrat:contrats(id, numero, titre, statut, montant)')
        .eq('id', id)
        .single(),
      supabase
        .from('taches')
        .select('*, assigne:users!assigne_a(prenom, nom, avatar_url)')
        .eq('projet_id', id)
        .order('ordre'),
      supabase
        .from('membres_projet')
        .select('*, user:users!membres_projet_user_id_fkey(prenom, nom, avatar_url, role)')
        .eq('projet_id', id)
        .is('revoque_at', null),
      supabase
        .from('evenements_calendrier')
        .select('id, titre, type, date_debut, date_fin, lieu, couleur')
        .eq('projet_id', id)
        .order('date_debut', { ascending: false })
        .limit(10),
      supabase
        .from('projets_clients')
        .select('client_id, client:entreprises_clientes(id, nom_entreprise)')
        .eq('projet_id', id),
      supabase
        .from('notes')
        .select('id, titre, contenu, couleur, visibilite, est_epinglee, pieces_jointes, updated_at, auteur:users!created_by(id, prenom, nom), client:entreprises_clientes!client_id(id, nom_entreprise)')
        .eq('projet_id', id)
        .order('est_epinglee', { ascending: false })
        .order('updated_at', { ascending: false }),
      supabase
        .from('projets')
        .select('id, titre, statut, avancement, date_fin_prevue')
        .eq('parent_id', id)
        .order('created_at'),
      supabase.rpc('projets_chemin', { p_projet_id: id }),
    ])

    if (projetData) {
      setProjet(projetData as Projet)
      // Load all clients for the add-client picker
      const { data: allC } = await supabase
        .from('entreprises_clientes')
        .select('id, nom_entreprise')
        .eq('entite_id', (projetData as any).entite_id)
        .order('nom_entreprise')
      setAllClients(allC || [])
      const { data: allCt } = await supabase
        .from('contrats')
        .select('id, numero, titre')
        .eq('entite_id', (projetData as any).entite_id)
        .order('created_at', { ascending: false })
      setAllContrats(allCt || [])
    }
    setTaches((tachesData || []) as Tache[])
    setMembres((membresData || []) as MembreProjet[])
    setEvenements((evData || []) as Evenement[])
    setClientsAssocies((pcData || []).map((r: any) => r.client).filter(Boolean))
    setNotes((notesData || []).map((n: any) => ({
      ...n,
      pieces_jointes: typeof n.pieces_jointes === 'string'
        ? (() => { try { return JSON.parse(n.pieces_jointes) } catch { return [] } })()
        : (Array.isArray(n.pieces_jointes) ? n.pieces_jointes : []),
    })) as NoteItem[])
    setSousProjets((spData || []) as { id: string; titre: string; statut: string; avancement: number; date_fin_prevue?: string }[])
    setChemin((cheminData || []) as { id: string; titre: string; niveau: number }[])
    setLoading(false)
  }

  async function switchToSpecial() {
    setChangingType(true)
    const currentClientId = (projet as any)?.client?.id
    await supabase.from('projets').update({ type_projet: 'special', client_id: null }).eq('id', id)
    if (currentClientId) {
      await supabase.from('projets_clients').upsert({ projet_id: id, client_id: currentClientId })
    }
    await loadProjet()
    setChangingType(false)
  }

  async function switchToClassique(keepClientId: string) {
    setChangingType(true)
    await supabase.from('projets').update({ type_projet: 'classique', client_id: keepClientId || null }).eq('id', id)
    await supabase.from('projets_clients').delete().eq('projet_id', id)
    await loadProjet()
    setChangingType(false)
  }

  async function addClientToProjet(clientId: string) {
    await supabase.from('projets_clients').upsert({ projet_id: id, client_id: clientId })
    await loadProjet()
    setShowAddClient(false)
  }

  async function removeClientFromProjet(clientId: string) {
    await supabase.from('projets_clients').delete().eq('projet_id', id).eq('client_id', clientId)
    await loadProjet()
  }

  async function addMembreToProjet(userId: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authUser.id).single()
    if (!userData) return
    setAddingMembre(true)
    await supabase.rpc('add_membre_projet_single', {
      p_projet_id: id, p_user_id: userId, p_role: 'contributeur', p_ajoute_par: userData.id,
    })
    const { data } = await supabase
      .from('membres_projet')
      .select('*, user:users!membres_projet_user_id_fkey(prenom, nom, avatar_url, role)')
      .eq('projet_id', id).is('revoque_at', null)
    setMembres((data || []) as MembreProjet[])
    setAddingMembre(false)
    setShowAddMembre(false)
  }

  async function removeMembreFromProjet(membreId: string) {
    await supabase.rpc('remove_membre_projet_single', { p_membre_id: membreId })
    setMembres(prev => prev.filter(m => m.id !== membreId))
  }

  function openEdit() {
    if (!projet) return
    setEditForm({
      titre: projet.titre,
      description: projet.description || '',
      statut: projet.statut,
      priorite: (projet as any).priorite || 'normale',
      date_debut: projet.date_debut || '',
      date_fin_prevue: projet.date_fin_prevue || '',
      budget_prevu: projet.budget_prevu ? String(projet.budget_prevu) : '',
      heures_prevues: (projet as any).heures_prevues ? String((projet as any).heures_prevues) : '',
      chef_projet_id: (projet as any).chef_projet_id || '',
      depot_git: (projet as any).depot_git || '',
      lien_design: (projet as any).lien_design || '',
    })
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editForm || !projet) return
    setEditSaving(true)
    const { error } = await supabase.from('projets').update({
      titre: editForm.titre.trim(),
      description: editForm.description.trim() || null,
      statut: editForm.statut as any,
      priorite: editForm.priorite as any,
      date_debut: editForm.date_debut || null,
      date_fin_prevue: editForm.date_fin_prevue || null,
      budget_prevu: editForm.budget_prevu ? parseFloat(editForm.budget_prevu) : 0,
      heures_prevues: editForm.heures_prevues ? parseInt(editForm.heures_prevues) : 0,
      chef_projet_id: editForm.chef_projet_id || null,
      depot_git: editForm.depot_git.trim() || null,
      lien_design: editForm.lien_design.trim() || null,
    } as any).eq('id', id)
    if (!error) {
      setShowEdit(false)
      await loadProjet()
    }
    setEditSaving(false)
  }

  async function downloadProjectFile(pj: { nom: string; url_stockage: string }) {
    await downloadFromStorage(supabase, 'documents', pj.url_stockage, pj.nom)
  }

  async function uploadProjectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (!selected.length || !projet) return
    setUploadingPJ(true); setPjError('')
    const existing: { nom: string; url_stockage: string; taille: number; type: string }[] = (projet as any).pieces_jointes || []
    const added: typeof existing = []
    const errors: string[] = []
    for (const file of selected) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
      const path = `projets/${id}/${Date.now()}_${safeName}`
      const { storedPath, error: ue } = await uploadToStorage(supabase, 'documents', path, file)
      if (ue) errors.push(`${file.name} : ${ue.message}`)
      else added.push({ nom: file.name, url_stockage: storedPath, taille: file.size, type: file.type })
    }
    if (added.length > 0) {
      const newPJs = [...existing, ...added]
      const { error: ue } = await supabase.from('projets').update({ pieces_jointes: newPJs } as any).eq('id', id)
      if (ue) errors.push(`Enregistrement : ${ue.message}`)
      else setProjet((prev: any) => ({ ...prev, pieces_jointes: newPJs }))
    }
    if (errors.length) setPjError(errors.join(' | '))
    setUploadingPJ(false)
  }

  async function deleteProjectFile(idx: number) {
    if (!projet) return
    const pjs: { nom: string; url_stockage: string; taille: number; type: string }[] = [...((projet as any).pieces_jointes || [])]
    const [removed] = pjs.splice(idx, 1)
    await supabase.storage.from('documents').remove([removed.url_stockage])
    const { error } = await supabase.from('projets').update({ pieces_jointes: pjs } as any).eq('id', id)
    if (!error) setProjet((prev: any) => ({ ...prev, pieces_jointes: pjs }))
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!projet) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Projet introuvable</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    )
  }

  const tachesTerminees = taches.filter(t => t.statut === 'termine').length
  const tachesUrgentes = taches.filter(t => t.priorite === 'urgente' && t.statut !== 'termine').length
  const statsParStatut = {
    backlog: taches.filter(t => t.statut === 'backlog').length,
    a_faire: taches.filter(t => t.statut === 'a_faire').length,
    en_cours: taches.filter(t => t.statut === 'en_cours').length,
    en_review: taches.filter(t => t.statut === 'en_review').length,
    termine: tachesTerminees,
  }

  const parentInfo = chemin.length > 1 ? chemin[chemin.length - 2] : null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
        <Link href="/projets" className="hover:text-blue transition-colors">Projets</Link>
        {chemin.slice(0, -1).map(ancetre => (
          <span key={ancetre.id} className="flex items-center gap-2">
            <ChevronRight size={12} />
            <Link href={`/projets/${ancetre.id}`} className="hover:text-blue transition-colors">{ancetre.titre}</Link>
          </span>
        ))}
        <ChevronRight size={12} />
        <span className="text-text-primary">{projet.titre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center">
              <FolderKanban size={20} className="text-blue" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{projet.titre}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatutProjetBadge statut={projet.statut} />
                {(projet as any).entite && <EntiteBadge nom={(projet as any).entite.nom} />}
                {(projet as any).type_projet === 'special' ? (
                  <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border font-medium bg-violet/10 text-violet border-violet/20">
                    <Layers size={10} /> Spécial
                  </span>
                ) : (projet as any).client ? (
                  <Link href={`/crm/clients/${(projet as any).client.id}`} className="text-xs text-text-muted hover:text-blue transition-colors">
                    {(projet as any).client.nom_entreprise}
                  </Link>
                ) : null}
              </div>
              {parentInfo && (
                <Link href={`/projets/${parentInfo.id}`}
                  className="inline-flex items-center gap-1.5 text-2xs text-text-muted hover:text-blue transition-colors mt-1.5">
                  <FolderTree size={11} />
                  Sous-projet de <span className="font-medium text-text-secondary">{parentInfo.titre}</span>
                </Link>
              )}
            </div>
          </div>
          {projet.description && (
            <p className="text-sm text-text-secondary max-w-2xl">{projet.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/projets/${id}/kanban`}>
            <Button variant="secondary" size="sm" icon={<Zap size={14} />}>Kanban</Button>
          </Link>
          <Button size="sm" icon={<Edit size={14} />} onClick={openEdit}>Modifier</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Avancement</p>
            <Target size={14} className="text-blue" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-text-primary">{projet.avancement}%</p>
            <div className="h-1.5 bg-surface-border rounded-full">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${projet.avancement}%`,
                  background: projet.avancement >= 75 ? '#10B981' : projet.avancement >= 40 ? '#3B82F6' : '#F59E0B'
                }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Tâches</p>
            <CheckCircle2 size={14} className="text-green" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{tachesTerminees}/{taches.length}</p>
          {tachesUrgentes > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-red" />
              <span className="text-2xs text-red">{tachesUrgentes} urgente{tachesUrgentes > 1 ? 's' : ''}</span>
            </div>
          )}
        </Card>

        {!isClientExterne && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">Budget</p>
              <TrendingUp size={14} className="text-violet" />
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {projet.budget_prevu > 0 ? formatMontant(projet.budget_prevu) : '—'}
            </p>
            {projet.budget_reel > 0 && (
              <p className="text-2xs text-text-muted">
                Réel : {formatMontant(projet.budget_reel)}
              </p>
            )}
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Échéance</p>
            <Calendar size={14} className="text-amber" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {projet.date_fin_prevue ? formatDate(projet.date_fin_prevue) : '—'}
          </p>
          {projet.date_debut && (
            <p className="text-2xs text-text-muted">Début : {formatDate(projet.date_debut)}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban mini */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Aperçu des tâches</h3>
            <Link href={`/projets/${id}/kanban`}>
              <Button variant="ghost" size="sm" iconRight={<ChevronRight size={12} />}>
                Voir le Kanban
              </Button>
            </Link>
          </div>

          {/* Colonnes mini */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { key: 'backlog', label: 'Backlog', color: '#6B7280' },
              { key: 'a_faire', label: 'À faire', color: '#9CA3AF' },
              { key: 'en_cours', label: 'En cours', color: '#3B82F6' },
              { key: 'en_review', label: 'Review', color: '#F59E0B' },
              { key: 'termine', label: 'Terminé', color: '#10B981' },
            ].map(col => (
              <div key={col.key} className="text-center">
                <div className="text-xl font-bold" style={{ color: col.color }}>
                  {statsParStatut[col.key as keyof typeof statsParStatut]}
                </div>
                <p className="text-2xs text-text-muted mt-0.5">{col.label}</p>
              </div>
            ))}
          </div>

          {/* Tâches urgentes */}
          {taches.filter(t => t.priorite === 'urgente' && t.statut !== 'termine').length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red flex items-center gap-1">
                <AlertTriangle size={12} />
                Tâches urgentes
              </p>
              {taches.filter(t => t.priorite === 'urgente' && t.statut !== 'termine').map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-red/5 border border-red/15">
                  <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
                  <p className="text-xs text-text-primary flex-1">{t.titre}</p>
                  {(t as any).assigne && (
                    <div className="w-5 h-5 rounded-full bg-surface border border-surface-border flex items-center justify-center text-2xs text-text-muted">
                      {(t as any).assigne.prenom?.[0]}
                    </div>
                  )}
                  {t.date_echeance && (
                    <span className="text-2xs text-red">{formatDate(t.date_echeance)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tâches récentes */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">Tâches récentes</p>
            {taches.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                  t.statut === 'termine' ? 'bg-green border-green' :
                  t.statut === 'en_cours' ? 'border-blue' :
                  'border-surface-border'
                }`} />
                <p className={`text-xs flex-1 ${t.statut === 'termine' ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                  {t.titre}
                </p>
                <Badge
                  variant={
                    t.priorite === 'urgente' ? 'red' :
                    t.priorite === 'haute' ? 'amber' : 'gray'
                  }
                  size="sm"
                >
                  {t.priorite}
                </Badge>
              </div>
            ))}
            {taches.length > 5 && (
              <p className="text-2xs text-text-muted text-center py-1">
                +{taches.length - 5} autres tâches
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Membres */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Users size={13} className="text-blue" />
                Équipe ({membres.length})
              </h4>
              {canManageTeam && (
                <button
                  onClick={() => setShowAddMembre(v => !v)}
                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-hover transition-colors text-text-muted hover:text-blue"
                >
                  {showAddMembre ? <X size={12} /> : <Plus size={12} />}
                </button>
              )}
            </div>

            {membres.length === 0 && (
              <p className="text-xs text-text-muted text-center py-1">Aucun membre</p>
            )}

            <div className="space-y-2">
              {membres.map(m => (
                <div key={m.id} className="flex items-center gap-2 group">
                  <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0">
                    {initiales((m as any).user?.prenom || '', (m as any).user?.nom || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs font-medium text-text-primary truncate">
                      {(m as any).user?.prenom} {(m as any).user?.nom}
                    </p>
                    <p className="text-2xs text-text-muted capitalize">{m.role_projet}</p>
                  </div>
                  {canManageTeam && (
                    <button
                      onClick={() => removeMembreFromProjet(m.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red/10 hover:text-red text-text-muted flex-shrink-0"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Picker d'ajout de membre */}
            {showAddMembre && canManageTeam && (
              <div className="pt-2 border-t border-surface-border space-y-1">
                {addingMembre && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 size={14} className="animate-spin text-blue" />
                  </div>
                )}
                {!addingMembre && (() => {
                  const memberUserIds = new Set(membres.map(m => (m as any).user_id))
                  const available = allUsers.filter(u => !memberUserIds.has(u.id))
                  return available.length === 0
                    ? <p className="text-xs text-text-muted text-center py-1">Tous les utilisateurs sont déjà membres</p>
                    : available.map(u => (
                        <button key={u.id} onClick={() => addMembreToProjet(u.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue/10 text-left transition-colors group">
                          <div className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-2xs font-bold text-text-muted flex-shrink-0">
                            {initiales(u.prenom, u.nom || u.prenom)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-2xs font-medium text-text-secondary group-hover:text-blue transition-colors truncate">
                              {u.prenom} {u.nom}
                            </p>
                            <p className="text-2xs text-text-muted capitalize">{u.role}</p>
                          </div>
                          <Plus size={10} className="text-text-muted group-hover:text-blue flex-shrink-0" />
                        </button>
                      ))
                })()}
              </div>
            )}
          </Card>

          {/* Navigation rapide */}
          <Card className="p-4 space-y-1">
            <h4 className="text-xs font-semibold text-text-primary mb-2">Navigation</h4>
            {[
              { href: `/projets/${id}/kanban`, icon: <Zap size={13} />, label: 'Kanban', desc: `${taches.length} tâches` },
              { href: `/projets/${id}/rapports`, icon: <FileText size={13} />, label: 'Rapports', desc: '' },
              { href: `/projets/${id}/ressources`, icon: <BookOpen size={13} />, label: 'Ressources', desc: '' },
              { href: `/projets/${id}/cloture`, icon: <Flag size={13} />, label: 'Clôture', desc: '' },
            ].map(nav => (
              <Link
                key={nav.href}
                href={nav.href}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover transition-colors group"
              >
                <span className="text-text-muted group-hover:text-blue transition-colors">{nav.icon}</span>
                <span className="text-xs text-text-secondary group-hover:text-text-primary flex-1 transition-colors">{nav.label}</span>
                {nav.desc && <span className="text-2xs text-text-muted">{nav.desc}</span>}
                <ChevronRight size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </Card>

          {/* Contrat associé */}
          {(() => {
            const contrat = (projet as any).contrat
            const statutCls: Record<string, string> = {
              actif:      'bg-green/10 text-green border-green/20',
              signe:      'bg-green/10 text-green border-green/20',
              en_attente: 'bg-amber/10 text-amber border-amber/20',
              expire:     'bg-red/10 text-red border-red/20',
              resilie:    'bg-red/10 text-red border-red/20',
              brouillon:  'bg-surface text-text-muted border-surface-border',
            }
            return (
              <Card className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <FileSignature size={13} className="text-amber" />
                    Contrat lié
                  </h4>
                  {contrat ? (
                    <button onClick={() => setShowContratPicker(v => !v)}
                      className="text-2xs text-text-muted hover:text-blue transition-colors">
                      Changer
                    </button>
                  ) : (
                    <button onClick={() => setShowContratPicker(v => !v)}
                      className="text-2xs text-blue hover:underline">
                      + Lier un contrat
                    </button>
                  )}
                </div>

                {contrat && !showContratPicker && (
                  <Link href={`/crm/contrats/${contrat.id}`} className="block group">
                    <div>
                      <p className="text-xs font-medium text-text-primary group-hover:text-blue transition-colors truncate">{contrat.titre}</p>
                      <p className="text-2xs text-text-muted mt-0.5">{contrat.numero}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${statutCls[contrat.statut] || statutCls.brouillon}`}>
                        {contrat.statut}
                      </span>
                      {contrat.montant > 0 && (
                        <span className="text-xs font-semibold text-text-primary">{contrat.montant.toLocaleString('fr')} FCFA</span>
                      )}
                    </div>
                  </Link>
                )}

                {!contrat && !showContratPicker && (
                  <p className="text-xs text-text-muted">Aucun contrat associé</p>
                )}

                {showContratPicker && (
                  <div className="space-y-1 pt-1 border-t border-surface-border">
                    {allContrats.length === 0 ? (
                      <p className="text-xs text-text-muted py-1">Aucun contrat disponible</p>
                    ) : (
                      allContrats.map(ct => (
                        <button key={ct.id}
                          onClick={async () => {
                            await supabase.from('projets').update({ contrat_id: ct.id }).eq('id', id)
                            setShowContratPicker(false)
                            await loadProjet()
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue/10 text-left transition-colors group">
                          <FileSignature size={11} className="text-text-muted group-hover:text-blue flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-secondary group-hover:text-blue transition-colors truncate">{ct.titre}</p>
                            <p className="text-2xs text-text-muted">{ct.numero}</p>
                          </div>
                          {contrat?.id === ct.id && <Check size={11} className="text-blue flex-shrink-0" />}
                        </button>
                      ))
                    )}
                    {contrat && (
                      <button
                        onClick={async () => {
                          await supabase.from('projets').update({ contrat_id: null }).eq('id', id)
                          setShowContratPicker(false)
                          await loadProjet()
                        }}
                        className="w-full text-2xs text-red/70 hover:text-red text-left px-2 py-1 transition-colors">
                        Dissocier le contrat
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })()}

          {/* Clients */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Building2 size={13} className="text-blue" />
                {(projet as any).type_projet === 'special' ? `Clients (${clientsAssocies.length})` : 'Client'}
              </h4>
              <div className="flex items-center gap-1">
                {(projet as any).type_projet === 'classique' ? (
                  <button onClick={switchToSpecial} disabled={changingType}
                    className="text-2xs text-violet hover:underline disabled:opacity-50">
                    → Passer en Spécial
                  </button>
                ) : (
                  <button onClick={() => setShowAddClient(v => !v)}
                    className="p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-blue">
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Classique : affiche le client unique */}
            {(projet as any).type_projet === 'classique' && (
              (projet as any).client ? (
                <Link href={`/crm/clients/${(projet as any).client.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0">
                    {(projet as any).client.nom_entreprise[0]}
                  </div>
                  <span className="text-xs font-medium text-text-primary group-hover:text-blue transition-colors truncate flex-1">
                    {(projet as any).client.nom_entreprise}
                  </span>
                  <ChevronRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100" />
                </Link>
              ) : (
                <p className="text-xs text-text-muted">Aucun client (projet interne)</p>
              )
            )}

            {/* Spécial : liste multi-clients */}
            {(projet as any).type_projet === 'special' && (
              <div className="space-y-1.5">
                {clientsAssocies.length === 0 && !showAddClient && (
                  <p className="text-xs text-text-muted">Aucun client associé — clique sur + pour en ajouter</p>
                )}
                {clientsAssocies.map(c => (
                  <div key={c.id} className="flex items-center gap-2 group">
                    <Link href={`/crm/clients/${c.id}`}
                      className="flex items-center gap-2 flex-1 p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                      <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0">
                        {c.nom_entreprise[0]}
                      </div>
                      <span className="text-xs font-medium text-text-primary truncate">{c.nom_entreprise}</span>
                    </Link>
                    <button onClick={() => removeClientFromProjet(c.id)}
                      className="p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {/* Add client picker */}
                {showAddClient && (
                  <div className="space-y-1 pt-1 border-t border-surface-border">
                    {allClients.filter(c => !clientsAssocies.find(ca => ca.id === c.id)).map(c => (
                      <button key={c.id} onClick={() => addClientToProjet(c.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue/10 text-left transition-colors group">
                        <div className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-2xs font-bold text-text-muted flex-shrink-0">
                          {c.nom_entreprise[0]}
                        </div>
                        <span className="text-xs text-text-secondary group-hover:text-blue transition-colors truncate">{c.nom_entreprise}</span>
                        <Plus size={10} className="ml-auto text-text-muted group-hover:text-blue flex-shrink-0" />
                      </button>
                    ))}
                    {allClients.filter(c => !clientsAssocies.find(ca => ca.id === c.id)).length === 0 && (
                      <p className="text-xs text-text-muted text-center py-1">Tous les clients sont déjà associés</p>
                    )}
                  </div>
                )}
                {/* Switch back to classique */}
                {clientsAssocies.length > 0 && (
                  <div className="pt-1 border-t border-surface-border">
                    <select className="w-full text-2xs text-text-muted bg-transparent border border-surface-border rounded px-1.5 py-1"
                      onChange={e => { if (e.target.value) switchToClassique(e.target.value) }}
                      defaultValue="">
                      <option value="" disabled>→ Passer en Classique (choisir un client)</option>
                      {clientsAssocies.map(c => <option key={c.id} value={c.id}>{c.nom_entreprise}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Responsable */}
          {(projet as any).responsable && (
            <Card className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-text-muted">Responsable</h4>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-xs font-bold text-violet">
                  {initiales((projet as any).responsable.prenom, (projet as any).responsable.nom)}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {(projet as any).responsable.prenom} {(projet as any).responsable.nom}
                  </p>
                  <p className="text-2xs text-text-muted">Chef de projet</p>
                </div>
              </div>
            </Card>
          )}

          {/* Pièces jointes du projet */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Paperclip size={12} /> Pièces jointes ({((projet as any).pieces_jointes as any[] | null)?.length ?? 0})
              </h4>
              <label className="relative cursor-pointer">
                <input
                  ref={pjInputRef}
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={uploadProjectFiles}
                  disabled={uploadingPJ}
                />
                <span className={`inline-flex items-center gap-1 text-2xs px-2 py-1 rounded-lg border font-medium transition-colors ${uploadingPJ ? 'text-text-muted border-surface-border' : 'text-blue border-blue/30 hover:bg-blue/5'}`}>
                  {uploadingPJ ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                  {uploadingPJ ? 'Envoi…' : 'Ajouter'}
                </span>
              </label>
            </div>
            {pjError && <p className="text-xs text-red-500">{pjError}</p>}
            {((projet as any).pieces_jointes as { nom: string; url_stockage: string; taille: number; type: string }[] | null)?.length ? (
              <div className="space-y-1.5">
                {((projet as any).pieces_jointes as { nom: string; url_stockage: string; taille: number; type: string }[]).map((pj, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-hover border border-surface-border group">
                    <FileText size={12} className="text-blue flex-shrink-0" />
                    <button onClick={() => downloadProjectFile(pj)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                      <span className="text-xs text-text-secondary truncate flex-1 hover:text-blue transition-colors">{pj.nom}</span>
                      <span className="text-2xs text-text-muted flex-shrink-0">
                        {pj.taille < 1048576 ? `${(pj.taille / 1024).toFixed(0)} Ko` : `${(pj.taille / 1048576).toFixed(1)} Mo`}
                      </span>
                      <Download size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                    <button onClick={() => deleteProjectFile(i)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-500 text-text-muted flex-shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted text-center py-2">Aucun fichier joint</p>
            )}
          </Card>

          {/* Événements */}
          {evenements.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock size={13} className="text-violet" />
                  Événements ({evenements.length})
                </h4>
                <Link href="/calendrier" className="text-2xs text-blue hover:underline">Calendrier</Link>
              </div>
              <div className="space-y-2">
                {evenements.map(ev => {
                  const couleur = ev.couleur || EV_COULEURS[ev.type] || '#6B7280'
                  const isPast = new Date(ev.date_debut) < new Date()
                  return (
                    <Link key={ev.id} href={`/calendrier?event=${ev.id}`}
                      className="flex items-start gap-2 rounded-lg p-1.5 -mx-1.5 hover:bg-surface-hover transition-colors group">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: couleur }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate group-hover:text-blue transition-colors ${isPast ? 'text-text-muted' : 'text-text-primary'}`}>{ev.titre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-2xs text-text-muted">{formatDate(ev.date_debut)}</span>
                          <span className="text-2xs px-1 py-px rounded font-medium"
                            style={{ color: couleur, background: couleur + '15' }}>
                            {EV_LABELS[ev.type] || ev.type}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sous-projets */}
      {(sousProjets.length > 0 || canManageTeam) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FolderTree size={14} className="text-blue" />
              Sous-projets{sousProjets.length > 0 ? ` (${sousProjets.length})` : ''}
            </h3>
            {canManageTeam && (
              <Button variant="secondary" size="sm" icon={<Plus size={12} />}
                onClick={() => router.push(`/projets/nouveau?parent=${id}`)}>
                Nouveau sous-projet
              </Button>
            )}
          </div>
          {sousProjets.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-surface-border rounded-xl">
              <FolderTree size={22} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Aucun sous-projet — organisez ce projet en phases ou lots en créant des sous-projets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sousProjets.map(sp => (
                <Link key={sp.id} href={`/projets/${sp.id}`}
                  className="group bg-surface border border-surface-border rounded-xl p-4 hover:border-blue/30 transition-all space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatutProjetBadge statut={sp.statut as any} />
                    <ChevronRight size={13} className="text-text-muted group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary group-hover:text-blue transition-colors truncate">{sp.titre}</h4>
                  <div className="space-y-1.5">
                    <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${sp.avancement}%`,
                          background: sp.avancement >= 75 ? '#10B981' : sp.avancement >= 40 ? '#3B82F6' : '#F59E0B'
                        }} />
                    </div>
                    <p className="text-2xs text-text-muted">
                      {sp.avancement}% complété{sp.date_fin_prevue ? ` · Échéance ${formatDate(sp.date_fin_prevue)}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes du projet */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <StickyNote size={14} className="text-amber" />
              Notes ({notes.length})
            </h3>
            <Link href="/notes" className="text-2xs text-blue hover:underline">
              Voir toutes les notes
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map(n => {
              const visCfg: Record<string, { icon: React.ReactNode; cls: string }> = {
                privee:     { icon: <Lock size={10} />,        cls: 'text-white/40' },
                equipe:     { icon: <Users size={10} />,       cls: 'text-blue/70' },
                fondateurs: { icon: <ShieldCheck size={10} />, cls: 'text-violet/70' },
                public:     { icon: <Eye size={10} />,         cls: 'text-green/70' },
              }
              const vis = visCfg[n.visibilite] ?? visCfg.equipe
              const pjCount = n.pieces_jointes?.length ?? 0
              return (
                <div
                  key={n.id}
                  onClick={() => setViewNote(n)}
                  className="group bg-surface border border-surface-border rounded-xl p-4 hover:border-surface-border-hover cursor-pointer transition-all duration-200 space-y-2.5 relative overflow-hidden"
                  style={{ borderLeftColor: n.couleur, borderLeftWidth: '3px' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px] opacity-30"
                    style={{ background: `linear-gradient(90deg, ${n.couleur}80, transparent)` }} />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-text-primary line-clamp-2 flex-1">{n.titre}</p>
                    {n.est_epinglee && <Pin size={11} className="text-amber flex-shrink-0 mt-0.5" style={{ fill: '#F59E0B' }} />}
                  </div>
                  {n.contenu && (
                    <div
                      className="text-xs text-text-muted line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: n.contenu.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    {n.auteur && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0"
                        style={{ backgroundColor: n.couleur + '25', color: n.couleur }}>
                        {n.auteur.prenom[0]}
                      </div>
                    )}
                    <span className="text-2xs text-text-muted flex-1 truncate">{formatRelativeTime(n.updated_at)}</span>
                    {pjCount > 0 && (
                      <span className="flex items-center gap-0.5 text-2xs text-text-muted">
                        <Paperclip size={9} /> {pjCount}
                      </span>
                    )}
                    <span className={`flex items-center gap-0.5 text-2xs ${vis.cls}`}>{vis.icon}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Note read drawer */}
      {viewNote && (
        <ProjetNoteDrawer note={viewNote} onClose={() => setViewNote(null)} />
      )}

      {/* Modale d'édition du projet */}
      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-text-primary">Modifier le projet</h2>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="label">Titre *</label>
                <input className="input" value={editForm.titre} onChange={e => setEditForm(f => f && ({ ...f, titre: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={editForm.description} onChange={e => setEditForm(f => f && ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">Statut</label>
                  <select className="input" value={editForm.statut} onChange={e => setEditForm(f => f && ({ ...f, statut: e.target.value }))}>
                    <option value="planifie">Planifié</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_pause">En pause</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="label">Priorité</label>
                  <select className="input" value={editForm.priorite} onChange={e => setEditForm(f => f && ({ ...f, priorite: e.target.value }))}>
                    <option value="faible">Faible</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">Date de début</label>
                  <input className="input" type="date" value={editForm.date_debut} onChange={e => setEditForm(f => f && ({ ...f, date_debut: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Échéance</label>
                  <input className="input" type="date" value={editForm.date_fin_prevue} onChange={e => setEditForm(f => f && ({ ...f, date_fin_prevue: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">Budget prévu (FCFA)</label>
                  <input className="input" type="number" value={editForm.budget_prevu} onChange={e => setEditForm(f => f && ({ ...f, budget_prevu: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Heures prévues</label>
                  <input className="input" type="number" value={editForm.heures_prevues} onChange={e => setEditForm(f => f && ({ ...f, heures_prevues: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label">Chef de projet</label>
                <select className="input" value={editForm.chef_projet_id} onChange={e => setEditForm(f => f && ({ ...f, chef_projet_id: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="label">Dépôt Git</label>
                <input className="input" type="url" placeholder="https://github.com/..." value={editForm.depot_git} onChange={e => setEditForm(f => f && ({ ...f, depot_git: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Lien Design (Figma)</label>
                <input className="input" type="url" placeholder="https://figma.com/..." value={editForm.lien_design} onChange={e => setEditForm(f => f && ({ ...f, lien_design: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-surface-border">
              <Button variant="secondary" onClick={() => setShowEdit(false)}>Annuler</Button>
              <Button loading={editSaving} disabled={!editForm.titre.trim()} onClick={saveEdit} icon={<Check size={14} />}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Social types ──────────────────────────────────────────────
interface NoteReaction { user_id: string; type: string }
interface NoteCommentReaction { user_id: string }
interface ProjNoteCommentaire {
  id: string; note_id: string; user_id: string; parent_id: string | null
  contenu: string; created_at: string
  auteur: { prenom: string; nom: string }
  reactions: NoteCommentReaction[]
}

function ProjetNoteDrawer({ note, onClose }: { note: NoteItem; onClose: () => void }) {
  const supabase = createClient()
  const color = note.couleur || '#3B82F6'
  const pjs   = note.pieces_jointes ?? []

  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [reactions,     setReactions]     = useState<NoteReaction[]>([])
  const [commentaires,  setCommentaires]  = useState<ProjNoteCommentaire[]>([])
  const [newComment,    setNewComment]    = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  const loadSocial = useCallback(async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('note_reactions').select('user_id, type').eq('note_id', note.id),
      supabase.from('note_commentaires')
        .select('*, auteur:users!user_id(prenom, nom), reactions:note_commentaire_reactions(user_id)')
        .eq('note_id', note.id)
        .order('created_at', { ascending: true }),
    ])
    setReactions((r || []) as NoteReaction[])
    setCommentaires((c || []) as ProjNoteCommentaire[])
  }, [note.id])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: au } }) => {
      if (!au) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', au.id).single()
      if (u) setCurrentUserId(u.id)
    })
    loadSocial()
  }, [loadSocial])

  async function download(pj: { nom: string; url_stockage: string; taille: number; type: string }) {
    await downloadFromStorage(supabase, 'notes', pj.url_stockage, pj.nom, 300)
  }

  async function toggleReaction(type: 'like' | 'dislike') {
    if (!currentUserId) return
    const current = reactions.find(r => r.user_id === currentUserId)
    if (current?.type === type) {
      setReactions(reactions.filter(r => r.user_id !== currentUserId))
    } else {
      setReactions([...reactions.filter(r => r.user_id !== currentUserId), { user_id: currentUserId, type }])
    }
    await supabase.rpc('toggler_reaction_note', { p_id: note.id, p_type: type })
  }

  async function submitComment() {
    if (!newComment.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_note', { p_note_id: note.id, p_contenu: newComment.trim() })
    setNewComment('')
    setSubmitting(false)
    loadSocial()
  }

  const likeCount    = reactions.filter(r => r.type === 'like').length
  const dislikeCount = reactions.filter(r => r.type === 'dislike').length
  const userReaction = currentUserId ? (reactions.find(r => r.user_id === currentUserId)?.type ?? null) : null
  const topLevel     = commentaires.filter(c => !c.parent_id)
  const repliesMap   = commentaires.filter(c => c.parent_id).reduce<Record<string, ProjNoteCommentaire[]>>((acc, c) => {
    acc[c.parent_id!] = [...(acc[c.parent_id!] || []), c]
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-slate-800/80"
        style={{ backgroundColor: '#0d0f14' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: color }} />

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-7 pt-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">{note.titre}</h2>
              <div className="flex items-center gap-3 flex-wrap">
                {note.auteur && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${color}22`, color }}>
                      {note.auteur.prenom[0]}
                    </div>
                    <span className="text-xs text-slate-500">{note.auteur.prenom} {note.auteur.nom}</span>
                  </div>
                )}
                <div className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock size={10} /> {formatRelativeTime(note.updated_at)}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Client tag */}
          {note.client?.nom_entreprise && (
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users size={10} /> {note.client.nom_entreprise}
              </span>
            </div>
          )}

          {/* ── Engagement bar ── */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center rounded-xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleReaction('like')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border-r border-slate-800 ${
                  userReaction === 'like' ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:bg-slate-800 hover:text-blue-400'
                }`}
              >
                <ThumbsUp size={12} className={userReaction === 'like' ? 'fill-blue-400/30' : ''} />
                <span>{likeCount > 0 ? likeCount : 'J\'aime'}</span>
              </button>
              <button
                onClick={() => toggleReaction('dislike')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                  userReaction === 'dislike' ? 'bg-red-500/15 text-red-400' : 'text-slate-500 hover:bg-slate-800 hover:text-red-400'
                }`}
              >
                <ThumbsDown size={12} className={userReaction === 'dislike' ? 'fill-red-400/30' : ''} />
                {dislikeCount > 0 && <span>{dislikeCount}</span>}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MessageCircle size={13} />
              <span>{commentaires.length} commentaire{commentaires.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Note content */}
          <div className="px-7 py-6 border-b border-slate-800/40">
            <div
              className="text-sm text-slate-300 leading-[1.8]"
              dangerouslySetInnerHTML={{ __html: note.contenu }}
            />
          </div>

          {/* Attachments */}
          {pjs.length > 0 && (
            <div className="px-7 py-4 border-b border-slate-800/40 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Paperclip size={10} /> Pièces jointes · {pjs.length}
              </p>
              <div className="space-y-1.5">
                {pjs.map((pj, i) => (
                  <div key={i} className="group/pj flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <FileText size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-slate-400 truncate">{pj.nom}</span>
                    <span className="text-[11px] text-slate-600 flex-shrink-0">
                      {pj.taille < 1048576 ? `${(pj.taille / 1024).toFixed(0)} Ko` : `${(pj.taille / 1048576).toFixed(1)} Mo`}
                    </span>
                    <button onClick={() => download(pj)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover/pj:opacity-100">
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Comments ── */}
          <div className="px-7 py-5 space-y-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MessageCircle size={10} /> Commentaires {commentaires.length > 0 && `· ${commentaires.length}`}
            </p>

            {/* New comment input */}
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-violet-500/20 text-violet-400">
                ?
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment() }}
                  placeholder="Ajouter un commentaire…"
                  rows={newComment ? 3 : 1}
                  onFocus={e => { e.currentTarget.rows = 3 }}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 transition-all resize-none"
                />
                {newComment.trim() && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setNewComment('')}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-all">
                      Annuler
                    </button>
                    <button onClick={submitComment} disabled={submitting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-60 shadow-md shadow-blue-500/20">
                      <Send size={11} /> {submitting ? 'Envoi…' : 'Commenter'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comment list */}
            <div className="space-y-5">
              {topLevel.map(c => (
                <ProjNoteCommentItem
                  key={c.id}
                  comment={c}
                  replies={repliesMap[c.id] || []}
                  currentUserId={currentUserId}
                  noteId={note.id}
                  onRefresh={loadSocial}
                />
              ))}
              {commentaires.length === 0 && (
                <div className="text-center py-6">
                  <MessageCircle size={20} className="mx-auto mb-2 text-slate-700" />
                  <p className="text-xs text-slate-600">Aucun commentaire — soyez le premier à réagir</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-7 py-4 border-t border-slate-800/60">
          <Link href="/notes"
            className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-500 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 transition-all flex items-center justify-center gap-2">
            <StickyNote size={13} /> Voir toutes les notes
          </Link>
        </div>
      </div>
    </div>
  )
}

function ProjNoteCommentItem({ comment, replies, currentUserId, noteId, onRefresh }: {
  comment: ProjNoteCommentaire; replies: ProjNoteCommentaire[]
  currentUserId: string; noteId: string; onRefresh: () => void
}) {
  const [liked,        setLiked]        = useState(() => comment.reactions.some(r => r.user_id === currentUserId))
  const [likeCount,    setLikeCount]    = useState(comment.reactions.length)
  const [replyOpen,    setReplyOpen]    = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)
  const supabase = createClient()

  async function toggleLike() {
    const next = !liked; setLiked(next); setLikeCount(c => next ? c + 1 : c - 1)
    await supabase.rpc('toggler_reaction_commentaire_note', { p_id: comment.id })
  }

  async function submitReply() {
    if (!replyContent.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_note', { p_note_id: noteId, p_contenu: replyContent.trim(), p_parent_id: comment.id })
    setReplyContent(''); setReplyOpen(false); setSubmitting(false); onRefresh()
  }

  async function deleteComment() {
    await supabase.rpc('supprimer_commentaire_note', { p_id: comment.id }); onRefresh()
  }

  const canDelete = comment.user_id === currentUserId

  return (
    <div>
      <div className="flex gap-3 group/cmt">
        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-400 flex-shrink-0 mt-0.5">
          {comment.auteur.prenom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-300">{comment.auteur.prenom} {comment.auteur.nom}</span>
            <span className="text-[11px] text-slate-600">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap break-words">{comment.contenu}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={toggleLike}
              className={`flex items-center gap-1 text-xs transition-all ${liked ? 'text-blue-400' : 'text-slate-600 hover:text-blue-400'}`}>
              <ThumbsUp size={11} className={liked ? 'fill-blue-400/30' : ''} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button onClick={() => { setReplyOpen(!replyOpen); setReplyContent('') }}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-300 transition-all">
              <Reply size={11} /> Répondre
            </button>
            {canDelete && (
              confirmDel ? (
                <span className="flex items-center gap-1.5 text-[11px]">
                  <button onClick={deleteComment} className="text-red-400 hover:underline font-medium">Supprimer</button>
                  <span className="text-slate-700">·</span>
                  <button onClick={() => setConfirmDel(false)} className="text-slate-600 hover:underline">Annuler</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="opacity-0 group-hover/cmt:opacity-100 text-slate-700 hover:text-red-400 transition-all">
                  <Trash2 size={11} />
                </button>
              )
            )}
          </div>

          {replyOpen && (
            <div className="mt-3 flex gap-2 items-start">
              <textarea
                autoFocus
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply() }}
                placeholder="Écrire une réponse…"
                rows={2}
                className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 resize-none transition-all"
              />
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={submitReply} disabled={submitting || !replyContent.trim()}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
                  <Send size={11} />
                </button>
                <button onClick={() => { setReplyOpen(false); setReplyContent('') }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all">
                  <X size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-10 mt-3 space-y-4 pl-4 border-l-2 border-slate-800/80">
          {replies.map(r => (
            <div key={r.id} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0 mt-0.5">
                {r.auteur.prenom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-400">{r.auteur.prenom} {r.auteur.nom}</span>
                  <span className="text-[11px] text-slate-600">{formatRelativeTime(r.created_at)}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap break-words">{r.contenu}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
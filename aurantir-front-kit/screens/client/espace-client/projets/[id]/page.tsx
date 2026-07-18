// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatDate, formatMontant, formatRelativeTime, initiales } from '@/aurantir-front-kit/lib/utils'
import { downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, FolderKanban,
  Users, ListChecks, AlertCircle, Target, TrendingUp, AlertTriangle,
  Paperclip, Download, StickyNote, Lock, ShieldCheck, Eye, Pin, X,
  FileSignature, ChevronRight, FileText, Globe, FolderTree,
} from 'lucide-react'
import Link from 'next/link'

interface ProjetDetail {
  id: string
  titre: string
  description?: string
  statut: string
  avancement: number
  date_debut?: string
  date_fin_prevue?: string
  date_fin_reelle?: string
  responsable?: { prenom: string; nom: string; avatar_url?: string }
  pieces_jointes?: { nom: string; url_stockage: string; taille: number; type: string }[]
  contrat?: { id: string; numero: string; titre: string; statut: string; montant: number; date_debut?: string; date_fin?: string }
  parent_id?: string | null
}

interface SousProjet {
  id: string
  titre: string
  statut: string
  avancement: number
  date_fin_prevue?: string
}

interface Tache {
  id: string
  titre: string
  statut: string
  priorite: string
  date_echeance?: string
  assigne?: { prenom: string; nom: string }
}

interface Evenement {
  id: string; titre: string; type: string; date_debut: string; couleur?: string
}

interface NoteItem {
  id: string; titre: string; contenu: string; couleur: string
  visibilite: string; est_epinglee: boolean; updated_at: string
  pieces_jointes?: { nom: string; url_stockage: string; taille: number; type: string }[]
  auteur?: { prenom: string; nom: string }
}

interface RapportItem {
  id: string
  numero?: string
  titre: string
  resume?: string
  created_at: string
  published_at?: string
  redacteur?: { prenom: string; nom: string }
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  planifie:  { label: 'Planifié',  cls: 'bg-amber/10 text-amber border-amber/20' },
  en_cours:  { label: 'En cours', cls: 'bg-blue/10 text-blue border-blue/20' },
  en_pause:  { label: 'En pause', cls: 'bg-white/10 text-white/50 border-white/10' },
  termine:   { label: 'Terminé',  cls: 'bg-green/10 text-green border-green/20' },
  annule:    { label: 'Annulé',   cls: 'bg-red/10 text-red border-red/20' },
}

const TACHE_STATUT: Record<string, { label: string; color: string }> = {
  backlog:   { label: 'Backlog',   color: 'text-white/40' },
  a_faire:   { label: 'À faire',   color: 'text-white/50' },
  en_cours:  { label: 'En cours',  color: 'text-blue' },
  en_review: { label: 'En révision', color: 'text-amber' },
  termine:   { label: 'Terminé',   color: 'text-green' },
}

const PRIORITE_CFG: Record<string, { label: string; cls: string }> = {
  urgente: { label: 'Urgente', cls: 'text-red' },
  haute:   { label: 'Haute',   cls: 'text-amber' },
  normale: { label: 'Normale', cls: 'text-white/40' },
  basse:   { label: 'Basse',   cls: 'text-white/20' },
}

const EV_COULEURS: Record<string, string> = {
  planification: '#6366F1', reunion: '#3B82F6', deadline: '#EF4444',
  presentation: '#8B5CF6', formation: '#10B981', conge: '#F59E0B',
  tache_kanban: '#0EA5E9', jalon: '#F97316', rappel: '#A78BFA', autre: '#6B7280',
}
const CONTRAT_STATUT_CLS: Record<string, string> = {
  actif:                'bg-green/10 text-green border-green/20',
  signe:                'bg-green/10 text-green border-green/20',
  valide:               'bg-green/10 text-green border-green/20',
  en_attente:           'bg-amber/10 text-amber border-amber/20',
  en_attente_signature: 'bg-amber/10 text-amber border-amber/20',
  en_negociation:       'bg-amber/10 text-amber border-amber/20',
  expire:               'bg-red/10 text-red border-red/20',
  resilie:              'bg-red/10 text-red border-red/20',
  brouillon:            'bg-surface text-text-muted border-surface-border',
}

const EV_LABELS: Record<string, string> = {
  planification: 'Planification', reunion: 'Réunion', deadline: 'Deadline',
  presentation: 'Présentation', formation: 'Formation', conge: 'Congé',
  tache_kanban: 'Tâche', jalon: 'Jalon', rappel: 'Rappel', autre: 'Autre',
}

export default function ClientProjetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projet, setProjet] = useState<ProjetDetail | null>(null)
  const [taches, setTaches] = useState<Tache[]>([])
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [viewNote, setViewNote] = useState<NoteItem | null>(null)
  const [rapports, setRapports] = useState<RapportItem[]>([])
  const [sousProjets, setSousProjets] = useState<SousProjet[]>([])
  const [chemin, setChemin] = useState<{ id: string; titre: string; niveau: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.replace('/login'); return }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()
    if (!userData) { setNotFound(true); setLoading(false); return }

    // Vérifie que le client a accès à ce projet : membre direct OU membre
    // d'un projet ancêtre (un sous-projet hérite l'accès de ses parents)
    const { data: hasAccess } = await supabase.rpc('utilisateur_a_acces_arborescence_projet', { p_projet_id: id })
    if (!hasAccess) { setNotFound(true); setLoading(false); return }

    const [{ data: p }, { data: t }, { data: ev }, { data: n }, { data: r }, { data: sp }, { data: ch }] = await Promise.all([
      supabase
        .from('projets')
        .select(`
          id, titre, description, statut, avancement, pieces_jointes,
          date_debut, date_fin_prevue, date_fin_reelle, parent_id,
          responsable:users!responsable_id(prenom, nom, avatar_url),
          contrat:contrats(id, numero, titre, statut, montant, date_debut, date_fin)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('taches')
        .select(`
          id, titre, statut, priorite, date_echeance,
          assigne:users!assigne_a(prenom, nom)
        `)
        .eq('projet_id', id)
        .order('ordre', { ascending: true })
        .limit(50),
      supabase
        .from('evenements_calendrier')
        .select('id, titre, type, date_debut, couleur')
        .eq('projet_id', id)
        .order('date_debut', { ascending: false })
        .limit(5),
      supabase
        .from('notes')
        .select('id, titre, contenu, couleur, visibilite, est_epinglee, pieces_jointes, updated_at, auteur:users!created_by(prenom, nom)')
        .eq('projet_id', id)
        .order('est_epinglee', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('rapports')
        .select('id, numero, titre, resume, created_at, published_at, redacteur:users!redacteur_id(prenom, nom)')
        .eq('projet_id', id)
        .eq('visibilite', 'public')
        .eq('statut', 'publie')
        .order('published_at', { ascending: false }),
      supabase
        .from('projets')
        .select('id, titre, statut, avancement, date_fin_prevue')
        .eq('parent_id', id)
        .order('created_at'),
      supabase.rpc('projets_chemin', { p_projet_id: id }),
    ])

    if (!p) { setNotFound(true); setLoading(false); return }
    setProjet(p as unknown as ProjetDetail)
    setTaches((t || []) as unknown as Tache[])
    setEvenements((ev || []) as Evenement[])
    setNotes((n || []).map((note: any) => ({
      ...note,
      pieces_jointes: typeof note.pieces_jointes === 'string'
        ? (() => { try { return JSON.parse(note.pieces_jointes) } catch { return [] } })()
        : (Array.isArray(note.pieces_jointes) ? note.pieces_jointes : []),
    })) as unknown as NoteItem[])
    setRapports((r || []) as unknown as RapportItem[])
    setSousProjets((sp || []) as unknown as SousProjet[])
    setChemin((ch || []) as { id: string; titre: string; niveau: number }[])
    setLoading(false)
  }

  async function downloadProjectFile(pj: { nom: string; url_stockage: string }) {
    await downloadFromStorage(supabase, 'documents', pj.url_stockage, pj.nom)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-white/5 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    )
  }

  if (notFound || !projet) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-sm text-white/40">Projet introuvable ou accès non autorisé</p>
        <Link href="/espace-client/projets"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue hover:underline">
          <ArrowLeft size={12} /> Retour à mes projets
        </Link>
      </div>
    )
  }

  const cfg = STATUT_CFG[projet.statut] || STATUT_CFG.planifie
  const avancementColor = projet.avancement === 100 ? '#10B981' : projet.avancement >= 50 ? '#3B82F6' : '#F59E0B'
  const tachesTerminees = taches.filter(t => t.statut === 'termine').length
  const tachesUrgentes = taches.filter(t => t.priorite === 'urgente' && t.statut !== 'termine')
  const statsParStatut = {
    backlog:   taches.filter(t => t.statut === 'backlog').length,
    a_faire:   taches.filter(t => t.statut === 'a_faire').length,
    en_cours:  taches.filter(t => t.statut === 'en_cours').length,
    en_review: taches.filter(t => t.statut === 'en_review').length,
    termine:   tachesTerminees,
  }
  const pieces = projet.pieces_jointes ?? []

  const parentInfo = chemin.length > 1 ? chemin[chemin.length - 2] : null

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
        <Link href="/espace-client/projets" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Mes projets
        </Link>
        {chemin.slice(0, -1).map(ancetre => (
          <span key={ancetre.id} className="flex items-center gap-2">
            <ChevronRight size={11} />
            <Link href={`/espace-client/projets/${ancetre.id}`} className="hover:text-white transition-colors">{ancetre.titre}</Link>
          </span>
        ))}
        {chemin.length > 1 && (
          <span className="flex items-center gap-2">
            <ChevronRight size={11} />
            <span className="text-white/60">{projet.titre}</span>
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center flex-shrink-0">
            <FolderKanban size={18} className="text-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{projet.titre}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs border font-medium mt-1 ${cfg.cls}`}>
              {cfg.label}
            </span>
            {parentInfo && (
              <Link href={`/espace-client/projets/${parentInfo.id}`}
                className="inline-flex items-center gap-1.5 text-2xs text-white/30 hover:text-white transition-colors mt-1.5 ml-2">
                <FolderTree size={11} />
                Sous-projet de <span className="font-medium text-white/50">{parentInfo.titre}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
      {projet.description && (
        <p className="text-sm text-white/50 leading-relaxed -mt-3">{projet.description}</p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40">Avancement</p>
            <Target size={14} className="text-blue" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">{projet.avancement}%</p>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${projet.avancement}%`, background: avancementColor }} />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40">Tâches</p>
            <CheckCircle2 size={14} className="text-green" />
          </div>
          <p className="text-2xl font-bold text-white">{tachesTerminees}/{taches.length}</p>
          {tachesUrgentes.length > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-red" />
              <span className="text-2xs text-red">{tachesUrgentes.length} urgente{tachesUrgentes.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40">Échéance</p>
            <Calendar size={14} className="text-amber" />
          </div>
          <p className="text-2xl font-bold text-white">
            {projet.date_fin_prevue ? formatDate(projet.date_fin_prevue) : '—'}
          </p>
          {projet.date_debut && (
            <p className="text-2xs text-white/30">Début : {formatDate(projet.date_debut)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aperçu des tâches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-white/40" />
              <h2 className="text-sm font-semibold text-white">Aperçu des tâches</h2>
              <span className="ml-auto text-xs text-white/30">{taches.length} tâche{taches.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Colonnes mini */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { key: 'backlog',   label: 'Backlog',  color: '#6B7280' },
                { key: 'a_faire',   label: 'À faire',  color: '#9CA3AF' },
                { key: 'en_cours',  label: 'En cours', color: '#3B82F6' },
                { key: 'en_review', label: 'Review',   color: '#F59E0B' },
                { key: 'termine',   label: 'Terminé',  color: '#10B981' },
              ].map(col => (
                <div key={col.key} className="bg-white/[0.02] rounded-xl p-2.5 text-center">
                  <p className="text-xl font-bold" style={{ color: col.color }}>
                    {statsParStatut[col.key as keyof typeof statsParStatut]}
                  </p>
                  <p className="text-2xs text-white/30 mt-0.5">{col.label}</p>
                </div>
              ))}
            </div>

            {/* Tâches urgentes */}
            {tachesUrgentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red flex items-center gap-1">
                  <AlertTriangle size={12} /> Tâches urgentes
                </p>
                {tachesUrgentes.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-red/5 border border-red/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
                    <p className="text-xs text-white/80 flex-1">{t.titre}</p>
                    {t.assigne && (
                      <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xs text-white/40">
                        {t.assigne.prenom?.[0]}
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
              <p className="text-xs font-medium text-white/40">Tâches récentes</p>
              {taches.length === 0 && (
                <p className="text-xs text-white/30 text-center py-3">Aucune tâche pour le moment</p>
              )}
              {taches.slice(0, 8).map(t => {
                const ts = TACHE_STATUT[t.statut] ?? { label: t.statut, color: 'text-white/40' }
                const pr = PRIORITE_CFG[t.priorite] ?? PRIORITE_CFG.normale
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      t.statut === 'termine' ? 'bg-green' : t.statut === 'en_cours' ? 'bg-blue' : 'bg-white/20'
                    }`} />
                    <p className={`flex-1 text-xs ${t.statut === 'termine' ? 'text-white/30 line-through' : 'text-white/80'}`}>
                      {t.titre}
                    </p>
                    <span className={`text-2xs font-medium flex-shrink-0 ${pr.cls}`}>{pr.label}</span>
                    <span className={`text-2xs flex-shrink-0 ${ts.color}`}>{ts.label}</span>
                    {t.date_echeance && (
                      <span className="text-2xs text-white/20 flex-shrink-0">{formatDate(t.date_echeance)}</span>
                    )}
                  </div>
                )
              })}
              {taches.length > 8 && (
                <p className="text-2xs text-white/30 text-center py-1">+{taches.length - 8} autres tâches</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Responsable */}
          {projet.responsable && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-white/40">Responsable</h4>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-xs font-bold text-violet">
                  {initiales(projet.responsable.prenom, projet.responsable.nom)}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">
                    {projet.responsable.prenom} {projet.responsable.nom}
                  </p>
                  <p className="text-2xs text-white/30">Chef de projet</p>
                </div>
              </div>
            </div>
          )}

          {/* Contrat lié */}
          {projet.contrat && (
            <Link href={`/espace-client/contrats/${projet.contrat.id}`}
              className="block bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3 hover:border-white/15 hover:bg-white/[0.05] transition-all group">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
                  <FileSignature size={12} /> Contrat lié
                </h4>
                <ChevronRight size={13} className="text-white/15 group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-white truncate group-hover:text-blue transition-colors">{projet.contrat.titre}</p>
                  <p className="text-2xs text-white/30 font-mono mt-0.5">{projet.contrat.numero}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs border font-medium ${
                    CONTRAT_STATUT_CLS[projet.contrat.statut?.toLowerCase()] || 'bg-surface text-white/40 border-white/10'
                  }`}>
                    {projet.contrat.statut}
                  </span>
                  {projet.contrat.montant > 0 && (
                    <span className="text-xs font-semibold text-white">{formatMontant(projet.contrat.montant)}</span>
                  )}
                </div>
                {(projet.contrat.date_debut || projet.contrat.date_fin) && (
                  <div className="flex items-center gap-3 text-2xs text-white/30 pt-1 border-t border-white/5">
                    {projet.contrat.date_debut && (
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(projet.contrat.date_debut)}</span>
                    )}
                    {projet.contrat.date_fin && (
                      <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(projet.contrat.date_fin)}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Pièces jointes */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
              <Paperclip size={12} /> Pièces jointes ({pieces.length})
            </h4>
            {pieces.length > 0 ? (
              <div className="space-y-1.5">
                {pieces.map((pj, i) => (
                  <button key={i} onClick={() => downloadProjectFile(pj)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 group transition-colors text-left">
                    <FileTextIcon />
                    <span className="text-xs text-white/60 truncate flex-1 group-hover:text-blue transition-colors">{pj.nom}</span>
                    <span className="text-2xs text-white/20 flex-shrink-0">
                      {pj.taille < 1048576 ? `${(pj.taille / 1024).toFixed(0)} Ko` : `${(pj.taille / 1048576).toFixed(1)} Mo`}
                    </span>
                    <Download size={11} className="text-white/20 group-hover:text-blue transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-2">Aucun fichier joint</p>
            )}
          </div>

          {/* Événements */}
          {evenements.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
                <Clock size={13} className="text-violet" /> Événements ({evenements.length})
              </h4>
              <div className="space-y-2">
                {evenements.map(ev => {
                  const couleur = ev.couleur || EV_COULEURS[ev.type] || '#6B7280'
                  const isPast = new Date(ev.date_debut) < new Date()
                  return (
                    <div key={ev.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: couleur }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isPast ? 'text-white/30' : 'text-white/80'}`}>{ev.titre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-2xs text-white/30">{formatDate(ev.date_debut)}</span>
                          <span className="text-2xs px-1 py-px rounded font-medium" style={{ color: couleur, background: couleur + '15' }}>
                            {EV_LABELS[ev.type] || ev.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sous-projets */}
      {sousProjets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderTree size={14} className="text-blue" /> Sous-projets ({sousProjets.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sousProjets.map(sp => {
              const spCfg = STATUT_CFG[sp.statut] || STATUT_CFG.planifie
              return (
                <Link key={sp.id} href={`/espace-client/projets/${sp.id}`}
                  className="group bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/15 hover:bg-white/[0.05] transition-all space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs border font-medium ${spCfg.cls}`}>
                      {spCfg.label}
                    </span>
                    <ChevronRight size={13} className="text-white/15 group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue transition-colors truncate">{sp.titre}</h4>
                  <div className="space-y-1.5">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${sp.avancement}%`, background: sp.avancement === 100 ? '#10B981' : sp.avancement >= 50 ? '#3B82F6' : '#F59E0B' }} />
                    </div>
                    <p className="text-2xs text-white/30">
                      {sp.avancement}% complété{sp.date_fin_prevue ? ` · Échéance ${formatDate(sp.date_fin_prevue)}` : ''}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Rapports publics */}
      {rapports.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText size={14} className="text-blue" /> Rapports publics ({rapports.length})
          </h3>
          <div className="space-y-2">
            {rapports.map(r => (
              <Link key={r.id} href={`/espace-client/rapports/${r.id}`}
                className="flex items-start justify-between gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/15 hover:bg-white/[0.05] transition-all group">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {r.numero && <span className="text-2xs font-mono text-white/30">{r.numero}</span>}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs border font-medium bg-green/10 text-green border-green/20">
                        <Globe size={9} /> Public
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white truncate group-hover:text-blue transition-colors">{r.titre}</p>
                    {r.resume && <p className="text-2xs text-white/30 mt-0.5 line-clamp-1">{r.resume}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      {r.redacteur && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-violet/10 flex items-center justify-center text-2xs font-bold text-violet">
                            {r.redacteur.prenom?.[0]}
                          </div>
                          <span className="text-2xs text-white/30">{r.redacteur.prenom} {r.redacteur.nom}</span>
                        </div>
                      )}
                      <span className="text-2xs text-white/30">{formatRelativeTime(r.published_at || r.created_at)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-white/15 group-hover:text-blue group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes du projet */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <StickyNote size={14} className="text-amber" /> Notes ({notes.length})
          </h3>
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
                <div key={n.id} onClick={() => setViewNote(n)}
                  className="group bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/15 cursor-pointer transition-all duration-200 space-y-2.5"
                  style={{ borderLeftColor: n.couleur, borderLeftWidth: '3px' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white line-clamp-2 flex-1">{n.titre}</p>
                    {n.est_epinglee && <Pin size={11} className="text-amber flex-shrink-0 mt-0.5" style={{ fill: '#F59E0B' }} />}
                  </div>
                  {n.contenu && (
                    <div className="text-xs text-white/40 line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: n.contenu.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }} />
                  )}
                  <div className="flex items-center gap-2">
                    {n.auteur && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0"
                        style={{ backgroundColor: n.couleur + '25', color: n.couleur }}>
                        {n.auteur.prenom[0]}
                      </div>
                    )}
                    <span className="text-2xs text-white/30 flex-1 truncate">{formatRelativeTime(n.updated_at)}</span>
                    {pjCount > 0 && (
                      <span className="flex items-center gap-0.5 text-2xs text-white/30">
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

      {/* Lecture d'une note (lecture seule) */}
      {viewNote && <ClientNoteDrawer note={viewNote} onClose={() => setViewNote(null)} />}
    </div>
  )
}

function FileTextIcon() {
  return (
    <span className="w-6 h-6 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
      <Paperclip size={11} className="text-blue" />
    </span>
  )
}

function ClientNoteDrawer({ note, onClose }: { note: NoteItem; onClose: () => void }) {
  const supabase = createClient()
  const color = note.couleur || '#3B82F6'
  const pjs = note.pieces_jointes ?? []

  const download = useCallback(async (pj: { nom: string; url_stockage: string }) => {
    await downloadFromStorage(supabase, 'notes', pj.url_stockage, pj.nom, 300)
  }, [supabase])

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-white/10"
        style={{ backgroundColor: '#0d0f14' }} onClick={e => e.stopPropagation()}>
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: color }} />

        <div className="flex-shrink-0 px-7 pt-6 pb-4 border-b border-white/10">
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
                    <span className="text-xs text-white/40">{note.auteur.prenom} {note.auteur.nom}</span>
                  </div>
                )}
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Clock size={10} /> {formatRelativeTime(note.updated_at)}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all flex-shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-7 py-6 border-b border-white/5">
            <div className="text-sm text-white/60 leading-[1.8]" dangerouslySetInnerHTML={{ __html: note.contenu }} />
          </div>

          {pjs.length > 0 && (
            <div className="px-7 py-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                <Paperclip size={10} /> Pièces jointes · {pjs.length}
              </p>
              <div className="space-y-1.5">
                {pjs.map((pj, i) => (
                  <div key={i} className="group/pj flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
                    <Paperclip size={13} className="text-blue flex-shrink-0" />
                    <span className="flex-1 text-xs text-white/50 truncate">{pj.nom}</span>
                    <span className="text-[11px] text-white/20 flex-shrink-0">
                      {pj.taille < 1048576 ? `${(pj.taille / 1024).toFixed(0)} Ko` : `${(pj.taille / 1048576).toFixed(1)} Mo`}
                    </span>
                    <button onClick={() => download(pj)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-blue hover:bg-blue/10 transition-all opacity-0 group-hover/pj:opacity-100">
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
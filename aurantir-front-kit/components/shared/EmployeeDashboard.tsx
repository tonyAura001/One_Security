// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState } from 'react'
import { Card, StatCard } from '@/aurantir-front-kit/components/ui/Card'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, CheckCheck, CalendarDays, User2,
  FileText, File, Archive, Image, Share2, Download,
} from 'lucide-react'
import Link from 'next/link'

interface MonProjet {
  id: string
  titre: string
  avancement: number
  statut: string
  role_projet: string
  date_fin_prevue: string | null
}

interface MaTache {
  id: string
  titre: string
  statut: string
  priorite: string
  date_echeance: string | null
  projet_id: string
  projet_titre: string
}

const STATUT_LABEL: Record<string, string> = {
  backlog: 'Backlog', a_faire: 'À faire', en_cours: 'En cours',
  en_review: 'En review', termine: 'Terminé', bloque: 'Bloqué',
}
const STATUT_COLOR: Record<string, string> = {
  backlog: 'default', a_faire: 'blue', en_cours: 'amber',
  en_review: 'violet', termine: 'green', bloque: 'red',
}
const PRIO_COLOR: Record<string, string> = {
  urgente: 'text-red', haute: 'text-amber', normale: 'text-text-muted', basse: 'text-text-muted',
}
const PROJET_STATUT_LABEL: Record<string, string> = {
  planifie: 'Planifié', en_cours: 'En cours', en_pause: 'En pause',
  termine: 'Terminé', annule: 'Annulé',
}
const PROJET_STATUT_COLOR: Record<string, string> = {
  planifie: 'blue', en_cours: 'green', en_pause: 'amber',
  termine: 'default', annule: 'red',
}

export default function EmployeeDashboard() {
  const { user } = useAppStore()
  const supabase = createClient()

  const [projets,   setProjets]   = useState<MonProjet[]>([])
  const [taches,    setTaches]    = useState<MaTache[]>([])
  const [documents, setDocuments] = useState<{ id: string; nom: string; type: string; taille?: number; url_stockage?: string; projet_titre: string }[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { if (user?.id) load() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!user?.id) return
    setLoading(true)
    try {
      // Mes projets (via membres_projet)
      const { data: memberships } = await supabase
        .from('membres_projet')
        .select('role_projet, projets(id, titre, avancement, statut, date_fin_prevue)')
        .eq('user_id', user.id)
        .eq('statut', 'actif')
        .not('projets', 'is', null)

      const mesProjets: MonProjet[] = (memberships || [])
        .map((m: any) => ({
          id:             m.projets?.id,
          titre:          m.projets?.titre,
          avancement:     m.projets?.avancement ?? 0,
          statut:         m.projets?.statut ?? 'planifie',
          role_projet:    m.role_projet,
          date_fin_prevue: m.projets?.date_fin_prevue ?? null,
        }))
        .filter((p: any) => p.id && ['en_cours', 'planifie'].includes(p.statut))

      // Aussi les projets où je suis responsable
      const { data: responsable } = await supabase
        .from('projets')
        .select('id, titre, avancement, statut, date_fin_prevue')
        .eq('responsable_id', user.id)
        .in('statut', ['en_cours', 'planifie'])

      const responsableIds = new Set(mesProjets.map(p => p.id))
      const tous = [...mesProjets, ...(responsable || []).filter((p: any) => !responsableIds.has(p.id)).map((p: any) => ({
        ...p, role_projet: 'responsable',
      }))]

      setProjets(tous)

      // Mes tâches assignées (non terminées en premier)
      const { data: tachesData } = await supabase
        .from('taches')
        .select('id, titre, statut, priorite, date_echeance, projet_id, projets(titre)')
        .eq('assigne_a', user.id)
        .neq('statut', 'termine')
        .order('priorite', { ascending: true })
        .order('date_echeance', { ascending: true, nullsFirst: false })
        .limit(10)

      // Documents partagés sur mes projets (prestataires ne voient que collaborateur)
      if (tous.length > 0) {
        const projetIds = tous.map(p => p.id)
        const { data: docData } = await supabase
          .from('ressources')
          .select('id, nom, type, taille, url_stockage, projet_id, projets(titre)')
          .eq('visibilite', 'collaborateur')
          .in('projet_id', projetIds)
          .order('created_at', { ascending: false })
          .limit(5)
        setDocuments((docData || []).map((d: any) => ({
          id: d.id, nom: d.nom, type: d.type, taille: d.taille,
          url_stockage: d.url_stockage, projet_titre: d.projets?.titre ?? '',
        })))
      }

      setTaches((tachesData || []).map((t: any) => ({
        id:           t.id,
        titre:        t.titre,
        statut:       t.statut,
        priorite:     t.priorite,
        date_echeance: t.date_echeance,
        projet_id:    t.projet_id,
        projet_titre: t.projets?.titre ?? '',
      })))
    } finally {
      setLoading(false)
    }
  }

  const tachesUrgentes = taches.filter(t => t.priorite === 'urgente').length
  const tachesEnCours  = taches.filter(t => t.statut === 'en_cours').length
  const tachesAFaire   = taches.filter(t => ['backlog', 'a_faire'].includes(t.statut)).length

  const now = new Date()
  const tachesEcheanceBientot = taches.filter(t => {
    if (!t.date_echeance) return false
    const diff = (new Date(t.date_echeance).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 3
  }).length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bonjour, {user?.prenom} 👋</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {new Date().toLocaleDateString('fr-SN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <User2 size={14} className="text-blue" />
          <span>Employé Interne</span>
        </div>
      </div>

      {/* Alertes */}
      {(tachesUrgentes > 0 || tachesEcheanceBientot > 0) && (
        <div className="flex gap-3 flex-wrap">
          {tachesUrgentes > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
              <AlertTriangle size={14} className="text-red" />
              <span className="text-xs text-red">
                {tachesUrgentes} tâche{tachesUrgentes > 1 ? 's' : ''} urgente{tachesUrgentes > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {tachesEcheanceBientot > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber/10 border border-amber/20">
              <CalendarDays size={14} className="text-amber" />
              <span className="text-xs text-amber">
                {tachesEcheanceBientot} tâche{tachesEcheanceBientot > 1 ? 's' : ''} à rendre dans les 3 prochains jours
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/projets"
          label="Mes projets actifs"
          value={loading ? '...' : projets.length}
          icon={<FolderKanban size={16} />}
          color="violet"
          loading={loading}
        />
        <StatCard
          label="Tâches en cours"
          value={loading ? '...' : tachesEnCours}
          icon={<Clock size={16} />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Tâches à faire"
          value={loading ? '...' : tachesAFaire}
          icon={<CheckCircle2 size={16} />}
          color="amber"
          loading={loading}
        />
        <StatCard
          label="Tâches urgentes"
          value={loading ? '...' : tachesUrgentes}
          icon={<AlertTriangle size={16} />}
          color={tachesUrgentes > 0 ? 'red' : 'green'}
          loading={loading}
        />
      </div>

      {/* Mes projets + Mes tâches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mes projets */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Mes projets</h3>
            <Link href="/projets" className="text-xs text-blue flex items-center gap-1">
              Voir tout <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)
            ) : projets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban size={20} strokeWidth={1.5} className="mb-3 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">Aucun projet assigné</p>
              </div>
            ) : (
              projets.map(p => (
                <Link key={p.id} href={`/projets/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban size={15} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-text-primary truncate">{p.titre}</p>
                      <Badge variant={PROJET_STATUT_COLOR[p.statut] as any} size="sm">
                        {PROJET_STATUT_LABEL[p.statut] ?? p.statut}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full transition-all" style={{ width: `${p.avancement}%` }} />
                      </div>
                      <span className="text-2xs text-text-muted flex-shrink-0">{p.avancement}%</span>
                    </div>
                    {p.date_fin_prevue && (
                      <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1">
                        <CalendarDays size={9} />
                        {new Date(p.date_fin_prevue).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Mes tâches */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Mes tâches</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              <span className="text-2xs text-text-muted">En direct</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)
            ) : taches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCheck size={20} strokeWidth={1.5} className="mb-3 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">Aucune tâche assignée</p>
              </div>
            ) : (
              taches.map(t => (
                <Link key={t.id} href={`/projets/${t.projet_id}`}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className={`flex-shrink-0 ${PRIO_COLOR[t.priorite] ?? 'text-text-muted'}`}>
                    {t.priorite === 'urgente' ? <AlertTriangle size={12} /> :
                     t.statut === 'en_cours'  ? <Clock size={12} />         :
                     <CheckCircle2 size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{t.titre}</p>
                    <p className="text-2xs text-text-muted truncate">{t.projet_titre}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={STATUT_COLOR[t.statut] as any} size="sm">
                      {STATUT_LABEL[t.statut] ?? t.statut}
                    </Badge>
                    {t.date_echeance && (
                      <span className="text-2xs text-text-muted">
                        {formatRelativeTime(t.date_echeance)}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Documents partagés — visible pour prestataires (et employés si ressources collaborateur) */}
      {documents.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Documents partagés</h3>
            <span className="text-2xs bg-blue/10 text-blue px-1.5 py-0.5 rounded-full">{documents.length}</span>
          </div>
          <div className="space-y-2">
            {documents.map(d => {
              const icon =
                d.type === 'pdf'   ? <FileText size={13} className="text-red" /> :
                d.type === 'image' ? <Image    size={13} className="text-blue" /> :
                d.type === 'xls'   ? <FileText size={13} className="text-green" /> :
                d.type === 'zip'   ? <Archive  size={13} className="text-amber" /> :
                d.type === 'doc'   ? <FileText size={13} className="text-blue" /> :
                                     <File     size={13} className="text-text-muted" />
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{d.nom}</p>
                    <p className="text-2xs text-text-muted truncate">{d.projet_titre}</p>
                  </div>
                  {d.url_stockage && (
                    <a href={d.url_stockage} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-colors flex-shrink-0">
                      <Download size={13} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
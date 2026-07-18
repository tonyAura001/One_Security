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
  FolderKanban, Users, AlertTriangle, CheckCircle2,
  ArrowRight, Clock, CalendarDays, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface ProjetEquipe {
  id: string; titre: string; avancement: number; statut: string
  responsable: string; date_fin_prevue: string | null
}
interface TacheUrgente {
  id: string; titre: string; priorite: string; statut: string
  projet_id: string; projet_titre: string; assigne_nom: string
  date_echeance: string | null
}
interface MembreActif {
  id: string; prenom: string; nom: string; role: string; last_seen: string | null
}

const PROJET_STATUT: Record<string, { label: string; color: string }> = {
  planifie:  { label: 'Planifié',  color: 'blue'    },
  en_cours:  { label: 'En cours',  color: 'green'   },
  en_pause:  { label: 'En pause',  color: 'amber'   },
  termine:   { label: 'Terminé',   color: 'default' },
  annule:    { label: 'Annulé',    color: 'red'     },
}

export default function ManagerDashboard() {
  const { user, entiteActive } = useAppStore()
  const supabase = createClient()

  const [projets, setProjets] = useState<ProjetEquipe[]>([])
  const [tachesUrgentes, setTachesUrgentes] = useState<TacheUrgente[]>([])
  const [membres, setMembres] = useState<MembreActif[]>([])
  const [counts, setCounts] = useState({ projets: 0, membres: 0, tachesUrgentes: 0, tachesEnRetard: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [entiteActive]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const ef = entiteActive?.id
    try {
      // Projets actifs de l'équipe
      let pq = supabase.from('projets')
        .select('id, titre, avancement, statut, date_fin_prevue, users!responsable_id(prenom, nom)')
        .in('statut', ['en_cours', 'planifie'])
        .order('updated_at', { ascending: false })
        .limit(6)
      if (ef) pq = pq.eq('entite_id', ef)
      const { data: pData, count: pCount } = await pq

      // Tâches urgentes / haute priorité non terminées
      const { data: tData } = await supabase.from('taches')
        .select('id, titre, priorite, statut, date_echeance, projet_id, projets(titre), users!assigne_a(prenom, nom)')
        .in('priorite', ['urgente', 'haute'])
        .neq('statut', 'termine')
        .order('priorite', { ascending: true })
        .order('date_echeance', { ascending: true, nullsFirst: false })
        .limit(8)

      // Membres actifs
      const { data: mData } = await supabase.from('users')
        .select('id, prenom, nom, role')
        .in('role', ['employe_interne', 'manager', 'prestataire'])
        .eq('statut', 'actif')
        .limit(8)

      // Tâches en retard
      const { count: retardCount } = await supabase.from('taches')
        .select('id', { count: 'exact', head: true })
        .lt('date_echeance', new Date().toISOString().split('T')[0])
        .neq('statut', 'termine')

      setProjets((pData || []).map((p: any) => ({
        id: p.id, titre: p.titre, avancement: p.avancement ?? 0, statut: p.statut,
        date_fin_prevue: p.date_fin_prevue,
        responsable: p.users ? `${p.users.prenom} ${p.users.nom}` : '—',
      })))

      setTachesUrgentes((tData || []).map((t: any) => ({
        id: t.id, titre: t.titre, priorite: t.priorite, statut: t.statut,
        projet_id: t.projet_id, projet_titre: t.projets?.titre ?? '',
        assigne_nom: t.users ? `${t.users.prenom} ${t.users.nom}` : 'Non assigné',
        date_echeance: t.date_echeance,
      })))

      setMembres((mData || []).map((m: any) => ({ ...m, last_seen: null })))

      setCounts({
        projets: pData?.length ?? 0,
        membres: mData?.length ?? 0,
        tachesUrgentes: (tData || []).filter((t: any) => t.priorite === 'urgente').length,
        tachesEnRetard: retardCount ?? 0,
      })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Bonjour, {user?.prenom} 👋</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {new Date().toLocaleDateString('fr-SN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alertes */}
      {(counts.tachesUrgentes > 0 || counts.tachesEnRetard > 0) && (
        <div className="flex gap-3 flex-wrap">
          {counts.tachesUrgentes > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
              <AlertTriangle size={14} className="text-red" />
              <span className="text-xs text-red">{counts.tachesUrgentes} tâche{counts.tachesUrgentes > 1 ? 's' : ''} urgente{counts.tachesUrgentes > 1 ? 's' : ''}</span>
            </div>
          )}
          {counts.tachesEnRetard > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber/10 border border-amber/20">
              <Clock size={14} className="text-amber" />
              <span className="text-xs text-amber">{counts.tachesEnRetard} tâche{counts.tachesEnRetard > 1 ? 's' : ''} en retard</span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard href="/projets" label="Projets actifs" value={loading ? '...' : counts.projets} icon={<FolderKanban size={16} />} color="violet" loading={loading} />
        <StatCard label="Membres actifs" value={loading ? '...' : counts.membres} icon={<Users size={16} />} color="blue" loading={loading} />
        <StatCard label="Tâches urgentes" value={loading ? '...' : counts.tachesUrgentes} icon={<AlertTriangle size={16} />} color={counts.tachesUrgentes > 0 ? 'red' : 'green'} loading={loading} />
        <StatCard label="Tâches en retard" value={loading ? '...' : counts.tachesEnRetard} icon={<Clock size={16} />} color={counts.tachesEnRetard > 0 ? 'amber' : 'green'} loading={loading} />
      </div>

      {/* Projets équipe + Tâches urgentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Projets de l'équipe</h3>
            <Link href="/projets" className="text-xs text-blue flex items-center gap-1">Voir tout <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />) :
             projets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban size={20} strokeWidth={1.5} className="mb-3 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">Aucun projet actif</p>
              </div>
            ) : projets.map(p => {
              const st = PROJET_STATUT[p.statut] ?? { label: p.statut, color: 'default' }
              return (
                <Link key={p.id} href={`/projets/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban size={14} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-text-primary truncate">{p.titre}</p>
                      <Badge variant={st.color as any} size="sm">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: `${p.avancement}%` }} />
                      </div>
                      <span className="text-2xs text-text-muted">{p.avancement}%</span>
                    </div>
                    <p className="text-2xs text-text-muted mt-0.5">Responsable : {p.responsable}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Tâches prioritaires</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
          </div>
          <div className="space-y-1.5">
            {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded" />) :
             tachesUrgentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={20} strokeWidth={1.5} className="mb-3 text-green opacity-50" />
                <p className="text-xs text-text-muted">Aucune tâche urgente</p>
              </div>
            ) : tachesUrgentes.map(t => (
              <Link key={t.id} href={`/projets/${t.projet_id}`}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                <AlertTriangle size={12} className={t.priorite === 'urgente' ? 'text-red' : 'text-amber'} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{t.titre}</p>
                  <p className="text-2xs text-text-muted truncate">{t.projet_titre} · {t.assigne_nom}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant={t.priorite === 'urgente' ? 'red' : 'amber'} size="sm">{t.priorite}</Badge>
                  {t.date_echeance && <span className="text-2xs text-text-muted">{formatRelativeTime(t.date_echeance)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Membres de l'équipe */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Mon équipe</h3>
          <Link href="/admin/membres" className="text-xs text-blue flex items-center gap-1">Gérer <ArrowRight size={10} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />) :
           membres.map(m => (
            <div key={m.id} className="flex items-center gap-2 p-3 rounded-lg border border-surface-border">
              <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center text-blue text-xs font-bold flex-shrink-0">
                {m.prenom?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{m.prenom} {m.nom}</p>
                <p className="text-2xs text-text-muted capitalize truncate">{m.role.replace('_', ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
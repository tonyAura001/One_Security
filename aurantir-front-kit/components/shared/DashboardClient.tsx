// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, StatCard } from '@/aurantir-front-kit/components/ui/Card'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatMontant, formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import EmployeeDashboard from './EmployeeDashboard'
import ManagerDashboard from './ManagerDashboard'
import ClientExterneDashboard from './ClientExterneDashboard'
import InviteDashboard from './InviteDashboard'
import {
  TrendingUp, FolderKanban, Receipt, Users,
  AlertTriangle, CheckCircle2, Clock, Wallet, FileText,
  ArrowRight, Plus, Activity, RefreshCw
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const RevenusChart = dynamic(
  () => import('@/aurantir-front-kit/components/ui/RevenusChart').then(m => m.RevenusChart),
  { ssr: false, loading: () => <div className="h-[200px] skeleton rounded" /> }
)

interface KPIs {
  revenus_mois: number; revenus_mois_precedent: number
  factures_en_attente: number; factures_montant_attente: number
  projets_actifs: number; taches_urgentes: number
  tresorerie_solde: number; devis_en_cours: number
}

interface ProjetActif { id: string; titre: string; avancement: number }
interface PipelineItem { label: string; count: number; color: string }
interface ActivityItem {
  id: string
  icon: React.ReactNode
  color: string
  label: string
  detail: string
  href?: string
  date: string
}

export default function DashboardClient() {
  const router = useRouter()
  const { user, entiteActive } = useAppStore()
  const role = user?.role

  // Le dashboard dédié des client_externe est /espace-client, pas /.
  // Filet de sécurité côté client en complément de la redirection middleware.
  useEffect(() => {
    if (role === 'client_externe') router.replace('/espace-client')
  }, [role, router])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [projetsActifs, setProjetsActifs] = useState<ProjetActif[]>([])
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [activites, setActivites] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const loadDashboardRef = useRef<() => void>(() => {})

  useEffect(() => { loadDashboard() }, [entiteActive])

  // Abonnement temps réel : rafraîchit le dashboard dès qu'une entrée/sortie
  // trésorerie est créée ou qu'une facture change de statut (paiement, avoir…)
  useEffect(() => {
    const debounce = { timer: null as ReturnType<typeof setTimeout> | null }
    const refresh = () => {
      if (debounce.timer) clearTimeout(debounce.timer)
      debounce.timer = setTimeout(() => loadDashboardRef.current(), 600)
    }
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tresorerie' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tresorerie' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'factures' }, refresh)
      .subscribe()
    return () => {
      if (debounce.timer) clearTimeout(debounce.timer)
      supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  loadDashboardRef.current = loadDashboard

  async function loadDashboard() {
    setLoading(true)
    const ef = useAppStore.getState().entiteActive?.id
    const now = new Date()

    try {
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      // ── KPIs ──────────────────────────────────────────────────────────────
      // Revenus ce mois = RPC SECURITY DEFINER (bypasse RLS, cohérent avec get_factures)
      const { data: revenusStats } = await supabase.rpc('dashboard_revenus_stats', { p_entite_id: ef ?? null })
      const rs = (revenusStats as Record<string, number>) || {}
      const revenus_mois = rs.mois_courant || 0
      const revenus_mois_precedent = rs.mois_precedent || 0

      let q2 = supabase.from('factures').select('id, montant_ttc, montant_restant_ttc').in('statut', ['envoyee', 'signee']).eq('type', 'facture_client')
      if (ef) q2 = q2.eq('entite_id', ef)
      const { data: attData } = await q2

      let q3 = supabase.from('projets').select('id', { count: 'exact' }).in('statut', ['en_cours', 'planifie'])
      if (ef) q3 = q3.eq('entite_id', ef)
      const { count: projets_actifs } = await q3

      const { count: taches_urgentes } = await supabase.from('taches').select('id', { count: 'exact' }).eq('priorite', 'urgente').neq('statut', 'termine')

      const { data: tresoSoldeData } = await supabase.rpc('dashboard_tresorerie_solde', { p_entite_id: ef ?? null })
      const tresoSolde = (tresoSoldeData as number) || 0

      // Devis : RPC SECURITY DEFINER dédié — aucun parsing ambigu, aucune RLS
      const { data: devisStats } = await supabase.rpc('dashboard_devis_stats')
      const ds = (devisStats as Record<string, number>) || {}
      const devis_en_cours = (ds.envoye || 0) + (ds.en_negociation || 0)

      setKpis({
        revenus_mois, revenus_mois_precedent,
        factures_en_attente: attData?.length || 0,
        factures_montant_attente: attData?.reduce((s: any, f: any) => s + (f.montant_restant_ttc ?? f.montant_ttc), 0) || 0,
        projets_actifs: projets_actifs || 0, taches_urgentes: taches_urgentes || 0,
        tresorerie_solde: tresoSolde, devis_en_cours: devis_en_cours || 0,
      })

      // ── Graphique 6 mois ────────────────────────────────────────────────
      // Pré-fetch des données tréso sur la fenêtre de 6 mois (1 seule requête)
      const debut6Mois = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
      const fin6Mois   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      let qTreso = supabase.from('tresorerie').select('type, montant, date_operation')
        .gte('date_operation', debut6Mois).lte('date_operation', fin6Mois)
      if (ef) qTreso = qTreso.eq('entite_id', ef)
      const { data: tresoWindow } = await qTreso
      const tresoAll = (tresoWindow || []) as { type: string; montant: number; date_operation: string }[]

      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const debut = d.toISOString().split('T')[0]
        const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

        const [{ data: chRevStats }, { data: chDepStats }] = await Promise.all([
          supabase.rpc('dashboard_revenus_mois',  { p_entite_id: ef ?? null, p_debut: debut, p_fin: fin }),
          supabase.rpc('dashboard_depenses_mois', { p_entite_id: ef ?? null, p_debut: debut, p_fin: fin }),
        ])

        const mois = d.getMonth() + 1; const annee = d.getFullYear()
        const tresoMois = tresoAll.filter(o => {
          const od = new Date(o.date_operation)
          return od.getMonth() + 1 === mois && od.getFullYear() === annee
        })
        const tresoEntrees = tresoMois.filter(o => o.type === 'entree').reduce((s, o) => s + o.montant, 0)
        const tresoSorties = tresoMois.filter(o => o.type === 'sortie').reduce((s, o) => s + o.montant, 0)

        months.push({
          name: d.toLocaleDateString('fr-SN', { month: 'short' }),
          revenus:      (chRevStats as number) || 0,
          depenses:     (chDepStats as number) || 0,
          tresoEntrees,
          tresoSorties,
        })
      }
      setChartData(months)

      // ── Pipeline devis — même source (ds déjà calculé) ────────────────
      const totalDevis = (ds.total as number) || 1
      setPipeline([
        { label: 'Brouillons',   count: ds.brouillon || 0,        color: '#6B7280' },
        { label: 'Envoyés',      count: ds.envoye || 0,            color: '#3B82F6' },
        { label: 'Négociation',  count: ds.en_negociation || 0,    color: '#F59E0B' },
        { label: 'Acceptés',     count: ds.accepte || 0,           color: '#10B981' },
      ].map(p => ({ ...p, pct: Math.round((p.count / totalDevis) * 100) })))

      // ── Projets actifs (3 derniers) ─────────────────────────────────────
      let pq = supabase.from('projets').select('id, titre, avancement').in('statut', ['en_cours', 'planifie']).order('updated_at', { ascending: false }).limit(3)
      if (ef) pq = pq.eq('entite_id', ef)
      const { data: pData } = await pq
      setProjetsActifs((pData || []) as ProjetActif[])

      // ── Activité récente — feed multi-sources (évite les aléas RLS audit_securite) ─
      const [{ data: recentFacs }, { data: recentTreso }, { data: recentProjets }] = await Promise.all([
        supabase.from('factures').select('id, numero, statut, montant_ttc, updated_at').order('updated_at', { ascending: false }).limit(4),
        supabase.from('tresorerie').select('id, type, montant, description, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('projets').select('id, titre, statut, updated_at').order('updated_at', { ascending: false }).limit(3),
      ])

      const feed: ActivityItem[] = [
        ...(recentFacs || []).map((f: any) => ({
          id: `fac-${f.id}`,
          icon: <Receipt size={11} />,
          color: f.statut === 'payee' ? 'text-green' : f.statut === 'envoyee' ? 'text-blue' : 'text-amber',
          label: `Facture ${f.numero}`,
          detail: f.statut === 'payee' ? `Payée — ${formatMontant(f.montant_ttc)}` : f.statut === 'envoyee' ? 'Envoyée au client' : f.statut,
          href: `/finance/factures/${f.id}`,
          date: f.updated_at,
        })),
        ...(recentTreso || []).map((t: any) => ({
          id: `treso-${t.id}`,
          icon: t.type === 'entree' ? <TrendingUp size={11} /> : <AlertTriangle size={11} />,
          color: t.type === 'entree' ? 'text-green' : 'text-red',
          label: t.type === 'entree' ? 'Entrée trésorerie' : 'Sortie trésorerie',
          detail: `${t.description || ''} — ${formatMontant(t.montant)}`,
          href: '/finance/tresorerie',
          date: t.created_at,
        })),
        ...(recentProjets || []).map((p: any) => ({
          id: `proj-${p.id}`,
          icon: <FolderKanban size={11} />,
          color: 'text-violet',
          label: p.titre,
          detail: p.statut?.replace('_', ' ') || '',
          href: `/projets/${p.id}`,
          date: p.updated_at,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

      setActivites(feed)

    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const variation = kpis && kpis.revenus_mois_precedent > 0
    ? Math.round(((kpis.revenus_mois - kpis.revenus_mois_precedent) / kpis.revenus_mois_precedent) * 100)
    : 0

  if (role === 'employe_interne' || role === 'prestataire') return <EmployeeDashboard />
  if (role === 'manager')         return <ManagerDashboard />
  if (role === 'client_externe')  return <ClientExterneDashboard />
  if (role === 'invite_lecture')  return <InviteDashboard />

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={() => loadDashboard()} disabled={loading}>Rafraîchir</Button>
          <Link href="/finance/factures/nouvelle">
            <Button size="sm" variant="secondary" icon={<Receipt size={14} />}>Nouvelle facture</Button>
          </Link>
          <Link href="/projets/nouveau">
            <Button size="sm" icon={<Plus size={14} />}>Nouveau projet</Button>
          </Link>
        </div>
      </div>

      {/* Alertes */}
      {kpis && (kpis.factures_en_attente > 0 || kpis.taches_urgentes > 0) && (
        <div className="flex gap-3 flex-wrap">
          {kpis.factures_en_attente > 0 && (
            <Link href="/finance/factures" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber/10 border border-amber/20 hover:bg-amber/15 transition-colors">
              <AlertTriangle size={14} className="text-amber" />
              <span className="text-xs text-amber">{kpis.factures_en_attente} facture{kpis.factures_en_attente > 1 ? 's' : ''} en attente — {formatMontant(kpis.factures_montant_attente)}</span>
            </Link>
          )}
          {kpis.taches_urgentes > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
              <AlertTriangle size={14} className="text-red" />
              <span className="text-xs text-red">{kpis.taches_urgentes} tâche{kpis.taches_urgentes > 1 ? 's' : ''} urgente{kpis.taches_urgentes > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard href="/finance/factures" label="Revenus ce mois" value={loading ? '...' : formatMontant(kpis?.revenus_mois || 0)} variation={variation} variationLabel="vs mois dernier" icon={<TrendingUp size={16} />} color="green" loading={loading} />
        <StatCard href="/finance/tresorerie" label="Trésorerie solde" value={loading ? '...' : formatMontant(kpis?.tresorerie_solde || 0)} icon={<Wallet size={16} />} color="blue" loading={loading} />
        <StatCard href="/projets" label="Projets actifs" value={loading ? '...' : kpis?.projets_actifs || 0} icon={<FolderKanban size={16} />} color="violet" loading={loading} />
        <StatCard href="/finance/devis" label="Devis en cours" value={loading ? '...' : kpis?.devis_en_cours || 0} icon={<Receipt size={16} />} color="amber" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Revenus vs Dépenses</h3>
              <p className="text-xs text-text-muted mt-0.5">6 derniers mois</p>
            </div>
            <Badge variant="blue" size="sm">Temps réel</Badge>
          </div>
          <RevenusChart data={chartData} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-text-primary">Pipeline Devis</h3>
            <Link href="/finance/devis" className="text-xs text-blue flex items-center gap-1">Voir tout <ArrowRight size={10} /></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-7 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {pipeline.map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{item.label}</span>
                    <span className="text-xs font-medium text-text-primary">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(item as any).pct || 0}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Projets actifs</h3>
            <Link href="/projets" className="text-xs text-blue flex items-center gap-1">Tous <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)
            ) : projetsActifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban size={20} strokeWidth={1.5} className="mb-3 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">Aucun projet actif</p>
                <Link href="/projets/nouveau" className="text-blue text-xs mt-2 inline-block hover:underline">Créer un projet →</Link>
              </div>
            ) : (
              projetsActifs.map(p => (
                <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban size={14} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{p.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: `${p.avancement}%` }} />
                      </div>
                      <span className="text-2xs text-text-muted">{p.avancement}%</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Activité récente</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              <span className="text-2xs text-text-muted">En direct</span>
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)
            ) : activites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-xs text-text-muted">Aucune activité récente</p>
              </div>
            ) : (
              activites.map(a => (
                <Link key={a.id} href={a.href || '#'}
                  className="flex items-center gap-3 py-1.5 hover:bg-surface-hover/50 rounded px-1 -mx-1 transition-colors">
                  <div className={`flex-shrink-0 ${a.color}`}>{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{a.label}</p>
                    <p className="text-2xs text-text-muted truncate">{a.detail}</p>
                  </div>
                  <span className="text-2xs text-text-muted flex-shrink-0">{formatRelativeTime(a.date)}</span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
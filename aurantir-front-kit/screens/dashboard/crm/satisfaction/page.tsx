// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { formatDate, formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts'
import {
  ThumbsUp, ThumbsDown, Minus, Plus, BarChart3,
  RefreshCw, AlertTriangle, Layers, Clock, ChevronRight, Copy, ExternalLink,
} from 'lucide-react'

interface KPIs { total_reponses: number; avg_score: number | null; promoteurs: number; passifs: number; detracteurs: number }
interface TimelinePoint { day: string; avg_score: number; total: number; promoteurs: number; passifs: number; detracteurs: number }
interface Survey { id: string; title: string; status: string; public_token: string; created_at: string }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TimelinePoint
  return (
    <div className="bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-3 shadow-xl text-xs space-y-1.5 min-w-44">
      <p className="text-slate-400 font-medium">{d?.day}</p>
      <p className="text-white font-bold">Score : <span className="text-cyan-400">{d?.avg_score?.toFixed(1) ?? '—'}</span></p>
      <div className="border-t border-slate-800 pt-1.5 space-y-0.5">
        <p className="text-emerald-400">Promoteurs : {d?.promoteurs ?? 0}</p>
        <p className="text-amber-400">Passifs : {d?.passifs ?? 0}</p>
        <p className="text-red-400">Détracteurs : {d?.detracteurs ?? 0}</p>
      </div>
      <p className="text-slate-500">{d?.total ?? 0} réponse{(d?.total ?? 0) > 1 ? 's' : ''}</p>
    </div>
  )
}

function NPSGauge({ nps, loading }: { nps: number; loading: boolean }) {
  const color = nps >= 50 ? '#10b981' : nps >= 20 ? '#06b6d4' : nps >= 0 ? '#94a3b8' : '#ef4444'
  const label = nps >= 50 ? 'Excellent' : nps >= 20 ? 'Bon' : nps >= 0 ? 'Moyen' : 'À améliorer'
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-2">
      {loading ? <div className="skeleton h-12 w-20 rounded" /> : (
        <>
          <p className="text-5xl font-black tabular-nums leading-none" style={{ color }}>{nps > 0 ? '+' : ''}{nps}</p>
          <p className="text-2xs font-semibold uppercase tracking-widest mt-1" style={{ color }}>{label}</p>
          <p className="text-2xs text-slate-500">de -100 à +100</p>
        </>
      )}
    </div>
  )
}

const PERIODS = [{ value: 7, label: '7j' }, { value: 30, label: '30j' }, { value: 90, label: '3 mois' }, { value: 365, label: '1 an' }]

export default function SatisfactionPage() {
  const { entiteActive } = useAppStore()
  const [period, setPeriod] = useState(30)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [recentResponses, setRecentResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detractorsOnly, setDetractorsOnly] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const ef = entiteActive?.id ?? null
    const [{ data: analytics }, { data: surveysData }, { data: respData }] = await Promise.all([
      supabase.rpc('get_survey_analytics', { p_entite_id: ef, p_period_days: period }),
      supabase.from('surveys').select('id, title, status, public_token, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('survey_responses').select(`
        id, submitted_at, client:entreprises_clientes(nom_entreprise),
        survey:surveys(title),
        answers:survey_answers(answer_value, question:survey_questions(type, question_text))
      `).eq('is_complete', true).order('submitted_at', { ascending: false }).limit(10),
    ])
    const a = analytics as any
    setKpis(a?.kpis ?? null)
    setTimeline((a?.timeline ?? []).map((t: any) => ({
      ...t,
      day: new Date(t.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    })))
    setSurveys(surveysData as Survey[] || [])
    setRecentResponses(respData as any[] || [])
    setLoading(false)
  }, [entiteActive?.id, period]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const total = kpis?.total_reponses ?? 0
  const promoteurs = kpis?.promoteurs ?? 0
  const detracteurs = kpis?.detracteurs ?? 0
  const nps = total > 0 ? Math.round((promoteurs - detracteurs) / total * 100) : 0
  const satisfactionRate = kpis?.avg_score != null ? Math.round((kpis.avg_score / 10) * 100) : null

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${token}`)
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const filteredResponses = detractorsOnly
    ? recentResponses.filter(r => {
        const s = r.answers?.find((a: any) => ['nps','rating_5','rating_10'].includes(a.question?.type))?.answer_value
        return s != null && Number(s) <= 2
      })
    : recentResponses

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Satisfaction Client</h1>
          <p className="page-subtitle">Analytics NPS & enquêtes de fidélisation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
          <Link href="/crm/satisfaction/builder">
            <Button size="sm" icon={<Plus size={14} />}>Nouvelle enquête</Button>
          </Link>
        </div>
      </div>

      {/* Alerte détracteurs */}
      {!loading && detracteurs > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red/5 border border-red/20 rounded-xl">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red" />
          </span>
          <AlertTriangle size={13} className="text-red flex-shrink-0" />
          <p className="text-xs text-red flex-1">
            <span className="font-semibold">{detracteurs} détracteur{detracteurs > 1 ? 's' : ''}</span> sur la période — relancez ces clients en priorité.
          </p>
          <button onClick={() => setDetractorsOnly(v => !v)} className="text-2xs text-red/70 hover:text-red underline underline-offset-2 transition-colors">
            {detractorsOnly ? 'Tous les retours' : 'Filtrer'}
          </button>
        </div>
      )}

      {/* Filtres période */}
      <div className="flex items-center gap-2">
        <span className="text-2xs text-text-muted font-medium mr-1">Période :</span>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${period === p.value ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-gradient-to-br from-surface to-background/60">
          <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score NPS</p>
          <NPSGauge nps={nps} loading={loading} />
        </Card>
        <Card className="p-5 border-slate-800">
          <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Satisfaction</p>
          {loading ? <div className="skeleton h-10 w-24 rounded mt-1" /> : (
            <>
              <p className="text-4xl font-black text-cyan-400 tabular-nums leading-none">{satisfactionRate != null ? `${satisfactionRate}%` : '—'}</p>
              <p className="text-2xs text-slate-500 mt-2">Moyenne {kpis?.avg_score?.toFixed(1) ?? '—'} / 10</p>
            </>
          )}
        </Card>
        <Card className="p-5 border-slate-800">
          <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Réponses</p>
          {loading ? <div className="skeleton h-10 w-16 rounded mt-1" /> : (
            <>
              <p className="text-4xl font-black text-text-primary tabular-nums leading-none">{total}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xs text-emerald-400 flex items-center gap-1"><ThumbsUp size={9} />{promoteurs}</span>
                <span className="text-2xs text-amber-400 flex items-center gap-1"><Minus size={9} />{kpis?.passifs ?? 0}</span>
                <span className="text-2xs text-red-400 flex items-center gap-1"><ThumbsDown size={9} />{detracteurs}</span>
              </div>
            </>
          )}
        </Card>
        <Card className="p-5 border-slate-800">
          <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Enquêtes actives</p>
          {loading ? <div className="skeleton h-10 w-16 rounded mt-1" /> : (
            <>
              <p className="text-4xl font-black text-violet tabular-nums leading-none">{surveys.filter(s => s.status === 'active').length}</p>
              <p className="text-2xs text-slate-500 mt-2">{surveys.length} créées au total</p>
            </>
          )}
        </Card>
      </div>

      {/* Graphique */}
      <Card className="p-6 border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Évolution de la satisfaction</h3>
            <p className="text-2xs text-slate-500 mt-0.5">Score moyen par jour · zones promoteurs / passifs / détracteurs</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-2xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />≥ 8</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500/30 border border-amber-500/50" />6–7</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/30 border border-red-500/50" />≤ 5</span>
          </div>
        </div>
        {loading ? (
          <div className="skeleton h-56 rounded-xl" />
        ) : timeline.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-600 gap-2">
            <BarChart3 size={28} className="opacity-30" />
            <p className="text-sm">Aucune donnée sur cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <ReferenceArea y1={0}   y2={5.5} fill="#ef4444" fillOpacity={0.05} />
              <ReferenceArea y1={5.5} y2={7.5} fill="#f59e0b" fillOpacity={0.05} />
              <ReferenceArea y1={7.5} y2={10}  fill="#10b981" fillOpacity={0.05} />
              <ReferenceLine y={5.5} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.25} />
              <ReferenceLine y={7.5} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.25} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avg_score" stroke="#06b6d4" strokeWidth={2}
                fill="url(#gradScore)" dot={{ fill: '#06b6d4', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#06b6d4' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Enquêtes + Réponses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enquêtes */}
        <Card className="p-5 border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Layers size={13} className="text-violet" />Enquêtes</h3>
            <Link href="/crm/satisfaction/builder" className="text-2xs text-blue hover:text-blue/80 flex items-center gap-1">Gérer <ChevronRight size={10} /></Link>
          </div>
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />) :
            surveys.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm"><BarChart3 size={22} className="mx-auto mb-2 opacity-30" />Aucune enquête</div>
            ) : surveys.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-background/40 border border-slate-800/60 rounded-lg group hover:border-slate-700 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'active' ? 'bg-emerald-500' : s.status === 'closed' ? 'bg-slate-600' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{s.title}</p>
                  <p className="text-2xs text-slate-500">{formatDate(s.created_at)} · {s.status === 'active' ? 'Active' : s.status === 'draft' ? 'Brouillon' : 'Fermée'}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyLink(s.public_token, s.id)} title="Copier lien"
                    className="p-1.5 rounded hover:bg-surface-hover text-slate-500 hover:text-cyan-400 transition-colors">
                    {copied === s.id ? <span className="text-2xs text-emerald-400 font-medium">✓</span> : <Copy size={11} />}
                  </button>
                  <Link href={`/crm/satisfaction/builder/${s.id}`} className="p-1.5 rounded hover:bg-surface-hover text-slate-500 hover:text-text-primary transition-colors">
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            ))
          }
        </Card>

        {/* Réponses récentes */}
        <Card className="p-5 border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Clock size={13} className="text-blue" />Réponses récentes</h3>
            {detractorsOnly && <span className="text-2xs text-red-400 bg-red/10 border border-red/20 px-2 py-0.5 rounded-full">Détracteurs</span>}
          </div>
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />) :
            filteredResponses.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">Aucune réponse</div>
            ) : filteredResponses.map(r => {
              const scoreAns = r.answers?.find((a: any) => ['nps','rating_5','rating_10'].includes(a.question?.type))
              const score = scoreAns ? Number(scoreAns.answer_value) : null
              const commentAns = r.answers?.find((a: any) => ['text_short','text_long'].includes(a.question?.type))
              const comment = commentAns?.answer_value ? String(commentAns.answer_value).replace(/^"|"$/g, '') : null
              const scoreClass = score == null ? 'bg-slate-800 text-slate-500' : score >= 9 ? 'bg-emerald-500/10 text-emerald-400' : score >= 7 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-background/40 border border-slate-800/60 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${scoreClass}`}>{score ?? '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-text-primary truncate">{r.client?.nom_entreprise || 'Anonyme'}</p>
                      <span className="text-2xs text-slate-600 truncate">· {r.survey?.title || ''}</span>
                    </div>
                    {comment && <p className="text-2xs text-slate-500 mt-0.5 line-clamp-1 italic">"{comment}"</p>}
                    <p className="text-2xs text-slate-600 mt-0.5">{formatRelativeTime(r.submitted_at)}</p>
                  </div>
                </div>
              )
            })
          }
        </Card>
      </div>
    </div>
  )
}
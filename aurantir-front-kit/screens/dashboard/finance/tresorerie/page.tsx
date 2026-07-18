// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card, StatCard } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant, formatDate, exportToCSV } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadDocument } from '@/aurantir-front-kit/lib/storage'
import type { Tresorerie } from '@/aurantir-front-kit/types/database.types'
import Link from 'next/link'
import {
  Plus, TrendingUp, TrendingDown, Wallet,
  ArrowUpRight, ArrowDownLeft, Download, Building2,
  Eye, Calendar, Tag, CreditCard, User, FileText, ExternalLink, X, Link2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface SoldeType { entrees: number; sorties: number; solde: number }
interface EntiteStats { id: string; nom: string; entrees: number; sorties: number; solde: number }

export default function TresoreriePage() {
  const { entites, entiteActive } = useAppStore()
  const [operations, setOperations] = useState<Tresorerie[]>([])
  const [solde, setSolde] = useState<SoldeType>({ entrees: 0, sorties: 0, solde: 0 })
  const [entiteStats, setEntiteStats] = useState<EntiteStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOp, setSelectedOp] = useState<Tresorerie | null>(null)
  const [typeFiltre, setTypeFiltre] = useState<'tous' | 'entree' | 'sortie'>('tous')
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null) // null = vue globale
  const [chartData, setChartData] = useState<{ name: string; entrees: number; sorties: number; cumul: number; cumulEntrees: number; cumulSorties: number }[]>([])
  const supabase = createClient()

  // Initialiser le filtre sur l'entité active au premier chargement
  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) {
      setEntiteFiltre(entiteActive.id)
    }
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTresorerie = useCallback(async () => {
    setLoading(true)

    // Requête légère sans limite — pour stats cards et graphique (toutes les opérations)
    let qAll = supabase.from('tresorerie').select('id, type, montant, date_operation, entite_id')
    if (entiteFiltre) qAll = qAll.eq('entite_id', entiteFiltre)
    const { data: allData } = await qAll
    const allOps = (allData || []) as Pick<Tresorerie, 'id' | 'type' | 'montant' | 'date_operation' | 'entite_id'>[]

    // Requête complète limitée — pour la table d'affichage
    let qTable = supabase.from('tresorerie').select('*').order('date_operation', { ascending: false })
    if (entiteFiltre) qTable = qTable.eq('entite_id', entiteFiltre)
    const { data: tableData } = await qTable.limit(200)
    setOperations((tableData || []) as Tresorerie[])

    // Stats — basées sur TOUTES les opérations
    const entrees = allOps.filter(o => o.type === 'entree').reduce((s, o) => s + o.montant, 0)
    const sorties = allOps.filter(o => o.type === 'sortie').reduce((s, o) => s + o.montant, 0)
    setSolde({ entrees, sorties, solde: entrees - sorties })

    // Breakdown par entité (vue globale uniquement)
    if (!entiteFiltre && entites.length > 0) {
      const stats: EntiteStats[] = entites.map(e => {
        const opsEntite = allOps.filter(o => o.entite_id === e.id)
        const e_ = opsEntite.filter(o => o.type === 'entree').reduce((s, o) => s + o.montant, 0)
        const s_ = opsEntite.filter(o => o.type === 'sortie').reduce((s, o) => s + o.montant, 0)
        return { id: e.id, nom: e.nom, entrees: e_, sorties: s_, solde: e_ - s_ }
      }).filter(s => s.entrees > 0 || s.sorties > 0)
      setEntiteStats(stats)
    } else {
      setEntiteStats([])
    }

    // Graphique 6 mois — 3 courbes cumulatives (toutes opérations)
    let cumul = 0; let cumulEntrees = 0; let cumulSorties = 0
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
      const m = d.getMonth() + 1; const y = d.getFullYear()
      const opsMois = allOps.filter(o => { const od = new Date(o.date_operation); return od.getMonth() + 1 === m && od.getFullYear() === y })
      const e = opsMois.filter(o => o.type === 'entree').reduce((s, o) => s + o.montant, 0)
      const s = opsMois.filter(o => o.type === 'sortie').reduce((s, o) => s + o.montant, 0)
      cumulEntrees += e; cumulSorties += s; cumul += e - s
      return { name: d.toLocaleDateString('fr-SN', { month: 'short' }), entrees: e, sorties: s, cumul, cumulEntrees, cumulSorties }
    })
    setChartData(months)
    setLoading(false)
  }, [entiteFiltre, entites]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTresorerie() }, [loadTresorerie])

  const opsFiltrees = operations.filter(o => typeFiltre === 'tous' || o.type === typeFiltre)

  // Entité courante pour l'affichage
  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null

  function handleExport() {
    const filename = entiteCourante
      ? `tresorerie-${entiteCourante.nom.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      : `tresorerie-globale-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(
      filename,
      ['Date', 'Entité', 'Libellé', 'Type', 'Montant', 'Catégorie', 'Référence'],
      opsFiltrees.map(o => {
        const entiteNom = entites.find(e => e.id === o.entite_id)?.nom || ''
        return [o.date_operation, entiteNom, o.description || '', o.type, o.montant, o.categorie || '', o.reference_document || '']
      })
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trésorerie</h1>
          <p className="page-subtitle">
            {entiteCourante ? entiteCourante.nom : 'Vue globale — toutes les entités'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={loading || operations.length === 0}>Exporter</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Nouvelle opération</Button>
        </div>
      </div>

      {/* Filtres par entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button
          onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            entiteFiltre === null
              ? 'bg-blue/10 text-blue border-blue/30'
              : 'border-surface-border text-text-muted hover:border-surface-border-hover'
          }`}
        >
          Vue globale
        </button>
        {entites.map(e => (
          <button
            key={e.id}
            onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              entiteFiltre === e.id
                ? 'bg-violet/10 text-violet border-violet/30'
                : 'border-surface-border text-text-muted hover:border-surface-border-hover'
            }`}
          >
            {e.nom}
          </button>
        ))}
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={entiteFiltre ? 'Solde actuel' : 'Solde consolidé'}
          value={formatMontant(solde.solde)}
          icon={<Wallet size={16} />}
          color={solde.solde >= 0 ? 'green' : 'red'}
          loading={loading}
        />
        <StatCard label="Total entrées" value={formatMontant(solde.entrees)} icon={<TrendingUp size={16} />} color="green" loading={loading} />
        <StatCard label="Total sorties" value={formatMontant(solde.sorties)} icon={<TrendingDown size={16} />} color="red" loading={loading} />
      </div>

      {/* Breakdown par entité (vue globale uniquement) */}
      {!entiteFiltre && entiteStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entiteStats.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet/10 flex items-center justify-center">
                    <Building2 size={14} className="text-violet" />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{s.nom}</span>
                </div>
                <button
                  onClick={() => setEntiteFiltre(s.id)}
                  className="text-2xs text-blue hover:underline"
                >
                  Voir détail →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xs text-text-muted mb-0.5">Solde</p>
                  <p className={`text-sm font-bold ${s.solde >= 0 ? 'text-green' : 'text-red'}`}>{formatMontant(s.solde)}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted mb-0.5">Entrées</p>
                  <p className="text-sm font-semibold text-green">{formatMontant(s.entrees)}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted mb-0.5">Sorties</p>
                  <p className="text-sm font-semibold text-red">{formatMontant(s.sorties)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Graphique */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Évolution cumulée{entiteCourante ? ` — ${entiteCourante.nom}` : ' (consolidée)'}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span className="text-xs text-text-muted">Total entrées</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-xs text-text-muted">Total sorties</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <span className="text-xs text-text-muted">Solde actuel</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradEntrees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSorties" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSolde" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => (v / 1000000) >= 1 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k'} width={50} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
              formatter={(v: any, name) => [formatMontant(Number(v)), String(name ?? '')]}
            />
            <Area type="monotone" dataKey="cumulEntrees" stroke="#10B981" fill="url(#gradEntrees)" strokeWidth={2} name="Total entrées" dot={false} />
            <Area type="monotone" dataKey="cumulSorties" stroke="#EF4444" fill="url(#gradSorties)" strokeWidth={2} name="Total sorties" dot={false} />
            <Area type="monotone" dataKey="cumul" stroke="#3B82F6" fill="url(#gradSolde)" strokeWidth={2} name="Solde actuel" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Filtres type + tableau */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Type :</span>
        {(['tous', 'entree', 'sortie'] as const).map(t => (
          <button key={t} onClick={() => setTypeFiltre(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              typeFiltre === t
                ? t === 'entree' ? 'bg-green/10 text-green border-green/30'
                : t === 'sortie' ? 'bg-red/10 text-red border-red/30'
                : 'bg-blue/10 text-blue border-blue/30'
                : 'border-surface-border text-text-muted hover:border-surface-border-hover'
            }`}>
            {t === 'tous' ? 'Toutes' : t === 'entree' ? '↑ Entrées' : '↓ Sorties'}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              {!entiteFiltre && <th>Entité</th>}
              <th>Type</th>
              <th>Description</th>
              <th>Catégorie</th>
              <th>Montant</th>
              <th>Référence</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: entiteFiltre ? 6 : 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 rounded w-20" /></td>
                  ))}</tr>
                ))
              : opsFiltrees.length === 0
                ? <tr><td colSpan={entiteFiltre ? 6 : 7} className="py-10 text-center text-text-muted text-sm">Aucune opération</td></tr>
                : opsFiltrees.map(op => (
                  <tr key={op.id} className="cursor-pointer hover:bg-surface-hover/50 transition-colors"
                    onClick={() => setSelectedOp(op)}>
                    <td className="text-xs text-text-muted">{formatDate(op.date_operation)}</td>
                    {!entiteFiltre && (
                      <td className="text-xs text-text-muted">
                        <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-surface-border text-2xs">
                          {entites.find(e => e.id === op.entite_id)?.nom || '—'}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${op.type === 'entree' ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>
                        {op.type === 'entree' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                        {op.type === 'entree' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td className="text-xs text-text-primary">{op.description || '—'}</td>
                    <td className="text-xs text-text-muted">{op.categorie || '—'}</td>
                    <td><span className={`font-semibold text-sm ${op.type === 'entree' ? 'text-green' : 'text-red'}`}>{op.type === 'entree' ? '+' : '-'}{formatMontant(op.montant, op.devise)}</span></td>
                    <td className="text-xs font-mono text-text-muted">
                      {op.facture_id
                        ? <Link href={`/finance/factures/${op.facture_id}`} onClick={e => e.stopPropagation()}
                            className="text-blue hover:underline flex items-center gap-1">
                            <FileText size={10} />{op.reference_document || 'Facture liée'}
                          </Link>
                        : op.reference_document || '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedOp(op)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-all">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {showForm && (
        <OperationModal
          entiteId={entiteFiltre || ''}
          entites={entites}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadTresorerie() }}
        />
      )}

      {selectedOp && (
        <OperationDetailModal
          op={selectedOp}
          entiteNom={entites.find(e => e.id === selectedOp.entite_id)?.nom || '—'}
          onClose={() => setSelectedOp(null)}
          onRefresh={() => { loadTresorerie(); setSelectedOp(null) }}
        />
      )}
    </div>
  )
}

function OperationDetailModal({ op, entiteNom, onClose, onRefresh }: {
  op: Tresorerie
  entiteNom: string
  onClose: () => void
  onRefresh: () => void
}) {
  const isEntree = op.type === 'entree'
  const supabase = createClient()
  const [factures, setFactures] = useState<{ id: string; numero: string }[]>([])
  const [selectedFactureId, setSelectedFactureId] = useState('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (!op.facture_id) {
      supabase.rpc('get_factures', { p_entite_id: op.entite_id, p_limit: 100 })
        .then(({ data }) => {
          const rows = (data as any[]) || []
          setFactures(rows.map((f: any) => ({ id: f.id, numero: f.numero })))
        })
    }
  }, [op.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLierFacture() {
    if (!selectedFactureId) return
    setLinking(true)
    const fac = factures.find(f => f.id === selectedFactureId)
    await supabase.from('tresorerie').update({
      facture_id: selectedFactureId,
      reference_document: fac ? `Facture ${fac.numero}` : op.reference_document,
    }).eq('id', op.id)
    setLinking(false)
    onRefresh()
  }

  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { icon: <Calendar size={13} />, label: 'Date', value: formatDate(op.date_operation) },
    { icon: <Building2 size={13} />, label: 'Entité', value: entiteNom },
    ...(op.categorie ? [{ icon: <Tag size={13} />, label: 'Catégorie', value: op.categorie }] : []),
    ...(op.mode_paiement ? [{ icon: <CreditCard size={13} />, label: 'Mode de paiement', value: op.mode_paiement }] : []),
    ...(op.tiers_type && op.tiers_id ? [{
      icon: <User size={13} />,
      label: op.tiers_type === 'client' ? 'Client' : 'Fournisseur',
      value: <span className="capitalize">{op.tiers_type}</span>,
    }] : []),
    { icon: <Calendar size={13} />, label: 'Enregistré le', value: formatDate(op.created_at) },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-5 ${isEntree ? 'bg-green/5 border-b border-green/10' : 'bg-red/5 border-b border-red/10'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEntree ? 'bg-green/10' : 'bg-red/10'}`}>
                {isEntree ? <ArrowUpRight size={18} className="text-green" /> : <ArrowDownLeft size={18} className="text-red" />}
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted">{isEntree ? 'Entrée' : 'Sortie'}</p>
                <p className="text-sm font-semibold text-text-primary leading-tight">{op.description || '—'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0">
              <X size={16} />
            </button>
          </div>
          <p className={`text-2xl font-bold mt-3 ${isEntree ? 'text-green' : 'text-red'}`}>
            {isEntree ? '+' : '−'}{formatMontant(op.montant, op.devise)}
          </p>
        </div>

        {/* Détails */}
        <div className="px-5 pt-4 space-y-0 divide-y divide-surface-border">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 gap-4">
              <div className="flex items-center gap-2 text-text-muted flex-shrink-0">
                {row.icon}
                <span className="text-xs">{row.label}</span>
              </div>
              <span className="text-xs text-text-primary text-right">{row.value}</span>
            </div>
          ))}

          {/* Référence / Facture liée */}
          <div className="py-3 space-y-2">
            <div className="flex items-center gap-2 text-text-muted">
              <FileText size={13} />
              <span className="text-xs">Facture liée</span>
            </div>
            {op.facture_id ? (
              <Link href={`/finance/factures/${op.facture_id}`} onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue/20 bg-blue/5 hover:bg-blue/10 transition-all group">
                <FileText size={12} className="text-blue flex-shrink-0" />
                <span className="text-xs text-blue font-medium flex-1">{op.reference_document || 'Facture'}</span>
                <ExternalLink size={10} className="text-blue/60 group-hover:text-blue transition-colors flex-shrink-0" />
              </Link>
            ) : (
              <div className="flex gap-2">
                <select className="input flex-1 text-xs py-1.5" value={selectedFactureId}
                  onChange={e => setSelectedFactureId(e.target.value)}>
                  <option value="">— Associer une facture —</option>
                  {factures.map(f => <option key={f.id} value={f.id}>{f.numero}</option>)}
                </select>
                <button
                  onClick={handleLierFacture}
                  disabled={!selectedFactureId || linking}
                  className="px-3 py-1.5 rounded-lg bg-blue/10 text-blue border border-blue/20 text-xs font-medium hover:bg-blue/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 flex-shrink-0">
                  <Link2 size={11} />{linking ? '…' : 'Lier'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Justificatif */}
        {op.justificatif_url && (
          <div className="px-5 pb-2">
            <button
              onClick={() => downloadDocument(supabase, 'documents', op.justificatif_url!, 'justificatif')}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg border border-surface-border bg-surface-hover hover:border-blue/30 hover:bg-blue/5 transition-all group">
              <FileText size={13} className="text-text-muted group-hover:text-blue transition-colors flex-shrink-0" />
              <span className="text-xs text-text-secondary group-hover:text-blue transition-colors flex-1">Télécharger le justificatif</span>
              <Download size={11} className="text-text-muted group-hover:text-blue transition-colors flex-shrink-0" />
            </button>
          </div>
        )}

        <div className="px-5 py-4">
          <button onClick={onClose}
            className="w-full py-2 rounded-lg text-xs font-medium border border-surface-border text-text-muted hover:bg-surface-hover transition-all">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

const CATEGORIES_ENTREE = [
  'Prestations de services', 'Acompte client', 'Solde client',
  'Remboursement', 'Subvention / Aide', 'Autres revenus',
]
const CATEGORIES_SORTIE = [
  'Logiciels / SaaS', 'Marketing / Publicité', 'Salaires / RH',
  'Loyer / Hébergement', 'Matériel informatique', 'Transports / Déplacements',
  'Frais bancaires', 'Formation', 'Sous-traitance', 'Téléphonie / Internet',
  'Frais design', 'Frais juridiques', 'Autres charges',
]
const MODES_PAIEMENT = ['Virement bancaire', 'Espèces', 'Chèque', 'Wave', 'Orange Money']

interface RefItem { id: string; label: string; type: 'facture' | 'devis' }
interface TiersItem { id: string; nom: string; type: 'client' | 'fournisseur' }

function OperationModal({
  entiteId,
  entites,
  onClose,
  onSuccess,
}: {
  entiteId: string
  entites: { id: string; nom: string }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    type: 'entree' as 'entree' | 'sortie',
    montant: '',
    description: '',
    categorie: '',
    mode_paiement: '',
    tiers_type: '' as '' | 'client' | 'fournisseur',
    tiers_id: '',
    reference_document: '',
    facture_id: '',
    date_operation: new Date().toISOString().split('T')[0],
    entite_id: entiteId,
  })
  const [file, setFile] = useState<File | null>(null)
  const [refs, setRefs] = useState<RefItem[]>([])
  const [tiers, setTiers] = useState<TiersItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Charger factures (via RPC SECURITY DEFINER) + devis + clients + fournisseurs
  useEffect(() => {
    const eid = form.entite_id
    if (!eid) return
    Promise.all([
      supabase.rpc('get_factures', { p_entite_id: eid, p_limit: 100 }),
      supabase.rpc('get_devis_list', { p_entite_id: eid, p_limit: 50 }),
      supabase.from('entreprises_clientes').select('id, nom_entreprise').eq('entite_id', eid).limit(50),
      supabase.from('fournisseurs').select('id, nom').eq('entite_id', eid).limit(50),
    ]).then(([{ data: facsRaw }, { data: devsRaw }, { data: clients }, { data: fourniss }]) => {
      const facs = (facsRaw as any[]) || []
      const devs = (devsRaw as any[]) || []
      const r: RefItem[] = [
        ...facs.map((f: any) => ({ id: f.id, label: `Facture ${f.numero}`, type: 'facture' as const })),
        ...devs.map((d: any) => ({ id: d.id, label: `Devis ${d.numero}`, type: 'devis' as const })),
      ]
      setRefs(r)
      const t: TiersItem[] = [
        ...(clients || []).map((c: any) => ({ id: c.id, nom: c.nom_entreprise, type: 'client' as const })),
        ...(fourniss || []).map((f: any) => ({ id: f.id, nom: f.nom, type: 'fournisseur' as const })),
      ]
      setTiers(t)
    })
  }, [form.entite_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = form.type === 'entree' ? CATEGORIES_ENTREE : CATEGORIES_SORTIE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id, entite_principale_id').eq('auth_user_id', user!.id).single()
    if (!userData) { setError('Profil introuvable'); setSaving(false); return }

    const resolvedEntiteId = form.entite_id || userData.entite_principale_id
    if (!resolvedEntiteId) { setError('Sélectionnez une entité.'); setSaving(false); return }

    // Trouver la référence sélectionnée
    const refItem = refs.find(r => r.id === form.reference_document)

    // Insert de base (colonnes garanties existantes)
    const { data: inserted, error: insertError } = await supabase.from('tresorerie').insert({
      entite_id: resolvedEntiteId,
      type: form.type,
      montant: parseFloat(form.montant),
      description: form.description,
      categorie: form.categorie || null,
      reference_document: refItem ? refItem.label : (form.reference_document || null),
      facture_id: form.facture_id || null,
      date_operation: form.date_operation,
      devise: 'FCFA',
      created_by: userData.id,
    }).select().single()

    if (insertError) { setError(insertError.message); setSaving(false); return }

    // Enrichissement avec les nouvelles colonnes (migration 026)
    if (inserted) {
      const extras: Record<string, string | null> = {}
      if (form.mode_paiement) extras.mode_paiement = form.mode_paiement
      if (form.tiers_type)    extras.tiers_type    = form.tiers_type
      if (form.tiers_id)      extras.tiers_id      = form.tiers_id
      if (Object.keys(extras).length > 0) {
        await supabase.from('tresorerie').update(extras).eq('id', inserted.id)
      }
    }

    // Upload justificatif si présent
    if (file && inserted) {
      const path = `tresorerie/${inserted.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { storedPath, error: upErr } = await uploadToStorage(supabase, 'documents', path, file, { upsert: true })
      if (!upErr) {
        await supabase.from('tresorerie').update({ justificatif_url: storedPath }).eq('id', inserted.id)
      }
    }

    setSaving(false)
    onSuccess()
  }

  const tiersFiltered = tiers.filter(t =>
    form.tiers_type ? t.type === form.tiers_type : true
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Nouvelle opération</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20"><p className="text-xs text-red">{error}</p></div>}

          {/* Entité */}
          {entites.length > 1 && (
            <div className="space-y-1.5">
              <label className="label">Entité *</label>
              <div className="flex gap-2">
                {entites.map(e => (
                  <button key={e.id} type="button" onClick={() => setForm({ ...form, entite_id: e.id })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.entite_id === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:bg-surface-hover'
                    }`}>{e.nom}</button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div className="flex gap-2">
            {(['entree', 'sortie'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm({ ...form, type: t, categorie: '' })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.type === t
                    ? t === 'entree' ? 'bg-green/10 text-green border-green/30' : 'bg-red/10 text-red border-red/30'
                    : 'border-surface-border text-text-muted hover:bg-surface-hover'
                }`}>
                {t === 'entree' ? '↑ Entrée' : '↓ Sortie'}
              </button>
            ))}
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <label className="label">Montant (FCFA) *</label>
            <input type="number" step="1" min="0" className="input" value={form.montant}
              onChange={e => setForm({ ...form, montant: e.target.value })} required placeholder="0" autoFocus />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="label">Description *</label>
            <input type="text" className="input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Libellé de l'opération" />
          </div>

          {/* Catégorie + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Catégorie</label>
              <select className="input" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date_operation}
                onChange={e => setForm({ ...form, date_operation: e.target.value })} required />
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="space-y-1.5">
            <label className="label">Mode de paiement *</label>
            <select className="input" value={form.mode_paiement} onChange={e => setForm({ ...form, mode_paiement: e.target.value })} required>
              <option value="">— Choisir —</option>
              {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Référence (Devis / Facture) */}
          <div className="space-y-1.5">
            <label className="label">Référence — Devis / Facture</label>
            <select className="input" value={form.reference_document}
              onChange={e => {
                const refId = e.target.value
                const refItem = refs.find(r => r.id === refId)
                setForm({
                  ...form,
                  reference_document: refId,
                  facture_id: refItem?.type === 'facture' ? refId : '',
                })
              }}>
              <option value="">— Aucune référence —</option>
              {refs.length > 0 && (
                <>
                  <optgroup label="Factures">
                    {refs.filter(r => r.type === 'facture').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </optgroup>
                  <optgroup label="Devis">
                    {refs.filter(r => r.type === 'devis').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Tiers */}
          <div className="space-y-1.5">
            <label className="label">Tiers / Relation</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={form.tiers_type}
                onChange={e => setForm({ ...form, tiers_type: e.target.value as '' | 'client' | 'fournisseur', tiers_id: '' })}>
                <option value="">— Type —</option>
                <option value="client">Client</option>
                <option value="fournisseur">Fournisseur</option>
              </select>
              <select className="input" value={form.tiers_id}
                onChange={e => setForm({ ...form, tiers_id: e.target.value })}
                disabled={!form.tiers_type}>
                <option value="">— Choisir —</option>
                {tiersFiltered.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Justificatif */}
          <div className="space-y-1.5">
            <label className="label">Justificatif / Pièce jointe</label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              file ? 'border-blue/40 bg-blue/5' : 'border-surface-border hover:border-surface-border-hover hover:bg-surface-hover'
            }`}>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {file ? (
                  <p className="text-xs font-medium text-blue truncate">{file.name}</p>
                ) : (
                  <p className="text-xs text-text-muted">PDF, JPG ou PNG — cliquer pour sélectionner</p>
                )}
              </div>
              {file && (
                <button type="button" onClick={e => { e.preventDefault(); setFile(null) }}
                  className="text-text-muted hover:text-red transition-colors flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
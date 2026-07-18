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
import { useRouter } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant, formatDate, exportToCSV } from '@/aurantir-front-kit/lib/utils'
import {
  Plus, Search, Download, Eye, Send, CheckCircle,
  XCircle, FileText, Clock, ArrowRight, Building2, RefreshCw
} from 'lucide-react'

type DevisStatut = 'brouillon' | 'envoye' | 'en_negociation' | 'accepte' | 'refuse' | 'expire' | 'annule' | 'converti'

interface Devis {
  id: string
  numero: string
  titre: string
  statut: DevisStatut
  entite_id: string
  client_id?: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  devise: string
  date_emission: string
  date_validite?: string
  created_at: string
  client?: { nom_entreprise: string }
  entite?: { nom: string; couleur: string }
}

const STATUT_CONFIG: Record<DevisStatut, { label: string; cls: string; icon: React.ReactNode }> = {
  brouillon:      { label: 'Brouillon',      cls: 'bg-surface text-text-muted border-surface-border',     icon: <FileText size={10} /> },
  envoye:         { label: 'Envoyé',         cls: 'bg-blue/10 text-blue border-blue/20',                  icon: <Send size={10} /> },
  en_negociation: { label: 'En négociation', cls: 'bg-amber/10 text-amber border-amber/20',               icon: <Clock size={10} /> },
  accepte:        { label: 'Accepté',        cls: 'bg-green/10 text-green border-green/20',               icon: <CheckCircle size={10} /> },
  refuse:         { label: 'Refusé',         cls: 'bg-red/10 text-red border-red/20',                     icon: <XCircle size={10} /> },
  expire:         { label: 'Expiré',         cls: 'bg-surface text-text-disabled border-surface-border',  icon: <Clock size={10} /> },
  annule:         { label: 'Annulé',         cls: 'bg-surface text-text-disabled border-surface-border',  icon: <XCircle size={10} /> },
  converti:       { label: 'Converti →Fact', cls: 'bg-violet/10 text-violet border-violet/20',            icon: <ArrowRight size={10} /> },
}

const STATUT_FILTRES: { value: string; label: string }[] = [
  { value: 'tous',          label: 'Tous' },
  { value: 'brouillon',     label: 'Brouillon' },
  { value: 'envoye',        label: 'Envoyé' },
  { value: 'en_negociation',label: 'En négociation' },
  { value: 'accepte',       label: 'Accepté' },
  { value: 'refuse',        label: 'Refusé' },
  { value: 'expire',        label: 'Expiré' },
  { value: 'annule',        label: 'Annulé' },
  { value: 'converti',      label: 'Converti' },
]

interface EntiteStats { id: string; nom: string; total: number; acceptes: number; ca: number }

export default function DevisPage() {
  const router = useRouter()
  const { entites, entiteActive } = useAppStore()
  const [devis, setDevis] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState<string>('tous')
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null)
  const [entiteStats, setEntiteStats] = useState<EntiteStats[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) setEntiteFiltre(entiteActive.id)
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDevis = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_devis_list', {
      p_entite_id: entiteFiltre || null,
      p_statut:    statutFiltre !== 'tous' ? statutFiltre : null,
      p_search:    search || null,
      p_limit:     100,
    })
    const rows = (data || []) as Devis[]
    setDevis(rows)

    if (!entiteFiltre && entites.length > 0) {
      setEntiteStats(entites.map(e => {
        const ef = rows.filter(d => d.entite_id === e.id)
        return {
          id: e.id, nom: e.nom,
          total:    ef.length,
          acceptes: ef.filter(d => d.statut === 'accepte').length,
          ca:       ef.filter(d => d.statut === 'accepte').reduce((s, d) => s + d.montant_ttc, 0),
        }
      }).filter(s => s.total > 0))
    } else {
      setEntiteStats([])
    }
    setLoading(false)
  }, [entiteFiltre, statutFiltre, search, entites]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDevis() }, [loadDevis])

  const stats = {
    total:        devis.length,
    envoyes:      devis.filter(d => d.statut === 'envoye').length,
    acceptes:     devis.filter(d => d.statut === 'accepte').length,
    montantTotal: devis.filter(d => d.statut === 'accepte').reduce((s, d) => s + d.montant_ttc, 0),
  }

  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null

  function handleExport() {
    exportToCSV(
      `devis-${entiteCourante?.nom.toLowerCase().replace(/\s+/g, '-') || 'globale'}-${new Date().toISOString().split('T')[0]}.csv`,
      ['Numéro', 'Titre', 'Client', 'Entité', 'Montant HT', 'TVA', 'Montant TTC', 'Devise', 'Émission', 'Validité', 'Statut'],
      devis.map(d => [d.numero, d.titre, (d as any).client?.nom_entreprise || '', (d as any).entite?.nom || '', d.montant_ht, d.montant_tva, d.montant_ttc, d.devise, d.date_emission, d.date_validite || '', d.statut])
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Devis</h1>
          <p className="page-subtitle">{entiteCourante ? entiteCourante.nom : 'Vue globale — toutes les entités'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={loading || devis.length === 0}>Exporter</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => router.push('/finance/devis/nouveau')}>Nouveau devis</Button>
        </div>
      </div>

      {/* Filtres entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === null ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
          Vue globale
        </button>
        {entites.map(e => (
          <button key={e.id} onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {e.nom}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1"><p className="text-xs text-text-muted">Total</p><p className="text-2xl font-bold text-text-primary">{loading ? '—' : stats.total}</p></Card>
        <Card className="p-4 space-y-1"><p className="text-xs text-text-muted">Envoyés</p><p className="text-2xl font-bold text-blue">{loading ? '—' : stats.envoyes}</p></Card>
        <Card className="p-4 space-y-1"><p className="text-xs text-text-muted">Acceptés</p><p className="text-2xl font-bold text-green">{loading ? '—' : stats.acceptes}</p></Card>
        <Card className="p-4 space-y-1"><p className="text-xs text-text-muted">CA devis acceptés</p><p className="text-lg font-bold text-text-primary">{loading ? '—' : formatMontant(stats.montantTotal)}</p></Card>
      </div>

      {/* Breakdown par entité (vue globale) */}
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
                <button onClick={() => setEntiteFiltre(s.id)} className="text-2xs text-blue hover:underline">Voir détail →</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-2xs text-text-muted mb-0.5">Total</p><p className="text-sm font-bold text-text-primary">{s.total}</p></div>
                <div><p className="text-2xs text-text-muted mb-0.5">Acceptés</p><p className="text-sm font-semibold text-green">{s.acceptes}</p></div>
                <div><p className="text-2xs text-text-muted mb-0.5">CA accepté</p><p className="text-sm font-semibold text-text-primary">{formatMontant(s.ca)}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filtres statut + recherche */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Numéro, titre, client..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-8" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUT_FILTRES.map(s => (
              <button key={s.value} onClick={() => setStatutFiltre(s.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statutFiltre === s.value ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadDevis}>Actualiser</Button>
        </div>
      </Card>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Numéro</th><th>Client</th><th>Titre</th>
              {!entiteFiltre && <th>Entité</th>}
              <th>Montant TTC</th><th>Validité</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: entiteFiltre ? 7 : 8 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded w-20" /></td>)}</tr>
              ))
            ) : devis.length === 0 ? (
              <tr>
                <td colSpan={entiteFiltre ? 7 : 8} className="py-16 text-center">
                  <FileText size={32} className="mx-auto text-text-muted mb-3" />
                  <p className="text-sm text-text-muted">Aucun devis trouvé</p>
                  <button onClick={() => router.push('/finance/devis/nouveau')} className="mt-3 inline-block">
                    <Button size="sm" icon={<Plus size={14} />}>Créer un devis</Button>
                  </button>
                </td>
              </tr>
            ) : (
              devis.map(d => {
                const cfg = STATUT_CONFIG[d.statut] || STATUT_CONFIG.brouillon
                const entiteColor = (d as any).entite?.couleur || '#3B82F6'
                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/finance/devis/${d.id}`} className="text-blue hover:text-blue-light font-mono text-xs font-semibold">
                        {d.numero}
                      </Link>
                    </td>
                    <td className="text-xs text-text-primary">{(d as any).client?.nom_entreprise || '—'}</td>
                    <td className="text-xs text-text-secondary max-w-40 truncate">{d.titre || '—'}</td>
                    {!entiteFiltre && (
                      <td>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium border"
                          style={{ color: entiteColor, borderColor: entiteColor + '33', background: entiteColor + '15' }}>
                          {(d as any).entite?.nom || '—'}
                        </span>
                      </td>
                    )}
                    <td><span className="font-semibold text-sm text-text-primary">{formatMontant(d.montant_ttc, d.devise)}</span></td>
                    <td className="text-xs text-text-muted">{d.date_validite ? formatDate(d.date_validite) : '—'}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/finance/devis/${d.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye size={13} /></Button>
                        </Link>
                        {d.statut === 'accepte' && (
                          <Link href={`/finance/devis/${d.id}`} title="Convertir en facture">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-violet"><ArrowRight size={13} /></Button>
                          </Link>
                        )}
                        <Link href={`/finance/devis/${d.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Download size={13} /></Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && devis.length > 0 && (
        <p className="text-xs text-text-muted text-center">
          {devis.length} devis affich{devis.length > 1 ? 'és' : 'é'}
        </p>
      )}
    </div>
  )
}
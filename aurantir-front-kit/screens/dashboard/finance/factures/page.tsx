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
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { StatutFactureBadge, TypeFactureBadge, EntiteBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { Card, StatCard } from '@/aurantir-front-kit/components/ui/Card'
import { formatMontant, formatDate, joursRestants, debounce, exportToCSV } from '@/aurantir-front-kit/lib/utils'
import type { Facture, FactureStatut, FactureType } from '@/aurantir-front-kit/types/database.types'
import {
  Plus, Search, Download, FileText, Eye, Send,
  RefreshCw, Receipt, TrendingUp, Clock, AlertTriangle, Building2,
  TrendingDown, Loader2,
} from 'lucide-react'
import { downloadFacturePDF } from '@/aurantir-front-kit/lib/pdf/facture'
import Link from 'next/link'

type TypeFiltre = 'tous' | 'facture_client' | 'facture_fournisseur' | 'avoir_client' | 'avoir_fournisseur'

const TYPE_OPTIONS: { value: TypeFiltre; label: string }[] = [
  { value: 'tous',                label: 'Tous' },
  { value: 'facture_client',      label: 'Factures clients' },
  { value: 'facture_fournisseur', label: 'Factures fourn.' },
  { value: 'avoir_client',        label: 'Avoirs clients' },
  { value: 'avoir_fournisseur',   label: 'Avoirs fourn.' },
]

const STATUS_OPTIONS_CLIENT: { value: FactureStatut | 'tous'; label: string }[] = [
  { value: 'tous',       label: 'Tous les statuts' },
  { value: 'brouillon',  label: 'Brouillon' },
  { value: 'envoyee',    label: 'Envoyée' },
  { value: 'payee',      label: 'Payée' },
  { value: 'en_retard',  label: 'En retard' },
  { value: 'annulee',    label: 'Annulée' },
]

const STATUS_OPTIONS_FOURN: { value: FactureStatut | 'tous'; label: string }[] = [
  { value: 'tous',                label: 'Tous les statuts' },
  { value: 'recue',               label: 'Reçue' },
  { value: 'validee',             label: 'Validée' },
  { value: 'partiellement_payee', label: 'Part. payée' },
  { value: 'payee',               label: 'Payée' },
  { value: 'en_retard',           label: 'En retard' },
  { value: 'annulee',             label: 'Annulée' },
]

export default function FacturesPage() {
  const { entites, entiteActive } = useAppStore()
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState<FactureStatut | 'tous'>('tous')
  const [typeFiltre, setTypeFiltre] = useState<TypeFiltre>('tous')
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    revenus_total: 0, revenus_encaisse: 0,
    depenses_total: 0, depenses_payees: 0,
    en_retard: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) setEntiteFiltre(entiteActive.id)
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadFactures = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_factures', {
      p_entite_id: entiteFiltre || null,
      p_statut:    statutFiltre !== 'tous' ? statutFiltre : null,
      p_search:    search || null,
      p_limit:     200,
      p_type:      typeFiltre !== 'tous' ? typeFiltre : null,
    })

    const today = new Date().toISOString().split('T')[0]
    const rows = (data || []).map((f: any) =>
      ['envoyee', 'signee', 'recue', 'validee'].includes(f.statut) && f.date_echeance < today
        ? { ...f, statut: 'en_retard' as FactureStatut }
        : f
    ) as Facture[]

    setFactures(rows)

    const clients = rows.filter(f => f.type === 'facture_client')
    const fournisseurs = rows.filter(f => f.type === 'facture_fournisseur')
    setStats({
      revenus_total:    clients.reduce((s, f) => s + f.montant_ttc, 0),
      revenus_encaisse: clients.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0),
      depenses_total:   fournisseurs.reduce((s, f) => s + f.montant_ttc, 0),
      depenses_payees:  fournisseurs.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0),
      en_retard:        rows.filter(f => f.statut === 'en_retard').length,
    })
    setLoading(false)
  }, [entiteFiltre, statutFiltre, typeFiltre, search, entites]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFactures() }, [loadFactures])

  const debouncedSearch = debounce(setSearch, 300)
  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null
  const statusOptions = typeFiltre === 'facture_fournisseur' ? STATUS_OPTIONS_FOURN : STATUS_OPTIONS_CLIENT

  const showFournisseur = typeFiltre === 'facture_fournisseur' || typeFiltre === 'avoir_fournisseur'
    || (typeFiltre === 'tous' && factures.some(f => f.fournisseur_id))

  function handleExport() {
    exportToCSV(
      `factures-${new Date().toISOString().split('T')[0]}.csv`,
      ['Numéro', 'Type', 'Tiers', 'Entité', 'Montant HT', 'TVA', 'Montant TTC', 'Devise', 'Émission', 'Échéance', 'Statut'],
      factures.map(f => [
        f.numero,
        f.type,
        (f as any).client?.nom_entreprise || (f as any).fournisseur?.nom || '',
        (f as any).entite?.nom || '',
        f.montant_ht, f.montant_tva, f.montant_ttc, f.devise,
        f.date_emission, f.date_echeance, f.statut,
      ])
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Factures</h1>
          <p className="page-subtitle">{entiteCourante ? entiteCourante.nom : 'Vue globale — toutes les entités'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={loading || factures.length === 0}>Exporter</Button>
          <Link href="/finance/factures/nouvelle">
            <Button size="sm" icon={<Plus size={14} />}>Nouveau document</Button>
          </Link>
        </div>
      </div>

      {/* Filtres entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === null ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
          Globale
        </button>
        {entites.map(e => (
          <button key={e.id} onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {e.nom}
          </button>
        ))}
      </div>

      {/* Filtres type */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => { setTypeFiltre(t.value); setStatutFiltre('tous') }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${typeFiltre === t.value ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {(typeFiltre === 'tous' || typeFiltre === 'facture_client') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Revenus facturés"  value={formatMontant(stats.revenus_total)}    icon={<Receipt size={16} />}       color="blue"  loading={loading} />
          <StatCard label="Encaissé"          value={formatMontant(stats.revenus_encaisse)} icon={<TrendingUp size={16} />}    color="green" loading={loading} />
          {typeFiltre === 'tous' && (
            <>
              <StatCard label="Dépenses fourn." value={formatMontant(stats.depenses_total)}  icon={<TrendingDown size={16} />} color="violet" loading={loading} />
              <StatCard label="En retard"        value={stats.en_retard}                      icon={<AlertTriangle size={16} />} color="red"   loading={loading} />
            </>
          )}
          {typeFiltre === 'facture_client' && (
            <>
              <StatCard label="En attente" value={formatMontant(stats.revenus_total - stats.revenus_encaisse)} icon={<Clock size={16} />} color="amber" loading={loading} />
              <StatCard label="En retard"  value={stats.en_retard} icon={<AlertTriangle size={16} />} color="red" loading={loading} />
            </>
          )}
        </div>
      )}
      {typeFiltre === 'facture_fournisseur' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total reçu"    value={formatMontant(stats.depenses_total)}   icon={<Receipt size={16} />}       color="violet" loading={loading} />
          <StatCard label="Payé"          value={formatMontant(stats.depenses_payees)}  icon={<TrendingDown size={16} />}  color="red"    loading={loading} />
          <StatCard label="Reste à payer" value={formatMontant(stats.depenses_total - stats.depenses_payees)} icon={<Clock size={16} />} color="amber" loading={loading} />
          <StatCard label="En retard"     value={stats.en_retard} icon={<AlertTriangle size={16} />} color="red" loading={loading} />
        </div>
      )}

      {/* Filtres statut + recherche */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Rechercher par numéro, tiers..." onChange={e => debouncedSearch(e.target.value)} className="input pl-8" />
          </div>
          <select value={statutFiltre} onChange={e => setStatutFiltre(e.target.value as any)} className="input w-auto min-w-40">
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadFactures}>Actualiser</Button>
        </div>
      </Card>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Numéro</th>
              {typeFiltre === 'tous' && <th>Type</th>}
              <th>{typeFiltre === 'tous' ? 'Tiers' : showFournisseur ? 'Fournisseur' : 'Client'}</th>
              {!entiteFiltre && <th>Entité</th>}
              <th>Montant TTC</th>
              <th>Émission</th>
              <th>Échéance</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded w-20" /></td>)}</tr>
              ))
            ) : factures.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <FileText size={32} className="mx-auto text-text-muted mb-3" />
                  <p className="text-sm text-text-muted">Aucun document trouvé</p>
                  <Link href="/finance/factures/nouvelle" className="mt-3 inline-block">
                    <Button size="sm" icon={<Plus size={14} />}>Nouveau document</Button>
                  </Link>
                </td>
              </tr>
            ) : (
              factures.map(facture => {
                const jours = joursRestants(facture.date_echeance)
                const isEnRetard = facture.statut === 'en_retard'
                const isFourn = facture.type === 'facture_fournisseur' || facture.type === 'avoir_fournisseur'
                const tiers = isFourn
                  ? (facture as any).fournisseur?.nom || '—'
                  : (facture as any).client?.nom_entreprise || '—'
                return (
                  <tr key={facture.id} className={isEnRetard ? 'bg-red/5' : ''}>
                    <td>
                      <Link href={`/finance/factures/${facture.id}`} className="text-blue hover:text-blue-light font-mono text-xs font-semibold">
                        {facture.numero}
                      </Link>
                    </td>
                    {typeFiltre === 'tous' && (
                      <td><TypeFactureBadge type={facture.type as FactureType} /></td>
                    )}
                    <td className="text-text-primary">{tiers}</td>
                    {!entiteFiltre && (
                      <td>{(facture as any).entite && <EntiteBadge nom={(facture as any).entite.nom} />}</td>
                    )}
                    <td>
                      <span className={`font-semibold text-text-primary ${isFourn ? 'text-violet' : ''}`}>
                        {formatMontant(facture.montant_ttc, facture.devise)}
                      </span>
                    </td>
                    <td className="text-text-muted text-xs">{formatDate(facture.date_emission)}</td>
                    <td>
                      <span className={`text-xs ${isEnRetard ? 'text-red font-medium' : jours <= 7 ? 'text-amber' : 'text-text-muted'}`}>
                        {formatDate(facture.date_echeance)}{isEnRetard && ` (${Math.abs(jours)}j)`}
                      </span>
                    </td>
                    <td><StatutFactureBadge statut={facture.statut} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/finance/factures/${facture.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye size={13} /></Button>
                        </Link>
                        {facture.statut === 'brouillon' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue"><Send size={13} /></Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          disabled={downloadingId === facture.id}
                          onClick={async () => {
                            setDownloadingId(facture.id)
                            try { await downloadFacturePDF(facture.id) } catch {}
                            finally { setDownloadingId(null) }
                          }}
                        >
                          {downloadingId === facture.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && factures.length > 0 && (
        <p className="text-xs text-text-muted text-center">
          {factures.length} document{factures.length > 1 ? 's' : ''} affiché{factures.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
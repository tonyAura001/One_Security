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
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant, formatDate, joursRestants, exportToCSV } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage } from '@/aurantir-front-kit/lib/storage'
import Link from 'next/link'
import {
  Plus, Search, FileText, Calendar, AlertTriangle,
  CheckCircle, Clock, RotateCcw, Download, Eye,
  Paperclip, X, ChevronDown, TrendingUp,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

type ContratStatut = 'BROUILLON' | 'EN_ATTENTE_DE_SIGNATURE' | 'ACTIF' | 'EXPIRÉ' | 'RÉSILIÉ' | 'LITIGE'
type ContratType   = 'prestation' | 'maintenance' | 'abonnement' | 'licence' | 'partenariat' | 'autre'

interface Contrat {
  id: string
  entite_id: string
  client_id?: string
  numero: string
  titre: string
  type: ContratType
  statut: ContratStatut
  montant: number
  devise: string
  date_debut: string
  date_fin?: string
  est_recurrent: boolean
  periodicite?: string
  type_reconduction?: string
  preavis_rupture?: string
  created_at: string
  client?: { nom_entreprise: string }
  entite?: { nom: string; couleur: string }
}

const STATUT_CFG: Record<ContratStatut, { label: string; cls: string; icon: React.ReactNode }> = {
  BROUILLON:               { label: 'Brouillon',            cls: 'bg-surface text-text-muted border-surface-border',       icon: <FileText size={10} /> },
  EN_ATTENTE_DE_SIGNATURE: { label: 'Signature en attente', cls: 'bg-amber/10 text-amber border-amber/20',                 icon: <Clock size={10} /> },
  ACTIF:                   { label: 'Actif',                cls: 'bg-green/10 text-green border-green/20',                 icon: <CheckCircle size={10} /> },
  'EXPIRÉ':                { label: 'Expiré',               cls: 'bg-surface text-text-disabled border-surface-border',    icon: <Clock size={10} /> },
  'RÉSILIÉ':               { label: 'Résilié',              cls: 'bg-red/10 text-red border-red/20',                       icon: <AlertTriangle size={10} /> },
  LITIGE:                  { label: 'Litige',               cls: 'bg-orange-500/10 text-orange-400 border-orange-400/20',  icon: <AlertTriangle size={10} /> },
}

const TYPE_LABELS: Record<ContratType, string> = {
  prestation: 'Prestation', maintenance: 'Maintenance', abonnement: 'Abonnement',
  licence: 'Licence', partenariat: 'Partenariat', autre: 'Autre',
}

// Auto-expire computé côté client
function effectiveStatut(c: Contrat): ContratStatut {
  if (c.statut === 'ACTIF' && c.date_fin && new Date(c.date_fin) < new Date()) return 'EXPIRÉ'
  return c.statut
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ContratsPage() {
  const { entiteActive } = useAppStore()
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('tous')
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    // Auto-expirer silencieusement en arrière-plan
    supabase.rpc('auto_expire_contrats').then(() => {})

    let q = supabase
      .from('contrats')
      .select('*, client:entreprises_clientes(nom_entreprise), entite:entites_legales(nom, couleur)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (entiteActive?.id) q = q.eq('entite_id', entiteActive.id)
    if (statutFiltre !== 'tous') q = q.eq('statut', statutFiltre)
    if (search) q = q.ilike('titre', `%${search}%`)
    const { data } = await q
    setContrats((data || []) as Contrat[])
    setLoading(false)
  }, [entiteActive?.id, statutFiltre, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Stats avec statut effectif
  const enrichis = contrats.map(c => ({ ...c, statut: effectiveStatut(c) }))
  const stats = {
    actifs:          enrichis.filter(c => c.statut === 'ACTIF').length,
    expirantBientot: enrichis.filter(c => c.statut === 'ACTIF' && c.date_fin && joursRestants(c.date_fin) <= 30 && joursRestants(c.date_fin) > 0).length,
    recurrents:      enrichis.filter(c => c.est_recurrent && c.statut === 'ACTIF').length,
    valeurTotale:    enrichis.filter(c => c.statut === 'ACTIF').reduce((s, c) => s + c.montant, 0),
  }

  function handleExport() {
    exportToCSV(
      `contrats-${new Date().toISOString().split('T')[0]}.csv`,
      ['Numéro', 'Titre', 'Client', 'Type', 'Montant', 'Devise', 'Début', 'Fin', 'Récurrent', 'Statut'],
      contrats.map(c => [c.numero, c.titre, (c as any).client?.nom_entreprise || '', c.type, c.montant, c.devise || 'FCFA', c.date_debut, c.date_fin || '', c.est_recurrent ? 'Oui' : 'Non', effectiveStatut(c)])
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contrats</h1>
          <p className="page-subtitle">Contrats clients et engagements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={loading || contrats.length === 0}>Exporter</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Nouveau contrat</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Actifs</p>
          <p className="text-2xl font-bold text-green">{loading ? '—' : stats.actifs}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-text-muted">Expirent dans 30j</p>
            {stats.expirantBientot > 0 && <AlertTriangle size={10} className="text-amber" />}
          </div>
          <p className={`text-2xl font-bold ${stats.expirantBientot > 0 ? 'text-amber' : 'text-text-primary'}`}>{loading ? '—' : stats.expirantBientot}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Récurrents actifs</p>
          <p className="text-2xl font-bold text-blue">{loading ? '—' : stats.recurrents}</p>
        </Card>
        <Card className={`p-4 space-y-1 ${stats.valeurTotale > 0 && !loading ? 'border-green/20' : ''}`}>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-text-muted">Valeur contrats actifs</p>
            {stats.valeurTotale > 0 && !loading && <TrendingUp size={10} className="text-green" />}
          </div>
          <p className={`text-lg font-bold ${stats.valeurTotale > 0 && !loading ? 'text-green' : 'text-text-primary'}`}>
            {loading ? '—' : formatMontant(stats.valeurTotale)}
          </p>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Titre, client..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-1.5 text-sm w-48" />
        </div>
        {(['tous', 'BROUILLON', 'EN_ATTENTE_DE_SIGNATURE', 'ACTIF', 'EXPIRÉ', 'RÉSILIÉ', 'LITIGE'] as const).map(s => (
          <button key={s} onClick={() => setStatutFiltre(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statutFiltre === s ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {s === 'tous' ? 'Tous' : STATUT_CFG[s as ContratStatut]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Numéro</th><th>Titre</th><th>Client</th><th>Type</th>
              <th>Montant</th><th>Début</th><th>Fin</th><th>Récurrence</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded w-16" /></td>)}</tr>
              ))
              : contrats.length === 0
                ? <tr><td colSpan={10} className="py-10 text-center text-text-muted text-sm">Aucun contrat</td></tr>
                : contrats.map(c => {
                    const statut = effectiveStatut(c)
                    const cfg = STATUT_CFG[statut]
                    const jours = c.date_fin ? joursRestants(c.date_fin) : null
                    const entiteColor = (c as any).entite?.couleur || '#3B82F6'
                    return (
                      <tr key={c.id} className={statut === 'EXPIRÉ' ? 'opacity-60' : ''}>
                        <td className="font-mono text-xs text-text-muted">{c.numero}</td>
                        <td>
                          <div>
                            <p className="text-xs font-medium text-text-primary truncate max-w-40">{c.titre}</p>
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-2xs border mt-0.5"
                              style={{ color: entiteColor, borderColor: entiteColor + '33', background: entiteColor + '15' }}>
                              {(c as any).entite?.nom}
                            </span>
                          </div>
                        </td>
                        <td className="text-xs text-text-secondary">{(c as any).client?.nom_entreprise || '—'}</td>
                        <td className="text-xs text-text-muted">{TYPE_LABELS[c.type] || c.type}</td>
                        <td className="text-sm font-semibold text-text-primary">{formatMontant(c.montant, c.devise || 'FCFA')}</td>
                        <td className="text-xs text-text-muted">{formatDate(c.date_debut)}</td>
                        <td>
                          {c.date_fin ? (
                            <div>
                              <p className="text-xs text-text-muted">{formatDate(c.date_fin)}</p>
                              {jours !== null && jours <= 30 && jours > 0 && statut === 'ACTIF' && (
                                <p className="text-2xs text-amber font-medium">{jours}j restants</p>
                              )}
                            </div>
                          ) : <span className="text-text-muted text-xs">—</span>}
                        </td>
                        <td>
                          {c.est_recurrent
                            ? <span className="inline-flex items-center gap-1 text-2xs text-blue"><RotateCcw size={9} />{c.periodicite || '—'}</span>
                            : <span className="text-text-muted text-xs">—</span>}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td>
                          <Link href={`/crm/contrats/${c.id}`} className="p-1.5 hover:bg-surface-hover rounded text-text-muted hover:text-blue transition-colors inline-flex">
                            <Eye size={13} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>

      {!loading && contrats.length > 0 && (
        <p className="text-xs text-text-muted text-center">{contrats.length} contrat{contrats.length > 1 ? 's' : ''}</p>
      )}

      {showForm && (
        <ContratModal
          entiteId={entiteActive?.id || ''}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

// ─── ContratModal ─────────────────────────────────────────────────────────────

const PERIODICITES = ['mensuel', 'trimestriel', 'semestriel', 'annuel']
const RECONDUCTIONS = [
  { value: 'tacite',      label: 'Tacite reconduction' },
  { value: 'duree_ferme', label: 'Durée ferme' },
]
const PREAVIS_OPTIONS = ['aucun', '15 jours', '1 mois', '2 mois', '3 mois']
const DEVISES = ['FCFA', 'EUR', 'USD']

function ContratModal({ entiteId, onClose, onSuccess }: { entiteId: string; onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // Données externes
  const [clients, setClients] = useState<{ id: string; nom_entreprise: string }[]>([])
  const [projets, setProjets] = useState<{ id: string; titre: string }[]>([])
  const [contacts, setContacts] = useState<{ id: string; prenom: string; nom: string; poste?: string; est_contact_principal?: boolean }[]>([])
  const [membres, setMembres] = useState<{ id: string; prenom: string; nom: string; role: string }[]>([])

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    titre:                  '',
    type:                   'prestation' as ContratType,
    client_id:              '',
    projet_id:              '',
    montant:                '',
    devise:                 'FCFA',
    date_debut:             today,
    date_fin:               '',
    est_recurrent:          false,
    periodicite:            'mensuel',
    type_reconduction:      'tacite',
    preavis_rupture:        'aucun',
    signataire_client_id:   '',
    signataire_client_nom:  '',
    signataire_interne_id:  '',
    description:            '',
    notes:                  '',
  })

  // Charger clients + membres au montage
  useEffect(() => {
    if (!entiteId) return
    supabase.from('entreprises_clientes').select('id, nom_entreprise').eq('entite_id', entiteId).order('nom_entreprise')
      .then(({ data }) => setClients(data || []))
    supabase.from('users').select('id, prenom, nom, role')
      .in('role', ['super_admin', 'fondateur', 'manager', 'employe_interne'])
      .eq('statut', 'actif').order('prenom')
      .then(({ data }) => setMembres((data || []) as typeof membres))
  }, [entiteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Charger projets + contacts quand client change
  useEffect(() => {
    if (!form.client_id) { setProjets([]); setContacts([]); return }
    supabase.from('projets').select('id, titre').eq('client_id', form.client_id).order('titre')
      .then(({ data }) => setProjets(data || []))
    supabase.from('contacts_clients').select('id, prenom, nom, poste, est_contact_principal')
      .eq('entreprise_id', form.client_id).order('est_contact_principal', { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as typeof contacts
        setContacts(list)
        // Auto-sélection contact principal
        const principal = list.find(c => c.est_contact_principal)
        if (principal) {
          setForm(f => ({
            ...f,
            signataire_client_id:  principal.id,
            signataire_client_nom: `${principal.prenom} ${principal.nom}`.trim(),
          }))
        }
      })
  }, [form.client_id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (selected.length > 0) setFiles(prev => [...prev, ...selected])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre.trim()) { setError('Le titre est requis.'); return }
    if (!form.client_id)    { setError('Sélectionnez un client.'); return }
    setError('')
    setSaving(true)

    const { data: contratId, error: rpcError } = await supabase.rpc('creer_contrat', {
      p_entite_id:             entiteId,
      p_client_id:             form.client_id,
      p_projet_id:             form.projet_id || null,
      p_titre:                 form.titre,
      p_type:                  form.type,
      p_montant:               parseFloat(form.montant) || 0,
      p_devise:                form.devise,
      p_date_debut:            form.date_debut,
      p_date_fin:              form.date_fin || null,
      p_est_recurrent:         form.est_recurrent,
      p_periodicite:           form.est_recurrent ? form.periodicite : null,
      p_type_reconduction:     form.est_recurrent ? form.type_reconduction : null,
      p_preavis_rupture:       form.preavis_rupture,
      p_signataire_client_id:  form.signataire_client_id || null,
      p_signataire_client_nom: form.signataire_client_nom || null,
      p_signataire_interne_id: form.signataire_interne_id || null,
      p_description:           form.description || null,
      p_notes:                 form.notes || null,
    })

    if (rpcError || !contratId) {
      setError(rpcError?.message || 'Erreur lors de la création.')
      setSaving(false)
      return
    }

    // Upload pièces jointes
    if (files.length > 0) {
      const pieces: { name: string; path: string; size: number; type: string }[] = []
      for (const f of files) {
        const path = `${contratId}/${Date.now()}_${f.name}`
        const { storedPath, error: upErr } = await uploadToStorage(supabase, 'contrats', path, f)
        if (!upErr) pieces.push({ name: f.name, path: storedPath, size: f.size, type: f.type })
      }
      if (pieces.length > 0)
        await supabase.rpc('update_contrat_pieces_jointes', { p_contrat_id: contratId, p_pieces: pieces })
    }

    setSaving(false)
    onSuccess()
  }

  const fieldCls = 'input w-full appearance-none'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-2xl mx-4 flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-text-primary">Nouveau contrat</h3>
            <p className="text-2xs text-text-muted mt-0.5">Contrat client, prestation ou engagement récurrent</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/20 rounded-lg">
              <AlertTriangle size={13} className="text-red flex-shrink-0" />
              <p className="text-xs text-red">{error}</p>
            </div>
          )}

          {/* ── Bloc 1 : Identification ──────────────────────────────────── */}
          <FormSection title="Identification">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="label">Intitulé du contrat <span className="text-red">*</span></label>
                <input type="text" required autoFocus
                  className={`${fieldCls} ${!form.titre ? 'border-surface-border' : ''}`}
                  placeholder="Ex : Maintenance annuelle, Licence SaaS, Prestation de conseil…"
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Type de contrat</label>
                <div className="relative">
                  <select className={fieldCls} value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as ContratType })}>
                    <option value="prestation">Prestation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="abonnement">Abonnement</option>
                    <option value="licence">Licence / SaaS</option>
                    <option value="partenariat">Partenariat</option>
                    <option value="autre">Autre</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Client <span className="text-red">*</span></label>
                <div className="relative">
                  <select className={fieldCls} value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value, projet_id: '', signataire_client_id: '', signataire_client_nom: '' })}>
                    <option value="">Sélectionner un client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom_entreprise}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Projet associé — affiché uniquement si client sélectionné */}
              {form.client_id && (
                <div className="col-span-2 space-y-1.5">
                  <label className="label">Projet associé <span className="text-2xs text-text-muted font-normal">(optionnel)</span></label>
                  <div className="relative">
                    <select className={fieldCls} value={form.projet_id}
                      onChange={e => setForm({ ...form, projet_id: e.target.value })}>
                      <option value="">Aucun projet lié</option>
                      {projets.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Bloc 2 : Termes financiers ───────────────────────────────── */}
          <FormSection title="Termes financiers & Durée">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Valeur du contrat</label>
                <div className="flex gap-2">
                  <input type="number" min="0" className={`${fieldCls} flex-1`}
                    placeholder="0" value={form.montant}
                    onChange={e => setForm({ ...form, montant: e.target.value })} />
                  <div className="relative w-24">
                    <select className={fieldCls} value={form.devise}
                      onChange={e => setForm({ ...form, devise: e.target.value })}>
                      {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Préavis de rupture</label>
                <div className="relative">
                  <select className={fieldCls} value={form.preavis_rupture}
                    onChange={e => setForm({ ...form, preavis_rupture: e.target.value })}>
                    {PREAVIS_OPTIONS.map(p => <option key={p} value={p}>{p === 'aucun' ? 'Aucun' : p}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label flex items-center gap-1"><Calendar size={10} className="text-text-muted" /> Date de début</label>
                <input type="date" required className={fieldCls}
                  value={form.date_debut}
                  onChange={e => setForm({ ...form, date_debut: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="label flex items-center gap-1"><Calendar size={10} className="text-text-muted" /> Date de fin</label>
                <input type="date" className={fieldCls}
                  value={form.date_fin}
                  onChange={e => setForm({ ...form, date_fin: e.target.value })} />
              </div>
            </div>
          </FormSection>

          {/* ── Bloc 3 : Récurrence ─────────────────────────────────────── */}
          <FormSection title="Récurrence">
            {/* Toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div className={`w-9 h-5 rounded-full transition-all relative flex-shrink-0 ${form.est_recurrent ? 'bg-blue' : 'bg-surface-hover border border-surface-border'}`}
                onClick={() => setForm({ ...form, est_recurrent: !form.est_recurrent })}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.est_recurrent ? 'left-4.5' : 'left-0.5'}`} />
              </div>
              <div>
                <span className="text-xs font-medium text-text-primary">Contrat récurrent</span>
                <span className="text-2xs text-text-muted ml-2">Facturation périodique automatisée</span>
              </div>
            </label>

            {/* Champs récurrence — transition douce */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${form.est_recurrent ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="label">Fréquence de facturation</label>
                  <div className="relative">
                    <select className={fieldCls} value={form.periodicite}
                      onChange={e => setForm({ ...form, periodicite: e.target.value })}>
                      {PERIODICITES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="label">Type de reconduction</label>
                  <div className="relative">
                    <select className={fieldCls} value={form.type_reconduction}
                      onChange={e => setForm({ ...form, type_reconduction: e.target.value })}>
                      {RECONDUCTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* ── Bloc 4 : Signatures ─────────────────────────────────────── */}
          <FormSection title="Signataires">
            <div className="grid grid-cols-2 gap-4">
              {/* Signataire client */}
              <div className="space-y-1.5">
                <label className="label">Signataire côté client</label>
                {contacts.length > 0 ? (
                  <div className="relative">
                    <select className={fieldCls}
                      value={form.signataire_client_id}
                      onChange={e => {
                        const ct = contacts.find(c => c.id === e.target.value)
                        setForm({ ...form,
                          signataire_client_id:  e.target.value,
                          signataire_client_nom: ct ? `${ct.prenom} ${ct.nom}`.trim() : '',
                        })
                      }}>
                      <option value="">Aucun</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.prenom} {c.nom}{c.poste ? ` — ${c.poste}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                ) : (
                  <input type="text" className={fieldCls}
                    placeholder={form.client_id ? 'Aucun contact CRM enregistré' : 'Sélectionnez d\'abord un client'}
                    value={form.signataire_client_nom}
                    onChange={e => setForm({ ...form, signataire_client_nom: e.target.value })}
                    disabled={!form.client_id}
                  />
                )}
              </div>

              {/* Signataire interne */}
              <div className="space-y-1.5">
                <label className="label">Signataire interne</label>
                <div className="relative">
                  <select className={fieldCls}
                    value={form.signataire_interne_id}
                    onChange={e => setForm({ ...form, signataire_interne_id: e.target.value })}>
                    <option value="">Aucun</option>
                    {membres.map(m => (
                      <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </FormSection>

          {/* ── Bloc 5 : Description + Notes ─────────────────────────────── */}
          <FormSection title="Contexte">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">Description / Objet du contrat</label>
                <textarea className={`${fieldCls} resize-none`} rows={3}
                  placeholder="Objet principal du contrat, périmètre des prestations…"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Notes internes</label>
                <textarea className={`${fieldCls} resize-none`} rows={2}
                  placeholder="Conditions particulières, contexte de négociation…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </FormSection>

          {/* ── Pièces jointes ──────────────────────────────────────────── */}
          <FormSection title="Pièces jointes">
            <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-surface-border rounded-lg cursor-pointer hover:border-blue/40 hover:bg-blue/5 transition-all">
              <Paperclip size={13} className="text-text-muted flex-shrink-0" />
              <span className="text-xs text-text-muted">Cliquer pour joindre un fichier (PDF, Word, images…)</span>
              <input type="file" multiple className="hidden" onChange={handleFiles}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv" />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1 mt-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 bg-surface-hover rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={11} className="text-text-muted flex-shrink-0" />
                      <span className="text-xs text-text-primary truncate">{f.name}</span>
                      <span className="text-2xs text-text-muted flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                    </div>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-text-muted hover:text-red transition-colors ml-2">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>
        </form>

        {/* Footer sticky */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border flex-shrink-0">
          <p className="text-2xs text-text-disabled">Statut initial : <span className="text-text-muted">Brouillon</span></p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" loading={saving}
              disabled={!form.titre.trim() || !form.client_id}
              onClick={handleSubmit as any}>
              Créer le contrat
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FormSection helper ──────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-primary">{title}</span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>
      {children}
    </div>
  )
}
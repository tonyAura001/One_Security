// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import {
  ChevronRight, Plus, X, Save, Send, Zap,
  Search, ChevronDown, Calendar, Hash, Globe, Building2, Users,
} from 'lucide-react'

interface Ligne {
  designation: string
  description: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  remise_pct: number
}

const LIGNE_VIDE: Ligne = {
  designation: '', description: '',
  quantite: 1, prix_unitaire: 0,
  taux_tva: 18, remise_pct: 0,
}

const CONDITIONS_RAPIDES = [
  'À réception', 'Fin de mois', '15 jours net',
  '30 jours net', '45 jours net', '60 jours net',
]

const DEVISES = ['FCFA', 'EUR', 'USD'] as const
type Devise = typeof DEVISES[number]

type DocType = 'facture_client' | 'facture_fournisseur' | 'avoir_client' | 'avoir_fournisseur'

const DOC_TYPES: { value: DocType; label: string; description: string }[] = [
  { value: 'facture_client',      label: 'Facture client',       description: 'Vente / prestation à un client' },
  { value: 'facture_fournisseur', label: 'Facture fournisseur',  description: 'Achat ou dépense auprès d\'un fournisseur' },
  { value: 'avoir_client',        label: 'Avoir client',         description: 'Correction / remboursement sur une facture client' },
  { value: 'avoir_fournisseur',   label: 'Avoir fournisseur',    description: 'Correction sur une facture fournisseur reçue' },
]

const STATUTS_CLIENT = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoyee',   label: 'Envoyée' },
]
const STATUTS_FOURNISSEUR = [
  { value: 'recue',   label: 'Reçue' },
  { value: 'validee', label: 'Validée' },
]
const STATUTS_AVOIR = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoyee',   label: 'Émis' },
]

function NouvelleFactureContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fournisseurParam = searchParams.get('fournisseur')
  const { entiteActive } = useAppStore()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const defaultEcheance = (() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })()

  const [docType, setDocType] = useState<DocType>(fournisseurParam ? 'facture_fournisseur' : 'facture_client')
  const [form, setForm] = useState({
    client_id: '',
    fournisseur_id: fournisseurParam || '',
    facture_origine_id: '',
    conditions_paiement: '30 jours net',
    date_echeance: defaultEcheance,
    notes: '',
    devise: 'FCFA' as Devise,
  })
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }])
  const [clients, setClients] = useState<{ id: string; nom_entreprise: string }[]>([])
  const [fournisseurs, setFournisseurs] = useState<{ id: string; nom: string }[]>([])
  const [facturesOrigine, setFacturesOrigine] = useState<{ id: string; numero: string; montant_ttc: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Comboboxes
  const [clientSearch, setClientSearch] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [fournisseurSearch, setFournisseurSearch] = useState('')
  const [fournisseurOpen, setFournisseurOpen] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  const fournisseurRef = useRef<HTMLDivElement>(null)

  const isFournisseur = docType === 'facture_fournisseur' || docType === 'avoir_fournisseur'
  const isAvoir = docType === 'avoir_client' || docType === 'avoir_fournisseur'
  const statutsDisponibles = isAvoir ? STATUTS_AVOIR : isFournisseur ? STATUTS_FOURNISSEUR : STATUTS_CLIENT
  const defaultStatut = statutsDisponibles[0].value

  useEffect(() => {
    if (!entiteActive?.id) return
    supabase.from('entreprises_clientes')
      .select('id, nom_entreprise')
      .eq('entite_id', entiteActive.id)
      .order('nom_entreprise')
      .then(({ data }) => setClients(data || []))

    supabase.from('fournisseurs')
      .select('id, nom')
      .eq('entite_id', entiteActive.id)
      .eq('statut', 'actif')
      .order('nom')
      .then(({ data }) => {
        setFournisseurs(data || [])
        if (fournisseurParam) {
          const found = (data || []).find((f: any) => f.id === fournisseurParam)
          if (found) setFournisseurSearch(found.nom)
        }
      })
  }, [entiteActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les factures d'origine pour les avoirs
  useEffect(() => {
    if (!isAvoir || !entiteActive?.id) return
    const type = docType === 'avoir_client' ? 'facture_client' : 'facture_fournisseur'
    supabase.rpc('get_factures', {
      p_entite_id: entiteActive.id,
      p_type: type,
      p_limit: 200,
    }).then(({ data }) => {
      const rows = (data as any[]) || []
      setFacturesOrigine(rows.map((f: any) => ({ id: f.id, numero: f.numero, montant_ttc: f.montant_ttc })))
    })
  }, [isAvoir, docType, entiteActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture dropdowns au clic extérieur
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientOpen(false)
      if (fournisseurRef.current && !fournisseurRef.current.contains(e.target as Node)) setFournisseurOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedClient = clients.find(c => c.id === form.client_id)
  const selectedFournisseur = fournisseurs.find(f => f.id === form.fournisseur_id)
  const filteredClients = clientSearch
    ? clients.filter(c => c.nom_entreprise.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients
  const filteredFournisseurs = fournisseurSearch
    ? fournisseurs.filter(f => f.nom.toLowerCase().includes(fournisseurSearch.toLowerCase()))
    : fournisseurs

  function selectClient(id: string, name: string) {
    setForm(f => ({ ...f, client_id: id }))
    setClientSearch(name)
    setClientOpen(false)
  }
  function clearClient() {
    setForm(f => ({ ...f, client_id: '' }))
    setClientSearch('')
  }
  function selectFournisseur(id: string, name: string) {
    setForm(f => ({ ...f, fournisseur_id: id }))
    setFournisseurSearch(name)
    setFournisseurOpen(false)
  }
  function clearFournisseur() {
    setForm(f => ({ ...f, fournisseur_id: '' }))
    setFournisseurSearch('')
  }

  function updateLigne(i: number, field: keyof Ligne, value: string | number) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }
  function toggleTVA(i: number) {
    setLignes(prev => prev.map((l, idx) =>
      idx === i ? { ...l, taux_tva: l.taux_tva === 0 ? 18 : 0 } : l
    ))
  }

  const totaux = lignes.reduce((acc, l) => {
    const ht = l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
    const tva = ht * (l.taux_tva / 100)
    return { ht: acc.ht + ht, tva: acc.tva + tva, ttc: acc.ttc + ht + tva }
  }, { ht: 0, tva: 0, ttc: 0 })

  const toutesLignesExonerees = lignes.every(l => l.taux_tva === 0)
  function setTVAGlobale(exoneree: boolean) {
    setLignes(prev => prev.map(l => ({ ...l, taux_tva: exoneree ? 0 : 18 })))
  }

  async function submit(statutOverride?: string) {
    if (!entiteActive?.id) {
      setError('Sélectionnez une entité dans la barre en haut.')
      return
    }
    setError('')
    setSaving(true)

    const lignesValides = lignes.filter(l => l.designation.trim())
    const statut = statutOverride || defaultStatut

    const { data: factureId, error: rpcError } = await supabase.rpc('creer_facture', {
      p_entite_id:          entiteActive.id,
      p_client_id:          (!isFournisseur && form.client_id) ? form.client_id : null,
      p_fournisseur_id:     (isFournisseur && form.fournisseur_id) ? form.fournisseur_id : null,
      p_facture_origine_id: (isAvoir && form.facture_origine_id) ? form.facture_origine_id : null,
      p_type:               docType,
      p_statut:             statut,
      p_date_emission:      today,
      p_date_echeance:      form.date_echeance,
      p_montant_ht:         totaux.ht,
      p_montant_tva:        totaux.tva,
      p_montant_ttc:        totaux.ttc,
      p_devise:             form.devise,
      p_conditions:         form.conditions_paiement || null,
      p_notes:              form.notes || null,
      p_lignes: lignesValides.map((l, ordre) => {
        const ht = l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
        return {
          designation:   l.designation,
          description:   l.description || '',
          quantite:      l.quantite,
          prix_unitaire: l.prix_unitaire,
          taux_tva:      l.taux_tva,
          remise_pct:    l.remise_pct,
          montant_ht:    ht,
          montant_tva:   ht * (l.taux_tva / 100),
          montant_ttc:   ht * (1 + l.taux_tva / 100),
          ordre,
        }
      }),
    })

    if (rpcError || !factureId) {
      setError(rpcError?.message || 'Erreur lors de la création.')
      setSaving(false)
      return
    }
    setSaving(false)
    router.push(`/finance/factures/${factureId}`)
  }

  const canSubmit = !lignes.every(l => !l.designation.trim()) && form.date_echeance
    && (!isFournisseur || !!form.fournisseur_id)
  const docTypeCfg = DOC_TYPES.find(d => d.value === docType)!

  return (
    <div className="space-y-4 animate-fade-up max-w-[1400px] mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/finance/factures" className="hover:text-blue flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Factures
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">Nouveau document</span>
      </div>

      <h1 className="page-title">Nouveau document</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red/10 border border-red/20">
          <p className="text-xs text-red">{error}</p>
        </div>
      )}

      {/* ── Sélecteur de type de document ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {DOC_TYPES.map(dt => (
          <button
            key={dt.value}
            type="button"
            onClick={() => {
              setDocType(dt.value)
              setForm(f => ({ ...f, client_id: '', fournisseur_id: '', facture_origine_id: '' }))
              setClientSearch('')
              setFournisseurSearch('')
            }}
            className={`text-left p-3 rounded-xl border transition-all ${
              docType === dt.value
                ? 'bg-blue/10 border-blue/30 text-blue'
                : 'bg-surface border-surface-border text-text-muted hover:border-surface-border-hover hover:text-text-secondary'
            }`}>
            <p className={`text-xs font-semibold ${docType === dt.value ? 'text-blue' : 'text-text-primary'}`}>{dt.label}</p>
            <p className="text-2xs mt-0.5 leading-tight">{dt.description}</p>
          </button>
        ))}
      </div>

      {/* ─── Layout 2 colonnes ─────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">

        {/* ════ COLONNE GAUCHE ═══════════════════════════════════ */}
        <div className="space-y-4">

          {/* Tableau des prestations */}
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-text-primary">
                {isAvoir ? 'Lignes de l\'avoir' : 'Prestations / Articles'}
              </h3>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setTVAGlobale(!toutesLignesExonerees)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium border transition-all ${
                    toutesLignesExonerees
                      ? 'bg-surface-hover border-surface-border text-text-muted'
                      : 'bg-amber/10 text-amber border-amber/20'
                  }`}>
                  <span className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    toutesLignesExonerees ? 'border-surface-border' : 'border-amber bg-amber'
                  }`} />
                  {toutesLignesExonerees ? 'TVA : Exonéré' : 'TVA : 18%'}
                </button>
                <button type="button"
                  onClick={() => setLignes(prev => [
                    ...prev,
                    { ...LIGNE_VIDE, taux_tva: toutesLignesExonerees ? 0 : 18 },
                  ])}
                  className="text-blue text-xs flex items-center gap-1 hover:underline">
                  <Plus size={11} /> Ajouter une ligne
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-background/40 border-b border-surface-border text-2xs text-text-muted font-medium uppercase tracking-wider">
              <span className="col-span-5">Désignation</span>
              <span className="col-span-1 text-right">Qté</span>
              <span className="col-span-2 text-right">P.U. HT</span>
              <span className="col-span-1 text-center">TVA</span>
              <span className="col-span-1 text-right">Rem.%</span>
              <span className="col-span-2 text-right">Total TTC</span>
            </div>

            <div className="divide-y divide-surface-border">
              {lignes.map((l, i) => {
                const ht = l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
                const ttc = ht * (1 + l.taux_tva / 100)
                const isTvaOn = l.taux_tva > 0
                return (
                  <div key={i}
                    className="grid grid-cols-12 gap-2 items-start px-5 py-3 group hover:bg-background/40 transition-colors">
                    <div className="col-span-5 space-y-1">
                      <input
                        className="input py-1.5 text-xs w-full font-medium"
                        placeholder="Désignation *"
                        value={l.designation}
                        onChange={e => updateLigne(i, 'designation', e.target.value)}
                      />
                      <input
                        className="input py-1 text-2xs w-full text-text-muted"
                        placeholder="Description (optionnel)"
                        value={l.description}
                        onChange={e => updateLigne(i, 'description', e.target.value)}
                      />
                    </div>
                    <input
                      type="number" min="0" step="0.01"
                      className="input py-1.5 text-xs col-span-1 text-right tabular-nums"
                      value={l.quantite}
                      onChange={e => updateLigne(i, 'quantite', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="number" min="0"
                      className="input py-1.5 text-xs col-span-2 text-right tabular-nums"
                      placeholder="0"
                      value={l.prix_unitaire}
                      onChange={e => updateLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleTVA(i)}
                      className={`col-span-1 h-[34px] rounded-lg text-xs font-semibold border transition-all ${
                        isTvaOn
                          ? 'bg-amber/10 text-amber border-amber/20 hover:bg-amber/20'
                          : 'bg-surface border-surface-border text-text-muted hover:bg-surface-hover'
                      }`}>
                      {isTvaOn ? '18%' : 'Exo.'}
                    </button>
                    <input
                      type="number" min="0" max="100"
                      className="input py-1.5 text-xs col-span-1 text-right tabular-nums"
                      value={l.remise_pct}
                      onChange={e => updateLigne(i, 'remise_pct', parseFloat(e.target.value) || 0)}
                    />
                    <div className="col-span-2 flex items-start justify-end gap-2 pt-2">
                      <span className={`text-xs font-semibold tabular-nums transition-all ${ttc > 0 ? 'text-text-primary' : 'text-text-muted'}`}>
                        {formatMontant(ttc, form.devise)}
                      </span>
                      <button
                        type="button"
                        onClick={() => { if (lignes.length > 1) setLignes(prev => prev.filter((_, j) => j !== i)) }}
                        disabled={lignes.length === 1}
                        className="text-text-muted hover:text-red disabled:opacity-20 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-2.5">
            <label className="text-sm font-semibold text-text-primary">Notes & conditions particulières</label>
            <textarea
              className="input w-full resize-none"
              rows={4}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Informations complémentaires, mentions légales, modalités..."
            />
          </div>
        </div>

        {/* ════ COLONNE DROITE ═══════════════════════════════════ */}
        <div className="sticky top-6 space-y-3">

          {/* ── Tiers (Client OU Fournisseur) ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
            {!isFournisseur ? (
              <>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={10} /> Client
                </p>
                <div className="relative" ref={clientRef}>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      className={`input pl-8 pr-8 text-xs w-full ${form.client_id ? 'text-text-primary' : ''}`}
                      placeholder="Rechercher un client..."
                      value={clientSearch}
                      onFocus={() => setClientOpen(true)}
                      onChange={e => { setClientSearch(e.target.value); setClientOpen(true); if (!e.target.value) clearClient() }}
                    />
                    {form.client_id
                      ? <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"><X size={12} /></button>
                      : <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    }
                  </div>
                  {clientOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                      {filteredClients.length > 0 ? filteredClients.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => selectClient(c.id, c.nom_entreprise)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${c.id === form.client_id ? 'bg-blue/10 text-blue font-medium' : 'text-text-secondary hover:bg-surface-hover'}`}>
                          {c.nom_entreprise}
                        </button>
                      )) : (
                        <p className="text-xs text-text-muted text-center py-3">Aucun client trouvé</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedClient && (
                  <p className="text-2xs text-green font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />{selectedClient.nom_entreprise}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={10} /> Fournisseur
                </p>
                <div className="relative" ref={fournisseurRef}>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      className={`input pl-8 pr-8 text-xs w-full ${form.fournisseur_id ? 'text-text-primary' : ''}`}
                      placeholder="Rechercher un fournisseur..."
                      value={fournisseurSearch}
                      onFocus={() => setFournisseurOpen(true)}
                      onChange={e => { setFournisseurSearch(e.target.value); setFournisseurOpen(true); if (!e.target.value) clearFournisseur() }}
                    />
                    {form.fournisseur_id
                      ? <button type="button" onClick={clearFournisseur} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"><X size={12} /></button>
                      : <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    }
                  </div>
                  {fournisseurOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                      {filteredFournisseurs.length > 0 ? filteredFournisseurs.map(f => (
                        <button key={f.id} type="button" onMouseDown={() => selectFournisseur(f.id, f.nom)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${f.id === form.fournisseur_id ? 'bg-violet/10 text-violet font-medium' : 'text-text-secondary hover:bg-surface-hover'}`}>
                          {f.nom}
                        </button>
                      )) : (
                        <p className="text-xs text-text-muted text-center py-3">Aucun fournisseur trouvé</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedFournisseur && (
                  <p className="text-2xs text-violet font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet inline-block" />{selectedFournisseur.nom}
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Facture d'origine (avoirs) ── */}
          {isAvoir && (
            <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Facture d&apos;origine</p>
              {facturesOrigine.length === 0 ? (
                <p className="text-2xs text-text-disabled italic">
                  Aucune facture {docType === 'avoir_client' ? 'client' : 'fournisseur'} trouvée
                </p>
              ) : (
                <div className="relative">
                  <select
                    className="input text-xs w-full appearance-none pr-8"
                    value={form.facture_origine_id}
                    onChange={e => setForm(f => ({ ...f, facture_origine_id: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {facturesOrigine.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.numero} — {formatMontant(f.montant_ttc, form.devise)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* ── Informations facture ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Informations</p>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5">
                <Hash size={10} className="text-text-muted" /> Numéro
              </label>
              <input
                className="input text-xs w-full text-text-muted bg-background/60 cursor-default italic"
                value={`Auto-généré`}
                readOnly
              />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5">
                <Calendar size={10} className="text-text-muted" /> Date d&apos;émission
              </label>
              <input
                type="date"
                className="input text-xs w-full text-text-muted bg-background/60 cursor-default"
                value={today}
                readOnly
              />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5">
                <Calendar size={10} className="text-text-muted" /> Échéance *
              </label>
              <input
                type="date"
                className="input text-xs w-full"
                value={form.date_echeance}
                onChange={e => setForm({ ...form, date_echeance: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5">
                <Globe size={10} className="text-text-muted" /> Devise
              </label>
              <div className="flex gap-1.5">
                {DEVISES.map(d => (
                  <button
                    key={d} type="button"
                    onClick={() => setForm({ ...form, devise: d })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.devise === d
                        ? 'bg-blue/10 text-blue border-blue/30'
                        : 'border-surface-border text-text-muted hover:bg-surface-hover'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Conditions de paiement ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Conditions de paiement</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS_RAPIDES.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm({ ...form, conditions_paiement: c })}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-medium border transition-all ${
                    form.conditions_paiement === c
                      ? 'bg-blue/10 text-blue border-blue/30'
                      : 'border-surface-border text-text-muted hover:bg-surface-hover'
                  }`}>
                  {form.conditions_paiement === c && <Zap size={8} className="fill-current" />}
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Récapitulatif ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Récapitulatif</p>
            <div className="flex justify-between items-center text-xs gap-4">
              <span className="text-text-muted">Sous-total HT</span>
              <span className="text-text-secondary font-medium tabular-nums">{formatMontant(totaux.ht, form.devise)}</span>
            </div>
            {totaux.tva > 0 ? (
              <div className="flex justify-between items-center text-xs gap-4">
                <span className="text-text-muted">TVA (18%)</span>
                <span className="text-amber tabular-nums">{formatMontant(totaux.tva, form.devise)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs gap-4">
                <span className="text-text-muted">TVA</span>
                <span className="text-text-muted text-2xs italic">Exonéré</span>
              </div>
            )}
            <div className="h-px bg-surface-border my-1" />
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm font-bold text-text-primary">Total TTC</span>
              <span className={`text-xl font-bold tabular-nums transition-all ${isAvoir ? 'text-red' : 'text-blue'}`}>
                {isAvoir ? '-' : ''}{formatMontant(totaux.ttc, form.devise)}
              </span>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-2">
            {isFournisseur ? (
              <>
                <Button size="sm" className="w-full" icon={<Save size={13} />} loading={saving}
                  onClick={() => submit('validee')} disabled={!canSubmit}>
                  Valider la facture
                </Button>
                <Button variant="secondary" size="sm" className="w-full" icon={<Save size={13} />} loading={saving}
                  onClick={() => submit('recue')} disabled={!canSubmit}>
                  Enregistrer comme reçue
                </Button>
              </>
            ) : isAvoir ? (
              <Button size="sm" className="w-full" icon={<Send size={13} />} loading={saving}
                onClick={() => submit('envoyee')} disabled={!canSubmit}>
                Émettre l&apos;avoir
              </Button>
            ) : (
              <>
                <Button size="sm" className="w-full" icon={<Send size={13} />} loading={saving}
                  onClick={() => submit('envoyee')}
                  disabled={!form.client_id || !canSubmit}>
                  Créer et envoyer
                </Button>
                <Button variant="secondary" size="sm" className="w-full" icon={<Save size={13} />} loading={saving}
                  onClick={() => submit('brouillon')}>
                  Enregistrer en brouillon
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NouvelleFacturePage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-fade-up"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-96 rounded-xl" /></div>}>
      <NouvelleFactureContent />
    </Suspense>
  )
}
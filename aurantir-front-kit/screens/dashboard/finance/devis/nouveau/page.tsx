// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import {
  ChevronRight, Plus, X, Save, Send, Zap,
  Search, ChevronDown, Calendar, Hash, Globe,
  Phone, MapPin, Mail, Building2, ExternalLink,
  ArrowRight, FileCheck, UserCircle, Star, Briefcase,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ligne {
  designation: string
  description: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  remise_pct: number
}

interface ClientInfo {
  id: string
  nom_entreprise: string
  telephone?: string
  adresse?: string
  email_principal?: string
}

interface ContactNego {
  id: string
  prenom: string
  nom: string
  poste?: string
  email?: string
  telephone?: string
  est_principal: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIGNE_VIDE: Ligne = {
  designation: '', description: '',
  quantite: 1, prix_unitaire: 0,
  taux_tva: 18, remise_pct: 0,
}

const MODALITES = [
  'À réception',
  '40% acompte / 60% livraison',
  '50% / 50%',
  '30 jours net',
  'Sur commande',
  'Sur devis signé',
]

const DEVISES = ['FCFA', 'EUR', 'USD'] as const
type Devise = typeof DEVISES[number]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NouveauDevisPage() {
  const router = useRouter()
  const { entites, entiteActive } = useAppStore()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const defaultValidite = (() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })()

  // ── State formulaire ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    entite_id:           entiteActive?.id || '',
    client_id:           '',
    titre:               '',
    conditions_paiement: 'À réception',
    date_validite:       defaultValidite,
    notes:               '',
    devise:              'FCFA' as Devise,
    // Snapshot contact entreprise (migration 031)
    contact_email:       '',
    contact_telephone:   '',
    contact_adresse:     '',
    // Contact de négociation (migration 032)
    contact_nego_id:     '',
    contact_nom:         '',
    contact_poste:       '',
  })

  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }])
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [contacts, setContacts] = useState<ContactNego[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactNego | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Combobox client ───────────────────────────────────────────────────────
  const [clientSearch, setClientSearch]   = useState('')
  const [clientOpen, setClientOpen]       = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null)
  const comboRef = useRef<HTMLDivElement>(null)

  // ── Sync entite_id quand le store charge ──────────────────────────────────
  useEffect(() => {
    if (entiteActive?.id && !form.entite_id)
      setForm(f => ({ ...f, entite_id: entiteActive.id }))
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Charger clients quand entité change ───────────────────────────────────
  useEffect(() => {
    if (!form.entite_id) return
    supabase.from('entreprises_clientes')
      .select('id, nom_entreprise, telephone, adresse, email_principal')
      .eq('entite_id', form.entite_id)
      .order('nom_entreprise')
      .then(({ data }) => setClients((data || []) as ClientInfo[]))
    setForm(f => ({ ...f, client_id: '', contact_email: '', contact_telephone: '', contact_adresse: '', contact_nego_id: '', contact_nom: '', contact_poste: '' }))
    setSelectedClient(null)
    setSelectedContact(null)
    setContacts([])
    setClientSearch('')
  }, [form.entite_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fermer dropdown au clic extérieur ─────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node))
        setClientOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Filtrage dropdown ─────────────────────────────────────────────────────
  const filteredClients = clientSearch
    ? clients.filter(c => c.nom_entreprise.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  function handleSelectClient(c: ClientInfo) {
    setSelectedClient(c)
    setSelectedContact(null)
    setClientSearch(c.nom_entreprise)
    setClientOpen(false)
    setForm(f => ({
      ...f,
      client_id:         c.id,
      contact_email:     c.email_principal || '',
      contact_telephone: c.telephone       || '',
      contact_adresse:   c.adresse         || '',
      contact_nego_id:   '',
      contact_nom:       '',
      contact_poste:     '',
    }))
    // Charger les contacts de la société
    supabase.from('contacts_clients')
      .select('id, prenom, nom, poste, email, telephone, est_principal')
      .eq('client_id', c.id)
      .order('est_principal', { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as ContactNego[]
        setContacts(list)
        // Auto-sélectionner le contact principal s'il existe
        const principal = list.find(ct => ct.est_principal)
        if (principal) handleSelectContact(principal)
      })
  }

  function handleSelectContact(ct: ContactNego) {
    setSelectedContact(ct)
    setForm(f => ({
      ...f,
      contact_nego_id:   ct.id,
      contact_nom:       `${ct.prenom} ${ct.nom}`.trim(),
      contact_poste:     ct.poste    || '',
      contact_email:     ct.email    || f.contact_email,
      contact_telephone: ct.telephone || f.contact_telephone,
    }))
  }

  function handleClearClient() {
    setSelectedClient(null)
    setSelectedContact(null)
    setContacts([])
    setClientSearch('')
    setForm(f => ({ ...f, client_id: '', contact_email: '', contact_telephone: '', contact_adresse: '', contact_nego_id: '', contact_nom: '', contact_poste: '' }))
  }

  // ── Lignes ────────────────────────────────────────────────────────────────
  function updateLigne(i: number, field: keyof Ligne, value: string | number) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function toggleTVALigne(i: number) {
    setLignes(prev => prev.map((l, idx) =>
      idx === i ? { ...l, taux_tva: l.taux_tva === 0 ? 18 : 0 } : l
    ))
  }

  const toutesLignesExonerees = lignes.every(l => l.taux_tva === 0)

  function setTVAGlobale(exoneree: boolean) {
    setLignes(prev => prev.map(l => ({ ...l, taux_tva: exoneree ? 0 : 18 })))
  }

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totaux = lignes.reduce((acc, l) => {
    const ht  = l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
    const tva = ht * (l.taux_tva / 100)
    return { ht: acc.ht + ht, tva: acc.tva + tva, ttc: acc.ttc + ht + tva }
  }, { ht: 0, tva: 0, ttc: 0 })

  // ── Soumission ────────────────────────────────────────────────────────────
  async function submit(statut: 'brouillon' | 'envoye') {
    if (!form.entite_id) { setError('Sélectionnez une entité avant de créer un devis.'); return }
    setError('')
    setSaving(true)

    const lignesValides = lignes.filter(l => l.designation.trim())

    const { data: devisId, error: rpcError } = await supabase.rpc('creer_devis', {
      p_entite_id:           form.entite_id,
      p_client_id:           form.client_id || null,
      p_titre:               form.titre || '',
      p_statut:              statut,
      p_date_emission:       today,
      p_date_validite:       form.date_validite || null,
      p_montant_ht:          totaux.ht,
      p_montant_tva:         totaux.tva,
      p_montant_ttc:         totaux.ttc,
      p_devise:              form.devise,
      p_conditions_paiement: form.conditions_paiement || '',
      p_notes:               form.notes || '',
      p_contact_email:       form.contact_email || null,
      p_contact_telephone:   form.contact_telephone || null,
      p_contact_adresse:     form.contact_adresse || null,
      p_contact_id:          form.contact_nego_id || null,
      p_contact_nom:         form.contact_nom || null,
      p_contact_poste:       form.contact_poste || null,
      p_lignes:              lignesValides.map((l, ordre) => ({
        designation:  l.designation,
        description:  l.description || '',
        quantite:     l.quantite,
        prix_unitaire: l.prix_unitaire,
        taux_tva:     l.taux_tva,
        remise_pct:   l.remise_pct,
        ordre,
      })),
    })

    if (rpcError || !devisId) {
      setError(rpcError?.message || 'Erreur lors de la création du devis.')
      setSaving(false)
      return
    }

    setSaving(false)
    router.push(`/finance/devis/${devisId}`)
  }

  // ─── Grid colonnes du tableau (TVA masquée si exonéré global) ──────────────
  const tableGrid = toutesLignesExonerees
    ? 'grid-cols-[minmax(0,2fr)_52px_90px_52px_72px_20px]'
    : 'grid-cols-[minmax(0,2fr)_52px_90px_44px_52px_72px_20px]'

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-up max-w-[1400px] mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/finance/devis" className="hover:text-blue flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Devis
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">Nouveau devis</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Nouveau devis</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Après création, convertissez-le en facture en un clic depuis la fiche du devis.
          </p>
        </div>
        {/* Pipeline hint */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet/5 border border-violet/15 text-2xs text-violet font-medium">
          <FileCheck size={11} />
          <span>Devis</span>
          <ArrowRight size={9} />
          <span>Facture en 1 clic</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red/10 border border-red/20">
          <p className="text-xs text-red">{error}</p>
        </div>
      )}

      {/* ─── Layout asymétrique lg:col-3 ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ════ COLONNE PRINCIPALE (2/3) ════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Titre */}
          <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-text-primary">Titre du devis</label>
            <input
              type="text"
              className="input w-full text-sm"
              placeholder="Ex : Refonte site web, Campagne digitale Q3, Développement API…"
              value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })}
            />
          </div>

          {/* ── Tableau prestations ── */}
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">

            {/* Header carte */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-text-primary">Prestations / Articles</h3>
              <div className="flex items-center gap-3">

                {/* Toggle TVA global */}
                <button
                  type="button"
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

                <button
                  type="button"
                  onClick={() => setLignes(prev => [
                    ...prev,
                    { ...LIGNE_VIDE, taux_tva: toutesLignesExonerees ? 0 : 18 },
                  ])}
                  className="text-blue text-xs flex items-center gap-1 hover:underline">
                  <Plus size={11} /> Ajouter une ligne
                </button>
              </div>
            </div>

            {/* En-têtes tableau — colonnes adaptées selon TVA */}
            <div className={`grid ${tableGrid} gap-2 px-5 py-2.5 bg-background/40 border-b border-surface-border text-2xs text-text-muted font-medium uppercase tracking-wider`}>
              <span>Désignation</span>
              <span className="text-right">Qté</span>
              <span className="text-right">P.U. HT</span>
              {!toutesLignesExonerees && <span className="text-center">TVA</span>}
              <span className="text-right">Rem.%</span>
              <span className="text-right">Total HT</span>
              <span />
            </div>

            {/* Lignes */}
            <div className="divide-y divide-surface-border">
              {lignes.map((l, i) => {
                const ht     = l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
                const isTvaOn = l.taux_tva > 0
                return (
                  <div
                    key={i}
                    className={`grid ${tableGrid} gap-2 items-start px-5 py-3 group hover:bg-background/40 transition-colors`}>

                    {/* Désignation + description */}
                    <div className="space-y-1 min-w-0">
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

                    {/* Quantité */}
                    <input
                      type="number" min="0" step="0.01"
                      className="input py-1.5 text-xs text-right tabular-nums w-full"
                      value={l.quantite}
                      onChange={e => updateLigne(i, 'quantite', parseFloat(e.target.value) || 0)}
                    />

                    {/* Prix unitaire */}
                    <input
                      type="number" min="0"
                      className="input py-1.5 text-xs text-right tabular-nums w-full"
                      placeholder="0"
                      value={l.prix_unitaire}
                      onChange={e => updateLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                    />

                    {/* TVA toggle — masqué si exonéré global */}
                    {!toutesLignesExonerees && (
                      <button
                        type="button"
                        onClick={() => toggleTVALigne(i)}
                        className={`h-[34px] w-full rounded-lg text-xs font-semibold border transition-all ${
                          isTvaOn
                            ? 'bg-amber/10 text-amber border-amber/20 hover:bg-amber/20'
                            : 'bg-surface border-surface-border text-text-muted hover:bg-surface-hover'
                        }`}>
                        {isTvaOn ? '18%' : 'Exo.'}
                      </button>
                    )}

                    {/* Remise */}
                    <input
                      type="number" min="0" max="100"
                      className="input py-1.5 text-xs text-right tabular-nums w-full"
                      value={l.remise_pct}
                      onChange={e => updateLigne(i, 'remise_pct', parseFloat(e.target.value) || 0)}
                    />

                    {/* Total HT */}
                    <span className={`text-xs font-semibold tabular-nums text-right pt-2 block ${
                      ht > 0 ? 'text-text-primary' : 'text-text-muted'
                    }`}>
                      {formatMontant(ht, form.devise)}
                    </span>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => { if (lignes.length > 1) setLignes(prev => prev.filter((_, j) => j !== i)) }}
                      disabled={lignes.length === 1}
                      className="flex items-start justify-center pt-2 text-text-muted hover:text-red disabled:opacity-20 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-2.5">
            <label className="text-sm font-semibold text-text-primary">
              Notes, conditions de livraison &amp; détails techniques
            </label>
            <textarea
              className="input w-full resize-none leading-relaxed"
              rows={5}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Périmètre de la prestation, délais, CGV, exclusions, prérequis techniques, remarques…"
            />
          </div>
        </div>

        {/* ════ COLONNE LATÉRALE (1/3) ══════════════════════════════════════ */}
        <div className="lg:col-span-1 sticky top-6 space-y-3">

          {/* ── Entité (si plusieurs) ── */}
          {entites.length > 1 && (
            <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={10} /> Entité émettrice
              </p>
              <div className="flex gap-1.5">
                {entites.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, entite_id: e.id }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all truncate ${
                      form.entite_id === e.id
                        ? 'bg-violet/10 text-violet border-violet/30'
                        : 'border-surface-border text-text-muted hover:bg-surface-hover'
                    }`}>
                    {e.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Client ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Client</p>
              {selectedClient && (
                <Link
                  href={`/crm/clients/${selectedClient.id}`}
                  target="_blank"
                  className="flex items-center gap-1 text-2xs text-blue hover:underline">
                  Voir fiche <ExternalLink size={9} />
                </Link>
              )}
            </div>

            {/* Combobox */}
            <div className="relative" ref={comboRef}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  className="input pl-8 pr-8 text-xs w-full"
                  placeholder="Rechercher un client…"
                  value={clientSearch}
                  onFocus={() => setClientOpen(true)}
                  onChange={e => {
                    setClientSearch(e.target.value)
                    setClientOpen(true)
                    if (!e.target.value) handleClearClient()
                  }}
                />
                {form.client_id ? (
                  <button
                    type="button"
                    onClick={handleClearClient}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                    <X size={12} />
                  </button>
                ) : (
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                )}
              </div>

              {clientOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => handleSelectClient(c)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          c.id === form.client_id
                            ? 'bg-blue/10 text-blue font-medium'
                            : 'text-text-secondary hover:bg-surface-hover'
                        }`}>
                        {c.nom_entreprise}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted text-center py-3 italic">
                      {clientSearch ? 'Aucun résultat' : 'Aucun client dans cette entité'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Adresse facturation ── */}
            <div className="pt-0.5">
              <div className="relative">
                <MapPin size={11} className="absolute left-3 top-3 text-text-disabled pointer-events-none" />
                <textarea
                  className="input pl-8 text-xs w-full resize-none"
                  placeholder="Adresse de facturation"
                  rows={2}
                  value={form.contact_adresse}
                  onChange={e => setForm({ ...form, contact_adresse: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── Contact de négociation ── */}
          {form.client_id && (
            <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <UserCircle size={10} /> Contact de négociation
                </p>
                {contacts.length === 0 && form.client_id && (
                  <Link
                    href={`/crm/clients/${form.client_id}`}
                    target="_blank"
                    className="text-2xs text-blue hover:underline flex items-center gap-1">
                    Ajouter <ExternalLink size={8} />
                  </Link>
                )}
              </div>

              {contacts.length > 0 ? (
                <>
                  {/* Liste des contacts à sélectionner */}
                  <div className="space-y-1.5">
                    {contacts.map(ct => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => handleSelectContact(ct)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                          selectedContact?.id === ct.id
                            ? 'bg-blue/10 border-blue/30'
                            : 'border-surface-border hover:bg-surface-hover'
                        }`}>
                        {/* Avatar initiales */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0 ${
                          selectedContact?.id === ct.id ? 'bg-blue/20 text-blue' : 'bg-surface-hover text-text-muted'
                        }`}>
                          {ct.prenom[0]}{ct.nom?.[0] || ''}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${selectedContact?.id === ct.id ? 'text-blue' : 'text-text-primary'}`}>
                            {ct.prenom} {ct.nom}
                          </p>
                          {ct.poste && <p className="text-2xs text-text-muted truncate">{ct.poste}</p>}
                        </div>
                        {ct.est_principal && (
                          <Star size={9} className="text-amber fill-amber flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Détails du contact sélectionné — éditables */}
                  {selectedContact && (
                    <div className="space-y-2 pt-1 border-t border-surface-border">
                      <div className="relative">
                        <Briefcase size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                        <input
                          type="text"
                          className="input pl-8 text-xs w-full"
                          placeholder="Poste / Fonction"
                          value={form.contact_poste}
                          onChange={e => setForm({ ...form, contact_poste: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Mail size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                        <input
                          type="email"
                          className="input pl-8 text-xs w-full"
                          placeholder="Email"
                          value={form.contact_email}
                          onChange={e => setForm({ ...form, contact_email: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                        <input
                          type="tel"
                          className="input pl-8 text-xs w-full"
                          placeholder="Téléphone"
                          value={form.contact_telephone}
                          onChange={e => setForm({ ...form, contact_telephone: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {/* Saisie manuelle si aucun contact CRM */}
                  <p className="text-2xs text-text-muted italic">Aucun contact enregistré pour ce client.</p>
                  <div className="relative">
                    <UserCircle size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                    <input
                      type="text"
                      className="input pl-8 text-xs w-full"
                      placeholder="Nom & prénom du contact"
                      value={form.contact_nom}
                      onChange={e => setForm({ ...form, contact_nom: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Briefcase size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                    <input
                      type="text"
                      className="input pl-8 text-xs w-full"
                      placeholder="Poste / Fonction"
                      value={form.contact_poste}
                      onChange={e => setForm({ ...form, contact_poste: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Mail size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                    <input
                      type="email"
                      className="input pl-8 text-xs w-full"
                      placeholder="Email"
                      value={form.contact_email}
                      onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
                    <input
                      type="tel"
                      className="input pl-8 text-xs w-full"
                      placeholder="Téléphone"
                      value={form.contact_telephone}
                      onChange={e => setForm({ ...form, contact_telephone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Informations devis ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Informations</p>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5"><Hash size={10} className="text-text-muted" /> Numéro</label>
              <input className="input text-xs w-full text-text-muted bg-background/60 cursor-default" value="Généré automatiquement" readOnly />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5"><Calendar size={10} className="text-text-muted" /> Date d&apos;émission</label>
              <input type="date" className="input text-xs w-full text-text-muted bg-background/60 cursor-default" value={today} readOnly />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5"><Calendar size={10} className="text-text-muted" /> Valable jusqu&apos;au *</label>
              <input
                type="date"
                className="input text-xs w-full"
                value={form.date_validite}
                onChange={e => setForm({ ...form, date_validite: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="label flex items-center gap-1.5"><Globe size={10} className="text-text-muted" /> Devise</label>
              <div className="flex gap-1.5">
                {DEVISES.map(d => (
                  <button
                    key={d}
                    type="button"
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

          {/* ── Modalités de paiement ── */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Modalités de paiement</p>
            <div className="flex flex-wrap gap-1.5">
              {MODALITES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, conditions_paiement: m })}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-medium border transition-all ${
                    form.conditions_paiement === m
                      ? 'bg-blue/10 text-blue border-blue/30'
                      : 'border-surface-border text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                  }`}>
                  {form.conditions_paiement === m && <Zap size={8} className="fill-current" />}
                  {m}
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

            {toutesLignesExonerees ? (
              <div className="flex justify-between items-center text-xs gap-4">
                <span className="text-text-muted">TVA</span>
                <span className="text-text-muted text-2xs italic">Exonéré</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs gap-4">
                <span className="text-text-muted">TVA (18%)</span>
                <span className="text-amber tabular-nums">{formatMontant(totaux.tva, form.devise)}</span>
              </div>
            )}

            <div className="h-px bg-surface-border my-0.5" />

            <div className="flex justify-between items-center gap-4">
              <span className="text-sm font-bold text-text-primary">Total TTC</span>
              <span className="text-xl font-bold text-blue tabular-nums transition-all">
                {formatMontant(totaux.ttc, form.devise)}
              </span>
            </div>
          </div>

          {/* ── Actions CTA ── */}
          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full"
              icon={<Send size={13} />}
              loading={saving}
              onClick={() => submit('envoye')}
              disabled={!form.entite_id || !form.date_validite || lignes.every(l => !l.designation.trim())}>
              Créer et envoyer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              icon={<Save size={13} />}
              loading={saving}
              onClick={() => submit('brouillon')}>
              Enregistrer en brouillon
            </Button>
          </div>

          {/* Pipeline hint bas */}
          <p className="text-center text-2xs text-text-disabled leading-relaxed px-2">
            Une fois créé, ouvrez la fiche du devis pour l&apos;envoyer au client ou le
            <span className="text-violet"> convertir en facture</span>.
          </p>
        </div>

      </div>
    </div>
  )
}
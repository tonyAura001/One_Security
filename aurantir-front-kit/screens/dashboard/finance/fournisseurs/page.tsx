// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { StatutFactureBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { formatDate, formatMontant, initiales } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadDocument, resolveStoragePath } from '@/aurantir-front-kit/lib/storage'
import {
  Plus, Search, Building2, Star, Phone, Mail, Globe,
  MapPin, Edit3, X, Check, Archive, ArchiveRestore, MoreHorizontal,
  CreditCard, Landmark, RefreshCw, AlertTriangle,
  ChevronDown, ExternalLink, Shield, Tag,
  Paperclip, Upload, FileText, Trash2, Receipt,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Fournisseur {
  id: string
  entite_id: string
  nom: string
  type: string
  domaine?: string
  email?: string
  telephone?: string
  site_web?: string
  adresse?: string
  pays: string
  ninea?: string
  devise: string
  conditions_paiement?: string
  mode_paiement?: string
  coordonnees_bancaires?: string
  note_evaluation?: number
  note_interne?: string
  statut: 'actif' | 'inactif' | 'blackliste' | 'archive' | 'en_evaluation'
  created_at: string
  documents?: { url: string; nom: string; uploaded_at: string }[]
}

// ─── Constantes ────────────────────────────────────────────────────────────

const TYPES: { value: string; label: string }[] = [
  { value: 'prestataire_service', label: 'Prestataire de service' },
  { value: 'agence',              label: 'Agence' },
  { value: 'fournisseur_tech',    label: 'Logiciel / SaaS' },
  { value: 'fournisseur_matiere', label: 'Matériel / Équipement' },
  { value: 'freelance',           label: 'Freelance' },
  { value: 'sous_traitant',       label: 'Sous-traitant' },
  { value: 'autre',               label: 'Autre' },
]

const DEVISES = ['FCFA', 'EUR', 'USD', 'GBP', 'CHF', 'MAD', 'XOF']

const CONDITIONS_PAIEMENT = [
  'À réception',
  '30 jours net',
  '30 jours fin de mois',
  '45 jours',
  '60 jours',
  '50% à la commande',
  '40% / 60% livraison',
]

const MODES_PAIEMENT = [
  'Virement bancaire',
  'Wave / Orange Money',
  'Carte bancaire',
  'Chèque',
  'Espèces',
]

const PAYS_LISTE = ['Sénégal', 'France', 'Maroc', 'Côte d\'Ivoire', 'Mali', 'Guinée', 'Cameroun', 'Belgique', 'Suisse', 'USA', 'Autre']

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  actif:          { label: 'Actif',          cls: 'bg-green/10 text-green border-green/20' },
  inactif:        { label: 'Inactif',        cls: 'bg-surface text-text-muted border-surface-border' },
  blackliste:     { label: 'Blacklisté',     cls: 'bg-red/10 text-red border-red/20' },
  archive:        { label: 'Archivé',        cls: 'bg-surface text-text-disabled border-surface-border' },
  en_evaluation:  { label: 'Évaluation',     cls: 'bg-amber/10 text-amber border-amber/20' },
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPES.map(t => [t.value, t.label]))

function getNINEALabel(pays: string) {
  if (pays === 'France' || pays === 'Belgique') return 'SIRET / SIREN'
  if (pays === 'Maroc') return 'Numéro ICE'
  if (['Suisse'].includes(pays)) return 'Numéro TVA'
  if (pays === 'USA') return 'EIN / TIN'
  return 'NINEA / N° RC'
}

// ─── StarRating ─────────────────────────────────────────────────────────────

function StarRating({ note, size = 12 }: { note?: number; size?: number }) {
  if (!note) return <span className="text-text-muted text-2xs italic">Non évalué</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < note ? 'text-amber fill-amber' : 'text-surface-border'} />
      ))}
      <span className="text-2xs text-text-muted ml-1">{note}/5</span>
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1
        const active = v <= (hovered || value)
        return (
          <button
            key={v} type="button"
            onMouseEnter={() => setHovered(v)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(value === v ? 0 : v)}
            className="transition-transform hover:scale-110">
            <Star size={18} className={active ? 'text-amber fill-amber' : 'text-surface-border hover:text-amber/50'} />
          </button>
        )
      })}
      {value > 0 && (
        <button type="button" onClick={() => onChange(0)} className="ml-1 text-2xs text-text-disabled hover:text-text-muted">Effacer</button>
      )}
    </div>
  )
}

// ─── FournisseurCard ─────────────────────────────────────────────────────────

function FournisseurCard({ f, onClick }: { f: Fournisseur; onClick: () => void }) {
  const cfg = STATUT_CFG[f.statut] || STATUT_CFG.actif
  if (f.statut === 'archive') return null
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-surface-border rounded-xl p-4 space-y-3 hover:border-blue/40 hover:shadow-lg hover:shadow-black/20 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue/20 to-violet/10 flex items-center justify-center text-sm font-bold text-blue flex-shrink-0">
            {initiales(f.nom.split(' ')[0], f.nom.split(' ')[1] || '')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{f.nom}</p>
            <p className="text-2xs text-text-muted">{TYPE_LABELS[f.type] || f.type}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
      </div>

      <div className="space-y-1.5">
        {f.email && (
          <div className="flex items-center gap-1.5 text-2xs text-text-muted">
            <Mail size={10} className="flex-shrink-0" /><span className="truncate">{f.email}</span>
          </div>
        )}
        {f.telephone && (
          <div className="flex items-center gap-1.5 text-2xs text-text-muted">
            <Phone size={10} className="flex-shrink-0" /><span>{f.telephone}</span>
          </div>
        )}
        {(f.adresse || f.pays) && (
          <div className="flex items-center gap-1.5 text-2xs text-text-muted">
            <MapPin size={10} className="flex-shrink-0" /><span className="truncate">{f.adresse ? `${f.adresse}, ` : ''}{f.pays}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-surface-border/50">
        <StarRating note={f.note_evaluation} size={10} />
        <div className="flex items-center gap-2">
          {f.devise && f.devise !== 'FCFA' && (
            <span className="text-2xs text-text-disabled border border-surface-border rounded px-1 py-0.5">{f.devise}</span>
          )}
          <span className="text-2xs text-blue opacity-0 group-hover:opacity-100 transition-opacity">Voir →</span>
        </div>
      </div>
    </button>
  )
}

// ─── FournisseurModal ─────────────────────────────────────────────────────────

interface FournisseurModalProps {
  entiteId: string
  providerData?: Fournisseur | null
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_FORM = {
  nom: '', type: 'prestataire_service', devise: 'FCFA', pays: 'Sénégal',
  email: '', telephone: '', site_web: '', adresse: '', ninea: '',
  conditions_paiement: 'À réception', mode_paiement: 'Virement bancaire',
  coordonnees_bancaires: '', note_evaluation: 0, note_interne: '',
}

function FournisseurModal({ entiteId, providerData, onClose, onSuccess }: FournisseurModalProps) {
  const supabase = createClient()
  const isEdit = !!providerData
  const [mode, setMode] = useState<'view' | 'form'>(isEdit ? 'view' : 'form')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [unarchiving, setUnarchiving] = useState(false)
  const [error, setError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [docs, setDocs] = useState<{ url: string; nom: string; uploaded_at: string }[]>(
    (providerData?.documents as { url: string; nom: string; uploaded_at: string }[]) || []
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [factures, setFactures] = useState<{ id: string; numero: string; statut: string; montant_ttc: number; devise: string; date_emission: string }[]>([])

  useEffect(() => {
    if (!providerData?.id) return
    supabase.rpc('get_factures', {
      p_fournisseur_id: providerData.id,
      p_limit: 50,
    }).then(({ data }) => setFactures((data as any[]) || []))
  }, [providerData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState(() => ({
    nom:                   providerData?.nom                   || '',
    type:                  providerData?.type                  || 'prestataire_service',
    devise:                providerData?.devise                || 'FCFA',
    pays:                  providerData?.pays                  || 'Sénégal',
    email:                 providerData?.email                 || '',
    telephone:             providerData?.telephone             || '',
    site_web:              providerData?.site_web              || '',
    adresse:               providerData?.adresse               || '',
    ninea:                 providerData?.ninea                 || '',
    conditions_paiement:   providerData?.conditions_paiement   || 'À réception',
    mode_paiement:         providerData?.mode_paiement         || 'Virement bancaire',
    coordonnees_bancaires: providerData?.coordonnees_bancaires || '',
    note_evaluation:       providerData?.note_evaluation       || 0,
    note_interne:          providerData?.note_interne          || '',
  }))

  const isIndep = ['freelance', 'sous_traitant'].includes(form.type)
  const nomPlaceholder = isIndep ? 'Nom de l\'indépendant ou de la structure' : 'Nom du fournisseur'
  const ninealabel = getNINEALabel(form.pays)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !providerData) return
    setUploading(true)
    setUploadError('')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `fournisseurs/${providerData.id}/${Date.now()}_${safeName}`
    const { storedPath, error: upErr } = await uploadToStorage(supabase, 'documents', path, file)
    if (upErr) { setUploadError(upErr.message); setUploading(false); e.target.value = ''; return }
    const newDoc = { url: storedPath, nom: file.name, uploaded_at: new Date().toISOString() }
    const newDocs = [...docs, newDoc]
    const { error: rpcErr } = await supabase.rpc('update_fournisseur_documents', { p_id: providerData.id, p_documents: newDocs })
    if (rpcErr) { setUploadError(rpcErr.message); setUploading(false); e.target.value = ''; return }
    setDocs(newDocs)
    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteDoc(idx: number) {
    if (!providerData) return
    const doc = docs[idx]
    const urlPart = resolveStoragePath('documents', doc.url)
    if (urlPart) await supabase.storage.from('documents').remove([urlPart])
    const newDocs = docs.filter((_, i) => i !== idx)
    await supabase.rpc('update_fournisseur_documents', { p_id: providerData.id, p_documents: newDocs })
    setDocs(newDocs)
  }

  function showError(msg: string) {
    setError(msg)
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (saving) return
    if (!form.nom.trim()) { showError('Le nom est requis.'); return }
    setError('')
    setSaving(true)

    try {
      if (isEdit && providerData) {
        const { error: rpcError } = await supabase.rpc('update_fournisseur', {
          p_id:                    providerData.id,
          p_nom:                   form.nom,
          p_type:                  form.type,
          p_devise:                form.devise,
          p_pays:                  form.pays,
          p_email:                 form.email,
          p_telephone:             form.telephone,
          p_site_web:              form.site_web,
          p_adresse:               form.adresse,
          p_ninea:                 form.ninea,
          p_conditions_paiement:   form.conditions_paiement,
          p_mode_paiement:         form.mode_paiement,
          p_coordonnees_bancaires: form.coordonnees_bancaires,
          p_note_evaluation:       form.note_evaluation || null,
          p_note_interne:          form.note_interne,
        })
        if (rpcError) { showError(rpcError.message); return }
      } else {
        const { error: rpcError } = await supabase.rpc('creer_fournisseur', {
          p_entite_id:             entiteId,
          p_nom:                   form.nom,
          p_type:                  form.type,
          p_devise:                form.devise,
          p_pays:                  form.pays,
          p_email:                 form.email,
          p_telephone:             form.telephone,
          p_site_web:              form.site_web,
          p_adresse:               form.adresse,
          p_ninea:                 form.ninea,
          p_conditions_paiement:   form.conditions_paiement,
          p_mode_paiement:         form.mode_paiement,
          p_coordonnees_bancaires: form.coordonnees_bancaires,
          p_note_evaluation:       form.note_evaluation || null,
          p_note_interne:          form.note_interne,
        })
        if (rpcError) { showError(rpcError.message); return }

        // Upload les fichiers en attente après création
        if (pendingFiles.length > 0) {
          const { data: newFour } = await supabase
            .from('fournisseurs')
            .select('id')
            .eq('entite_id', entiteId)
            .eq('nom', form.nom)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (newFour) {
            const uploadedDocs: { url: string; nom: string; uploaded_at: string }[] = []
            for (const file of pendingFiles) {
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
              const path = `fournisseurs/${newFour.id}/${Date.now()}_${safeName}`
              const { storedPath, error: upErr } = await uploadToStorage(supabase, 'documents', path, file)
              if (!upErr) {
                uploadedDocs.push({ url: storedPath, nom: file.name, uploaded_at: new Date().toISOString() })
              }
            }
            if (uploadedDocs.length > 0) {
              await supabase.rpc('update_fournisseur_documents', { p_id: newFour.id, p_documents: uploadedDocs })
            }
          }
        }
      }
      onSuccess()
    } catch (err: any) {
      showError(err?.message || 'Une erreur inattendue est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!providerData) return
    setArchiving(true)
    await supabase.rpc('archiver_fournisseur', { p_id: providerData.id })
    setArchiving(false)
    onSuccess()
  }

  async function handleUnarchive() {
    if (!providerData) return
    setUnarchiving(true)
    await supabase.rpc('desarchiver_fournisseur', { p_id: providerData.id })
    setUnarchiving(false)
    onSuccess()
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (mode === 'view' && providerData) {
    const cfg = STATUT_CFG[providerData.statut] || STATUT_CFG.actif
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal w-full max-w-2xl mx-4 overflow-y-auto max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-surface-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue/20 to-violet/10 flex items-center justify-center text-base font-bold text-blue">
                {initiales(providerData.nom.split(' ')[0], providerData.nom.split(' ')[1] || '')}
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">{providerData.nom}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xs text-text-muted">{TYPE_LABELS[providerData.type] || providerData.type}</span>
                  <span className="text-text-disabled">·</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium border ${cfg.cls}`}>{cfg.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {providerData.statut !== 'archive' && (
                <Button variant="secondary" size="sm" icon={<Edit3 size={13} />} onClick={() => setMode('form')}>Modifier</Button>
              )}
              {providerData.statut === 'archive' ? (
                <Button variant="ghost" size="sm" icon={<ArchiveRestore size={13} />} loading={unarchiving}
                  onClick={handleUnarchive} className="text-green hover:text-green">
                  Désarchiver
                </Button>
              ) : !confirmArchive ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-amber"
                  onClick={() => setConfirmArchive(true)} title="Archiver">
                  <Archive size={14} />
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber/10 border border-amber/20 rounded-lg px-2 py-1">
                  <span className="text-2xs text-amber">Archiver ?</span>
                  <button onClick={handleArchive} disabled={archiving}
                    className="p-0.5 rounded hover:bg-amber/20 text-amber transition-colors">
                    <Check size={12} />
                  </button>
                  <button onClick={() => setConfirmArchive(false)} className="p-0.5 rounded hover:bg-surface-hover text-text-muted transition-colors">
                    <X size={12} />
                  </button>
                </div>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">

            {/* Évaluation */}
            <StarRating note={providerData.note_evaluation} size={14} />

            {/* Bloc Contact */}
            <div>
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">Contact & Localisation</p>
              <div className="grid grid-cols-2 gap-3">
                {providerData.email && (
                  <InfoRow icon={<Mail size={12} />} label="Email" value={providerData.email} />
                )}
                {providerData.telephone && (
                  <InfoRow icon={<Phone size={12} />} label="Téléphone" value={providerData.telephone} />
                )}
                {providerData.site_web && (
                  <InfoRow icon={<Globe size={12} />} label="Site web"
                    value={<a href={providerData.site_web} target="_blank" rel="noopener noreferrer"
                      className="text-blue hover:underline flex items-center gap-1">
                      {providerData.site_web.replace(/^https?:\/\//, '')} <ExternalLink size={9} />
                    </a>} />
                )}
                <InfoRow icon={<MapPin size={12} />} label="Pays" value={providerData.pays} />
              </div>
              {providerData.adresse && (
                <div className="mt-3 p-3 bg-background/50 rounded-lg border border-surface-border/50">
                  <p className="text-2xs text-text-muted mb-1">Adresse</p>
                  <p className="text-xs text-text-secondary whitespace-pre-line">{providerData.adresse}</p>
                </div>
              )}
            </div>

            {/* Bloc Identification */}
            {(providerData.ninea || providerData.devise !== 'FCFA') && (
              <div>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">Identification</p>
                <div className="grid grid-cols-2 gap-3">
                  {providerData.ninea && (
                    <InfoRow icon={<Shield size={12} />} label={getNINEALabel(providerData.pays)} value={providerData.ninea} />
                  )}
                  <InfoRow icon={<Tag size={12} />} label="Devise" value={providerData.devise} />
                </div>
              </div>
            )}

            {/* Bloc Règlement */}
            {(providerData.conditions_paiement || providerData.mode_paiement || providerData.coordonnees_bancaires) && (
              <div className="bg-background/40 border border-surface-border rounded-xl p-4">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Landmark size={10} /> Paramètres de règlement
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {providerData.conditions_paiement && (
                    <InfoRow icon={<CreditCard size={12} />} label="Conditions" value={providerData.conditions_paiement} />
                  )}
                  {providerData.mode_paiement && (
                    <InfoRow icon={<CreditCard size={12} />} label="Mode" value={providerData.mode_paiement} />
                  )}
                </div>
                {providerData.coordonnees_bancaires && (
                  <div className="mt-3 p-3 bg-surface rounded-lg border border-surface-border font-mono text-xs text-text-secondary whitespace-pre-line">
                    {providerData.coordonnees_bancaires}
                  </div>
                )}
              </div>
            )}

            {/* Note interne */}
            {providerData.note_interne && (
              <div>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">Note interne</p>
                <p className="text-xs text-text-secondary bg-background/40 border border-surface-border rounded-lg p-3 whitespace-pre-line">
                  {providerData.note_interne}
                </p>
              </div>
            )}

            {/* Pièces jointes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip size={10} /> Pièces jointes
                </p>
                <label className="cursor-pointer flex items-center gap-1 text-xs text-blue hover:text-blue/80 transition-colors">
                  <Upload size={11} /> Ajouter
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                </label>
              </div>

              {docs.length === 0 ? (
                <label className="cursor-pointer block">
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                  <div className="border-2 border-dashed border-surface-border hover:border-blue/40 rounded-xl p-6 text-center transition-colors">
                    <Paperclip size={20} className="mx-auto mb-2 text-text-disabled" />
                    <p className="text-xs text-text-muted">Cliquez pour ajouter un document</p>
                    <p className="text-2xs text-text-disabled mt-0.5">PDF, image, Word, Excel</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-background/40 border border-surface-border rounded-lg group">
                      <FileText size={14} className="text-blue flex-shrink-0" />
                      <button
                        type="button"
                        onClick={() => downloadDocument(supabase, 'documents', doc.url, doc.nom)}
                        className="flex-1 text-xs text-text-primary truncate hover:text-blue transition-colors text-left">
                        {doc.nom}
                      </button>
                      <span className="text-2xs text-text-disabled flex-shrink-0">{formatDate(doc.uploaded_at)}</span>
                      <button
                        onClick={() => handleDeleteDoc(i)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <label className="cursor-pointer flex items-center gap-1 text-xs text-text-muted hover:text-blue transition-colors">
                    <Plus size={11} /> Ajouter un document
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                  </label>
                </div>
              )}

              {uploading && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                  <RefreshCw size={11} className="animate-spin" /> Téléversement en cours…
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
                  <AlertTriangle size={11} className="flex-shrink-0" /> {uploadError}
                </div>
              )}
            </div>

            {/* Factures liées */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={10} /> Factures liées
                </p>
                <Link
                  href={`/finance/factures/nouvelle?fournisseur=${providerData.id}`}
                  className="flex items-center gap-1 text-xs text-blue hover:text-blue/80 transition-colors">
                  <Plus size={11} /> Nouvelle facture
                </Link>
              </div>
              {factures.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-surface-border rounded-xl">
                  <p className="text-2xs text-text-disabled">Aucune facture liée à ce fournisseur</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {factures.map(f => (
                    <Link key={f.id} href={`/finance/factures/${f.id}`}
                      className="flex items-center gap-2 p-2.5 bg-background/40 border border-surface-border rounded-lg hover:border-violet/30 transition-colors group">
                      <FileText size={13} className="text-violet flex-shrink-0" />
                      <span className="font-mono text-xs text-text-primary group-hover:text-violet transition-colors flex-shrink-0">{f.numero}</span>
                      <span className="flex-1 text-2xs text-text-muted">{formatDate(f.date_emission)}</span>
                      <span className="text-xs font-semibold text-text-primary tabular-nums flex-shrink-0">{formatMontant(f.montant_ttc, f.devise as any)}</span>
                      <StatutFactureBadge statut={f.statut as any} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <p className="text-2xs text-text-disabled">Ajouté le {formatDate(providerData.created_at)}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form mode (create or edit) ─────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-text-primary">
              {isEdit ? `Modifier ${providerData!.nom}` : 'Nouveau fournisseur'}
            </h3>
            <p className="text-2xs text-text-muted mt-0.5">
              {isEdit ? 'Mettez à jour les informations du fournisseur' : 'Ajoutez un fournisseur ou partenaire à votre réseau'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button onClick={() => setMode('view')}
                className="text-2xs text-text-muted hover:text-text-primary transition-colors underline">
                Annuler les modifications
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit() }} className="overflow-y-auto flex-1 p-6 space-y-6">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red/10 border border-red/20 rounded-lg">
              <AlertTriangle size={14} className="text-red flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red">{error}</p>
            </div>
          )}

          {/* ── Bloc 1 : Identité & Typologie ──────────────────────────── */}
          <Section title="Identité & Typologie">
            <div className="grid grid-cols-2 gap-4">
              {/* Nom */}
              <div className="col-span-2 space-y-1.5">
                <label className="label">Nom <span className="text-red">*</span></label>
                <input
                  type="text" required
                  className={`input w-full ${!form.nom && 'border-red/30'}`}
                  placeholder={nomPlaceholder}
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                />
                {isIndep && (
                  <p className="text-2xs text-violet">
                    Mode indépendant — indiquez le nom complet ou la raison sociale de la structure
                  </p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="label">Type <span className="text-red">*</span></label>
                <div className="relative">
                  <select
                    className="input w-full appearance-none pr-8"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Devise */}
              <div className="space-y-1.5">
                <label className="label">Devise <span className="text-red">*</span></label>
                <div className="relative">
                  <select
                    className="input w-full appearance-none pr-8"
                    value={form.devise}
                    onChange={e => setForm({ ...form, devise: e.target.value })}>
                    {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Pays */}
              <div className="space-y-1.5">
                <label className="label">Pays</label>
                <div className="relative">
                  <select
                    className="input w-full appearance-none pr-8"
                    value={form.pays}
                    onChange={e => setForm({ ...form, pays: e.target.value })}>
                    {PAYS_LISTE.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* NINEA / N° fiscal */}
              <div className="space-y-1.5">
                <label className="label">{ninealabel}</label>
                <input
                  type="text"
                  className="input w-full font-mono"
                  placeholder={`Ex : ${ninealabel === 'NINEA / N° RC' ? '7012345 2A1' : ninealabel}`}
                  value={form.ninea}
                  onChange={e => setForm({ ...form, ninea: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* ── Bloc 2 : Contact & Localisation ────────────────────────── */}
          <Section title="Contact & Localisation">
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <label className="label">Email général <span className="text-red">*</span></label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="billing@fournisseur.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Téléphone</label>
                <input
                  type="tel"
                  className="input w-full"
                  placeholder="+221 77 000 00 00"
                  value={form.telephone}
                  onChange={e => setForm({ ...form, telephone: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="label">Site web</label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://fournisseur.com"
                  value={form.site_web}
                  onChange={e => setForm({ ...form, site_web: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="label">Adresse du siège social</label>
                <textarea
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Numéro, rue, ville, code postal…"
                  value={form.adresse}
                  onChange={e => setForm({ ...form, adresse: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* ── Bloc 3 : Paramètres de règlement ───────────────────────── */}
          <div className="bg-background/40 border border-surface-border rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
              <Landmark size={13} className="text-violet" />
              Paramètres de règlement
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Conditions de paiement</label>
                <div className="relative">
                  <select
                    className="input w-full appearance-none pr-8"
                    value={form.conditions_paiement}
                    onChange={e => setForm({ ...form, conditions_paiement: e.target.value })}>
                    {CONDITIONS_PAIEMENT.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Mode de paiement préféré</label>
                <div className="relative">
                  <select
                    className="input w-full appearance-none pr-8"
                    value={form.mode_paiement}
                    onChange={e => setForm({ ...form, mode_paiement: e.target.value })}>
                    {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="label">Coordonnées bancaires / RIB</label>
                <textarea
                  className="input w-full resize-none font-mono text-xs"
                  rows={3}
                  placeholder={`Banque : \nIBAN : \nBIC/SWIFT : \nTitulaire : `}
                  value={form.coordonnees_bancaires}
                  onChange={e => setForm({ ...form, coordonnees_bancaires: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── Évaluation & Note interne ───────────────────────────────── */}
          <Section title="Évaluation & Notes">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="label">Note de satisfaction (optionnel)</label>
                <StarPicker value={form.note_evaluation} onChange={v => setForm({ ...form, note_evaluation: v })} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Note interne (confidentielle)</label>
                <textarea
                  className="input w-full resize-none text-xs"
                  rows={3}
                  placeholder="Fiabilité, délais, qualité, points de vigilance…"
                  value={form.note_interne}
                  onChange={e => setForm({ ...form, note_interne: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* ── Pièces jointes ─────────────────────────────────────────── */}
          <Section title="Pièces jointes">
            {isEdit ? (
              <div className="space-y-2">
                {docs.length === 0 ? (
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                    <div className="border-2 border-dashed border-surface-border hover:border-blue/40 rounded-xl p-5 text-center transition-colors">
                      <Paperclip size={18} className="mx-auto mb-2 text-text-disabled" />
                      <p className="text-xs text-text-muted">Cliquez pour ajouter un document</p>
                      <p className="text-2xs text-text-disabled mt-0.5">PDF, image, Word, Excel</p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 bg-background/40 border border-surface-border rounded-lg group">
                        <FileText size={14} className="text-blue flex-shrink-0" />
                        <button type="button" onClick={() => downloadDocument(supabase, 'documents', doc.url, doc.nom)}
                          className="flex-1 text-xs text-text-primary truncate hover:text-blue transition-colors text-left">
                          {doc.nom}
                        </button>
                        <span className="text-2xs text-text-disabled flex-shrink-0">{formatDate(doc.uploaded_at)}</span>
                        <button type="button"
                          onClick={() => handleDeleteDoc(i)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer flex items-center gap-1 text-xs text-text-muted hover:text-blue transition-colors">
                      <Plus size={11} /> Ajouter un document
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
                    </label>
                  </div>
                )}
                {uploading && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <RefreshCw size={11} className="animate-spin" /> Téléversement en cours…
                  </div>
                )}
                {uploadError && (
                  <div className="flex items-center gap-1.5 p-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
                    <AlertTriangle size={11} className="flex-shrink-0" /> {uploadError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingFiles.length === 0 ? (
                  <label className="cursor-pointer block">
                    <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) setPendingFiles(prev => [...prev, ...f]) }} />
                    <div className="border-2 border-dashed border-surface-border hover:border-blue/40 rounded-xl p-5 text-center transition-colors">
                      <Paperclip size={18} className="mx-auto mb-2 text-text-disabled" />
                      <p className="text-xs text-text-muted">Cliquez pour ajouter un document</p>
                      <p className="text-2xs text-text-disabled mt-0.5">PDF, image, Word, Excel</p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-2">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 bg-background/40 border border-surface-border rounded-lg group">
                        <FileText size={14} className="text-blue flex-shrink-0" />
                        <span className="flex-1 text-xs text-text-primary truncate">{f.name}</span>
                        <button type="button"
                          onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer flex items-center gap-1 text-xs text-text-muted hover:text-blue transition-colors">
                      <Plus size={11} /> Ajouter un document
                      <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) setPendingFiles(prev => [...prev, ...f]) }} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </Section>
        </form>

        {/* Footer sticky */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-border flex-shrink-0 bg-surface">
          <p className="text-2xs text-text-disabled">Les champs marqués <span className="text-red">*</span> sont obligatoires</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" size="sm" onClick={isEdit ? () => setMode('view') : onClose}>
              Annuler
            </Button>
            <Button type="button" size="sm" loading={saving} onClick={handleSubmit} disabled={!form.nom.trim()}>
              {isEdit ? 'Enregistrer les modifications' : 'Créer le fournisseur'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section helper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-text-primary">{title}</p>
        <div className="flex-1 h-px bg-surface-border" />
      </div>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-text-muted mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-2xs text-text-muted">{label}</p>
        <p className="text-xs text-text-primary font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function FournisseursPage() {
  const { entiteActive } = useAppStore()
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFiltre, setTypeFiltre] = useState('')
  const [showArchives, setShowArchives] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; data?: Fournisseur | null }>({ open: false })
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('fournisseurs')
      .select('*')
      .order('nom')
    if (entiteActive?.id) q = q.eq('entite_id', entiteActive.id)
    if (typeFiltre) q = q.eq('type', typeFiltre)
    if (search) q = q.ilike('nom', `%${search}%`)
    const { data } = await q
    setFournisseurs((data || []) as Fournisseur[])
    setLoading(false)
  }, [entiteActive?.id, search, typeFiltre]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const actifs   = fournisseurs.filter(f => f.statut !== 'archive')
  const archives = fournisseurs.filter(f => f.statut === 'archive')
  const visibles = typeFiltre ? actifs.filter(f => f.type === typeFiltre) : actifs

  const usedTypes = Array.from(new Set(actifs.map(f => f.type)))

  const stats = {
    total:  actifs.length,
    actifs: actifs.filter(f => f.statut === 'actif').length,
    notesMoy: (() => {
      const noted = actifs.filter(f => f.note_evaluation)
      if (!noted.length) return 0
      return Math.round(noted.reduce((s, f) => s + (f.note_evaluation || 0), 0) / noted.length * 10) / 10
    })(),
  }

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="page-subtitle">Prestataires, agences et partenaires commerciaux</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ open: true, data: null })}>
            Nouveau fournisseur
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center">
            <Building2 size={15} className="text-blue" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total actifs</p>
            <p className="text-xl font-bold text-text-primary">{loading ? '—' : stats.total}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center">
            <Check size={15} className="text-green" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Statut actif</p>
            <p className="text-xl font-bold text-text-primary">{loading ? '—' : stats.actifs}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
            <Star size={15} className="text-amber" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Note moyenne</p>
            <p className="text-xl font-bold text-text-primary">{loading ? '—' : stats.notesMoy > 0 ? `${stats.notesMoy}/5` : '—'}</p>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" placeholder="Rechercher…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 py-1.5 text-xs w-48"
          />
        </div>
        <button
          onClick={() => setTypeFiltre('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${typeFiltre === '' ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
          Tous
        </button>
        {usedTypes.map(t => (
          <button key={t} onClick={() => setTypeFiltre(typeFiltre === t ? '' : t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${typeFiltre === t ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {/* Grille fournisseurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)
          : visibles.length === 0
            ? (
              <div className="col-span-3 text-center py-16 text-text-muted">
                <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">Aucun fournisseur</p>
                <Button size="sm" icon={<Plus size={13} />} onClick={() => setModal({ open: true, data: null })}>
                  Ajouter un fournisseur
                </Button>
              </div>
            )
            : visibles.map(f => (
              <FournisseurCard key={f.id} f={f} onClick={() => setModal({ open: true, data: f })} />
            ))
        }
      </div>

      {/* Fournisseurs archivés */}
      {archives.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchives(v => !v)}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors mb-3">
            <Archive size={12} />
            {archives.length} fournisseur{archives.length > 1 ? 's' : ''} archivé{archives.length > 1 ? 's' : ''}
            <ChevronDown size={12} className={`transition-transform ${showArchives ? 'rotate-180' : ''}`} />
          </button>
          {showArchives && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60 hover:opacity-80 transition-opacity">
              {archives.map(f => (
                <div key={f.id} className="flex items-center gap-2 bg-surface/50 border border-surface-border rounded-xl p-4 group hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({ open: true, data: f })}
                    className="flex items-center gap-2 flex-1 text-left min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-xs font-bold text-text-muted flex-shrink-0">
                      {initiales(f.nom.split(' ')[0], f.nom.split(' ')[1] || '')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-muted truncate">{f.nom}</p>
                      <p className="text-2xs text-text-disabled">{TYPE_LABELS[f.type] || f.type} · Archivé</p>
                    </div>
                  </button>
                  <button
                    title="Désarchiver"
                    onClick={async () => {
                      await supabase.rpc('desarchiver_fournisseur', { p_id: f.id })
                      load()
                    }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg hover:bg-green/10 text-text-disabled hover:text-green transition-all">
                    <ArchiveRestore size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && actifs.length > 0 && (
        <p className="text-xs text-text-muted text-center">
          {visibles.length} fournisseur{visibles.length > 1 ? 's' : ''} affiché{visibles.length > 1 ? 's' : ''}
        </p>
      )}

      {/* Modal */}
      {modal.open && (
        <FournisseurModal
          entiteId={entiteActive?.id || ''}
          providerData={modal.data}
          onClose={() => { setModal({ open: false }); load() }}
          onSuccess={() => { setModal({ open: false }); load() }}
        />
      )}
    </div>
  )
}
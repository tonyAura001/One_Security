// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { uploadToStorage } from '@/aurantir-front-kit/lib/storage'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import {
  Building2, User, CheckCircle2, AlertCircle, X,
  Mail, Send, Loader2, Info, Star,
  Paperclip, Upload, FileText, Trash2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PieceJointe {
  nom: string
  path: string
  taille: number
  type: string
  created_at: string
}

export interface ClientRow {
  id: string
  nom_entreprise: string
  secteur?: string
  domaine_activite?: string
  telephone?: string
  site_web?: string
  adresse?: string
  pays?: string
  email_principal?: string
  type_client?: string
  ninea?: string
  entite_id?: string
  statut?: string
  pieces_jointes?: PieceJointe[]
}

interface ContactRow {
  id: string
  prenom: string
  nom: string
  poste?: string
  email?: string
  telephone?: string
  est_principal: boolean
}

export interface ClientFormModalProps {
  mode: 'create' | 'edit'
  clientData?: ClientRow
  onClose: () => void
  onSuccess: () => void
  userId?: string
  defaultEntiteId: string
  entites: { id: string; nom: string }[]
  defaultTab?: 'info' | 'email'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINE_LABELS: Record<string, string> = {
  administration: 'Administration', finance: 'Finance', education: 'Éducation',
  agriculture: 'Agriculture', commerce: 'Commerce', sante: 'Santé', tech: 'Tech', autre: 'Autre',
}

const SECTEURS = [
  'Banque & Finance', 'Assurance', 'Télécommunications', 'Énergie & Mines',
  'BTP & Immobilier', 'Transport & Logistique', 'Hôtellerie & Tourisme',
  'Santé & Pharma', 'Éducation & Formation', 'Distribution & Commerce',
  'Import / Export', 'Industrie & Manufacture', 'Consulting & Services',
  'Technologie & IT', 'ONG / Associations', 'Autre',
]

const EMAIL_TEMPLATES: Record<string, { sujet: string; message: string }> = {
  bienvenue: {
    sujet: 'Bienvenue !',
    message: 'Bonjour,\n\nNous sommes ravis de vous compter parmi nos clients et partenaires.\n\nN\'hésitez pas à nous contacter pour toute question.\n\nCordialement,',
  },
  suivi: {
    sujet: 'Suivi de notre dernier échange',
    message: 'Bonjour,\n\nJe reviens vers vous à la suite de notre dernier échange afin de faire le point sur l\'avancement de notre collaboration.\n\nSommes-nous toujours alignés sur les prochaines étapes ?\n\nCordialement,',
  },
  relance_devis: {
    sujet: 'Relance — Votre devis en attente',
    message: 'Bonjour,\n\nNous revenons vers vous concernant le devis que nous vous avons soumis, toujours en attente de votre retour.\n\nPourriez-vous nous faire part de votre décision dans les meilleurs délais ?\n\nCordialement,',
  },
  relance_facture: {
    sujet: 'Rappel — Règlement en attente',
    message: 'Bonjour,\n\nSauf erreur de notre part, nous n\'avons pas encore reçu le règlement correspondant à notre dernière facture.\n\nPourriez-vous procéder au paiement dans les meilleurs délais ?\n\nMerci par avance,',
  },
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Field({
  label, required, touched, valid, children,
}: {
  label: string; required?: boolean
  touched?: boolean; valid?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between h-4">
        <label className="label leading-none">
          {label}{required && <span className="text-red ml-0.5">*</span>}
        </label>
        {touched !== undefined && (
          valid
            ? <CheckCircle2 size={11} className="text-green" />
            : <AlertCircle size={11} className="text-red/80" />
        )}
      </div>
      {children}
    </div>
  )
}

function inputCls(touched?: boolean, valid?: boolean) {
  if (!touched) return 'input'
  return valid ? 'input border-green/40 focus:border-green/60' : 'input border-red/40 focus:border-red/60'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientFormModal({
  mode, clientData, onClose, onSuccess, userId, defaultEntiteId, entites, defaultTab = 'info',
}: ClientFormModalProps) {
  const supabase = createClient()

  const [tab, setTab] = useState<'info' | 'email'>(defaultTab)
  const [typeClient, setTypeClient] = useState<'entreprise' | 'particulier'>(
    clientData?.type_client === 'particulier' ? 'particulier' : 'entreprise'
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [principalContact, setPrincipalContact] = useState<ContactRow | null>(null)

  // ── Entreprise fields ──
  const [ent, setEnt] = useState({
    entite_id:        clientData?.entite_id        || defaultEntiteId,
    nom_entreprise:   clientData?.nom_entreprise   || '',
    secteur:          clientData?.secteur          || '',
    domaine_activite: clientData?.domaine_activite || 'autre',
    email_principal:  (clientData as any)?.email_principal || '',
    telephone:        clientData?.telephone        || '',
    adresse:          (clientData as any)?.adresse || '',
    site_web:         clientData?.site_web         || '',
    ninea:            (clientData as any)?.ninea   || '',
    pays:             clientData?.pays             || 'Sénégal',
  })

  // ── Interlocuteur ──
  const [interlo, setInterlo] = useState({ prenom: '', nom: '', poste: '', email: '', telephone: '' })

  // ── Particulier fields ──
  const [part, setPart] = useState({
    entite_id:  clientData?.entite_id        || defaultEntiteId,
    prenom:     '',
    nom:        '',
    email:      (clientData as any)?.email_principal || '',
    telephone:  clientData?.telephone        || '',
    adresse:    (clientData as any)?.adresse || '',
    pays:       clientData?.pays             || 'Sénégal',
  })

  // ── Pièces jointes ──
  const [pjFiles,    setPjFiles]    = useState<File[]>([])
  const [pjExisting, setPjExisting] = useState<PieceJointe[]>([])

  // ── Email ──
  const [emailTo,      setEmailTo]      = useState('')
  const [emailSujet,   setEmailSujet]   = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Load principal contact in edit / entreprise mode
  useEffect(() => {
    if (mode !== 'edit' || !clientData?.id || typeClient !== 'entreprise') return
    setLoadingContacts(true)
    supabase
      .from('contacts_clients')
      .select('*')
      .eq('client_id', clientData.id)
      .eq('est_principal', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const c = data as ContactRow
          setPrincipalContact(c)
          setInterlo({ prenom: c.prenom || '', nom: c.nom || '', poste: c.poste || '', email: c.email || '', telephone: c.telephone || '' })
          setEmailTo(c.email || (clientData as any).email_principal || '')
        } else {
          setEmailTo((clientData as any).email_principal || '')
        }
        setLoadingContacts(false)
      })
  }, [mode, clientData?.id, typeClient]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeClient === 'particulier') setEmailTo(part.email)
  }, [typeClient, part.email])

  useEffect(() => {
    if (mode !== 'edit' || !clientData?.id) return
    supabase
      .from('entreprises_clientes')
      .select('pieces_jointes')
      .eq('id', clientData.id)
      .single()
      .then(({ data }) => {
        if (data?.pieces_jointes) setPjExisting(data.pieces_jointes as PieceJointe[])
      })
  }, [mode, clientData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──
  function touch(field: string) { setTouched(t => ({ ...t, [field]: true })) }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  }

  async function uploadPiecesJointes(clientId: string): Promise<PieceJointe[]> {
    const uploaded: PieceJointe[] = []
    for (const file of pjFiles) {
      const safeName = `${Date.now()}_${sanitizeFilename(file.name)}`
      const path = `${clientId}/${safeName}`
      const { storedPath, error } = await uploadToStorage(supabase, 'clients', path, file, { upsert: false })
      if (!error) {
        uploaded.push({ nom: file.name, path: storedPath, taille: file.size, type: file.type, created_at: new Date().toISOString() })
      }
    }
    return uploaded
  }

  async function resolveEntiteId(eid: string): Promise<string | null> {
    if (eid) return eid
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('users').select('entite_principale_id').eq('auth_user_id', user!.id).single()
    return data?.entite_principale_id || null
  }

  // ── Submit info ──
  async function handleSubmitInfo(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (typeClient === 'entreprise') {
      setTouched(t => ({ ...t, nom_entreprise: true }))
      if (!ent.nom_entreprise.trim()) { setFormError("Nom de l'entreprise requis"); return }
    } else {
      setTouched(t => ({ ...t, part_email: true, part_telephone: true }))
      if (!part.email.trim() && !part.telephone.trim()) { setFormError("Email ou téléphone requis"); return }
    }

    setSaving(true)
    let finalClientId: string | undefined

    if (typeClient === 'entreprise') {
      const eid = await resolveEntiteId(ent.entite_id)
      if (!eid) { setFormError('Sélectionnez une entité.'); setSaving(false); return }

      const basePayload = {
        nom_entreprise:   ent.nom_entreprise,
        secteur:          ent.secteur    || null,
        domaine_activite: ent.domaine_activite,
        telephone:        ent.telephone  || null,
        site_web:         ent.site_web   || null,
        ninea:            ent.ninea      || null,
        pays:             ent.pays,
        source_acquisition: 'autre',
      }
      const extras: any = {
        type_client:     'entreprise',
        email_principal: ent.email_principal || null,
        adresse:         ent.adresse         || null,
      }

      let clientId = clientData?.id

      if (mode === 'create') {
        const { data: created, error: err } = await supabase
          .from('entreprises_clientes')
          .insert({ ...basePayload, cree_par: userId, entite_id: eid })
          .select('id').single()
        if (err) { setFormError(err.message); setSaving(false); return }
        clientId = created?.id
        if (clientId) await supabase.from('entreprises_clientes').update(extras).eq('id', clientId)
        if (clientId && interlo.prenom.trim()) {
          await supabase.from('contacts_clients').insert({
            client_id: clientId, entite_id: eid,
            prenom: interlo.prenom, nom: interlo.nom || null,
            poste: interlo.poste || null, email: interlo.email || null,
            telephone: interlo.telephone || null, est_principal: true, cree_par: userId,
          })
        }
      } else {
        const { error: err } = await supabase
          .from('entreprises_clientes')
          .update({ ...basePayload, entite_id: eid })
          .eq('id', clientId!)
        if (err) { setFormError(err.message); setSaving(false); return }
        await supabase.from('entreprises_clientes').update(extras).eq('id', clientId!)

        if (interlo.prenom.trim()) {
          if (principalContact?.id) {
            await supabase.from('contacts_clients').update({
              prenom: interlo.prenom, nom: interlo.nom || null,
              poste: interlo.poste || null, email: interlo.email || null,
              telephone: interlo.telephone || null,
            }).eq('id', principalContact.id)
          } else {
            await supabase.from('contacts_clients').insert({
              client_id: clientId, entite_id: eid,
              prenom: interlo.prenom, nom: interlo.nom || null,
              poste: interlo.poste || null, email: interlo.email || null,
              telephone: interlo.telephone || null, est_principal: true, cree_par: userId,
            })
          }
        }
      }
      finalClientId = clientId

    } else {
      // Particulier
      const nomComplet = [part.prenom, part.nom].filter(Boolean).join(' ') || 'Particulier'
      const eid = await resolveEntiteId(part.entite_id)
      if (!eid) { setFormError('Sélectionnez une entité.'); setSaving(false); return }

      const basePayload = {
        nom_entreprise: nomComplet, domaine_activite: 'autre',
        telephone: part.telephone || null, pays: part.pays, source_acquisition: 'autre',
      }
      const extras: any = {
        type_client: 'particulier', email_principal: part.email || null, adresse: part.adresse || null,
      }

      let clientId = clientData?.id

      if (mode === 'create') {
        const { data: created, error: err } = await supabase
          .from('entreprises_clientes')
          .insert({ ...basePayload, cree_par: userId, entite_id: eid })
          .select('id').single()
        if (err) { setFormError(err.message); setSaving(false); return }
        if (created?.id) {
          await supabase.from('entreprises_clientes').update(extras).eq('id', created.id)
          clientId = created.id
        }
      } else {
        const { error: err } = await supabase
          .from('entreprises_clientes')
          .update({ ...basePayload, entite_id: eid })
          .eq('id', clientData!.id)
        if (err) { setFormError(err.message); setSaving(false); return }
        await supabase.from('entreprises_clientes').update(extras).eq('id', clientData!.id)
        clientId = clientData!.id
      }
      finalClientId = clientId
    }

    // Sync pièces jointes (upload new files, persist removals)
    if (finalClientId && (pjFiles.length > 0 || mode === 'edit')) {
      const newPJ = pjFiles.length > 0 ? await uploadPiecesJointes(finalClientId) : []
      const allPJ = [...pjExisting, ...newPJ]
      await supabase.from('entreprises_clientes').update({ pieces_jointes: allPJ } as any).eq('id', finalClientId)
    }

    setSaving(false)
    onSuccess()
  }

  // ── Submit email ──
  async function handleSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    setSendingEmail(true); setEmailFeedback(null)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message_client',
          payload: { to: emailTo, sujet: emailSujet, message: emailMessage, clientNom: clientData?.nom_entreprise || '' },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setEmailFeedback({ type: 'success', msg: `E-mail envoyé avec succès à ${emailTo}` })
        setEmailMessage(''); setEmailSujet('')
      } else {
        setEmailFeedback({ type: 'error', msg: data.error || "Erreur lors de l'envoi" })
      }
    } catch {
      setEmailFeedback({ type: 'error', msg: 'Erreur réseau' })
    }
    setSendingEmail(false)
  }

  const isEnt = typeClient === 'entreprise'
  const currentEntiteId = isEnt ? ent.entite_id : part.entite_id

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {mode === 'create' ? 'Nouveau client' : `Modifier — ${clientData?.nom_entreprise || ''}`}
            </h3>
            {mode === 'edit' && clientData && (
              <p className="text-2xs text-text-muted mt-0.5">
                {isEnt ? 'Entreprise' : 'Particulier'} · ID {clientData.id.slice(0, 8)}…
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs (edit only) ── */}
        {mode === 'edit' && (
          <div className="flex border-b border-surface-border px-6 flex-shrink-0">
            <button onClick={() => setTab('info')}
              className={`py-3 px-1 mr-6 text-xs font-medium border-b-2 transition-colors ${tab === 'info' ? 'border-blue text-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
              Informations
            </button>
            <button onClick={() => setTab('email')}
              className={`py-3 px-1 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${tab === 'email' ? 'border-blue text-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
              <Mail size={11} /> Envoyer un message
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>

          {/* ════ TAB: INFORMATIONS ════ */}
          {tab === 'info' && (
            <form id="client-info-form" onSubmit={handleSubmitInfo} className="space-y-5">

              {/* Toggle type */}
              <div className="flex rounded-xl border border-surface-border bg-surface p-1 gap-1">
                <button type="button" onClick={() => setTypeClient('entreprise')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${isEnt ? 'bg-blue/10 text-blue shadow-sm' : 'text-text-muted hover:bg-surface-hover'}`}>
                  <Building2 size={13} /> Entreprise
                </button>
                <button type="button" onClick={() => setTypeClient('particulier')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${!isEnt ? 'bg-violet/10 text-violet shadow-sm' : 'text-text-muted hover:bg-surface-hover'}`}>
                  <User size={13} /> Particulier
                </button>
              </div>

              {/* Entité */}
              {entites.length > 1 && (
                <div className="space-y-1.5">
                  <label className="label">Entité *</label>
                  <div className="flex gap-2">
                    {entites.map(e => (
                      <button key={e.id} type="button"
                        onClick={() => isEnt ? setEnt(f => ({ ...f, entite_id: e.id })) : setPart(f => ({ ...f, entite_id: e.id }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${currentEntiteId === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:bg-surface-hover'}`}>
                        {e.nom}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ENTREPRISE ─────────────────────────── */}
              <div className={`space-y-4 transition-all duration-300 ${isEnt ? 'opacity-100' : 'hidden'}`}>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nom de l'entreprise" required
                    touched={touched.nom_entreprise} valid={!!ent.nom_entreprise.trim()}>
                    <input
                      className={inputCls(touched.nom_entreprise, !!ent.nom_entreprise.trim())}
                      value={ent.nom_entreprise}
                      onChange={e => setEnt(f => ({ ...f, nom_entreprise: e.target.value }))}
                      onBlur={() => touch('nom_entreprise')}
                      placeholder="Société XYZ" />
                  </Field>
                  <Field label="Secteur d'activité">
                    <input className="input" list="secteurs-list"
                      value={ent.secteur}
                      onChange={e => setEnt(f => ({ ...f, secteur: e.target.value }))}
                      placeholder="Banque, BTP, Tech..." />
                    <datalist id="secteurs-list">
                      {SECTEURS.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Domaine">
                    <select className="input" value={ent.domaine_activite}
                      onChange={e => setEnt(f => ({ ...f, domaine_activite: e.target.value }))}>
                      {Object.entries(DOMAINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Site web">
                    <input className="input" value={ent.site_web}
                      onChange={e => setEnt(f => ({ ...f, site_web: e.target.value }))}
                      placeholder="https://..." />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email principal">
                    <input className="input" type="email" value={ent.email_principal}
                      onChange={e => setEnt(f => ({ ...f, email_principal: e.target.value }))}
                      placeholder="contact@entreprise.sn" />
                  </Field>
                  <Field label="Téléphone général">
                    <input className="input" type="tel" value={ent.telephone}
                      onChange={e => setEnt(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="+221 33 XXX XX XX" />
                  </Field>
                </div>

                <Field label="Adresse / Siège social">
                  <input className="input" value={ent.adresse}
                    onChange={e => setEnt(f => ({ ...f, adresse: e.target.value }))}
                    placeholder="Rue, quartier, ville..." />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="NINEA / RC">
                    <input className="input" value={ent.ninea}
                      onChange={e => setEnt(f => ({ ...f, ninea: e.target.value }))}
                      placeholder="Ex: 00123456789" />
                  </Field>
                  <Field label="Pays">
                    <input className="input" value={ent.pays}
                      onChange={e => setEnt(f => ({ ...f, pays: e.target.value }))} />
                  </Field>
                </div>

                {/* Interlocuteur */}
                <div className="rounded-xl border border-surface-border bg-surface/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star size={11} className="text-amber fill-amber" />
                    <span className="text-xs font-semibold text-text-secondary">Interlocuteur / Négociateur principal</span>
                    <span className="text-2xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-surface-border ml-auto">Optionnel</span>
                    {loadingContacts && <Loader2 size={11} className="text-text-muted animate-spin" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom">
                      <input className="input" value={interlo.prenom}
                        onChange={e => setInterlo(f => ({ ...f, prenom: e.target.value }))}
                        placeholder="Moussa" />
                    </Field>
                    <Field label="Nom">
                      <input className="input" value={interlo.nom}
                        onChange={e => setInterlo(f => ({ ...f, nom: e.target.value }))}
                        placeholder="Diallo" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fonction / Poste">
                      <input className="input" value={interlo.poste}
                        onChange={e => setInterlo(f => ({ ...f, poste: e.target.value }))}
                        placeholder="Directeur Général, DRH..." />
                    </Field>
                    <Field label="Email direct professionnel">
                      <input className="input" type="email" value={interlo.email}
                        onChange={e => setInterlo(f => ({ ...f, email: e.target.value }))}
                        placeholder="m.diallo@entreprise.sn" />
                    </Field>
                  </div>
                  <Field label="Téléphone direct mobile">
                    <input className="input" type="tel" value={interlo.telephone}
                      onChange={e => setInterlo(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="+221 77 XXX XX XX" />
                  </Field>
                </div>
              </div>

              {/* ── PARTICULIER ────────────────────────── */}
              <div className={`space-y-4 transition-all duration-300 ${!isEnt ? 'opacity-100' : 'hidden'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom">
                    <input className="input" value={part.prenom}
                      onChange={e => setPart(f => ({ ...f, prenom: e.target.value }))}
                      placeholder="Fatou" />
                  </Field>
                  <Field label="Nom">
                    <input className="input" value={part.nom}
                      onChange={e => setPart(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Diop" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" required
                    touched={touched.part_email} valid={!!part.email.trim()}>
                    <input className={inputCls(touched.part_email, !!part.email.trim())} type="email"
                      value={part.email}
                      onChange={e => setPart(f => ({ ...f, email: e.target.value }))}
                      onBlur={() => touch('part_email')}
                      placeholder="fatou@exemple.com" />
                  </Field>
                  <Field label="Téléphone" required
                    touched={touched.part_telephone} valid={!!part.telephone.trim()}>
                    <input className={inputCls(touched.part_telephone, !!part.telephone.trim())} type="tel"
                      value={part.telephone}
                      onChange={e => setPart(f => ({ ...f, telephone: e.target.value }))}
                      onBlur={() => touch('part_telephone')}
                      placeholder="+221 77 XXX XX XX" />
                  </Field>
                </div>
                <Field label="Adresse résidentielle">
                  <input className="input" value={part.adresse}
                    onChange={e => setPart(f => ({ ...f, adresse: e.target.value }))}
                    placeholder="Rue, quartier, ville..." />
                </Field>
                <Field label="Pays">
                  <input className="input" value={part.pays}
                    onChange={e => setPart(f => ({ ...f, pays: e.target.value }))} />
                </Field>
              </div>

              {/* ── Pièces jointes ──────────────────────── */}
              <div className="rounded-xl border border-surface-border bg-surface/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip size={11} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text-secondary">Pièces jointes</span>
                  <span className="text-2xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-surface-border ml-auto">Optionnel</span>
                </div>

                {/* Existing files (edit mode) */}
                {pjExisting.length > 0 && (
                  <div className="space-y-1.5">
                    {pjExisting.map((pj, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-surface-border group">
                        <FileText size={12} className="text-text-muted flex-shrink-0" />
                        <span className="text-xs text-text-secondary flex-1 truncate">{pj.nom}</span>
                        <span className="text-2xs text-text-muted">{formatBytes(pj.taille)}</span>
                        <button type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-text-muted hover:text-red"
                          onClick={() => setPjExisting(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New files staged for upload */}
                {pjFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {pjFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue/5 border border-blue/20 group">
                        <FileText size={12} className="text-blue flex-shrink-0" />
                        <span className="text-xs text-text-secondary flex-1 truncate">{f.name}</span>
                        <span className="text-2xs text-text-muted">{formatBytes(f.size)}</span>
                        <button type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-text-muted hover:text-red"
                          onClick={() => setPjFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-surface-border hover:border-blue/40 hover:bg-blue/5 transition-all cursor-pointer group">
                  <Upload size={13} className="text-text-muted group-hover:text-blue transition-colors" />
                  <span className="text-xs text-text-muted group-hover:text-blue transition-colors">Cliquez ou déposez vos fichiers</span>
                  <span className="text-2xs text-text-muted">(PDF, JPG, PNG · max 5 Mo)</span>
                  <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                      const files = Array.from(e.target.files || [])
                      setPjFiles(prev => [...prev, ...files])
                      e.target.value = ''
                    }} />
                </label>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red/10 border border-red/20">
                  <AlertCircle size={13} className="text-red flex-shrink-0" />
                  <p className="text-xs text-red">{formError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {mode === 'create' ? 'Créer le client' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </form>
          )}

          {/* ════ TAB: EMAIL ════ */}
          {tab === 'email' && (
            <form onSubmit={handleSubmitEmail} className="space-y-4">

              {!emailTo && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20">
                  <Info size={13} className="text-amber flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber">
                    Aucun email disponible. Ajoutez-en un dans l'onglet Informations.
                  </p>
                </div>
              )}

              {/* À */}
              <div className="space-y-1.5">
                <label className="label">À :</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-surface-border">
                  <Mail size={12} className="text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-secondary flex-1 truncate">{emailTo || '—'}</span>
                  {emailTo && <CheckCircle2 size={11} className="text-green flex-shrink-0" />}
                </div>
              </div>

              {/* Objet */}
              <div className="space-y-1.5">
                <label className="label">Objet :</label>
                <input className="input" value={emailSujet}
                  onChange={e => setEmailSujet(e.target.value)}
                  required
                  placeholder="Suivi de notre dernier échange..." />
              </div>

              {/* Modèles */}
              <div className="space-y-1.5">
                <label className="label">Utiliser un modèle</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(EMAIL_TEMPLATES).map(([key, tpl]) => (
                    <button key={key} type="button"
                      onClick={() => { setEmailSujet(tpl.sujet); setEmailMessage(tpl.message) }}
                      className="px-2.5 py-1 rounded-lg border border-surface-border text-2xs font-medium text-text-muted hover:bg-surface-hover hover:text-text-secondary hover:border-blue/30 transition-all">
                      {key === 'bienvenue' ? '👋 Bienvenue' : key === 'suivi' ? '🤝 Suivi' : key === 'relance_devis' ? '📋 Relance devis' : '💰 Relance facture'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="label">Message :</label>
                <textarea
                  className="input min-h-36 resize-none leading-relaxed text-xs"
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  required
                  placeholder="Écrivez votre message ici..." />
              </div>

              {/* Feedback */}
              {emailFeedback && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${emailFeedback.type === 'success' ? 'bg-green/10 border-green/20 text-green' : 'bg-red/10 border-red/20 text-red'}`}>
                  {emailFeedback.type === 'success'
                    ? <CheckCircle2 size={13} className="flex-shrink-0" />
                    : <AlertCircle   size={13} className="flex-shrink-0" />}
                  {emailFeedback.msg}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" type="button" onClick={onClose}>Fermer</Button>
                <Button type="submit" icon={<Send size={13} />} loading={sendingEmail}
                  disabled={!emailTo || !emailSujet || !emailMessage}>
                  Envoyer l'e-mail
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
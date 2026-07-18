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
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import type { Role } from '@/aurantir-front-kit/types/database.types'
import { Send, Copy, Check } from 'lucide-react'

const ROLES: { value: Role; label: string }[] = [
  { value: 'manager',         label: 'Manager'          },
  { value: 'employe_interne', label: 'Employé interne'  },
  { value: 'client_externe',  label: 'Client externe'   },
  { value: 'prestataire',     label: 'Prestataire'      },
  { value: 'invite_lecture',  label: 'Invité (lecture)' },
]

export function InviteMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form,        setForm]        = useState({ email: '', prenom: '', nom: '', role: 'employe_interne' as Role, entite_id: '' })
  const [envoyerEmail, setEnvoyerEmail] = useState(true)
  const [motDePasse,  setMotDePasse]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [warning,     setWarning]     = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied,      setCopied]      = useState(false)
  const [entites,     setEntites]     = useState<{ id: string; nom: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('entites_legales').select('id, nom').then(({ data }) => setEntites(data || []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const res = await fetch('/api/admin/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:         form.email,
        prenom:        form.prenom,
        nom:           form.nom,
        role:          form.role,
        entite_id:     form.entite_id || null,
        envoyer_email: envoyerEmail,
        mot_de_passe:  envoyerEmail ? undefined : motDePasse,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Erreur lors de la création du compte')
      setSaving(false)
      return
    }

    setSaving(false)

    if (json.password) {
      setCreatedPassword(json.password)
      return
    }

    if (!json.emailSent) {
      setWarning("Le compte a été créé, mais l'email d'invitation n'a pas pu être envoyé. Communique le mot de passe temporaire manuellement ou réinitialise-le depuis la gestion des membres.")
      return
    }

    onSuccess()
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(createdPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center">
            <Send size={18} className="text-blue" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Inviter un membre</h3>
            <p className="text-xs text-text-muted">Crée un compte et choisis comment transmettre les accès</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Prénom *</label>
              <input className="input" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="label">Nom *</label>
              <input className="input" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="prenom@exemple.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Rôle *</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Entité</label>
              <select className="input" value={form.entite_id} onChange={e => setForm({ ...form, entite_id: e.target.value })}>
                <option value="">Les deux</option>
                {entites.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </div>

          {!createdPassword && (
            <div className="space-y-1.5">
              <label className="label">Informations de connexion</label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" className="mt-0.5" checked={envoyerEmail} onChange={() => setEnvoyerEmail(true)} />
                  <span className="text-xs text-text-secondary">Envoyer par email : un mot de passe temporaire sera généré et envoyé au membre, qui devra le modifier à sa première connexion.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" className="mt-0.5" checked={!envoyerEmail} onChange={() => setEnvoyerEmail(false)} />
                  <span className="text-xs text-text-secondary">Définir le mot de passe moi-même : aucun email ne sera envoyé, je communiquerai les identifiants directement.</span>
                </label>
              </div>
            </div>
          )}

          {!createdPassword && !envoyerEmail && (
            <div className="space-y-1.5">
              <label className="label">Mot de passe temporaire *</label>
              <input type="text" className="input" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} required minLength={8} placeholder="Au moins 8 caractères" />
            </div>
          )}

          {error && <p className="text-xs text-red bg-red/5 border border-red/20 rounded-lg px-3 py-2">{error}</p>}

          {warning && <p className="text-xs text-amber bg-amber/5 border border-amber/20 rounded-lg px-3 py-2">{warning}</p>}

          {createdPassword && (
            <div className="bg-green/5 border border-green/20 rounded-lg px-3 py-2 space-y-2">
              <p className="text-2xs text-green">Compte créé. Communique ces identifiants au membre :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-surface rounded px-2 py-1 text-text-primary">{createdPassword}</code>
                <Button variant="secondary" type="button" onClick={copyPassword} icon={copied ? <Check size={13} /> : <Copy size={13} />}>
                  {copied ? 'Copié' : 'Copier'}
                </Button>
              </div>
            </div>
          )}

          {!createdPassword && envoyerEmail && (
            <div className="bg-blue/5 border border-blue/20 rounded-lg px-3 py-2">
              <p className="text-2xs text-blue">Un mot de passe temporaire sera généré. Le membre devra le modifier à sa première connexion.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {createdPassword || warning ? (
              <Button type="button" className="flex-1" onClick={onSuccess}>Fermer</Button>
            ) : (
              <>
                <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
                <Button type="submit" className="flex-1" loading={saving} icon={<Send size={13} />}>Inviter</Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
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
import { formatDate } from '@/aurantir-front-kit/lib/utils'
import { Lock, Eye, EyeOff, Shield, Folder, Key } from 'lucide-react'

interface DossierProtege {
  id: string
  nom: string
  description?: string
  entite_id: string
  couleur?: string
  created_at: string
  est_protege: boolean
  mot_de_passe_hash?: string | null
  entite?: { nom: string }
}

export default function DossiersMdpPage() {
  const [dossiers, setDossiers] = useState<DossierProtege[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<DossierProtege | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('dossiers')
      .select('*, entite:entites_legales(nom)')
      .eq('est_protege', true)
      .order('nom')
    setDossiers((data || []) as DossierProtege[])
    setLoading(false)
  }

  async function updatePassword(dossierId: string, newPassword: string) {
    const res = await fetch('/api/bibliotheque/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId, nouveauMotDePasse: newPassword }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return json.error || 'Erreur'
    }
    await load()
    setEditModal(null)
    return null
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Admin — Dossiers</h1>
          <p className="page-subtitle">Dossiers protégés par mot de passe (vue super_admin)</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20">
          <Shield size={12} className="text-amber" />
          <span className="text-2xs text-amber font-medium">Accès restreint — super_admin</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-blue/5 border border-blue/20 flex items-start gap-2">
        <Shield size={13} className="text-blue mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue">
          Les mots de passe sont stockés sous forme de hash : ils ne peuvent pas être
          affichés en clair. Un super_admin peut uniquement définir un nouveau mot de passe.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : dossiers.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Lock size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun dossier protégé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dossiers.map(d => (
            <div key={d.id} className="bg-surface border border-surface-border rounded-xl p-4 flex items-center gap-4 hover:border-amber/20 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (d.couleur || '#3B82F6') + '20' }}>
                <Folder size={16} style={{ color: d.couleur || '#3B82F6' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{d.nom}</p>
                  <Lock size={11} className="text-amber" />
                  <span className="text-2xs text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">
                    {d.entite?.nom || '—'}
                  </span>
                </div>
                {d.description && <p className="text-2xs text-text-muted">{d.description}</p>}
              </div>

              <div className="flex items-center gap-3">
                {d.mot_de_passe_hash ? (
                  <span className="text-2xs text-text-muted bg-surface-hover px-2 py-1 rounded">Mot de passe défini</span>
                ) : (
                  <span className="text-2xs text-red italic">Pas de MDP défini</span>
                )}
                <button
                  onClick={() => setEditModal(d)}
                  className="p-1.5 hover:bg-surface-hover rounded text-text-muted hover:text-blue transition-colors"
                  title="Modifier le mot de passe"
                >
                  <Key size={13} />
                </button>
              </div>

              <p className="text-2xs text-text-muted flex-shrink-0">{formatDate(d.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <EditPasswordModal
          dossier={editModal}
          onClose={() => setEditModal(null)}
          onSave={(pwd) => updatePassword(editModal.id, pwd)}
        />
      )}
    </div>
  )
}

function EditPasswordModal({ dossier, onClose, onSave }: {
  dossier: DossierProtege; onClose: () => void; onSave: (pwd: string) => Promise<string | null>
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pwdMismatch = password.length > 0 && confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 4 && password === confirm

  async function handleSave() {
    if (!canSubmit) return
    setSaving(true); setError('')
    const err = await onSave(password.trim())
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-amber" />
          <h3 className="text-sm font-semibold text-text-primary">Modifier le MDP — {dossier.nom}</h3>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe (min. 4 caractères)"
              autoFocus
              minLength={4}
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            className={`input ${pwdMismatch ? 'border-red/50 focus:border-red' : ''}`}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmer le nouveau mot de passe"
          />
          {pwdMismatch && <p className="text-xs text-red">Les mots de passe ne correspondent pas</p>}
          {error && <p className="text-xs text-red">{error}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1" loading={saving} disabled={!canSubmit} onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}
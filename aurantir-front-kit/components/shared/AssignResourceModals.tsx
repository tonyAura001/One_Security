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
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import type { User } from '@/aurantir-front-kit/types/database.types'
import {
  Search, Loader2, FolderKanban, Check, CheckCircle2, AlertCircle, X, FileText, Receipt,
} from 'lucide-react'

// ══════════════════════════════════════════════════════════════
// ── AssignProjetsModal ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
interface Projet { id: string; titre: string; statut: string; entite_nom: string | null }

export function AssignProjetsModal({ client, onClose }: { client: User; onClose: () => void }) {
  const [projets,   setProjets]   = useState<Projet[]>([])
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError,  setSaveError]  = useState('')
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      // Tous les projets actifs
      supabase.from('projets')
        .select('id, titre, statut, entites_legales(nom)')
        .in('statut', ['en_cours', 'planifie'])
        .order('titre'),
      // Projets déjà assignés au membre
      fetch(`/api/admin/assign-projets-client?member_user_id=${client.id}`).then(r => r.json()),
    ]).then(([{ data: pData }, assigned]) => {
      setProjets((pData || []).map((p: any) => ({
        id: p.id, titre: p.titre, statut: p.statut,
        entite_nom: p.entites_legales?.nom ?? null,
      })))
      setSelected(new Set((assigned.projet_ids || []) as string[]))
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleProjet(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveStatus('idle')
    setSaveError('')
    try {
      const res = await fetch('/api/admin/assign-projets-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_user_id: client.id, projet_ids: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setSaveError(data.error ?? 'Erreur lors de l\'assignation')
        setSaveStatus('error')
        setSaving(false)
        return
      }
      setSaveStatus('success')
      setSaving(false)
      setTimeout(() => onClose(), 1200)
    } catch {
      setSaveError('Erreur réseau — vérifiez votre connexion')
      setSaveStatus('error')
      setSaving(false)
    }
  }

  const STATUT_COLOR: Record<string, string> = {
    en_cours: 'text-green', planifie: 'text-blue',
  }
  const STATUT_LABEL: Record<string, string> = {
    en_cours: 'En cours', planifie: 'Planifié',
  }

  const filtered = projets.filter(p =>
    p.titre.toLowerCase().includes(search.toLowerCase()) ||
    (p.entite_nom ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center">
              <FolderKanban size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Assigner des projets</h3>
              <p className="text-xs text-text-muted">{client.prenom} {client.nom} — {client.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Explication */}
        <div className="px-6 py-3 bg-blue/5 border-b border-blue/10">
          <p className="text-xs text-blue">
            {client.role === 'manager'
              ? 'Cochez les projets que ce manager supervisera. Il pourra gérer les tâches, l\'équipe et l\'avancement du projet.'
              : client.role === 'employe_interne'
              ? 'Cochez les projets sur lesquels cet employé travaillera. Il pourra modifier les tâches qui lui sont assignées.'
              : client.role === 'prestataire'
              ? 'Cochez les projets sur lesquels ce prestataire interviendra. Il aura accès aux tâches qui lui sont assignées et pourra les modifier.'
              : client.role === 'invite_lecture'
              ? 'Cochez les projets que cet invité pourra consulter. Accès en lecture seule, aucune modification possible.'
              : 'Cochez les projets auxquels ce client aura accès en lecture. Il pourra consulter les tâches, les ressources et l\'avancement.'}
          </p>
        </div>

        {/* Recherche */}
        <div className="px-6 py-3 border-b border-surface-border">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-8 text-xs"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Liste projets */}
        <div className="overflow-y-auto max-h-72 px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Aucun projet actif trouvé</p>
            </div>
          ) : filtered.map(p => {
            const isChecked = selected.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggleProjet(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  isChecked ? 'bg-blue/5 hover:bg-blue/10' : 'hover:bg-surface-hover'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                  isChecked
                    ? 'bg-blue border-blue'
                    : 'border-surface-border bg-surface'
                }`}>
                  {isChecked && <Check size={11} className="text-white" />}
                </div>

                {/* Icône projet */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'bg-blue/15' : 'bg-surface-elevated'
                }`}>
                  <FolderKanban size={14} className={isChecked ? 'text-blue' : 'text-text-muted'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isChecked ? 'text-blue' : 'text-text-primary'}`}>
                    {p.titre}
                  </p>
                  {p.entite_nom && <p className="text-2xs text-text-muted truncate">{p.entite_nom}</p>}
                </div>

                {/* Statut */}
                <span className={`text-2xs font-medium flex-shrink-0 ${STATUT_COLOR[p.statut] ?? 'text-text-muted'}`}>
                  {STATUT_LABEL[p.statut] ?? p.statut}
                </span>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {saveStatus === 'success' && (
          <div className="px-6 py-2.5 bg-green/10 border-t border-green/20 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green flex-shrink-0" />
            <p className="text-xs text-green font-medium">Projets assignés avec succès</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="px-6 py-2.5 bg-red/10 border-t border-red/20 flex items-center gap-2">
            <AlertCircle size={14} className="text-red flex-shrink-0" />
            <p className="text-xs text-red">{saveError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
          <span className="text-xs text-text-muted">
            {selected.size} projet{selected.size !== 1 ? 's' : ''} sélectionné{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" loading={saving} onClick={handleSave} icon={<Check size={13} />}
              disabled={saving || saveStatus === 'success'}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── AssignDocumentsModal (devis / factures) ──────────────────
// ══════════════════════════════════════════════════════════════
type TypeDocumentAssign = 'devis' | 'facture'
interface DocumentAssign {
  id: string
  numero: string
  titre: string | null
  montant_ttc: number
  statut: string
  client_nom: string | null
}

const DEVIS_STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté',
  refuse: 'Refusé', expire: 'Expiré', converti: 'Converti',
}
const DEVIS_STATUT_COLOR: Record<string, string> = {
  brouillon: 'text-text-muted', envoye: 'text-blue', accepte: 'text-green',
  refuse: 'text-red', expire: 'text-amber', converti: 'text-violet',
}
const FACTURE_STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', signee: 'Signée',
  payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée',
}
const FACTURE_STATUT_COLOR: Record<string, string> = {
  brouillon: 'text-text-muted', envoyee: 'text-blue', signee: 'text-violet',
  payee: 'text-green', en_retard: 'text-red', annulee: 'text-text-muted',
}

export function AssignDocumentsModal({ client, typeDocument, onClose }: {
  client: User; typeDocument: TypeDocumentAssign; onClose: () => void
}) {
  const [documents, setDocuments] = useState<DocumentAssign[]>([])
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError,  setSaveError]  = useState('')
  const [loadError,  setLoadError]  = useState('')
  const supabase = createClient()

  const isDevis = typeDocument === 'devis'
  const Icon = isDevis ? FileText : Receipt
  const STATUT_LABEL = isDevis ? DEVIS_STATUT_LABEL : FACTURE_STATUT_LABEL
  const STATUT_COLOR = isDevis ? DEVIS_STATUT_COLOR : FACTURE_STATUT_COLOR

  useEffect(() => {
    // Pas de FK déclarée entre devis/factures et entreprises_clientes (client_id est un uuid
    // nu) → impossible d'utiliser un embed PostgREST ; on résout le nom via une requête séparée.
    const columns = isDevis
      ? 'id, numero, titre, montant_ttc, statut, client_id'
      : 'id, numero, montant_ttc, statut, client_id'
    Promise.all([
      supabase.from(isDevis ? 'devis' : 'factures')
        .select(columns)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('entreprises_clientes').select('id, nom_entreprise'),
      fetch(`/api/admin/assign-documents-client?member_user_id=${client.id}&type_document=${typeDocument}`).then(r => r.json()),
    ]).then(([{ data: dData, error: dError }, { data: cData, error: cError }, assigned]) => {
      if (dError) setLoadError(`Erreur chargement ${label} : ${dError.message}`)
      else if (cError) setLoadError(`Erreur chargement clients : ${cError.message}`)
      else setLoadError('')
      const nomParClientId = new Map((cData || []).map((c: any) => [c.id, c.nom_entreprise as string]))
      setDocuments((dData || []).map((d: any) => ({
        id: d.id, numero: d.numero, titre: d.titre ?? null,
        montant_ttc: d.montant_ttc ?? 0, statut: d.statut,
        client_nom: d.client_id ? (nomParClientId.get(d.client_id) ?? null) : null,
      })))
      setSelected(new Set((assigned.document_ids || []) as string[]))
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDocument(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveStatus('idle')
    setSaveError('')
    try {
      const res = await fetch('/api/admin/assign-documents-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_user_id: client.id, type_document: typeDocument, document_ids: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setSaveError(data.error ?? 'Erreur lors de l\'assignation')
        setSaveStatus('error')
        setSaving(false)
        return
      }
      setSaveStatus('success')
      setSaving(false)
      setTimeout(() => onClose(), 1200)
    } catch {
      setSaveError('Erreur réseau — vérifiez votre connexion')
      setSaveStatus('error')
      setSaving(false)
    }
  }

  const filtered = documents.filter(d =>
    d.numero.toLowerCase().includes(search.toLowerCase()) ||
    (d.titre ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.client_nom ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const label = isDevis ? 'devis' : 'factures'
  const labelSingulier = isDevis ? 'devis' : 'facture'
  const article = isDevis ? 'un' : 'une'
  const accordSingulier = isDevis ? '' : 'e'   // "Aucun devis" / "Aucune facture"
  const accordPluriel = isDevis ? '' : 's'     // "devis sélectionnés" / "factures sélectionnées"
  const accordPlurielFeminin = isDevis ? '' : 'e'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center">
              <Icon size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Assigner des {label}</h3>
              <p className="text-xs text-text-muted">{client.prenom} {client.nom} — {client.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Explication */}
        <div className="px-6 py-3 bg-blue/5 border-b border-blue/10">
          <p className="text-xs text-blue">
            Cochez les {label} auxquels ce client aura accès en lecture dans son espace, en plus de ceux déjà liés à son entreprise.
          </p>
        </div>

        {/* Recherche */}
        <div className="px-6 py-3 border-b border-surface-border">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-8 text-xs"
              placeholder={`Rechercher ${article} ${labelSingulier}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Liste documents */}
        <div className="overflow-y-auto max-h-72 px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Icon size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Aucun{accordSingulier} {labelSingulier} trouvé{accordSingulier}</p>
              {loadError && <p className="text-2xs text-red mt-2 px-6">{loadError}</p>}
            </div>
          ) : filtered.map(d => {
            const isChecked = selected.has(d.id)
            return (
              <button
                key={d.id}
                onClick={() => toggleDocument(d.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  isChecked ? 'bg-blue/5 hover:bg-blue/10' : 'hover:bg-surface-hover'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                  isChecked
                    ? 'bg-blue border-blue'
                    : 'border-surface-border bg-surface'
                }`}>
                  {isChecked && <Check size={11} className="text-white" />}
                </div>

                {/* Icône document */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'bg-blue/15' : 'bg-surface-elevated'
                }`}>
                  <Icon size={14} className={isChecked ? 'text-blue' : 'text-text-muted'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isChecked ? 'text-blue' : 'text-text-primary'}`}>
                    {d.numero}{d.titre ? ` — ${d.titre}` : ''}
                  </p>
                  <p className="text-2xs text-text-muted truncate">
                    {d.client_nom ?? '—'} · {formatMontant(d.montant_ttc)}
                  </p>
                </div>

                {/* Statut */}
                <span className={`text-2xs font-medium flex-shrink-0 ${STATUT_COLOR[d.statut] ?? 'text-text-muted'}`}>
                  {STATUT_LABEL[d.statut] ?? d.statut}
                </span>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {saveStatus === 'success' && (
          <div className="px-6 py-2.5 bg-green/10 border-t border-green/20 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green flex-shrink-0" />
            <p className="text-xs text-green font-medium">{label.charAt(0).toUpperCase() + label.slice(1)} assigné{accordPlurielFeminin}s avec succès</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="px-6 py-2.5 bg-red/10 border-t border-red/20 flex items-center gap-2">
            <AlertCircle size={14} className="text-red flex-shrink-0" />
            <p className="text-xs text-red">{saveError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
          <span className="text-xs text-text-muted">
            {selected.size} {labelSingulier}{selected.size !== 1 ? accordPluriel : ''} sélectionné{accordPlurielFeminin}{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" loading={saving} onClick={handleSave} icon={<Check size={13} />}
              disabled={saving || saveStatus === 'success'}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
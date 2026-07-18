// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatDate, formatRelativeTime, initiales } from '@/aurantir-front-kit/lib/utils'
import { FileText, Plus, Globe, Lock, Users, Building2, ChevronRight } from 'lucide-react'

type RapportStatut = 'brouillon' | 'publie' | 'archive'
type RapportVisibilite = 'prive' | 'equipe' | 'fondateurs' | 'public'

interface Rapport {
  id: string
  numero: string
  titre: string
  type: string
  statut: RapportStatut
  visibilite: RapportVisibilite
  resume?: string
  created_at: string
  published_at?: string
  redacteur?: { prenom: string; nom: string }
}

const STATUT_CFG: Record<RapportStatut, string> = {
  brouillon: 'bg-surface text-text-muted border-surface-border',
  publie:    'bg-green/10 text-green border-green/20',
  archive:   'bg-surface text-text-disabled border-surface-border',
}
const VISI_CFG: Record<RapportVisibilite, { label: string; icon: React.ReactNode; cls: string }> = {
  prive:      { label: 'Privé',      icon: <Lock size={9} />,     cls: 'bg-red/10 text-red border-red/20' },
  equipe:     { label: 'Équipe',     icon: <Users size={9} />,    cls: 'bg-blue/10 text-blue border-blue/20' },
  fondateurs: { label: 'Fondateurs', icon: <Building2 size={9} />, cls: 'bg-violet/10 text-violet border-violet/20' },
  public:     { label: 'Public',     icon: <Globe size={9} />,    cls: 'bg-green/10 text-green border-green/20' },
}

export default function ProjetRapportsPage() {
  const { id: projetId } = useParams<{ id: string }>()
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [projetId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('rapports')
      .select('*, redacteur:users!redacteur_id(prenom, nom)')
      .eq('projet_id', projetId)
      .order('created_at', { ascending: false })
    setRapports((data || []) as Rapport[])
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
        <Link href={`/projets/${projetId}`} className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Projet
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">Rapports</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rapports du projet</h1>
          <p className="page-subtitle">{rapports.length} rapport{rapports.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Nouveau rapport</Button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)
          : rapports.length === 0
            ? (
              <div className="text-center py-12 text-text-muted">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun rapport pour ce projet</p>
              </div>
            )
            : rapports.map(r => {
              const visi = VISI_CFG[r.visibilite]
              return (
                <Link key={r.id} href={`/rapports/${r.id}`}
                  className="block bg-surface border border-surface-border rounded-xl p-4 hover:border-blue/30 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.numero && <span className="text-2xs font-mono text-text-muted">{r.numero}</span>}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs border font-medium ${STATUT_CFG[r.statut]}`}>
                            {r.statut}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs border font-medium ${visi.cls}`}>
                            {visi.icon}{visi.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-blue transition-colors">{r.titre}</h3>
                        {r.resume && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{r.resume}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          {r.redacteur && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-violet/10 flex items-center justify-center text-2xs font-bold text-violet">
                                {r.redacteur.prenom?.[0]}
                              </div>
                              <span className="text-2xs text-text-muted">{r.redacteur.prenom} {r.redacteur.nom}</span>
                            </div>
                          )}
                          <span className="text-2xs text-text-muted">{formatRelativeTime(r.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ChevronRight size={14} className="text-text-muted group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              )
            })
        }
      </div>

      {showForm && (
        <NouveauRapportModal
          projetId={projetId}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function NouveauRapportModal({ projetId, onClose, onSuccess }: { projetId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ titre: '', type: 'rapport_projet', visibilite: 'equipe' as RapportVisibilite, resume: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id, entite_id').eq('auth_user_id', user!.id).single()
    const { error: insertError } = await supabase.from('rapports').insert({
      projet_id: projetId,
      entite_id: userData?.entite_id || '',
      titre: form.titre,
      type: form.type,
      visibilite: form.visibilite,
      resume: form.resume || null,
      statut: 'brouillon',
      redacteur_id: userData!.id,
    })
    setSaving(false)
    if (!insertError) onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Nouveau rapport</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Titre *</label>
            <input type="text" className="input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="rapport_projet">Projet</option>
                <option value="rapport_activite">Activité</option>
                <option value="bilan">Bilan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Visibilité</label>
              <select className="input" value={form.visibilite} onChange={e => setForm({ ...form, visibilite: e.target.value as RapportVisibilite })}>
                <option value="prive">Privé</option>
                <option value="equipe">Équipe</option>
                <option value="fondateurs">Fondateurs</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Résumé</label>
            <textarea className="input" rows={2} value={form.resume} onChange={e => setForm({ ...form, resume: e.target.value })} placeholder="Résumé exécutif..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving}>Créer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
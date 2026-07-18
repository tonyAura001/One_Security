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
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatDate } from '@/aurantir-front-kit/lib/utils'
import { Plus, Globe, Calendar, CheckCircle, Clock, Edit3, Target, Share2, AtSign, Send } from 'lucide-react'

type StatutPub = 'idee' | 'en_redaction' | 'a_valider' | 'planifie' | 'publie' | 'annule'
type Plateforme = 'instagram' | 'linkedin' | 'twitter' | 'site_web' | 'newsletter' | 'autre'

interface Publication {
  id: string
  entite_id: string
  titre: string
  contenu?: string
  plateforme: Plateforme[]
  statut: StatutPub
  date_publication?: string
  auteur_id?: string
  campagne_id?: string
  tags?: string[]
  created_at: string
  auteur?: { prenom: string; nom: string }
}

interface Campagne {
  id: string
  entite_id: string
  nom: string
  objectif?: string
  date_debut?: string
  date_fin?: string
  statut: string
  budget?: number
}

const STATUT_CONFIG: Record<StatutPub, { label: string; className: string; icon: React.ReactNode }> = {
  idee:          { label: 'Idée',          className: 'bg-surface text-text-muted border-surface-border',   icon: <Edit3 size={9} /> },
  en_redaction:  { label: 'Rédaction',     className: 'bg-blue/10 text-blue border-blue/20',                icon: <Edit3 size={9} /> },
  a_valider:     { label: 'À valider',     className: 'bg-amber/10 text-amber border-amber/20',             icon: <Clock size={9} /> },
  planifie:      { label: 'Planifié',      className: 'bg-violet/10 text-violet border-violet/20',          icon: <Calendar size={9} /> },
  publie:        { label: 'Publié',        className: 'bg-green/10 text-green border-green/20',             icon: <CheckCircle size={9} /> },
  annule:        { label: 'Annulé',        className: 'bg-surface text-text-disabled border-surface-border', icon: <Clock size={9} /> },
}

const PLATEFORME_ICONS: Record<Plateforme, React.ReactNode> = {
  instagram:   <AtSign size={12} />,
  linkedin:    <Share2 size={12} />,
  twitter:     <Send size={12} />,
  site_web:    <Globe size={12} />,
  newsletter:  <Globe size={12} />,
  autre:       <Globe size={12} />,
}

const PLATEFORME_COLORS: Record<Plateforme, string> = {
  instagram:   '#E1306C',
  linkedin:    '#0A66C2',
  twitter:     '#1DA1F2',
  site_web:    '#6B7280',
  newsletter:  '#8B5CF6',
  autre:       '#6B7280',
}

export default function CalendrierEditorialPage() {
  const { entiteActive } = useAppStore()
  const [publications, setPublications] = useState<Publication[]>([])
  const [campagnes, setCampagnes] = useState<Campagne[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'liste'>('kanban')
  const [showForm, setShowForm] = useState(false)
  const [showCampagneForm, setShowCampagneForm] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [entiteActive?.id])

  async function load() {
    setLoading(true)
    let qP = supabase.from('publications_editoriales').select('*, auteur:users!auteur_id(prenom, nom)').order('date_publication', { ascending: true })
    let qC = supabase.from('campagnes_communication').select('*').order('date_debut', { ascending: true })
    if (entiteActive?.id) { qP = qP.eq('entite_id', entiteActive.id); qC = qC.eq('entite_id', entiteActive.id) }
    const [{ data: pData }, { data: cData }] = await Promise.all([qP, qC])
    setPublications((pData || []) as Publication[])
    setCampagnes((cData || []) as Campagne[])
    setLoading(false)
  }

  async function movePublication(id: string, newStatut: StatutPub) {
    await supabase.from('publications_editoriales').update({ statut: newStatut }).eq('id', id)
    setPublications(prev => prev.map(p => p.id === id ? { ...p, statut: newStatut } : p))
  }

  const COLONNES: { statut: StatutPub }[] = [
    { statut: 'idee' },
    { statut: 'en_redaction' },
    { statut: 'a_valider' },
    { statut: 'planifie' },
    { statut: 'publie' },
  ]

  const stats = {
    total: publications.length,
    publies: publications.filter(p => p.statut === 'publie').length,
    planifies: publications.filter(p => p.statut === 'planifie').length,
    campagnes: campagnes.length,
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendrier Éditorial</h1>
          <p className="page-subtitle">Publications et campagnes de communication</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-surface-border rounded-lg overflow-hidden">
            {(['kanban', 'liste'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                {v === 'kanban' ? 'Kanban' : 'Liste'}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Target size={14} />} onClick={() => setShowCampagneForm(true)}>Campagne</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Publication</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Planifiées', value: stats.planifies, color: 'text-violet' },
          { label: 'Publiées', value: stats.publies, color: 'text-green' },
          { label: 'Campagnes', value: stats.campagnes, color: 'text-blue' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-surface-border rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color || 'text-text-primary'}`}>{loading ? '—' : s.value}</p>
            <p className="text-2xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Campagnes actives */}
      {campagnes.filter(c => c.statut === 'active' || c.statut === 'planifie').length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {campagnes.filter(c => c.statut === 'active' || c.statut === 'planifie').map(c => (
            <div key={c.id} className="flex-shrink-0 bg-surface border border-blue/20 rounded-xl px-4 py-3 min-w-48">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={11} className="text-blue" />
                <span className="text-2xs text-blue font-medium">Campagne</span>
              </div>
              <p className="text-xs font-semibold text-text-primary">{c.nom}</p>
              {c.date_debut && c.date_fin && (
                <p className="text-2xs text-text-muted mt-0.5">{formatDate(c.date_debut)} → {formatDate(c.date_fin)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar" style={{ minHeight: '60vh' }}>
          {COLONNES.map(col => {
            const cfg = STATUT_CONFIG[col.statut]
            const colPubs = publications.filter(p => p.statut === col.statut)
            return (
              <div
                key={col.statut}
                className="flex-shrink-0 w-64 flex flex-col rounded-xl border border-surface-border overflow-hidden bg-background-elevated/30"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('pubId')
                  if (id) movePublication(id, col.statut)
                }}
              >
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-surface-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-2xs font-medium ${cfg.className} px-1.5 py-0.5 rounded-full border`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <span className="text-2xs text-text-muted bg-surface px-1.5 py-0.5 rounded-full">{colPubs.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                  {loading
                    ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)
                    : colPubs.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('pubId', p.id); e.dataTransfer.effectAllowed = 'move' }}
                        className="bg-surface border border-surface-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-blue/30 transition-all"
                      >
                        <p className="text-xs font-semibold text-text-primary leading-tight">{p.titre}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(p.plateforme || []).map(pl => (
                            <span key={pl} className="flex items-center gap-0.5 text-2xs px-1 py-0.5 rounded border" style={{ color: PLATEFORME_COLORS[pl], borderColor: PLATEFORME_COLORS[pl] + '40', background: PLATEFORME_COLORS[pl] + '15' }}>
                              {PLATEFORME_ICONS[pl]}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          {p.date_publication
                            ? <span className="text-2xs text-text-muted flex items-center gap-1"><Calendar size={9} />{formatDate(p.date_publication)}</span>
                            : <span />}
                          {(p as any).auteur && (
                            <span className="text-2xs text-text-muted">{(p as any).auteur.prenom?.[0]}{(p as any).auteur.nom?.[0]}</span>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Titre</th><th>Plateformes</th><th>Statut</th><th>Date</th><th>Auteur</th></tr></thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded w-20" /></td>)}</tr>)
                : publications.length === 0
                  ? <tr><td colSpan={5} className="py-8 text-center text-text-muted text-sm">Aucune publication</td></tr>
                  : publications.map(p => {
                    const cfg = STATUT_CONFIG[p.statut]
                    return (
                      <tr key={p.id}>
                        <td className="text-xs font-medium text-text-primary max-w-48 truncate">{p.titre}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            {(p.plateforme || []).map(pl => (
                              <span key={pl} style={{ color: PLATEFORME_COLORS[pl] }}>{PLATEFORME_ICONS[pl]}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-medium border ${cfg.className}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="text-xs text-text-muted">{p.date_publication ? formatDate(p.date_publication) : '—'}</td>
                        <td className="text-xs text-text-muted">
                          {(p as any).auteur ? `${(p as any).auteur.prenom} ${(p as any).auteur.nom}` : '—'}
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PublicationModal
          entiteId={entiteActive?.id || ''}
          campagnes={campagnes}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function PublicationModal({ entiteId, campagnes, onClose, onSuccess }: {
  entiteId: string; campagnes: Campagne[]; onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState({
    titre: '', contenu: '', statut: 'idee' as StatutPub,
    date_publication: '', campagne_id: '',
    plateformes: [] as Plateforme[]
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function togglePlateforme(pl: Plateforme) {
    setForm(f => ({
      ...f,
      plateformes: f.plateformes.includes(pl) ? f.plateformes.filter(p => p !== pl) : [...f.plateformes, pl]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', user!.id).single()
    const { error: insertError } = await supabase.from('publications_editoriales').insert({
      entite_id: entiteId,
      titre: form.titre,
      contenu: form.contenu || null,
      statut: form.statut,
      plateforme: form.plateformes,
      date_publication: form.date_publication || null,
      campagne_id: form.campagne_id || null,
      auteur_id: userData!.id,
    })
    setSaving(false)
    if (!insertError) onSuccess()
  }

  const PLATEFORMES: Plateforme[] = ['instagram', 'linkedin', 'twitter', 'site_web', 'newsletter']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Nouvelle publication</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Titre *</label>
            <input type="text" className="input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required placeholder="Sujet de la publication" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="label">Plateformes</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PLATEFORMES.map(pl => (
                <button key={pl} type="button" onClick={() => togglePlateforme(pl)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${form.plateformes.includes(pl) ? 'border-blue/40 bg-blue/10 text-blue' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
                  <span style={{ color: form.plateformes.includes(pl) ? undefined : PLATEFORME_COLORS[pl] }}>{PLATEFORME_ICONS[pl]}</span>
                  <span className="capitalize">{pl.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Statut</label>
              <select className="input" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value as StatutPub })}>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Date publication</label>
              <input type="datetime-local" className="input" value={form.date_publication} onChange={e => setForm({ ...form, date_publication: e.target.value })} />
            </div>
          </div>
          {campagnes.length > 0 && (
            <div className="space-y-1.5">
              <label className="label">Campagne</label>
              <select className="input" value={form.campagne_id} onChange={e => setForm({ ...form, campagne_id: e.target.value })}>
                <option value="">Aucune</option>
                {campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="label">Contenu / Brouillon</label>
            <textarea className="input" rows={3} value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} placeholder="Texte de la publication..." />
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
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
import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'
import { Plus, TrendingUp, DollarSign, Target, Users, Paperclip, X, FileText, Eye, Download, Mail, Phone, Calendar, StickyNote } from 'lucide-react'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'

type StadeProspect = 'nouveau' | 'contacte' | 'qualification' | 'proposition' | 'negociation' | 'gagne' | 'perdu'

interface PieceJointe { nom: string; url_stockage: string; taille: number; type: string }

interface Prospect {
  id: string
  entite_id: string
  nom_entreprise: string
  contact_nom?: string
  contact_email?: string
  contact_telephone?: string
  stade: StadeProspect
  valeur_estimee?: number
  probabilite?: number
  source?: string
  notes?: string
  date_relance?: string
  created_at: string
  pieces_jointes?: PieceJointe[]
}

const STADES: { stade: StadeProspect; label: string; color: string; bg: string }[] = [
  { stade: 'nouveau',       label: 'Nouveau',       color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  { stade: 'contacte',      label: 'Contacté',      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { stade: 'qualification', label: 'Qualification', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { stade: 'proposition',   label: 'Proposition',   color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { stade: 'negociation',   label: 'Négociation',   color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  { stade: 'gagne',         label: 'Gagné',         color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { stade: 'perdu',         label: 'Perdu',         color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
]

export default function ProspectsPage() {
  const { entites, entiteActive } = useAppStore()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<StadeProspect | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) setEntiteFiltre(entiteActive.id)
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProspects() }, [entiteFiltre]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProspects() {
    setLoading(true)
    let q = supabase.from('prospects').select('*').order('created_at', { ascending: false })
    if (entiteFiltre) q = q.eq('entite_id', entiteFiltre)
    const { data } = await q
    setProspects((data || []) as Prospect[])
    setLoading(false)
  }

  async function moveProspect(id: string, newStade: StadeProspect) {
    await supabase.from('prospects').update({ stade: newStade }).eq('id', id)
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stade: newStade } : p))
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id); e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }
  function handleDrop(e: React.DragEvent, stade: StadeProspect) {
    e.preventDefault()
    if (draggedId) { moveProspect(draggedId, stade); setDraggedId(null) }
  }

  const pipelineValue = prospects
    .filter(p => !['gagne', 'perdu'].includes(p.stade))
    .reduce((s, p) => s + ((p.valeur_estimee || 0) * (p.probabilite || 50) / 100), 0)

  const tauxConversion = prospects.length > 0
    ? Math.round(prospects.filter(p => p.stade === 'gagne').length / prospects.filter(p => ['gagne', 'perdu'].includes(p.stade)).length * 100) || 0
    : 0

  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline commercial</h1>
          <p className="page-subtitle">{entiteCourante ? entiteCourante.nom : 'Vue globale'} — {prospects.length} prospect{prospects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm('nouveau')}>Nouveau prospect</Button>
      </div>

      {/* Filtres entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === null ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
          Vue globale
        </button>
        {entites.map(e => (
          <button key={e.id} onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {e.nom}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total prospects', value: loading ? '—' : prospects.length, icon: <Users size={14} />, color: 'text-blue' },
          { label: 'Pipeline pondéré', value: loading ? '—' : formatMontant(pipelineValue), icon: <DollarSign size={14} />, color: 'text-violet' },
          { label: 'Taux conversion', value: loading ? '—' : `${tauxConversion}%`, icon: <TrendingUp size={14} />, color: 'text-green' },
          { label: 'Gagnés', value: loading ? '—' : prospects.filter(p => p.stade === 'gagne').length, icon: <Target size={14} />, color: 'text-green' },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-surface-border rounded-xl p-4 space-y-1">
            <div className={`${k.color}`}>{k.icon}</div>
            <p className="text-xs text-text-muted">{k.label}</p>
            <p className="text-lg font-bold text-text-primary">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Pipeline */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar" style={{ minHeight: '60vh' }}>
        {STADES.map(col => {
          const colProspects = prospects.filter(p => p.stade === col.stade)
          const colValue = colProspects.reduce((s, p) => s + (p.valeur_estimee || 0), 0)
          return (
            <div
              key={col.stade}
              className="flex-shrink-0 w-64 flex flex-col rounded-xl border border-surface-border overflow-hidden"
              style={{ background: col.bg }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.stade)}
            >
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-surface-border/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold text-text-primary">{col.label}</span>
                  <span className="text-2xs text-text-muted bg-surface px-1.5 py-0.5 rounded-full">{colProspects.length}</span>
                </div>
                <button onClick={() => setShowForm(col.stade)} className="text-text-muted hover:text-text-primary transition-colors p-0.5">
                  <Plus size={13} />
                </button>
              </div>
              {colValue > 0 && (
                <div className="px-3 py-1 border-b border-surface-border/30">
                  <span className="text-2xs text-text-muted">{formatMontant(colValue)}</span>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)
                  : colProspects.map(p => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      isDragging={draggedId === p.id}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onOpen={() => setSelectedProspect(p)}
                    />
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <NouveauProspectModal
          stadeInitial={showForm}
          entiteId={entiteFiltre || ''}
          entites={entites}
          onClose={() => setShowForm(null)}
          onSuccess={() => { setShowForm(null); loadProspects() }}
        />
      )}

      {selectedProspect && (
        <ProspectDetailPanel
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
        />
      )}
    </div>
  )
}

function ProspectCard({ prospect: p, isDragging, onDragStart, onOpen }: {
  prospect: Prospect; isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onOpen: () => void
}) {
  const pjCount = p.pieces_jointes?.length ?? 0
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`bg-surface border border-surface-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue/30 transition-all group ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-text-primary truncate flex-1">{p.nom_entreprise}</p>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onOpen() }}
          onMouseDown={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-blue/10 text-text-muted hover:text-blue flex-shrink-0"
        >
          <Eye size={12} />
        </button>
      </div>
      {p.contact_nom && <p className="text-2xs text-text-muted mt-0.5">{p.contact_nom}</p>}
      <div className="flex items-center justify-between mt-2">
        {p.valeur_estimee
          ? <span className="text-2xs font-medium text-green">{formatMontant(p.valeur_estimee)}</span>
          : <span />
        }
        {p.probabilite !== undefined && (
          <span className="text-2xs text-text-muted">{p.probabilite}%</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        {p.date_relance
          ? <p className="text-2xs text-amber">📅 {formatDate(p.date_relance)}</p>
          : <span />
        }
        {pjCount > 0 && (
          <span className="flex items-center gap-0.5 text-2xs text-text-muted">
            <Paperclip size={9} /> {pjCount}
          </span>
        )}
      </div>
    </div>
  )
}

function NouveauProspectModal({ stadeInitial, entiteId, entites, onClose, onSuccess }: {
  stadeInitial: StadeProspect; entiteId: string
  entites: { id: string; nom: string }[]
  onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState({
    nom_entreprise: '', contact_nom: '', contact_email: '', contact_telephone: '',
    stade: stadeInitial, valeur_estimee: '', probabilite: '50', source: '', notes: '', date_relance: '',
    entite_id: entiteId,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const supabase = createClient()

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (selected.length > 0) setFiles(prev => [...prev, ...selected])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id, entite_principale_id').eq('auth_user_id', user!.id).single()
    if (!userData) { setError('Profil introuvable.'); setSaving(false); return }
    const resolvedEntiteId = form.entite_id || userData.entite_principale_id
    if (!resolvedEntiteId) { setError('Sélectionnez une entité.'); setSaving(false); return }
    const { data: prospect, error: insertError } = await supabase.from('prospects').insert({
      entite_id: resolvedEntiteId,
      nom_entreprise: form.nom_entreprise,
      contact_nom: form.contact_nom || null,
      contact_email: form.contact_email || null,
      contact_telephone: form.contact_telephone || null,
      stade: form.stade,
      valeur_estimee: form.valeur_estimee ? parseFloat(form.valeur_estimee) : null,
      probabilite: parseInt(form.probabilite),
      source: form.source || null,
      notes: form.notes || null,
      date_relance: form.date_relance || null,
      created_by: userData.id,
    }).select('id').single()
    if (insertError) { setError(insertError.message); setSaving(false); return }
    if (prospect?.id && files.length > 0) {
      const pj: { nom: string; url_stockage: string; taille: number; type: string }[] = []
      for (const file of files) {
        const safeName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
        const path = `prospects/${prospect.id}/${Date.now()}_${safeName}`
        const { storedPath, error: ue } = await uploadToStorage(supabase, 'documents', path, file)
        if (!ue) pj.push({ nom: file.name, url_stockage: storedPath, taille: file.size, type: file.type })
      }
      if (pj.length > 0) {
        await supabase.from('prospects').update({ pieces_jointes: pj } as any).eq('id', prospect.id)
      }
    }
    setSaving(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Nouveau prospect</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20"><p className="text-xs text-red">{error}</p></div>}
          {entites.length > 1 && (
            <div className="space-y-1.5">
              <label className="label">Entité *</label>
              <div className="flex gap-2">
                {entites.map(e => (
                  <button key={e.id} type="button" onClick={() => setForm(f => ({ ...f, entite_id: e.id }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.entite_id === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:bg-surface-hover'}`}>
                    {e.nom}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="label">Entreprise *</label>
            <input type="text" className="input" value={form.nom_entreprise} onChange={e => setForm({ ...form, nom_entreprise: e.target.value })} required placeholder="Nom de l'entreprise" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Contact</label>
              <input type="text" className="input" value={form.contact_nom} onChange={e => setForm({ ...form, contact_nom: e.target.value })} placeholder="Nom contact" />
            </div>
            <div className="space-y-1.5">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="email@..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Numéro de téléphone</label>
            <input type="tel" className="input" value={form.contact_telephone} onChange={e => setForm({ ...form, contact_telephone: e.target.value })} placeholder="+221..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Valeur estimée (FCFA)</label>
              <input type="number" className="input" value={form.valeur_estimee} onChange={e => setForm({ ...form, valeur_estimee: e.target.value })} placeholder="0" min="0" />
            </div>
            <div className="space-y-1.5">
              <label className="label">Probabilité (%)</label>
              <input type="number" className="input" value={form.probabilite} onChange={e => setForm({ ...form, probabilite: e.target.value })} min="0" max="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Stade</label>
              <select className="input" value={form.stade} onChange={e => setForm({ ...form, stade: e.target.value as StadeProspect })}>
                {STADES.map(s => <option key={s.stade} value={s.stade}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Relance le</label>
              <input type="date" className="input" value={form.date_relance} onChange={e => setForm({ ...form, date_relance: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
              <option value="">—</option>
              <option value="referral">Référence</option>
              <option value="linkedin">LinkedIn</option>
              <option value="site_web">Site web</option>
              <option value="evenement">Événement</option>
              <option value="cold_outreach">Prospection directe</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Détail</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Stratégie d'approche, contexte, observations..." />
          </div>
          {/* Pièces jointes */}
          <div className="space-y-2">
            <label className="label flex items-center gap-1.5"><Paperclip size={11} /> Pièces jointes</label>
            <label className="relative flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-surface-border hover:border-blue/40 hover:bg-blue/5 transition-all cursor-pointer group">
              <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFiles} />
              <FileText size={13} className="text-text-muted group-hover:text-blue transition-colors flex-shrink-0" />
              <span className="text-xs text-text-muted group-hover:text-blue transition-colors">Cliquer pour ajouter des fichiers</span>
            </label>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-hover border border-surface-border">
                    <FileText size={11} className="text-blue flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate flex-1">{f.name}</span>
                    <span className="text-2xs text-text-muted flex-shrink-0">
                      {f.size < 1048576 ? `${(f.size / 1024).toFixed(0)} Ko` : `${(f.size / 1048576).toFixed(1)} Mo`}
                    </span>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="p-0.5 hover:text-red text-text-muted transition-colors flex-shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Référence', linkedin: 'LinkedIn', site_web: 'Site web',
  evenement: 'Événement', cold_outreach: 'Prospection directe', autre: 'Autre',
}

function ProspectDetailPanel({ prospect: p, onClose }: { prospect: Prospect; onClose: () => void }) {
  const supabase = createClient()
  const stade = STADES.find(s => s.stade === p.stade)
  const pjs = p.pieces_jointes ?? []

  async function downloadFile(pj: PieceJointe) {
    await downloadFromStorage(supabase, 'documents', pj.url_stockage, pj.nom)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative h-full w-full max-w-sm bg-surface border-l border-surface-border flex flex-col shadow-2xl animate-slide-in-right overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">{p.nom_entreprise}</h2>
            {stade && (
              <span className="inline-flex items-center gap-1 mt-1 text-2xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: stade.color, background: stade.bg }}>
                {stade.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors flex-shrink-0 ml-2">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">
          {/* Contact */}
          <div className="space-y-2">
            <h3 className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Contact</h3>
            {p.contact_nom && (
              <div className="flex items-center gap-2 text-xs text-text-primary">
                <Users size={13} className="text-text-muted flex-shrink-0" /> {p.contact_nom}
              </div>
            )}
            {p.contact_email && (
              <a href={`mailto:${p.contact_email}`} className="flex items-center gap-2 text-xs text-blue hover:underline">
                <Mail size={13} className="flex-shrink-0" /> {p.contact_email}
              </a>
            )}
            {p.contact_telephone && (
              <a href={`tel:${p.contact_telephone}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-blue">
                <Phone size={13} className="text-text-muted flex-shrink-0" /> {p.contact_telephone}
              </a>
            )}
          </div>

          {/* Infos commerciales */}
          <div className="space-y-2">
            <h3 className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Commercial</h3>
            <div className="grid grid-cols-2 gap-2">
              {p.valeur_estimee != null && (
                <div className="bg-surface-hover rounded-lg p-2.5">
                  <p className="text-2xs text-text-muted">Valeur estimée</p>
                  <p className="text-xs font-semibold text-green mt-0.5">{formatMontant(p.valeur_estimee)}</p>
                </div>
              )}
              {p.probabilite != null && (
                <div className="bg-surface-hover rounded-lg p-2.5">
                  <p className="text-2xs text-text-muted">Probabilité</p>
                  <p className="text-xs font-semibold text-text-primary mt-0.5">{p.probabilite}%</p>
                </div>
              )}
              {p.source && (
                <div className="bg-surface-hover rounded-lg p-2.5">
                  <p className="text-2xs text-text-muted">Source</p>
                  <p className="text-xs font-medium text-text-primary mt-0.5">{SOURCE_LABELS[p.source] ?? p.source}</p>
                </div>
              )}
              {p.date_relance && (
                <div className="bg-surface-hover rounded-lg p-2.5">
                  <p className="text-2xs text-text-muted flex items-center gap-1"><Calendar size={10} /> Relance</p>
                  <p className="text-xs font-medium text-amber mt-0.5">{formatDate(p.date_relance)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {p.notes && (
            <div className="space-y-2">
              <h3 className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <StickyNote size={10} /> Notes
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed bg-surface-hover rounded-lg p-3">{p.notes}</p>
            </div>
          )}

          {/* Pièces jointes */}
          <div className="space-y-2">
            <h3 className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Paperclip size={10} /> Pièces jointes ({pjs.length})
            </h3>
            {pjs.length === 0
              ? <p className="text-xs text-text-muted">Aucun fichier joint</p>
              : (
                <div className="space-y-1.5">
                  {pjs.map((pj, i) => (
                    <button key={i} onClick={() => downloadFile(pj)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface border border-surface-border text-left transition-all group">
                      <FileText size={12} className="text-blue flex-shrink-0" />
                      <span className="text-xs text-text-secondary truncate flex-1">{pj.nom}</span>
                      <span className="text-2xs text-text-muted flex-shrink-0">
                        {pj.taille < 1048576 ? `${(pj.taille / 1024).toFixed(0)} Ko` : `${(pj.taille / 1048576).toFixed(1)} Mo`}
                      </span>
                      <Download size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-border flex-shrink-0">
          <p className="text-2xs text-text-muted">Créé le {formatDate(p.created_at)}</p>
        </div>
      </div>
    </div>
  )
}
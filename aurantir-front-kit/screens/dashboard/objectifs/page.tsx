// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage, shouldCompress } from '@/aurantir-front-kit/lib/storage'
import {
  Plus, Target, TrendingUp, CheckCircle, Circle, Trophy,
  Paperclip, Download, FileText, Image, Loader2, X,
} from 'lucide-react'

interface PieceJointe {
  nom: string
  path: string
  taille: number
  mime: string
}

interface PendingFile extends PieceJointe {
  uploading: boolean
  localFile?: File
}

interface OKR {
  id: string
  entite_id: string
  fondateur_id?: string
  titre: string
  description?: string
  trimestre: number
  annee: number
  avancement: number
  statut: 'en_cours' | 'atteint' | 'manque' | 'abandonne'
  pieces_jointes?: PieceJointe[]
  created_at: string
  fondateur?: { prenom: string; nom: string }
  okr_key_results?: KeyResult[]
}

interface KeyResult {
  id: string
  okr_id: string
  titre: string
  valeur_cible: number
  valeur_actuelle: number
  unite: string
  statut: 'en_cours' | 'atteint' | 'en_retard'
}

interface ObjectifCommercial {
  id: string
  entite_id: string
  responsable_id?: string
  type: string
  valeur_cible: number
  valeur_actuelle: number
  unite?: string
  periode: string
  annee: number
  devise: string
  statut: 'en_cours' | 'atteint' | 'en_retard'
  responsable?: { prenom: string; nom: string }
}

// ── Helpers ────────────────────────────────────────────────────
function sanitizeFilename(name: string): string {
  const parts = name.split('.')
  const ext   = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : ''
  const base  = parts.join('.')
  return (base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'fichier') + ext
}

function formatBytes(n: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <Image size={11} className="text-violet flex-shrink-0" />
  return <FileText size={11} className="text-blue flex-shrink-0" />
}

export default function ObjectifsPage() {
  const { entiteActive } = useAppStore()
  const [okrs, setOkrs] = useState<OKR[]>([])
  const [objectifs, setObjectifs] = useState<ObjectifCommercial[]>([])
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [activeTab, setActiveTab] = useState<'okr' | 'commercial'>('okr')
  const [showForm, setShowForm] = useState(false)
  const [selectedOkr, setSelectedOkr] = useState<OKR | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [entiteActive?.id, annee, trimestre])

  async function load() {
    setLoading(true)
    const eid = entiteActive?.id
    const [okrRes, objRes] = await Promise.all([
      supabase
        .from('okr_fondateurs')
        .select('*, fondateur:users!fondateur_id(prenom, nom), okr_key_results(*)')
        .eq('annee', annee)
        .eq('trimestre', trimestre)
        .then(({ data, error }) => { if (error) console.error('OKR load:', error); return data || [] }),
      supabase
        .from('objectifs_commerciaux')
        .select('*, responsable:users!responsable_id(prenom, nom)')
        .eq('annee', annee)
        .then(({ data, error }) => { if (error) console.error('Objectifs load:', error); return data || [] }),
    ])
    setOkrs(okrRes as OKR[])
    setObjectifs(objRes as ObjectifCommercial[])
    setLoading(false)
  }

  const okrAtteints = okrs.filter(o => o.statut === 'atteint').length
  const objAtteints = objectifs.filter(o => o.statut === 'atteint').length
  const avgAvancement = okrs.length > 0 ? Math.round(okrs.reduce((s, o) => s + o.avancement, 0) / okrs.length) : 0

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Objectifs</h1>
          <p className="page-subtitle">OKR et performance commerciale</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={trimestre} onChange={e => setTrimestre(parseInt(e.target.value))} className="input py-1.5 text-sm w-20">
            {[1, 2, 3, 4].map(t => <option key={t} value={t}>T{t}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className="input py-1.5 text-sm w-24">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Ajouter</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">OKR actifs</p>
          <p className="text-2xl font-bold text-text-primary">{okrs.length}</p>
          <p className="text-2xs text-green">{okrAtteints} atteints</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Avancement moyen</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-blue">{avgAvancement}%</p>
          </div>
          <div className="h-1.5 bg-surface-border rounded-full">
            <div className="h-full bg-blue rounded-full" style={{ width: `${avgAvancement}%` }} />
          </div>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Objectifs commerciaux</p>
          <p className="text-2xl font-bold text-text-primary">{objectifs.length}</p>
          <p className="text-2xs text-green">{objAtteints} atteints</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {[
          { key: 'okr', label: 'OKR' },
          { key: 'commercial', label: 'Objectifs commerciaux' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'okr' | 'commercial')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue text-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'okr' && (
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)
            : okrs.length === 0
              ? (
                <div className="text-center py-12 text-text-muted">
                  <Target size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun OKR pour T{trimestre} {annee}</p>
                </div>
              )
              : okrs.map(okr => <OKRCard key={okr.id} okr={okr} onClick={() => setSelectedOkr(okr)} />)
          }
        </div>
      )}

      {activeTab === 'commercial' && (
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)
            : objectifs.length === 0
              ? (
                <div className="text-center py-12 text-text-muted">
                  <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun objectif commercial pour {annee}</p>
                </div>
              )
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {objectifs.map(obj => <ObjectifCard key={obj.id} objectif={obj} />)}
                </div>
              )
          }
        </div>
      )}

      {showForm && (
        <OKRModal
          trimestre={trimestre}
          annee={annee}
          entiteId={entiteActive?.id || ''}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}

      {selectedOkr && (
        <OKRDetailModal
          okr={selectedOkr}
          onClose={() => setSelectedOkr(null)}
          onRefresh={() => { setSelectedOkr(null); load() }}
        />
      )}
    </div>
  )
}

function parsePieces(raw: unknown): PieceJointe[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as PieceJointe[]
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

function OKRCard({ okr, onClick }: { okr: OKR; onClick?: () => void }) {
  const pct      = okr.avancement
  const barColor = pct >= 80 ? '#10B981' : pct >= 50 ? '#3B82F6' : '#F59E0B'
  const supabase = createClient()
  const pieces   = parsePieces(okr.pieces_jointes)

  async function downloadFile(pj: PieceJointe, e: React.MouseEvent) {
    e.stopPropagation()
    await downloadFromStorage(supabase, 'objectifs', pj.path, pj.nom, 300)
  }

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-surface-border rounded-xl p-5 space-y-4 cursor-pointer hover:border-blue/30 hover:bg-surface-hover/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {okr.statut === 'atteint'
              ? <Trophy size={14} className="text-amber" />
              : <Target size={14} className="text-blue" />}
            <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${
              okr.statut === 'atteint' ? 'bg-green/10 text-green border-green/20'
              : okr.statut === 'abandonne' ? 'bg-surface text-text-muted border-surface-border'
              : 'bg-blue/10 text-blue border-blue/20'
            }`}>{okr.statut === 'atteint' ? 'Atteint' : okr.statut === 'abandonne' ? 'Abandonné' : 'Actif'}</span>
            {(okr as any).fondateur && (
              <span className="text-2xs text-text-muted">— {(okr as any).fondateur.prenom} {(okr as any).fondateur.nom}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{okr.titre}</h3>
          {okr.description && <p className="text-xs text-text-secondary mt-0.5">{okr.description}</p>}
        </div>
        <span className="text-xl font-bold" style={{ color: barColor }}>{pct}%</span>
      </div>

      <div className="h-2 bg-surface-border rounded-full">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>

      {(okr.okr_key_results?.length ?? 0) > 0 && (
        <div className="space-y-2 pt-1">
          {okr.okr_key_results!.map(kr => {
            const krPct = kr.valeur_cible > 0 ? Math.round(kr.valeur_actuelle / kr.valeur_cible * 100) : 0
            return (
              <div key={kr.id} className="flex items-center gap-3">
                {kr.statut === 'atteint'
                  ? <CheckCircle size={12} className="text-green flex-shrink-0" />
                  : <Circle size={12} className="text-text-muted flex-shrink-0" />}
                <span className="text-xs text-text-secondary flex-1 truncate">{kr.titre}</span>
                <span className="text-2xs text-text-muted flex-shrink-0">{kr.valeur_actuelle}/{kr.valeur_cible} {kr.unite}</span>
                <div className="w-16 h-1 bg-surface-border rounded-full flex-shrink-0">
                  <div className="h-full bg-blue rounded-full" style={{ width: `${Math.min(krPct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pieces.length > 0 && (
        <div className="flex items-center gap-2 pt-1 flex-wrap border-t border-surface-border/50">
          <Paperclip size={10} className="text-text-muted flex-shrink-0" />
          {pieces.map((pj, i) => (
            <button
              key={i}
              onClick={(e) => downloadFile(pj, e)}
              className="flex items-center gap-1 text-2xs text-blue hover:underline"
              title={`${pj.nom} · ${formatBytes(pj.taille)}`}
            >
              <FileIcon mime={pj.mime} />
              {pj.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ObjectifCard({ objectif: o }: { objectif: ObjectifCommercial }) {
  const pct = o.valeur_cible > 0 ? Math.round(o.valeur_actuelle / o.valeur_cible * 100) : 0
  const isAmount = ['ca', 'mrr', 'arr', 'pipeline'].includes(o.type)
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted capitalize">{o.type.replace('_', ' ')}</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">
            {isAmount ? formatMontant(o.valeur_actuelle, o.devise) : o.valeur_actuelle}
            <span className="text-text-muted font-normal"> / {isAmount ? formatMontant(o.valeur_cible, o.devise) : `${o.valeur_cible} ${o.unite || ''}`}</span>
          </p>
        </div>
        <span className={`text-sm font-bold ${pct >= 100 ? 'text-green' : pct >= 70 ? 'text-blue' : 'text-amber'}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-surface-border rounded-full">
        <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-green' : 'bg-blue'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span>{o.periode}</span>
        {(o as any).responsable && <span>{(o as any).responsable.prenom} {(o as any).responsable.nom}</span>}
      </div>
    </div>
  )
}

function OKRDetailModal({ okr, onClose, onRefresh }: {
  okr: OKR; onClose: () => void; onRefresh: () => void
}) {
  const supabase  = createClient()
  const pieces    = parsePieces(okr.pieces_jointes)
  const pct       = okr.avancement
  const barColor  = pct >= 80 ? '#10B981' : pct >= 50 ? '#3B82F6' : '#F59E0B'

  const [avancement, setAvancement] = useState(okr.avancement)
  const [statut, setStatut]         = useState(okr.statut)
  const [krValues, setKrValues]     = useState<Record<string, number>>(
    Object.fromEntries((okr.okr_key_results || []).map(kr => [kr.id, kr.valeur_actuelle]))
  )
  const [saving, setSaving]         = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('okr_fondateurs').update({ avancement, statut }).eq('id', okr.id)
    const updates = (okr.okr_key_results || []).map(kr =>
      supabase.from('okr_key_results').update({
        valeur_actuelle: krValues[kr.id] ?? kr.valeur_actuelle,
        statut: (krValues[kr.id] ?? kr.valeur_actuelle) >= kr.valeur_cible ? 'atteint' : 'en_cours',
      }).eq('id', kr.id)
    )
    await Promise.all(updates)
    setSaving(false)
    onRefresh()
  }

  const statutLabel: Record<OKR['statut'], string> = {
    en_cours: 'En cours', atteint: 'Atteint', manque: 'Manqué', abandonne: 'Abandonné'
  }
  const statutColor: Record<OKR['statut'], string> = {
    en_cours: 'bg-blue/10 text-blue border-blue/20',
    atteint:  'bg-green/10 text-green border-green/20',
    manque:   'bg-amber/10 text-amber border-amber/20',
    abandonne:'bg-surface text-text-muted border-surface-border',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-border gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {okr.statut === 'atteint' ? <Trophy size={14} className="text-amber" /> : <Target size={14} className="text-blue" />}
              <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${statutColor[okr.statut]}`}>
                {statutLabel[okr.statut]}
              </span>
              {okr.fondateur && (
                <span className="text-2xs text-text-muted">— {okr.fondateur.prenom} {okr.fondateur.nom}</span>
              )}
              <span className="text-2xs text-text-muted ml-auto">T{okr.trimestre} {okr.annee}</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary leading-snug">{okr.titre}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          {okr.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{okr.description}</p>
          )}

          {/* Avancement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Avancement global</span>
              <span className="text-lg font-bold" style={{ color: barColor }}>{avancement}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={avancement}
              onChange={e => setAvancement(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: barColor }}
            />
            <div className="h-2 bg-surface-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${avancement}%`, backgroundColor: barColor }} />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {(['en_cours', 'atteint', 'manque', 'abandonne'] as OKR['statut'][]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatut(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    statut === s ? statutColor[s] : 'border-surface-border text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {statutLabel[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Key Results */}
          {(okr.okr_key_results?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted">Key Results</p>
              {okr.okr_key_results!.map(kr => {
                const current = krValues[kr.id] ?? kr.valeur_actuelle
                const krPct   = kr.valeur_cible > 0 ? Math.min(Math.round(current / kr.valeur_cible * 100), 100) : 0
                return (
                  <div key={kr.id} className="space-y-1.5 p-3 rounded-lg bg-surface-hover/40 border border-surface-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-primary flex-1">{kr.titre}</span>
                      <span className={`text-xs font-bold ${krPct >= 100 ? 'text-green' : 'text-blue'}`}>{krPct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={kr.valeur_cible * 2}
                        value={current}
                        onChange={e => setKrValues(prev => ({ ...prev, [kr.id]: parseFloat(e.target.value) || 0 }))}
                        className="input py-1 text-xs w-20 flex-shrink-0"
                      />
                      <span className="text-xs text-text-muted">/ {kr.valeur_cible} {kr.unite}</span>
                      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full transition-all" style={{ width: `${krPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pièces jointes */}
          {pieces.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted flex items-center gap-1.5"><Paperclip size={11} />Pièces jointes</p>
              <div className="space-y-1.5">
                {pieces.map((pj, i) => (
                  <button
                    key={i}
                    onClick={() => downloadFromStorage(supabase, 'objectifs', pj.path, pj.nom, 300)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-surface-border hover:bg-surface-hover hover:border-blue/20 transition-all group text-left"
                  >
                    <FileIcon mime={pj.mime} />
                    <span className="text-xs text-text-primary group-hover:text-blue transition-colors flex-1 truncate">{pj.nom}</span>
                    <span className="text-2xs text-text-muted flex-shrink-0">{formatBytes(pj.taille)}</span>
                    <Download size={11} className="text-text-muted group-hover:text-blue transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Fermer</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}

function OKRModal({ trimestre, annee, entiteId, onClose, onSuccess }: {
  trimestre: number; annee: number; entiteId: string; onClose: () => void; onSuccess: () => void
}) {
  const [form,       setForm]       = useState({ titre: '', description: '' })
  const [keyResults, setKeyResults] = useState([{ titre: '', valeur_cible: '', unite: '' }])
  const [files,      setFiles]      = useState<PendingFile[]>([])
  const [saving,     setSaving]     = useState(false)
  const [fileError,  setFileError]  = useState('')
  const [submitError, setSubmitError] = useState('')
  const orphanRef = useRef<string[]>([])
  const supabase  = createClient()

  // Cleanup orphans on unmount (cancel without submit)
  useEffect(() => {
    return () => {
      if (orphanRef.current.length > 0) {
        createClient().storage.from('objectifs').remove([...orphanRef.current])
      }
    }
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const selected = Array.from(e.target.files || [])
    e.target.value = ''

    for (const file of selected) {
      const safeName   = sanitizeFilename(file.name)
      const basePath   = `${entiteId}/${Date.now()}-${safeName}`
      const storedPath = shouldCompress(file) ? basePath + '.gz' : basePath
      const pending: PendingFile = { nom: file.name, path: storedPath, taille: file.size, mime: file.type, uploading: true, localFile: file }
      setFiles(prev => [...prev, pending])

      const { error } = await uploadToStorage(supabase, 'objectifs', basePath, file, { upsert: false })
      if (error) {
        setFiles(prev => prev.filter(f => f.path !== storedPath))
        setFileError(`Erreur upload "${file.name}" : ${error.message}`)
      } else {
        orphanRef.current.push(storedPath)
        setFiles(prev => prev.map(f => f.path === storedPath ? { ...f, uploading: false } : f))
      }
    }
  }

  function removeFile(path: string) {
    setFiles(prev => prev.filter(f => f.path !== path))
    // Remove from orphan tracking (will be deleted on unmount if not submitted)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSubmitError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', user!.id).single()
    if (!userData) { setSubmitError('Profil introuvable'); setSaving(false); return }

    const piecesJointes = files
      .filter(f => !f.uploading)
      .map(({ nom, path, taille, mime }) => ({ nom, path, taille, mime }))

    const { data: okrData, error: okrError } = await supabase.from('okr_fondateurs').insert({
      entite_id:      entiteId,
      fondateur_id:   userData.id,
      titre:          form.titre,
      description:    form.description || null,
      trimestre, annee,
      avancement:     0,
      statut:         'en_cours',
      pieces_jointes: piecesJointes,
    }).select().single()

    if (okrError) { setSubmitError(okrError.message); setSaving(false); return }

    if (okrData) {
      const validKRs = keyResults.filter(kr => kr.titre && kr.valeur_cible)
      if (validKRs.length > 0) {
        const { error: krErr } = await supabase.from('okr_key_results').insert(
          validKRs.map(kr => ({
            okr_id:          okrData.id,
            titre:           kr.titre,
            valeur_cible:    parseFloat(kr.valeur_cible),
            valeur_actuelle: 0,
            unite:           kr.unite || '',
            statut:          'en_cours',
          }))
        )
        if (krErr) console.error('Key results insert:', krErr)
      }
      orphanRef.current = []
    }

    setSaving(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-text-primary">Nouvel OKR — T{trimestre} {annee}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {submitError && (
            <div className="p-3 rounded-lg bg-red/10 border border-red/20">
              <p className="text-xs text-red">{submitError}</p>
            </div>
          )}

          {/* Objectif */}
          <div className="space-y-1.5">
            <label className="label">Objectif (O) *</label>
            <input
              type="text" className="input" value={form.titre} required autoFocus
              onChange={e => setForm({ ...form, titre: e.target.value })}
              placeholder="Ex: Atteindre 10M FCFA de CA"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="label">Description</label>
            <textarea
              className="input resize-none" rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Contexte, motivation..."
            />
          </div>

          {/* Key Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Key Results (KR)</label>
              <button
                type="button"
                onClick={() => setKeyResults(krs => [...krs, { titre: '', valeur_cible: '', unite: '' }])}
                className="text-blue text-xs hover:underline flex items-center gap-1"
              >
                <Plus size={11} /> Ajouter
              </button>
            </div>
            {keyResults.map((kr, i) => (
              <div key={i} className="grid grid-cols-5 gap-1.5">
                <input
                  className="input py-1 text-xs col-span-3" placeholder={`KR ${i + 1}`}
                  value={kr.titre}
                  onChange={e => setKeyResults(krs => krs.map((k, j) => j === i ? { ...k, titre: e.target.value } : k))}
                />
                <input
                  type="number" className="input py-1 text-xs col-span-1" placeholder="Cible"
                  value={kr.valeur_cible}
                  onChange={e => setKeyResults(krs => krs.map((k, j) => j === i ? { ...k, valeur_cible: e.target.value } : k))}
                />
                <input
                  className="input py-1 text-xs col-span-1" placeholder="Unité"
                  value={kr.unite}
                  onChange={e => setKeyResults(krs => krs.map((k, j) => j === i ? { ...k, unite: e.target.value } : k))}
                />
              </div>
            ))}
          </div>

          {/* ── Pièces jointes ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0 flex items-center gap-1.5">
                <Paperclip size={11} /> Pièces jointes
              </label>
              <label className="text-blue text-xs hover:underline cursor-pointer flex items-center gap-1">
                <Plus size={11} /> Ajouter un fichier
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* Error */}
            {fileError && (
              <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-red/5 border border-red/20">
                <X size={11} className="text-red mt-0.5 flex-shrink-0" />
                <p className="text-2xs text-red">{fileError}</p>
              </div>
            )}

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background-elevated border border-slate-800 group"
                  >
                    <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center flex-shrink-0">
                      {f.uploading
                        ? <Loader2 size={12} className="text-blue animate-spin" />
                        : <FileIcon mime={f.mime} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{f.nom}</p>
                      <p className="text-2xs text-text-muted">
                        {f.uploading ? 'Upload en cours…' : formatBytes(f.taille)}
                      </p>
                    </div>
                    {!f.uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(f.path)}
                        className="p-1 rounded-md text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Retirer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {files.length === 0 && (
              <p className="text-2xs text-text-muted">Tous types de fichiers acceptés</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button
              type="submit"
              className="flex-1"
              loading={saving}
              disabled={files.some(f => f.uploading)}
            >
              Créer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
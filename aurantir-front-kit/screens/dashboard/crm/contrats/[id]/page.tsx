// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import { formatMontant, formatDate, joursRestants } from '@/aurantir-front-kit/lib/utils'
import {
  ChevronRight, FileText, Calendar, RotateCcw, AlertTriangle,
  CheckCircle, Clock, Download, Edit2, Save, X, PenLine,
  Building2, Banknote, TrendingUp, RefreshCw, ChevronDown,
  User, UserCheck, ShieldAlert, Bell, FolderKanban, Paperclip,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

type ContratStatut = 'BROUILLON' | 'EN_ATTENTE_DE_SIGNATURE' | 'ACTIF' | 'EXPIRÉ' | 'RÉSILIÉ' | 'LITIGE'
type ContratType   = 'prestation' | 'maintenance' | 'abonnement' | 'licence' | 'partenariat' | 'autre'

interface Contrat {
  id: string
  entite_id: string
  client_id?: string
  projet_id?: string
  numero: string
  titre: string
  type: ContratType
  statut: ContratStatut
  montant: number
  devise: string
  date_debut: string
  date_fin?: string
  est_recurrent: boolean
  periodicite?: string
  type_reconduction?: string
  preavis_rupture?: string
  description?: string
  clauses?: string
  notes?: string
  signataire_client_id?: string
  signataire_client_nom?: string
  signataire_interne_id?: string
  created_by?: string
  created_at: string
  updated_at?: string
  pieces_jointes?: { name: string; path: string; size: number; type: string }[]
  client?: { id: string; nom_entreprise: string; email?: string; telephone?: string; site_web?: string; pays?: string }
  entite?: { nom: string; couleur: string }
  createur?: { prenom: string; nom: string }
  signataire_interne?: { prenom: string; nom: string }
}

interface Signature {
  id: string
  contrat_id: string
  signataire_id: string
  role: string
  statut: 'en_attente' | 'signe' | 'refuse'
  signe_le?: string
  commentaire?: string
  signataire?: { prenom: string; nom: string; email?: string }
}

// ─── Config statuts ──────────────────────────────────────────────────────────

const STATUT_CFG: Record<ContratStatut, { label: string; cls: string; icon: React.ReactNode }> = {
  BROUILLON:               { label: 'Brouillon',            cls: 'bg-surface text-text-muted border-surface-border',       icon: <FileText size={13} /> },
  EN_ATTENTE_DE_SIGNATURE: { label: 'Signature en attente', cls: 'bg-amber/10 text-amber border-amber/20',                 icon: <Clock size={13} /> },
  ACTIF:                   { label: 'Actif',                cls: 'bg-green/10 text-green border-green/20',                 icon: <CheckCircle size={13} /> },
  'EXPIRÉ':                { label: 'Expiré',               cls: 'bg-surface text-text-disabled border-surface-border',    icon: <Clock size={13} /> },
  'RÉSILIÉ':               { label: 'Résilié',              cls: 'bg-red/10 text-red border-red/20',                       icon: <AlertTriangle size={13} /> },
  LITIGE:                  { label: 'Litige',               cls: 'bg-orange-500/10 text-orange-400 border-orange-400/20',  icon: <AlertTriangle size={13} /> },
}

const TYPE_LABELS: Record<ContratType, string> = {
  prestation: 'Prestation', maintenance: 'Maintenance', abonnement: 'Abonnement',
  licence: 'Licence', partenariat: 'Partenariat', autre: 'Autre',
}

const RECONDUCTION_LABELS: Record<string, string> = {
  tacite: 'Tacite reconduction', duree_ferme: 'Durée ferme',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatut(c: Contrat): ContratStatut {
  if (c.statut === 'ACTIF' && c.date_fin && new Date(c.date_fin) < new Date()) return 'EXPIRÉ'
  return c.statut
}

// Badge de signature compact
function SigBadge({ sig }: { sig: { statut: 'en_attente' | 'signe' | 'refuse'; signe_le?: string } }) {
  if (sig.statut === 'signe') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20 text-2xs font-medium">
        <CheckCircle size={9} className="fill-green/30" />
        Signé{sig.signe_le ? ` le ${formatDate(sig.signe_le)}` : ''}
      </span>
    )
  }
  if (sig.statut === 'refuse') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20 text-2xs font-medium">
        <X size={9} /> Refusé
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-2xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-amber" />
      En attente
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ContratDetailPage() {
  const { id: contratId } = useParams<{ id: string }>()
  const { user: currentUser } = useAppStore()
  const router = useRouter()
  const [contrat, setContrat] = useState<Contrat | null>(null)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [projets, setProjets] = useState<{ id: string; titre: string; statut: string; avancement: number; type_projet?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [form, setForm] = useState({
    titre: '', description: '', clauses: '', notes: '',
    montant: 0, date_fin: '', statut: 'BROUILLON' as ContratStatut,
  })
  const supabase = createClient()

  useEffect(() => { load() }, [contratId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    // Auto-expire en arrière-plan
    supabase.rpc('auto_expire_contrats').then(() => {})

    const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('contrats')
        .select(`
          *,
          client:entreprises_clientes(id, nom_entreprise, telephone, site_web, pays),
          entite:entites_legales(nom, couleur),
          createur:users!created_by(prenom, nom),
          signataire_interne:users!signataire_interne_id(prenom, nom)
        `)
        .eq('id', contratId).single(),
      supabase.from('signatures_elec')
        .select('*, signataire:users(prenom, nom, email)')
        .eq('document_id', contratId).order('created_at'),
      supabase.from('projets')
        .select('id, titre, statut, avancement, type_projet')
        .eq('contrat_id', contratId)
        .order('created_at', { ascending: false }),
    ])

    if (c) {
      setContrat(c as unknown as Contrat)
      setForm({
        titre:       c.titre       || '',
        description: c.description || '',
        clauses:     c.clauses     || '',
        notes:       c.notes       || '',
        montant:     c.montant     || 0,
        date_fin:    c.date_fin    || '',
        statut:      c.statut      as ContratStatut,
      })
    }
    setSignatures((s || []) as unknown as Signature[])
    setProjets(p || [])
    setLoading(false)
  }

  async function saveEdits() {
    setSaving(true)
    await supabase.from('contrats').update({
      titre:       form.titre,
      description: form.description || null,
      clauses:     form.clauses     || null,
      notes:       form.notes       || null,
      montant:     form.montant,
      date_fin:    form.date_fin    || null,
      statut:      form.statut,
      updated_at:  new Date().toISOString(),
    }).eq('id', contratId)
    setSaving(false)
    setEditing(false)
    load()
  }

  async function updateStatut(statut: ContratStatut) {
    await supabase.from('contrats').update({ statut, updated_at: new Date().toISOString() }).eq('id', contratId)
    load()
  }

  async function downloadFile(pj: { name: string; path: string }) {
    await downloadFromStorage(supabase, 'contrats', pj.path, pj.name)
  }

  async function exportPDF() {
    if (!contrat) return
    setGenerating(true)
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, M = 15
    const entiteColor = contrat.entite?.couleur || '#2D6BFF'
    const [r, g, b] = entiteColor.match(/\w\w/g)!.map(x => parseInt(x, 16))
    doc.setFillColor(r, g, b); doc.rect(0, 0, W, 12, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text(contrat.entite?.nom?.toUpperCase() || '', M, 8)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
    doc.text('CONTRAT', M, 28)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(contrat.titre, M, 36)
    doc.setFontSize(9); doc.setTextColor(120, 120, 120)
    doc.text(`N° ${contrat.numero} · ${TYPE_LABELS[contrat.type]} · ${STATUT_CFG[effectiveStatut].label}`, M, 42)
    doc.setDrawColor(230, 230, 230); doc.line(M, 47, W - M, 47)
    let y = 55
    const kpis: [string, string][] = [
      ['Client', (contrat as any).client?.nom_entreprise || '—'],
      ['Montant', formatMontant(contrat.montant, contrat.devise || 'FCFA')],
      ['Date début', formatDate(contrat.date_debut)],
      ['Date fin', contrat.date_fin ? formatDate(contrat.date_fin) : 'Indéterminée'],
      ['Récurrent', contrat.est_recurrent ? `Oui — ${contrat.periodicite || ''}` : 'Non'],
      ['Statut', STATUT_CFG[effectiveStatut].label],
    ]
    for (const [k, v] of kpis) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text(k, M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(v, M + 55, y)
      y += 7
    }
    if (contrat.description) {
      doc.line(M, y + 2, W - M, y + 2); y += 10
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
      doc.text('Description', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      for (const line of doc.splitTextToSize(contrat.description, W - M * 2)) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(line, M, y); y += 5
      }
    }
    if (signatures.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }
      doc.line(M, y + 4, W - M, y + 4); y += 12
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
      doc.text('Signatures', M, y); y += 7
      for (const sig of signatures) {
        const name = sig.signataire ? `${sig.signataire.prenom} ${sig.signataire.nom}` : '—'
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.setTextColor(sig.statut === 'signe' ? 40 : 80, sig.statut === 'signe' ? 140 : 80, sig.statut === 'signe' ? 40 : 80)
        doc.text(`${name} — ${sig.role} — ${sig.statut === 'signe' ? `Signé le ${sig.signe_le ? formatDate(sig.signe_le) : ''}` : 'En attente'}`, M, y)
        y += 6
      }
    }
    doc.save(`contrat-${contrat.numero}.pdf`)
    setGenerating(false)
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-up">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  )

  if (!contrat) return (
    <div className="text-center py-20">
      <p className="text-text-muted">Contrat introuvable.</p>
      <Link href="/crm/contrats"><Button variant="secondary" className="mt-4">Retour</Button></Link>
    </div>
  )

  const effectiveStatut = computeStatut(contrat)
  const cfg = STATUT_CFG[effectiveStatut]
  const jours = contrat.date_fin ? joursRestants(contrat.date_fin) : null
  const entiteColor = (contrat as any).entite?.couleur || '#2D6BFF'
  const toutsSigues = signatures.length > 0 && signatures.every(s => s.statut === 'signe')

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/crm/contrats" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Contrats
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary font-mono">{contrat.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-text-muted">{contrat.numero}</span>
            <span className="text-2xs px-1.5 py-0.5 rounded font-medium border"
              style={{ color: entiteColor, borderColor: entiteColor + '44', background: entiteColor + '18' }}>
              {(contrat as any).entite?.nom}
            </span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">{contrat.titre}</h1>
          <p className="text-sm text-text-muted mt-0.5">{TYPE_LABELS[contrat.type]}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
            {cfg.icon}{cfg.label}
          </span>
          <Button variant="secondary" size="sm" icon={<Download size={13} />} loading={generating} onClick={exportPDF}>PDF</Button>
          {!editing ? (
            <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} onClick={() => setEditing(true)}>Modifier</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={<X size={13} />} onClick={() => { setEditing(false); load() }}>Annuler</Button>
              <Button size="sm" icon={<Save size={13} />} loading={saving} onClick={saveEdits}>Sauvegarder</Button>
            </>
          )}
        </div>
      </div>

      {/* Bandeaux d'alerte */}
      {effectiveStatut === 'ACTIF' && jours !== null && jours <= 30 && jours > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber/10 border border-amber/20 rounded-lg">
          <Bell size={14} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            Ce contrat expire dans <strong>{jours} jours</strong> ({formatDate(contrat.date_fin!)}).
            {contrat.preavis_rupture && contrat.preavis_rupture !== 'aucun' && (
              <> Préavis de non-renouvellement : <strong>{contrat.preavis_rupture}</strong>.</>
            )}
          </span>
        </div>
      )}
      {effectiveStatut === 'EXPIRÉ' && (
        <div className="flex items-center gap-3 p-3 bg-red/10 border border-red/20 rounded-lg">
          <ShieldAlert size={14} className="text-red flex-shrink-0" />
          <span className="text-sm text-red">
            Ce contrat est <strong>expiré</strong>{contrat.date_fin ? ` depuis le ${formatDate(contrat.date_fin)}` : ''}.
          </span>
        </div>
      )}

      {/* Bandeau valeur — ACTIF seulement */}
      {effectiveStatut === 'ACTIF' && contrat.montant > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green/5 border border-green/15 rounded-xl">
          <TrendingUp size={16} className="text-green" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Valeur contractuelle active :</span>
            <span className="text-lg font-bold text-green">{formatMontant(contrat.montant, contrat.devise || 'FCFA')}</span>
            {contrat.est_recurrent && contrat.periodicite && (
              <span className="text-xs text-green/70">/ {contrat.periodicite}</span>
            )}
          </div>
        </div>
      )}

      {/* Corps principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══ Colonne principale ══ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Infos essentielles */}
          <Card className="p-5 space-y-5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileText size={14} className="text-blue" /> Informations contractuelles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Valeur</p>
                {editing ? (
                  <input type="number" className="input py-1 text-sm w-full" value={form.montant} min="0"
                    onChange={e => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} />
                ) : (
                  <p className="text-lg font-bold text-text-primary">{formatMontant(contrat.montant, contrat.devise || 'FCFA')}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Statut</p>
                {editing ? (
                  <div className="relative">
                    <select className="input py-1 text-sm w-full appearance-none pr-7" value={form.statut}
                      onChange={e => setForm({ ...form, statut: e.target.value as ContratStatut })}>
                      {(Object.keys(STATUT_CFG) as ContratStatut[]).map(s => (
                        <option key={s} value={s}>{STATUT_CFG[s].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                    {cfg.icon}{cfg.label}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1 flex items-center gap-1"><Calendar size={10} /> Début</p>
                <p className="text-sm text-text-primary">{formatDate(contrat.date_debut)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1 flex items-center gap-1"><Calendar size={10} /> Fin</p>
                {editing ? (
                  <input type="date" className="input py-1 text-sm w-full" value={form.date_fin}
                    onChange={e => setForm({ ...form, date_fin: e.target.value })} />
                ) : (
                  <div>
                    <p className="text-sm text-text-primary">
                      {contrat.date_fin ? formatDate(contrat.date_fin) : <span className="text-text-muted">Indéterminée</span>}
                    </p>
                    {jours !== null && jours > 0 && jours <= 60 && effectiveStatut === 'ACTIF' && (
                      <p className={`text-2xs font-medium mt-0.5 ${jours <= 30 ? 'text-amber' : 'text-text-muted'}`}>{jours}j restants</p>
                    )}
                  </div>
                )}
              </div>

              {contrat.est_recurrent && (
                <div className="col-span-2 flex items-start gap-6">
                  <div>
                    <p className="text-xs text-text-muted mb-1 flex items-center gap-1"><RotateCcw size={10} /> Récurrence</p>
                    <p className="text-sm text-text-primary capitalize">{contrat.periodicite}</p>
                  </div>
                  {contrat.type_reconduction && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Reconduction</p>
                      <p className="text-sm text-text-primary">{RECONDUCTION_LABELS[contrat.type_reconduction] || contrat.type_reconduction}</p>
                    </div>
                  )}
                  {contrat.preavis_rupture && contrat.preavis_rupture !== 'aucun' && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Préavis</p>
                      <p className="text-sm text-text-primary">{contrat.preavis_rupture}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {editing && (
              <div className="space-y-1.5 pt-1 border-t border-surface-border">
                <label className="label">Titre</label>
                <input className="input w-full" value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })} />
              </div>
            )}
          </Card>

          {/* Description */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Description & Objet</h3>
            {editing ? (
              <textarea className="input w-full resize-none" rows={4} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Objet et description du contrat…" />
            ) : (
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {contrat.description || <span className="text-text-muted italic">Aucune description</span>}
              </p>
            )}
          </Card>

          {/* Clauses */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Clauses & Conditions</h3>
            {editing ? (
              <textarea className="input w-full resize-none" rows={5} value={form.clauses}
                onChange={e => setForm({ ...form, clauses: e.target.value })}
                placeholder="Clauses particulières, conditions générales…" />
            ) : (
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {contrat.clauses || <span className="text-text-muted italic">Aucune clause renseignée</span>}
              </p>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Notes internes</h3>
            {editing ? (
              <textarea className="input w-full resize-none" rows={3} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes visibles uniquement en interne…" />
            ) : (
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {contrat.notes || <span className="text-text-muted italic">Aucune note</span>}
              </p>
            )}
          </Card>

          {/* ── Signatures ──────────────────────────────────────────────── */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <PenLine size={14} className="text-blue" /> Signatures
                {toutsSigues && <CheckCircle size={13} className="text-green" />}
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setShowSignModal(true)}>
                + Signataire
              </Button>
            </div>

            {/* Signataires pré-configurés depuis la création */}
            {(contrat.signataire_client_nom || (contrat as any).signataire_interne) && (
              <div className="space-y-2">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Signataires désignés</p>
                {contrat.signataire_client_nom && (
                  <SigRow
                    label={contrat.signataire_client_nom}
                    role="Représentant client"
                    icon={<User size={11} />}
                    synced={signatures.some(s => s.role === 'Représentant client' && s.statut === 'signe')}
                  />
                )}
                {(contrat as any).signataire_interne && (
                  <SigRow
                    label={`${(contrat as any).signataire_interne.prenom} ${(contrat as any).signataire_interne.nom}`}
                    role="Signataire interne"
                    icon={<UserCheck size={11} />}
                    synced={signatures.some(s => s.signataire_id === contrat.signataire_interne_id && s.statut === 'signe')}
                  />
                )}
              </div>
            )}

            {/* Workflows signatures_elec */}
            {signatures.length > 0 && (
              <div className="space-y-2">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Workflow électronique</p>
                {signatures.map(sig => (
                  <SignatureRow key={sig.id} sig={sig} contratId={contratId} onRefresh={load} />
                ))}
              </div>
            )}

            {signatures.length === 0 && !contrat.signataire_client_nom && !(contrat as any).signataire_interne && (
              <p className="text-sm text-text-muted text-center py-6">Aucun signataire configuré</p>
            )}

            {contrat.statut === 'EN_ATTENTE_DE_SIGNATURE' && toutsSigues && (
              <Button className="w-full bg-green hover:bg-green/90 mt-2" icon={<CheckCircle size={14} />}
                onClick={() => updateStatut('ACTIF')}>
                Toutes les signatures obtenues — Marquer comme actif
              </Button>
            )}
          </Card>
        </div>

        {/* ══ Sidebar ══ */}
        <div className="space-y-4">

          {/* Client */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={11} /> Client
            </h4>
            {(contrat as any).client ? (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-text-primary">{(contrat as any).client.nom_entreprise}</p>
                {(contrat as any).client.telephone && (
                  <p className="text-xs text-text-muted">{(contrat as any).client.telephone}</p>
                )}
                {(contrat as any).client.pays && (
                  <p className="text-xs text-text-muted">{(contrat as any).client.pays}</p>
                )}
                <Link href={`/crm/clients/${(contrat as any).client.id}`} className="text-xs text-blue hover:underline">
                  Voir la fiche client →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-text-muted">Aucun client associé</p>
            )}
          </Card>

          {/* Projets liés */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban size={11} /> Projets liés ({projets.length})
            </h4>
            {projets.length === 0 ? (
              <p className="text-xs text-text-muted">Aucun projet associé à ce contrat</p>
            ) : (
              <div className="space-y-1.5">
                {projets.map(p => {
                  const statutCls =
                    p.statut === 'termine'  ? 'bg-green/10 text-green border-green/20' :
                    p.statut === 'en_cours' ? 'bg-blue/10 text-blue border-blue/20' :
                    p.statut === 'en_pause' ? 'bg-amber/10 text-amber border-amber/20' :
                    'bg-surface text-text-muted border-surface-border'
                  return (
                    <Link key={p.id} href={`/projets/${p.id}`}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border border-surface-border hover:border-blue/30 hover:bg-surface-hover transition-colors group">
                      <div className="w-6 h-6 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FolderKanban size={11} className="text-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary group-hover:text-blue transition-colors truncate">
                          {p.titre}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-2xs px-1.5 py-px rounded-full border font-medium ${statutCls}`}>
                            {p.statut.replace('_', ' ')}
                          </span>
                          {p.type_projet === 'special' && (
                            <span className="text-2xs px-1 py-px rounded font-medium bg-violet/10 text-violet border border-violet/20">
                              Spécial
                            </span>
                          )}
                          <span className="text-2xs text-text-muted ml-auto">{p.avancement}%</span>
                        </div>
                        <div className="h-0.5 bg-surface-border rounded-full mt-1.5">
                          <div className="h-full bg-blue rounded-full transition-all" style={{ width: `${p.avancement}%` }} />
                        </div>
                      </div>
                      <ChevronRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Changer statut */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Changer le statut</h4>
            <div className="space-y-1">
              {(Object.keys(STATUT_CFG) as ContratStatut[]).map(s => (
                <button key={s} onClick={() => updateStatut(s)} disabled={contrat.statut === s}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-2
                    ${contrat.statut === s
                      ? 'border-blue/30 bg-blue/10 text-blue cursor-default'
                      : 'border-surface-border text-text-muted hover:bg-surface-hover'}`}>
                  {STATUT_CFG[s].icon}
                  <span>{STATUT_CFG[s].label}</span>
                  {contrat.statut === s && <span className="ml-auto text-2xs opacity-60">(actuel)</span>}
                </button>
              ))}
            </div>
          </Card>

          {/* Récurrence */}
          {contrat.est_recurrent && (
            <Card className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={11} /> Récurrence
              </h4>
              <InfoRow label="Fréquence" value={contrat.periodicite || '—'} />
              {contrat.type_reconduction && (
                <InfoRow label="Reconduction" value={RECONDUCTION_LABELS[contrat.type_reconduction] || contrat.type_reconduction} />
              )}
              {contrat.preavis_rupture && contrat.preavis_rupture !== 'aucun' && (
                <InfoRow label="Préavis" value={contrat.preavis_rupture} />
              )}
            </Card>
          )}

          {/* Méta */}
          <Card className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Détails</h4>
            <InfoRow label="Numéro" value={<span className="font-mono">{contrat.numero}</span>} />
            <InfoRow label="Type" value={TYPE_LABELS[contrat.type]} />
            <InfoRow label="Devise" value={contrat.devise || 'FCFA'} />
            <InfoRow label="Créé le" value={formatDate(contrat.created_at)} />
            {(contrat as any).createur && (
              <InfoRow label="Créé par" value={`${(contrat as any).createur.prenom} ${(contrat as any).createur.nom}`} />
            )}
          </Card>

          {/* Pièces jointes */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip size={11} /> Pièces jointes
              {contrat.pieces_jointes && contrat.pieces_jointes.length > 0 && (
                <span className="ml-auto text-blue font-semibold">{contrat.pieces_jointes.length}</span>
              )}
            </h4>
            {!contrat.pieces_jointes || contrat.pieces_jointes.length === 0 ? (
              <p className="text-xs text-text-muted">Aucun fichier joint</p>
            ) : (
              <div className="space-y-1.5">
                {contrat.pieces_jointes.map((pj, i) => (
                  <button key={i} onClick={() => downloadFile(pj)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-surface-border hover:border-blue/30 hover:bg-surface-hover transition-colors group text-left">
                    <div className="w-6 h-6 rounded bg-blue/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={11} className="text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{pj.name}</p>
                      <p className="text-2xs text-text-muted">
                        {pj.size ? `${(pj.size / 1024).toFixed(0)} Ko` : ''}
                      </p>
                    </div>
                    <Download size={11} className="text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showSignModal && (
        <AjouterSignataireModal
          contratId={contratId}
          onClose={() => setShowSignModal(false)}
          onSuccess={() => { setShowSignModal(false); load() }}
        />
      )}
    </div>
  )
}

// ─── SigRow — ligne signataire désigné ────────────────────────────────────────

function SigRow({ label, role, icon, synced }: { label: string; role: string; icon: React.ReactNode; synced: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-surface-border">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-text-muted">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-text-primary">{label}</p>
          <p className="text-2xs text-text-muted">{role}</p>
        </div>
      </div>
      <SigBadge sig={{ statut: synced ? 'signe' : 'en_attente' }} />
    </div>
  )
}

// ─── SignatureRow — workflow électronique ─────────────────────────────────────

function SignatureRow({ sig, contratId, onRefresh }: { sig: Signature; contratId: string; onRefresh: () => void }) {
  const [signing, setSigning] = useState(false)
  const { user: currentUser } = useAppStore()
  const supabase = createClient()

  async function handleSign(statut: 'signe' | 'refuse') {
    setSigning(true)
    await supabase.from('signatures_elec').update({
      statut, signe_le: new Date().toISOString(),
    }).eq('id', sig.id)
    setSigning(false)
    onRefresh()
  }

  const isMe = sig.signataire_id === currentUser?.id

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-surface-border">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-muted uppercase">
          {sig.signataire ? sig.signataire.prenom[0] : '?'}
        </div>
        <div>
          <p className="text-xs font-medium text-text-primary">
            {sig.signataire ? `${sig.signataire.prenom} ${sig.signataire.nom}` : '—'}
          </p>
          <p className="text-2xs text-text-muted">{sig.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SigBadge sig={sig} />
        {sig.statut === 'en_attente' && isMe && (
          <div className="flex gap-1">
            <Button size="sm" className="bg-green hover:bg-green/90 text-white h-6 px-2 text-2xs"
              loading={signing} onClick={() => handleSign('signe')}>Signer</Button>
            <Button variant="secondary" size="sm" className="h-6 px-2 text-2xs text-red border-red/30 hover:bg-red/10"
              loading={signing} onClick={() => handleSign('refuse')}>Refuser</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── InfoRow helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary font-medium text-right">{value}</span>
    </div>
  )
}

// ─── AjouterSignataireModal ───────────────────────────────────────────────────

function AjouterSignataireModal({ contratId, onClose, onSuccess }: {
  contratId: string; onClose: () => void; onSuccess: () => void
}) {
  const [membres, setMembres] = useState<{ id: string; prenom: string; nom: string; role: string }[]>([])
  const [signataire_id, setSignataireId] = useState('')
  const [role, setRole] = useState('Signataire')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('users').select('id, prenom, nom, role')
      .in('role', ['super_admin', 'fondateur', 'manager'])
      .eq('statut', 'actif').order('prenom')
      .then(({ data }) => setMembres((data || []) as typeof membres))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!signataire_id) return
    setSaving(true)
    await supabase.from('signatures_elec').insert({
      document_id: contratId, document_type: 'contrat',
      signataire_id, role, statut: 'en_attente',
    })
    setSaving(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-text-primary">Ajouter un signataire</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="label">Membre de l'équipe</label>
            <div className="relative">
              <select className="input w-full appearance-none pr-7" value={signataire_id}
                onChange={e => setSignataireId(e.target.value)} required>
                <option value="">Sélectionner…</option>
                {membres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Rôle / Qualité</label>
            <input className="input w-full" value={role} onChange={e => setRole(e.target.value)}
              placeholder="Ex : Directeur Commercial, Gérant…" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving} disabled={!signataire_id}>Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
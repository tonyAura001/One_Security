// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant, pourcentage } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadDocument } from '@/aurantir-front-kit/lib/storage'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import {
  Plus, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle,
  Building2, Link2, X, Pencil, Trash2, ExternalLink, Calendar, Tag,
  FileText, ChevronRight, Download, Paperclip, ImageIcon, Loader2
} from 'lucide-react'

const MOIS_NOMS = ['Janv','Fév','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

const capitalizeFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

const ENTITY_COLORS = [
  { bg: 'bg-blue/10',   text: 'text-blue',   border: 'border-blue/20'   },
  { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/20' },
  { bg: 'bg-green/10',  text: 'text-green',  border: 'border-green/20'  },
  { bg: 'bg-amber/10',  text: 'text-amber',  border: 'border-amber/20'  },
]

const CATEGORIES_RECETTE = [
  'Prestations de services', 'Abonnements SaaS (Revenus)', 'Maintenance',
  'Formations / Workshops', 'Licences & Royalties', 'Autres recettes',
]
const CATEGORIES_DEPENSE = [
  'Salaires / Rémunérations', 'Sous-traitance', 'Hébergement & Serveurs',
  'Marketing & Publicité', 'Logiciels / SaaS', 'Matériel informatique',
  'Formation équipe', 'Déplacements & Transport', 'Frais bancaires',
  'Frais de fonctionnement', 'Autres charges',
]

interface PieceJointe { name: string; url: string; type?: string }

interface BudgetLigne {
  id: string
  entite_id: string
  annee: number
  mois?: number
  categorie: string
  sous_categorie?: string
  budget_prevu: number
  budget_reel: number
  type: 'recette' | 'depense'
  notes?: string
  contrat_id?: string
  projet_id?: string
  pieces_jointes?: PieceJointe[]
}

interface EntiteStats {
  id: string; nom: string
  recettePrevu: number; recetteReel: number
  depensePrevu: number; depenseReel: number
}

export default function BudgetPage() {
  const { entites, entiteActive } = useAppStore()
  const [lignes, setLignes] = useState<BudgetLigne[]>([])
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [selectedLigne, setSelectedLigne] = useState<BudgetLigne | null>(null)
  const [editLigne, setEditLigne] = useState<BudgetLigne | null>(null)
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null)
  const [entiteStats, setEntiteStats] = useState<EntiteStats[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) setEntiteFiltre(entiteActive.id)
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBudget = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('budget').select('*').eq('annee', annee).order('categorie')
    if (entiteFiltre) q = q.eq('entite_id', entiteFiltre)
    const { data } = await q
    const rows = (data || []) as BudgetLigne[]
    setLignes(rows)

    if (!entiteFiltre && entites.length > 0) {
      const stats: EntiteStats[] = entites.map(e => {
        const el = rows.filter(l => l.entite_id === e.id)
        return {
          id: e.id, nom: e.nom,
          recettePrevu: el.filter(l => l.type === 'recette').reduce((s, l) => s + l.budget_prevu, 0),
          recetteReel:  el.filter(l => l.type === 'recette').reduce((s, l) => s + l.budget_reel,  0),
          depensePrevu: el.filter(l => l.type === 'depense').reduce((s, l) => s + l.budget_prevu, 0),
          depenseReel:  el.filter(l => l.type === 'depense').reduce((s, l) => s + l.budget_reel,  0),
        }
      }).filter(s => s.recettePrevu + s.depensePrevu > 0)
      setEntiteStats(stats)
    } else {
      setEntiteStats([])
    }
    setLoading(false)
  }, [entiteFiltre, annee, entites]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBudget() }, [loadBudget])

  const recettes = lignes.filter(l => l.type === 'recette')
  const depenses = lignes.filter(l => l.type === 'depense')
  const totalRecettePrevu = recettes.reduce((s, l) => s + l.budget_prevu, 0)
  const totalRecetteReel  = recettes.reduce((s, l) => s + l.budget_reel,  0)
  const totalDepensePrevu = depenses.reduce((s, l) => s + l.budget_prevu, 0)
  const totalDepenseReel  = depenses.reduce((s, l) => s + l.budget_reel,  0)
  const resultatPrevu = totalRecettePrevu - totalDepensePrevu
  const resultatReel  = totalRecetteReel  - totalDepenseReel

  const categories = Array.from(new Set(lignes.map(l => l.categorie)))
  const chartData = categories.map(cat => {
    const catLignes = lignes.filter(l => l.categorie === cat)
    return {
      name: cat,
      prevu: catLignes.reduce((s, l) => s + l.budget_prevu, 0),
      reel:  catLignes.reduce((s, l) => s + l.budget_reel,  0),
    }
  })

  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-subtitle">
            {entiteCourante ? entiteCourante.nom : 'Vue globale — toutes les entités'} — {annee}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className="input py-1.5 text-sm w-28">
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Ajouter</Button>
        </div>
      </div>

      {/* Filtres entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button
          onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            entiteFiltre === null ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'
          }`}
        >
          Vue globale
        </button>
        {entites.map(e => (
          <button key={e.id} onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              entiteFiltre === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'
            }`}
          >
            {e.nom}
          </button>
        ))}
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Recettes prévues</p>
            <TrendingUp size={13} className="text-green" />
          </div>
          <p className="text-xl font-bold text-green">{loading ? '—' : formatMontant(totalRecettePrevu)}</p>
          <p className="text-2xs text-text-muted">Réel : <span className={totalRecetteReel >= totalRecettePrevu ? 'text-green' : 'text-amber'}>{formatMontant(totalRecetteReel)}</span></p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Dépenses prévues</p>
            <TrendingDown size={13} className="text-red" />
          </div>
          <p className="text-xl font-bold text-red">{loading ? '—' : formatMontant(totalDepensePrevu)}</p>
          <p className="text-2xs text-text-muted">Réel : <span className={totalDepenseReel <= totalDepensePrevu ? 'text-green' : 'text-red'}>{formatMontant(totalDepenseReel)}</span></p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Résultat prévu</p>
            <Target size={13} className="text-blue" />
          </div>
          <p className={`text-xl font-bold ${resultatPrevu >= 0 ? 'text-green' : 'text-red'}`}>{loading ? '—' : formatMontant(resultatPrevu)}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Résultat réel</p>
            {resultatReel >= resultatPrevu ? <CheckCircle size={13} className="text-green" /> : <AlertTriangle size={13} className="text-amber" />}
          </div>
          <p className={`text-xl font-bold ${resultatReel >= 0 ? 'text-green' : 'text-red'}`}>{loading ? '—' : formatMontant(resultatReel)}</p>
          {!loading && totalDepensePrevu > 0 && (
            <p className="text-2xs text-text-muted">{pourcentage(totalDepenseReel, totalDepensePrevu)}% dépenses utilisées</p>
          )}
        </Card>
      </div>

      {/* Breakdown par entité (vue globale) */}
      {!entiteFiltre && entiteStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entiteStats.map(s => {
            const res = (s.recettePrevu - s.depensePrevu)
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet/10 flex items-center justify-center">
                      <Building2 size={14} className="text-violet" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{s.nom}</span>
                  </div>
                  <button onClick={() => setEntiteFiltre(s.id)} className="text-2xs text-blue hover:underline">
                    Voir détail →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xs text-text-muted mb-0.5">Résultat prévu</p>
                    <p className={`text-sm font-bold ${res >= 0 ? 'text-green' : 'text-red'}`}>{formatMontant(res)}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-text-muted mb-0.5">Recettes</p>
                    <p className="text-sm font-semibold text-green">{formatMontant(s.recettePrevu)}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-text-muted mb-0.5">Dépenses</p>
                    <p className="text-sm font-semibold text-red">{formatMontant(s.depensePrevu)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Prévu vs Réel par catégorie{entiteCourante ? ` — ${entiteCourante.nom}` : ' (consolidé)'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={capitalizeFirst} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }} formatter={(v: any) => [formatMontant(Number(v)), '']} />
              <Legend />
              <Bar dataKey="prevu" name="Prévu" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="reel" name="Réel" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {recettes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green mb-3 flex items-center gap-2"><TrendingUp size={14} /> Recettes</h3>
          <BudgetTable lignes={recettes} entites={entites} showEntite={!entiteFiltre} onSelect={setSelectedLigne} />
        </div>
      )}
      {depenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red mb-3 flex items-center gap-2"><TrendingDown size={14} /> Dépenses</h3>
          <BudgetTable lignes={depenses} entites={entites} showEntite={!entiteFiltre} onSelect={setSelectedLigne} />
        </div>
      )}

      {!loading && lignes.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <Target size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune ligne budgétaire pour {annee}</p>
          <button onClick={() => setShowForm(true)} className="text-blue text-xs mt-2 hover:underline">Ajouter une ligne</button>
        </div>
      )}

      {showForm && (
        <BudgetModal
          annee={annee}
          entiteId={entiteFiltre || ''}
          entites={entites}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadBudget() }}
        />
      )}

      {selectedLigne && (
        <BudgetDetailDrawer
          ligne={selectedLigne}
          entites={entites}
          onClose={() => setSelectedLigne(null)}
          onEdit={() => { setEditLigne(selectedLigne); setSelectedLigne(null) }}
          onDeleted={() => { setSelectedLigne(null); loadBudget() }}
        />
      )}

      {editLigne && (
        <BudgetModal
          annee={annee}
          entiteId={editLigne.entite_id}
          entites={entites}
          ligne={editLigne}
          onClose={() => setEditLigne(null)}
          onSuccess={() => { setEditLigne(null); loadBudget() }}
        />
      )}
    </div>
  )
}

function BudgetTable({ lignes, entites, showEntite, onSelect }: {
  lignes: BudgetLigne[]
  entites: { id: string; nom: string }[]
  showEntite: boolean
  onSelect: (l: BudgetLigne) => void
}) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {showEntite && <th>Entité</th>}
            <th>Catégorie</th><th>Sous-catégorie</th><th>Prévu</th><th>Réel</th><th>Écart</th><th>Avancement</th><th>Notes</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(l => {
            const ecart = l.budget_reel - l.budget_prevu
            const pct = l.budget_prevu > 0 ? Math.round(l.budget_reel / l.budget_prevu * 100) : 0
            const isOver = l.type === 'depense' ? ecart > 0 : ecart < 0
            const entityIdx = entites.findIndex(e => e.id === l.entite_id)
            const color = ENTITY_COLORS[entityIdx >= 0 ? entityIdx % ENTITY_COLORS.length : 0]
            return (
              <tr key={l.id} onClick={() => onSelect(l)}
                className="cursor-pointer hover:bg-surface-hover/50 transition-colors">
                {showEntite && (
                  <td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
                      {entites.find(e => e.id === l.entite_id)?.nom || '—'}
                    </span>
                  </td>
                )}
                <td className="text-xs font-medium text-text-primary">{capitalizeFirst(l.categorie)}</td>
                <td className="text-xs text-text-muted">{l.sous_categorie ? capitalizeFirst(l.sous_categorie) : '—'}</td>
                <td className="text-xs text-text-secondary">{formatMontant(l.budget_prevu)}</td>
                <td className="text-xs font-medium text-text-primary">{formatMontant(l.budget_reel)}</td>
                <td className={`text-xs font-semibold ${isOver ? 'text-red' : 'text-green'}`}>
                  {ecart >= 0 ? '+' : ''}{formatMontant(ecart)}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 bg-surface-border rounded-full w-16">
                      <div className={`h-full rounded-full ${pct > 100 ? 'bg-red' : 'bg-blue'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-2xs text-text-muted">{pct}%</span>
                  </div>
                </td>
                <td className="text-2xs text-text-muted max-w-[120px] truncate">{l.notes || '—'}</td>
                <td>
                  <ChevronRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BudgetDetailDrawer({ ligne, entites, onClose, onEdit, onDeleted }: {
  ligne: BudgetLigne
  entites: { id: string; nom: string }[]
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [lienLabel, setLienLabel] = useState<string | null>(null)
  const [lienUrl, setLienUrl] = useState<string | null>(null)
  const [pieces, setPieces] = useState<PieceJointe[]>(
    Array.isArray(ligne.pieces_jointes) ? ligne.pieces_jointes : []
  )
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (ligne.contrat_id) {
      supabase.from('contrats').select('titre, numero').eq('id', ligne.contrat_id).single()
        .then(({ data }) => {
          if (data) { setLienLabel(`Contrat — ${data.numero} ${data.titre}`); setLienUrl(`/crm/contrats/${ligne.contrat_id}`) }
        })
    } else if (ligne.projet_id) {
      supabase.from('projets').select('titre').eq('id', ligne.projet_id).single()
        .then(({ data }) => {
          if (data) { setLienLabel(`Projet — ${data.titre}`); setLienUrl(`/projets/${ligne.projet_id}`) }
        })
    }
  }, [ligne.contrat_id, ligne.projet_id]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeWithAnim() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const isRecette = ligne.type === 'recette'
  const ecart = ligne.budget_reel - ligne.budget_prevu
  const pct = ligne.budget_prevu > 0 ? Math.round(ligne.budget_reel / ligne.budget_prevu * 100) : 0
  const isOver = isRecette ? ecart < 0 : ecart > 0
  const entityIdx = entites.findIndex(e => e.id === ligne.entite_id)
  const color = ENTITY_COLORS[entityIdx >= 0 ? entityIdx % ENTITY_COLORS.length : 0]
  const periode = ligne.mois ? `${MOIS_NOMS[ligne.mois - 1]} ${ligne.annee}` : `Annuel ${ligne.annee}`
  const entiteNom = entites.find(e => e.id === ligne.entite_id)?.nom || '—'

  async function exportPDF() {
    setGenerating(true)
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, M = 15
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
    doc.text('LIGNE BUDGÉTAIRE', M, 25)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(`${capitalizeFirst(ligne.categorie)}${ligne.sous_categorie ? ' — ' + capitalizeFirst(ligne.sous_categorie) : ''}`, M, 33)
    doc.setDrawColor(220, 220, 220); doc.line(M, 40, W - M, 40)
    let y = 50
    const kpis: [string, string][] = [
      ['Type', isRecette ? 'Recette' : 'Dépense'],
      ['Entité', entiteNom],
      ['Période', periode],
      ['Montant prévu', formatMontant(ligne.budget_prevu)],
      ['Montant réel', formatMontant(ligne.budget_reel)],
      ['Écart', `${ecart >= 0 ? '+' : ''}${formatMontant(ecart)}`],
      ['Avancement', `${pct}%`],
      ...(lienLabel ? [['Lié à', lienLabel] as [string, string]] : []),
    ]
    for (const [k, v] of kpis) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60)
      doc.text(k, M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
      doc.text(v, M + 55, y); y += 7
    }
    if (ligne.notes) {
      doc.line(M, y + 3, W - M, y + 3); y += 11
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
      doc.text('Notes', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      for (const l of doc.splitTextToSize(ligne.notes, W - M * 2)) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(l, M, y); y += 5
      }
    }
    doc.setFontSize(8); doc.setTextColor(160, 160, 160)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — Aurantir Workspace`, M, 285)
    doc.save(`budget-${capitalizeFirst(ligne.categorie).replace(/\s+/g, '-')}-${ligne.annee}.pdf`)
    setGenerating(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('budget').delete().eq('id', ligne.id)
    setDeleting(false)
    onDeleted()
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const path = `budget/${ligne.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { storedPath, error: upErr } = await uploadToStorage(supabase, 'documents', path, file, { upsert: true })
    if (!upErr) {
      const next: PieceJointe[] = [...pieces, { name: file.name, url: storedPath, type: file.type }]
      await supabase.from('budget').update({ pieces_jointes: next }).eq('id', ligne.id)
      setPieces(next)
    }
    setUploading(false)
  }

  async function handleDeleteFile(idx: number) {
    const next = pieces.filter((_, i) => i !== idx)
    await supabase.from('budget').update({ pieces_jointes: next }).eq('id', ligne.id)
    setPieces(next)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeWithAnim}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl
        bg-[#0D1117] border-l border-surface-border
        transition-transform duration-300 ease-out
        ${visible ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className={`p-5 border-b border-surface-border flex-shrink-0 ${isRecette ? 'bg-green/5' : 'bg-red/5'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                ${isRecette ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>
                {isRecette ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isRecette ? 'Recette' : 'Dépense'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
                {entiteNom}
              </span>
            </div>
            <button onClick={closeWithAnim}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0">
              <X size={16} />
            </button>
          </div>
          <h2 className="text-base font-bold text-text-primary">{capitalizeFirst(ligne.categorie)}</h2>
          {ligne.sous_categorie && (
            <p className="text-xs text-text-muted mt-0.5">{capitalizeFirst(ligne.sous_categorie)}</p>
          )}

          {/* Actions dans le header */}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={exportPDF} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all disabled:opacity-50">
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              PDF
            </button>
            <div className="w-px h-4 bg-surface-border" />
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue/30 bg-blue/10 text-blue hover:bg-blue/20 transition-all">
              <Pencil size={12} />
              Modifier
            </button>
            <div className="w-px h-4 bg-surface-border" />
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-2xs text-text-muted">Confirmer ?</span>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded text-2xs border border-surface-border text-text-muted hover:bg-surface-hover transition-all">
                  Non
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-2 py-1 rounded text-2xs font-semibold bg-red/10 text-red border border-red/20 hover:bg-red/20 transition-all disabled:opacity-50">
                  {deleting ? '…' : 'Oui'}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border text-text-muted hover:bg-red/5 hover:text-red hover:border-red/20 transition-all">
                <Trash2 size={12} />
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-3 gap-0 border-b border-surface-border flex-shrink-0">
          {[
            { label: 'Prévu', value: formatMontant(ligne.budget_prevu), cls: 'text-text-secondary' },
            { label: 'Réel', value: formatMontant(ligne.budget_reel), cls: 'text-text-primary font-semibold' },
            { label: 'Écart', value: `${ecart >= 0 ? '+' : ''}${formatMontant(ecart)}`, cls: isOver ? 'text-red font-semibold' : 'text-green font-semibold' },
          ].map((m, i) => (
            <div key={i} className={`p-4 ${i < 2 ? 'border-r border-surface-border' : ''}`}>
              <p className="text-2xs text-text-muted mb-1">{m.label}</p>
              <p className={`text-sm ${m.cls}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Avancement */}
        <div className="px-5 py-3 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">Avancement</span>
            <span className={`text-xs font-semibold ${pct > 100 ? 'text-red' : 'text-text-primary'}`}>{pct}%</span>
          </div>
          <div className="h-2 bg-surface-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red' : isRecette ? 'bg-green' : 'bg-blue'}`}
              style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
          <div className="px-5 divide-y divide-surface-border">
            <DetailRow icon={<Calendar size={13} />} label="Période" value={periode} />
            {lienLabel && lienUrl && (
              <DetailRow icon={<FileText size={13} />} label="Lié à"
                value={
                  <a href={lienUrl} className="inline-flex items-center gap-1.5 text-blue hover:underline" onClick={e => e.stopPropagation()}>
                    {lienLabel}<ExternalLink size={10} />
                  </a>
                }
              />
            )}
          </div>

          {ligne.notes && (
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Tag size={13} />
                <span className="text-xs">Notes</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-hover rounded-lg p-3 border border-surface-border">
                {ligne.notes}
              </p>
            </div>
          )}

          {/* Pièces jointes */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 text-text-muted">
              <Paperclip size={13} />
              <span className="text-xs font-medium">Pièces jointes</span>
              {pieces.length > 0 && (
                <span className="ml-auto text-2xs bg-surface-hover border border-surface-border px-1.5 py-0.5 rounded-full">{pieces.length}</span>
              )}
            </div>

            {/* Zone d'upload */}
            <label className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all
              ${uploading ? 'border-blue/30 bg-blue/5 opacity-60' : 'border-surface-border hover:border-blue/30 hover:bg-blue/5'}`}>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
              <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                {uploading
                  ? <Loader2 size={14} className="text-blue animate-spin" />
                  : <Paperclip size={14} className="text-text-muted" />
                }
              </div>
              <p className="text-xs text-text-muted">
                {uploading ? 'Téléversement…' : 'Glisser ou cliquer — PDF, Image'}
              </p>
            </label>

            {/* Liste des fichiers */}
            {pieces.length > 0 && (
              <div className="space-y-1.5">
                {pieces.map((p, i) => {
                  const isImg = p.type?.startsWith('image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(p.name)
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-hover border border-surface-border group">
                      <div className="flex-shrink-0 text-text-muted">
                        {isImg ? <ImageIcon size={13} className="text-blue" /> : <FileText size={13} className="text-red" />}
                      </div>
                      <button type="button" onClick={() => downloadDocument(supabase, 'documents', p.url, p.name)}
                        className="flex-1 min-w-0 text-xs text-text-secondary hover:text-blue truncate transition-colors text-left">
                        {p.name}
                      </button>
                      <button onClick={() => handleDeleteFile(i)}
                        className="flex-shrink-0 p-1 rounded text-text-muted hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 gap-4">
      <div className="flex items-center gap-2 text-text-muted flex-shrink-0">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs text-text-primary text-right">{value}</span>
    </div>
  )
}

interface LienItem { id: string; label: string; type: 'contrat' | 'projet' }

function BudgetModal({ annee, entiteId, entites, ligne, onClose, onSuccess }: {
  annee: number
  entiteId: string
  entites: { id: string; nom: string }[]
  ligne?: BudgetLigne
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!ligne
  const [form, setForm] = useState({
    type: (ligne?.type ?? 'recette') as 'recette' | 'depense',
    categorie: ligne?.categorie ?? '',
    sous_categorie: ligne?.sous_categorie ?? '',
    budget_prevu: ligne?.budget_prevu?.toString() ?? '',
    mois: ligne?.mois?.toString() ?? '',
    notes: ligne?.notes ?? '',
    entite_id: ligne?.entite_id ?? entiteId,
    lien_id: ligne?.contrat_id ?? ligne?.projet_id ?? '',
    lien_type: (ligne?.contrat_id ? 'contrat' : ligne?.projet_id ? 'projet' : '') as '' | 'contrat' | 'projet',
  })
  const [liens, setLiens] = useState<LienItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const eid = form.entite_id
    if (!eid) return
    Promise.all([
      supabase.from('contrats').select('id, titre, numero').eq('entite_id', eid).limit(50),
      supabase.from('projets').select('id, titre').eq('entite_id', eid).limit(50),
    ]).then(([{ data: contrats }, { data: projets }]) => {
      setLiens([
        ...(contrats || []).map((c: any) => ({ id: c.id, label: `${c.numero} — ${c.titre}`, type: 'contrat' as const })),
        ...(projets  || []).map((p: any) => ({ id: p.id, label: p.titre,                    type: 'projet'  as const })),
      ])
    })
  }, [form.entite_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = form.type === 'recette' ? CATEGORIES_RECETTE : CATEGORIES_DEPENSE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    if (!form.entite_id) { setError('Sélectionnez une entité.'); setSaving(false); return }

    const basePayload = {
      entite_id: form.entite_id, annee,
      mois: form.mois ? parseInt(form.mois) : null,
      type: form.type,
      categorie: form.categorie,
      sous_categorie: form.sous_categorie || null,
      budget_prevu: parseFloat(form.budget_prevu),
      notes: form.notes || null,
    }

    let targetId = ligne?.id
    if (isEdit && targetId) {
      const { error: updateError } = await supabase.from('budget').update(basePayload).eq('id', targetId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { data: inserted, error: insertError } = await supabase.from('budget').insert({
        ...basePayload, budget_reel: 0,
      }).select('id').single()
      if (insertError) { setError(insertError.message); setSaving(false); return }
      targetId = inserted?.id
    }

    // Liaison contrat/projet (migration 027) — silencieuse si colonnes absentes
    if (targetId && form.lien_type) {
      const patch = form.lien_type === 'contrat'
        ? { contrat_id: form.lien_id || null, projet_id: null }
        : { projet_id: form.lien_id || null, contrat_id: null }
      await supabase.from('budget').update(patch).eq('id', targetId)
    }

    // Pièce jointe (migration 028)
    if (file && targetId) {
      const path = `budget/${targetId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { storedPath, error: upErr } = await uploadToStorage(supabase, 'documents', path, file, { upsert: true })
      if (!upErr) {
        const existing: PieceJointe[] = Array.isArray(ligne?.pieces_jointes) ? ligne.pieces_jointes : []
        await supabase.from('budget').update({
          pieces_jointes: [...existing, { name: file.name, url: storedPath, type: file.type }]
        }).eq('id', targetId)
      }
    }

    setSaving(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">{isEdit ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20"><p className="text-xs text-red">{error}</p></div>}

          {/* Entité */}
          {entites.length > 1 && (
            <div className="space-y-1.5">
              <label className="label">Entité *</label>
              <div className="flex gap-2">
                {entites.map(e => (
                  <button key={e.id} type="button" onClick={() => setForm({ ...form, entite_id: e.id, lien_id: '', lien_type: '' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.entite_id === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:bg-surface-hover'
                    }`}>{e.nom}</button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div className="flex gap-2">
            {(['recette', 'depense'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm({ ...form, type: t, categorie: '' })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.type === t
                    ? t === 'recette' ? 'bg-green/10 text-green border-green/30' : 'bg-red/10 text-red border-red/30'
                    : 'border-surface-border text-text-muted hover:bg-surface-hover'
                }`}>
                {t === 'recette' ? '↑ Recette' : '↓ Dépense'}
              </button>
            ))}
          </div>

          {/* Catégorie (select dynamique) + Sous-catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Catégorie *</label>
              <select className="input" value={form.categorie}
                onChange={e => setForm({ ...form, categorie: e.target.value })} required>
                <option value="">{form.type === 'recette' ? 'Sélectionner une recette' : 'Sélectionner une dépense'}</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Sous-catégorie</label>
              <input type="text" className="input" value={form.sous_categorie}
                onChange={e => setForm({ ...form, sous_categorie: e.target.value })} placeholder="Optionnel" />
            </div>
          </div>

          {/* Montant + Mois */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Montant prévu (FCFA) *</label>
              <input type="number" className="input" value={form.budget_prevu}
                onChange={e => setForm({ ...form, budget_prevu: e.target.value })} required min="0" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="label">Mois</label>
              <select className="input" value={form.mois} onChange={e => setForm({ ...form, mois: e.target.value })}>
                <option value="">Annuel</option>
                {['Janv','Fév','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lier à un contrat / projet */}
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><Link2 size={11} /> Lier à un contrat / projet</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={form.lien_type}
                onChange={e => setForm({ ...form, lien_type: e.target.value as '' | 'contrat' | 'projet', lien_id: '' })}>
                <option value="">— Type —</option>
                <option value="contrat">Contrat</option>
                <option value="projet">Projet</option>
              </select>
              <select className="input" value={form.lien_id}
                onChange={e => setForm({ ...form, lien_id: e.target.value })}
                disabled={!form.lien_type}>
                <option value="">— Choisir —</option>
                {liens.filter(l => !form.lien_type || l.type === form.lien_type).map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="label">Notes</label>
            <input type="text" className="input" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel" />
          </div>

          {/* Pièce jointe */}
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><Paperclip size={11} /> Pièce jointe</label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              file ? 'border-blue/40 bg-blue/5' : 'border-surface-border hover:border-blue/30 hover:bg-blue/5'
            }`}>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                <Paperclip size={13} className={file ? 'text-blue' : 'text-text-muted'} />
              </div>
              <div className="flex-1 min-w-0">
                {file
                  ? <p className="text-xs font-medium text-blue truncate">{file.name}</p>
                  : <p className="text-xs text-text-muted">PDF, JPG ou PNG — cliquer pour sélectionner</p>
                }
              </div>
              {file && (
                <button type="button" onClick={e => { e.preventDefault(); setFile(null) }}
                  className="flex-shrink-0 text-text-muted hover:text-red transition-colors">
                  <X size={13} />
                </button>
              )}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving}>{isEdit ? 'Enregistrer' : 'Planifier la ligne'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
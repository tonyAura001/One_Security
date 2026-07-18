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
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatDate, formatMontant } from '@/aurantir-front-kit/lib/utils'
import {
  ChevronRight, Flag, CheckCircle, AlertTriangle, Clock,
  FileText, Star, Download, PackageCheck, Banknote
} from 'lucide-react'

type StatutFacturation = 'en_attente' | 'acompte_recu' | 'solde_recu' | 'en_litige'

const STATUT_FACT_CONFIG: Record<StatutFacturation, { label: string; className: string }> = {
  en_attente:   { label: 'En attente de paiement', className: 'bg-amber/10 text-amber border-amber/20' },
  acompte_recu: { label: 'Acompte reçu',           className: 'bg-blue/10 text-blue border-blue/20' },
  solde_recu:   { label: 'Entièrement réglé',       className: 'bg-green/10 text-green border-green/20' },
  en_litige:    { label: 'En litige',               className: 'bg-red/10 text-red border-red/20' },
}

interface FicheCloture {
  id: string; projet_id: string; statut: 'brouillon' | 'soumis' | 'valide'
  objectifs_atteints: boolean; taux_completion: number; budget_consomme: number
  delai_respecte: boolean; recette_validee: boolean
  satisfaction_client?: number; heures_reelles?: number
  statut_facturation?: StatutFacturation
  lecons_apprises?: string; points_positifs?: string
  points_amelioration?: string; prochaines_etapes?: string
  updated_at?: string
}

interface Projet {
  id: string; titre: string; statut: string; avancement: number
  budget_prevu: number; budget_reel: number; heures_prevues?: number
  date_debut?: string; date_fin_prevue?: string; date_fin_reelle?: string
}

export default function ProjetCloturePage() {
  const { id: projetId } = useParams<{ id: string }>()
  const [projet, setProjet] = useState<Projet | null>(null)
  const [fiche, setFiche] = useState<FicheCloture | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    objectifs_atteints: true,
    delai_respecte: true,
    recette_validee: false,
    satisfaction_client: 4,
    heures_reelles: '',
    statut_facturation: 'en_attente' as StatutFacturation,
    lecons_apprises: '',
    points_positifs: '',
    points_amelioration: '',
    prochaines_etapes: '',
  })
  const supabase = createClient()

  useEffect(() => { load() }, [projetId])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from('projets').select('id, titre, statut, avancement, budget_prevu, budget_reel, heures_prevues, date_debut, date_fin_prevue, date_fin_reelle').eq('id', projetId).single(),
      supabase.from('fiches_cloture').select('*').eq('projet_id', projetId).maybeSingle(),
    ])
    if (p) setProjet(p as Projet)
    if (f) {
      setFiche(f as FicheCloture)
      setForm({
        objectifs_atteints: f.objectifs_atteints ?? true,
        delai_respecte: f.delai_respecte ?? true,
        recette_validee: f.recette_validee ?? false,
        satisfaction_client: f.satisfaction_client || 4,
        heures_reelles: f.heures_reelles?.toString() || '',
        statut_facturation: (f.statut_facturation as StatutFacturation) || 'en_attente',
        lecons_apprises: f.lecons_apprises || '',
        points_positifs: f.points_positifs || '',
        points_amelioration: f.points_amelioration || '',
        prochaines_etapes: f.prochaines_etapes || '',
      })
    }
    setLoading(false)
  }

  async function save(statut: 'brouillon' | 'soumis' = 'brouillon') {
    setSaving(true)
    const payload = {
      projet_id: projetId, statut,
      objectifs_atteints: form.objectifs_atteints,
      taux_completion: projet?.avancement || 0,
      budget_consomme: projet?.budget_reel || 0,
      delai_respecte: form.delai_respecte,
      recette_validee: form.recette_validee,
      satisfaction_client: form.satisfaction_client,
      heures_reelles: form.heures_reelles ? parseInt(form.heures_reelles) : null,
      statut_facturation: form.statut_facturation,
      lecons_apprises: form.lecons_apprises || null,
      points_positifs: form.points_positifs || null,
      points_amelioration: form.points_amelioration || null,
      prochaines_etapes: form.prochaines_etapes || null,
    }
    if (fiche) {
      await supabase.from('fiches_cloture').update(payload).eq('id', fiche.id)
    } else {
      const { data } = await supabase.from('fiches_cloture').insert(payload).select().single()
      if (data) setFiche(data as FicheCloture)
    }
    if (statut === 'soumis') {
      await supabase.from('projets').update({ statut: 'termine' }).eq('id', projetId)
    }
    setSaving(false)
    load()
  }

  async function exportPDF() {
    if (!projet) return
    setGenerating(true)
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, M = 15
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
    doc.text('FICHE DE CLÔTURE', M, 25)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(projet.titre, M, 33)
    doc.setDrawColor(230, 230, 230); doc.line(M, 44, W - M, 44)
    let y = 52
    const kpis: [string, string][] = [
      ['Objectifs atteints', form.objectifs_atteints ? 'Oui' : 'Non'],
      ['Délai respecté', form.delai_respecte ? 'Oui' : 'Non'],
      ['Recette validée', form.recette_validee ? 'Oui' : 'Non'],
      ['Satisfaction client', `${form.satisfaction_client}/5`],
      ['Budget réel', `${formatMontant(projet.budget_reel)} (prévu : ${formatMontant(projet.budget_prevu)})`],
      ['Temps consommé', form.heures_reelles ? `${form.heures_reelles}h (prévu : ${projet.heures_prevues || '—'}h)` : '—'],
      ['Facturation', STATUT_FACT_CONFIG[form.statut_facturation].label],
    ]
    for (const [k, v] of kpis) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60)
      doc.text(k, M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
      doc.text(v, M + 65, y); y += 7
    }
    doc.line(M, y + 2, W - M, y + 2); y += 10
    const sections: [string, string][] = [
      ['Points positifs', form.points_positifs],
      ["Points d'amélioration", form.points_amelioration],
      ['Leçons apprises', form.lecons_apprises],
      ['Prochaines étapes', form.prochaines_etapes],
    ]
    for (const [title, content] of sections) {
      if (!content) continue
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
      doc.text(title, M, y); y += 5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      for (const line of doc.splitTextToSize(content, W - M * 2)) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(line, M, y); y += 5
      }
      y += 4
    }
    doc.save(`cloture-${projet.titre.replace(/\s+/g, '-')}.pdf`)
    setGenerating(false)
  }

  const budgetEcart = projet ? projet.budget_reel - projet.budget_prevu : 0
  const heuresEcart = projet?.heures_prevues && form.heures_reelles
    ? parseInt(form.heures_reelles) - projet.heures_prevues
    : null

  if (loading) return (
    <div className="space-y-4 animate-fade-up">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href={`/projets/${projetId}`} className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Projet
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">Fiche de clôture</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Fiche de clôture</h1>
          <p className="page-subtitle">{projet?.titre}</p>
        </div>
        <div className="flex items-center gap-2">
          {fiche && (
            <span className={`text-2xs px-2 py-0.5 rounded-full border font-medium ${
              fiche.statut === 'valide' ? 'bg-green/10 text-green border-green/20'
              : fiche.statut === 'soumis' ? 'bg-blue/10 text-blue border-blue/20'
              : 'bg-surface text-text-muted border-surface-border'
            }`}>{fiche.statut}</span>
          )}
          <Button variant="secondary" size="sm" icon={<Download size={13} />} loading={generating} onClick={exportPDF} disabled={!projet}>
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* KPIs — Avancement remplacé par Temps consommé */}
      {projet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Temps consommé (remplace Avancement) */}
          <Card className="p-4 space-y-1">
            <p className="text-xs text-text-muted flex items-center gap-1"><Clock size={10} /> Temps consommé</p>
            {form.heures_reelles ? (
              <>
                <p className={`text-xl font-bold ${heuresEcart !== null && heuresEcart > 0 ? 'text-red' : 'text-green'}`}>
                  {form.heures_reelles}h
                </p>
                {projet.heures_prevues ? (
                  <p className={`text-2xs ${heuresEcart !== null && heuresEcart > 0 ? 'text-red' : 'text-green'}`}>
                    {heuresEcart !== null && heuresEcart > 0 ? '+' : ''}{heuresEcart}h vs {projet.heures_prevues}h prévu
                  </p>
                ) : (
                  <p className="text-2xs text-text-muted">{projet.heures_prevues ?? '—'}h estimées</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-text-muted">—</p>
                <p className="text-2xs text-text-muted">{projet.heures_prevues ? `${projet.heures_prevues}h estimées` : 'Non renseigné'}</p>
              </>
            )}
          </Card>

          {/* Budget */}
          <Card className={`p-4 space-y-1 ${budgetEcart > 0 ? 'border-red/20' : 'border-green/20'}`}>
            <p className="text-xs text-text-muted">Budget réel</p>
            <p className="text-xl font-bold text-text-primary">{formatMontant(projet.budget_reel)}</p>
            {projet.budget_prevu > 0 && (
              <p className={`text-2xs ${budgetEcart > 0 ? 'text-red' : 'text-green'}`}>
                {budgetEcart > 0 ? '+' : ''}{formatMontant(budgetEcart)} vs prévu
              </p>
            )}
          </Card>

          {/* Dates */}
          <Card className="p-4 space-y-1">
            <p className="text-xs text-text-muted">Date début</p>
            <p className="text-sm font-medium text-text-primary">{projet.date_debut ? formatDate(projet.date_debut) : '—'}</p>
          </Card>
          <Card className="p-4 space-y-1">
            <p className="text-xs text-text-muted">Date fin prévue</p>
            <p className="text-sm font-medium text-text-primary">{projet.date_fin_prevue ? formatDate(projet.date_fin_prevue) : '—'}</p>
            {projet.date_fin_reelle && <p className="text-2xs text-text-muted">Réelle : {formatDate(projet.date_fin_reelle)}</p>}
          </Card>
        </div>
      )}

      {/* Badge statut facturation */}
      {fiche && (
        <div className="flex items-center gap-2">
          <Banknote size={14} className="text-text-muted" />
          <span className="text-xs text-text-muted">Facturation :</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUT_FACT_CONFIG[fiche.statut_facturation || 'en_attente'].className}`}>
            {STATUT_FACT_CONFIG[fiche.statut_facturation || 'en_attente'].label}
          </span>
        </div>
      )}

      {/* Formulaire */}
      <Card className="p-6 space-y-6">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Flag size={14} className="text-green" /> Évaluation du projet
        </h3>

        {/* 3 toggles Oui/Non */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'objectifs_atteints', label: 'Objectifs atteints ?', iconOui: <CheckCircle size={12} />, iconNon: <AlertTriangle size={12} />, colorNon: 'red' },
            { key: 'delai_respecte',     label: 'Délai respecté ?',     iconOui: <CheckCircle size={12} />, iconNon: <Clock size={12} />,        colorNon: 'amber' },
            { key: 'recette_validee',    label: 'Recette & Livrables validés ?', iconOui: <PackageCheck size={12} />, iconNon: <AlertTriangle size={12} />, colorNon: 'red' },
          ] as const).map(({ key, label, iconOui, iconNon, colorNon }) => (
            <div key={key} className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">{label}</p>
              <div className="flex gap-2">
                {([true, false] as const).map(v => (
                  <button key={String(v)} type="button"
                    onClick={() => setForm({ ...form, [key]: v })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                      form[key] === v
                        ? v ? 'bg-green/10 text-green border-green/30' : `bg-${colorNon}/10 text-${colorNon} border-${colorNon}/30`
                        : 'border-surface-border text-text-muted hover:bg-surface-hover'
                    }`}>
                    {v ? iconOui : iconNon}{v ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Satisfaction + Heures réelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Satisfaction client</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setForm({ ...form, satisfaction_client: n })}
                  className="transition-transform hover:scale-110">
                  <Star size={22} className={n <= form.satisfaction_client ? 'text-amber fill-amber' : 'text-surface-border'} />
                </button>
              ))}
              <span className="text-sm font-medium text-text-secondary ml-1">{form.satisfaction_client}/5</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><Clock size={11} /> Heures réelles consommées</label>
            <input type="number" className="input" min="0" value={form.heures_reelles}
              onChange={e => setForm({ ...form, heures_reelles: e.target.value })}
              placeholder={projet?.heures_prevues ? `Estimé : ${projet.heures_prevues}h` : 'Ex: 145'} />
          </div>
        </div>

        {/* Statut facturation */}
        <div className="space-y-1.5">
          <label className="label flex items-center gap-1.5"><Banknote size={11} /> Statut de facturation</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(STATUT_FACT_CONFIG) as [StatutFacturation, typeof STATUT_FACT_CONFIG[StatutFacturation]][]).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => setForm({ ...form, statut_facturation: val })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all
                  ${form.statut_facturation === val ? cfg.className : 'border-surface-border text-text-muted hover:bg-surface-hover'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* Champs texte */}
        <div className="space-y-4">
          {[
            { key: 'points_positifs',    label: '✅ Points positifs',        placeholder: 'Ce qui a bien fonctionné...' },
            { key: 'points_amelioration',label: "⚠️ Points d'amélioration",  placeholder: 'Ce qui peut être mieux...' },
            { key: 'lecons_apprises',    label: '📚 Leçons apprises',        placeholder: 'Enseignements pour les prochains projets...' },
            { key: 'prochaines_etapes',  label: '🚀 Prochaines étapes',      placeholder: 'Suite, maintenance, opportunités...' },
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="label">{field.label}</label>
              <textarea className="input" rows={3}
                value={form[field.key as keyof typeof form] as string}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder} />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" loading={saving} onClick={() => save('brouillon')}>
            Sauvegarder brouillon
          </Button>
          <Button className="flex-1 bg-green hover:bg-green/90" loading={saving} icon={<Flag size={14} />} onClick={() => save('soumis')}>
            Clôturer le projet
          </Button>
        </div>
      </Card>

      {fiche?.updated_at && (
        <p className="text-2xs text-text-muted text-center">Dernière modification : {formatDate(fiche.updated_at)}</p>
      )}
    </div>
  )
}
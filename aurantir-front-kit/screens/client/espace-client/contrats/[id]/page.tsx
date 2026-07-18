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
import { formatMontant, formatDate, joursRestants } from '@/aurantir-front-kit/lib/utils'
import { downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  ArrowLeft, FileSignature, FileText, Calendar, Clock, CheckCircle2,
  AlertTriangle, AlertCircle, Download, PenLine, RotateCcw, FolderKanban,
  Paperclip, Bell, ShieldAlert, TrendingUp, ChevronRight,
} from 'lucide-react'

type ContratStatut = 'BROUILLON' | 'EN_ATTENTE_DE_SIGNATURE' | 'ACTIF' | 'EXPIRÉ' | 'RÉSILIÉ' | 'LITIGE'

interface Contrat {
  id: string
  numero: string
  titre: string
  type: string
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
  signataire_client_nom?: string
  pieces_jointes?: { name: string; path: string; size: number; type: string }[]
  entite?: { nom: string; couleur: string }
  signataire_interne?: { prenom: string; nom: string }
}

interface Signature {
  id: string
  signataire_id: string
  role: string
  statut: 'en_attente' | 'signe' | 'refuse'
  signe_le?: string
  signataire?: { prenom: string; nom: string }
}

interface ProjetLie { id: string; titre: string; statut: string; avancement: number }

const STATUT_CFG: Record<ContratStatut, { label: string; cls: string; icon: React.ReactNode }> = {
  BROUILLON:               { label: 'Brouillon',            cls: 'bg-white/5 text-white/40 border-white/10',               icon: <FileText size={13} /> },
  EN_ATTENTE_DE_SIGNATURE: { label: 'Signature en attente', cls: 'bg-amber/10 text-amber border-amber/20',                 icon: <Clock size={13} /> },
  ACTIF:                   { label: 'Actif',                cls: 'bg-green/10 text-green border-green/20',                 icon: <CheckCircle2 size={13} /> },
  'EXPIRÉ':                { label: 'Expiré',               cls: 'bg-white/5 text-white/30 border-white/10',               icon: <Clock size={13} /> },
  'RÉSILIÉ':               { label: 'Résilié',              cls: 'bg-red/10 text-red border-red/20',                       icon: <AlertTriangle size={13} /> },
  LITIGE:                  { label: 'Litige',               cls: 'bg-orange-500/10 text-orange-400 border-orange-400/20',  icon: <AlertTriangle size={13} /> },
}

const TYPE_LABELS: Record<string, string> = {
  prestation: 'Prestation', maintenance: 'Maintenance', abonnement: 'Abonnement',
  licence: 'Licence', partenariat: 'Partenariat', autre: 'Autre',
}

const RECONDUCTION_LABELS: Record<string, string> = {
  tacite: 'Tacite reconduction', duree_ferme: 'Durée ferme',
}

function computeStatut(c: Contrat): ContratStatut {
  if (c.statut === 'ACTIF' && c.date_fin && new Date(c.date_fin) < new Date()) return 'EXPIRÉ'
  return c.statut
}

function SigBadge({ sig }: { sig: { statut: 'en_attente' | 'signe' | 'refuse'; signe_le?: string } }) {
  if (sig.statut === 'signe') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20 text-2xs font-medium">
        <CheckCircle2 size={9} /> Signé{sig.signe_le ? ` le ${formatDate(sig.signe_le)}` : ''}
      </span>
    )
  }
  if (sig.statut === 'refuse') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20 text-2xs font-medium">
        Refusé
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-2xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-amber" /> En attente
    </span>
  )
}

export default function ClientContratDetailPage() {
  const { id: contratId } = useParams<{ id: string }>()
  const [contrat, setContrat] = useState<Contrat | null>(null)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [projets, setProjets] = useState<ProjetLie[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [contratId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('contrats')
        .select(`
          id, numero, titre, type, statut, montant, devise,
          date_debut, date_fin, est_recurrent, periodicite, type_reconduction, preavis_rupture,
          description, clauses, signataire_client_nom, pieces_jointes,
          entite:entites_legales(nom, couleur),
          signataire_interne:users!signataire_interne_id(prenom, nom)
        `)
        .eq('id', contratId)
        .single(),
      supabase.from('signatures_elec')
        .select('id, signataire_id, role, statut, signe_le, signataire:users(prenom, nom)')
        .eq('document_id', contratId)
        .eq('document_type', 'contrat')
        .order('created_at'),
      supabase.from('projets')
        .select('id, titre, statut, avancement')
        .eq('contrat_id', contratId),
    ])

    if (!c) { setNotFound(true); setLoading(false); return }
    setContrat(c as unknown as Contrat)
    setSignatures((s || []) as unknown as Signature[])
    setProjets((p || []) as ProjetLie[])
    setLoading(false)
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
    doc.text(`N° ${contrat.numero} · ${TYPE_LABELS[contrat.type] || contrat.type} · ${STATUT_CFG[effectiveStatut].label}`, M, 42)
    doc.setDrawColor(230, 230, 230); doc.line(M, 47, W - M, 47)
    let y = 55
    const kpis: [string, string][] = [
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-white/5 rounded w-1/3" />
        <div className="h-32 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-white/5 rounded-2xl" />
            <div className="h-28 bg-white/5 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <div className="h-28 bg-white/5 rounded-2xl" />
            <div className="h-28 bg-white/5 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !contrat) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-sm text-white/40">Contrat introuvable ou accès non autorisé</p>
        <Link href="/espace-client/projets"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue hover:underline">
          <ArrowLeft size={12} /> Retour à mes projets
        </Link>
      </div>
    )
  }

  const effectiveStatut = computeStatut(contrat)
  const cfg = STATUT_CFG[effectiveStatut]
  const jours = contrat.date_fin ? joursRestants(contrat.date_fin) : null
  const entiteColor = contrat.entite?.couleur || '#2D6BFF'
  const projetRetour = projets[0]

  return (
    <div className="space-y-6">
      {/* Retour */}
      <Link href={projetRetour ? `/espace-client/projets/${projetRetour.id}` : '/espace-client/projets'}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
        <ArrowLeft size={12} /> {projetRetour ? projetRetour.titre : 'Mes projets'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center flex-shrink-0">
            <FileSignature size={18} className="text-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs text-white/40">{contrat.numero}</span>
              {contrat.entite && (
                <span className="text-2xs px-1.5 py-0.5 rounded font-medium border"
                  style={{ color: entiteColor, borderColor: entiteColor + '44', background: entiteColor + '18' }}>
                  {contrat.entite.nom}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-white">{contrat.titre}</h1>
            <p className="text-xs text-white/40 mt-0.5">{TYPE_LABELS[contrat.type] || contrat.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
            {cfg.icon}{cfg.label}
          </span>
          <button onClick={exportPDF} disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/60 border border-white/10 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50">
            <Download size={13} /> {generating ? 'Génération…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Bandeaux d'alerte */}
      {effectiveStatut === 'ACTIF' && jours !== null && jours <= 30 && jours > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber/10 border border-amber/20 rounded-lg">
          <Bell size={14} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            Ce contrat expire dans <strong>{jours} jours</strong> ({formatDate(contrat.date_fin!)}).
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
      {effectiveStatut === 'ACTIF' && contrat.montant > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green/5 border border-green/15 rounded-xl">
          <TrendingUp size={16} className="text-green" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/40">Valeur contractuelle active :</span>
            <span className="text-lg font-bold text-green">{formatMontant(contrat.montant, contrat.devise || 'FCFA')}</span>
            {contrat.est_recurrent && contrat.periodicite && (
              <span className="text-xs text-green/70">/ {contrat.periodicite}</span>
            )}
          </div>
        </div>
      )}

      {/* Corps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">

          {/* Informations contractuelles */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText size={14} className="text-blue" /> Informations contractuelles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">Valeur</p>
                <p className="text-lg font-bold text-white">{formatMontant(contrat.montant, contrat.devise || 'FCFA')}</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Statut</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                  {cfg.icon}{cfg.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><Calendar size={10} /> Début</p>
                <p className="text-sm text-white/70">{formatDate(contrat.date_debut)}</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><Calendar size={10} /> Fin</p>
                <p className="text-sm text-white/70">
                  {contrat.date_fin ? formatDate(contrat.date_fin) : <span className="text-white/30">Indéterminée</span>}
                </p>
                {jours !== null && jours > 0 && jours <= 60 && effectiveStatut === 'ACTIF' && (
                  <p className={`text-2xs font-medium mt-0.5 ${jours <= 30 ? 'text-amber' : 'text-white/30'}`}>{jours}j restants</p>
                )}
              </div>
              {contrat.est_recurrent && (
                <div className="col-span-2 flex items-start gap-6 pt-1 border-t border-white/5">
                  <div>
                    <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><RotateCcw size={10} /> Récurrence</p>
                    <p className="text-sm text-white/70 capitalize">{contrat.periodicite}</p>
                  </div>
                  {contrat.type_reconduction && (
                    <div>
                      <p className="text-xs text-white/30 mb-1">Reconduction</p>
                      <p className="text-sm text-white/70">{RECONDUCTION_LABELS[contrat.type_reconduction] || contrat.type_reconduction}</p>
                    </div>
                  )}
                  {contrat.preavis_rupture && contrat.preavis_rupture !== 'aucun' && (
                    <div>
                      <p className="text-xs text-white/30 mb-1">Préavis</p>
                      <p className="text-sm text-white/70">{contrat.preavis_rupture}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-white">Description & Objet</h3>
            <p className="text-sm text-white/50 whitespace-pre-wrap leading-relaxed">
              {contrat.description || <span className="text-white/20 italic">Aucune description</span>}
            </p>
          </div>

          {/* Clauses */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-white">Clauses & Conditions</h3>
            <p className="text-sm text-white/50 whitespace-pre-wrap leading-relaxed">
              {contrat.clauses || <span className="text-white/20 italic">Aucune clause renseignée</span>}
            </p>
          </div>

          {/* Signatures */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PenLine size={14} className="text-blue" /> Signatures
            </h3>
            {signatures.length > 0 ? (
              <div className="space-y-2">
                {signatures.map(sig => (
                  <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 uppercase">
                        {sig.signataire ? sig.signataire.prenom[0] : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">
                          {sig.signataire ? `${sig.signataire.prenom} ${sig.signataire.nom}` : '—'}
                        </p>
                        <p className="text-2xs text-white/30">{sig.role}</p>
                      </div>
                    </div>
                    <SigBadge sig={sig} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-6">Aucun signataire configuré pour le moment</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Projet associé */}
          {projets.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
                <FolderKanban size={12} /> Projet{projets.length > 1 ? 's' : ''} associé{projets.length > 1 ? 's' : ''}
              </h4>
              <div className="space-y-1.5">
                {projets.map(p => (
                  <Link key={p.id} href={`/espace-client/projets/${p.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban size={12} className="text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white group-hover:text-blue transition-colors truncate">{p.titre}</p>
                      <div className="h-0.5 bg-white/5 rounded-full mt-1.5">
                        <div className="h-full bg-blue rounded-full" style={{ width: `${p.avancement}%` }} />
                      </div>
                    </div>
                    <ChevronRight size={11} className="text-white/20 group-hover:text-white/40 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Récurrence */}
          {contrat.est_recurrent && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
                <RotateCcw size={11} /> Récurrence
              </h4>
              <InfoRow label="Fréquence" value={contrat.periodicite || '—'} />
              {contrat.type_reconduction && (
                <InfoRow label="Reconduction" value={RECONDUCTION_LABELS[contrat.type_reconduction] || contrat.type_reconduction} />
              )}
              {contrat.preavis_rupture && contrat.preavis_rupture !== 'aucun' && (
                <InfoRow label="Préavis" value={contrat.preavis_rupture} />
              )}
            </div>
          )}

          {/* Détails */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-white/40">Détails</h4>
            <InfoRow label="Numéro" value={<span className="font-mono">{contrat.numero}</span>} />
            <InfoRow label="Type" value={TYPE_LABELS[contrat.type] || contrat.type} />
            <InfoRow label="Devise" value={contrat.devise || 'FCFA'} />
            {contrat.signataire_client_nom && (
              <InfoRow label="Signataire client" value={contrat.signataire_client_nom} />
            )}
            {contrat.signataire_interne && (
              <InfoRow label="Signataire interne" value={`${contrat.signataire_interne.prenom} ${contrat.signataire_interne.nom}`} />
            )}
          </div>

          {/* Pièces jointes */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
              <Paperclip size={12} /> Pièces jointes ({contrat.pieces_jointes?.length || 0})
            </h4>
            {contrat.pieces_jointes && contrat.pieces_jointes.length > 0 ? (
              <div className="space-y-1.5">
                {contrat.pieces_jointes.map((pj, i) => (
                  <button key={i} onClick={() => downloadFile(pj)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 group transition-colors text-left">
                    <span className="w-6 h-6 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={11} className="text-blue" />
                    </span>
                    <span className="text-xs text-white/60 truncate flex-1 group-hover:text-blue transition-colors">{pj.name}</span>
                    <span className="text-2xs text-white/20 flex-shrink-0">
                      {pj.size ? (pj.size < 1048576 ? `${(pj.size / 1024).toFixed(0)} Ko` : `${(pj.size / 1048576).toFixed(1)} Mo`) : ''}
                    </span>
                    <Download size={11} className="text-white/20 group-hover:text-blue transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-2">Aucun fichier joint</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-white/30">{label}</span>
      <span className="text-white/60 font-medium text-right">{value}</span>
    </div>
  )
}
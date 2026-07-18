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
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'
import {
  ChevronRight, Download, Send, CheckCircle, AlertTriangle,
  FileText, Building2, User, ChevronDown,
  Ban, RotateCcw, BadgeCheck, Clock, ArrowRight, XCircle
} from 'lucide-react'

interface LigneDevis {
  id: string; designation: string; description?: string
  quantite: number; prix_unitaire: number; taux_tva: number
  remise_pct?: number; montant_ht: number; montant_tva: number; montant_ttc: number
}

interface Devis {
  id: string; numero: string; titre?: string; statut: string
  date_emission: string; date_validite?: string
  montant_ht: number; montant_tva: number; montant_ttc: number
  devise: string; notes?: string; conditions_paiement?: string
  entite_id?: string; client_id?: string
  entite?: { nom: string; email_contact?: string; adresse?: string; ninea?: string }
  client?: { nom_entreprise: string; email_principal?: string; adresse?: string; ninea?: string }
  lignes?: LigneDevis[]
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  brouillon:      { label: 'Brouillon',      cls: 'bg-surface text-text-muted border-surface-border' },
  envoye:         { label: 'Envoyé',         cls: 'bg-blue/10 text-blue border-blue/20' },
  en_negociation: { label: 'En négociation', cls: 'bg-amber/10 text-amber border-amber/20' },
  accepte:        { label: 'Accepté',        cls: 'bg-green/10 text-green border-green/20' },
  refuse:         { label: 'Refusé',         cls: 'bg-red/10 text-red border-red/20' },
  expire:         { label: 'Expiré',         cls: 'bg-surface text-text-disabled border-surface-border' },
  annule:         { label: 'Annulé',         cls: 'bg-surface text-text-disabled border-surface-border' },
  converti:       { label: 'Converti',       cls: 'bg-violet/10 text-violet border-violet/20' },
}

type Transition = {
  statut: string; label: string; desc: string
  icon: React.ReactNode; color: string; destructive?: boolean
}

// Cycle de vie complet des devis
const TRANSITIONS: Record<string, Transition[]> = {
  brouillon: [
    { statut: 'envoye',  label: 'Marquer comme envoyé',  desc: 'Transmettre le devis au client',      icon: <Send size={14}/>,        color: 'text-blue' },
    { statut: 'annule',  label: 'Annuler le devis',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,         color: 'text-red', destructive: true },
  ],
  envoye: [
    { statut: 'en_negociation', label: 'Mettre en négociation', desc: 'En cours de discussion',       icon: <Clock size={14}/>,       color: 'text-amber' },
    { statut: 'accepte', label: 'Marquer accepté',        desc: 'Client a accepté le devis',           icon: <CheckCircle size={14}/>, color: 'text-green' },
    { statut: 'refuse',  label: 'Marquer refusé',         desc: 'Client a refusé le devis',            icon: <XCircle size={14}/>,     color: 'text-red' },
    { statut: 'expire',  label: 'Marquer expiré',         desc: 'Date de validité dépassée',           icon: <Clock size={14}/>,       color: 'text-text-muted' },
  ],
  en_negociation: [
    { statut: 'accepte', label: 'Marquer accepté',        desc: 'Négociation aboutie, devis accepté',  icon: <CheckCircle size={14}/>, color: 'text-green' },
    { statut: 'refuse',  label: 'Marquer refusé',         desc: 'Négociation échouée',                 icon: <XCircle size={14}/>,     color: 'text-red' },
    { statut: 'expire',  label: 'Marquer expiré',         desc: 'Date de validité dépassée',           icon: <Clock size={14}/>,       color: 'text-text-muted' },
  ],
  accepte: [
    { statut: 'annule',  label: 'Annuler le devis',       desc: 'Annuler malgré l\'acceptation',       icon: <Ban size={14}/>,         color: 'text-red', destructive: true },
  ],
  refuse: [
    { statut: 'brouillon', label: 'Remettre en brouillon', desc: 'Réouvrir et modifier',              icon: <RotateCcw size={14}/>,   color: 'text-text-muted' },
  ],
  expire: [
    { statut: 'brouillon', label: 'Remettre en brouillon', desc: 'Retravailler et renvoyer',          icon: <RotateCcw size={14}/>,   color: 'text-text-muted' },
    { statut: 'envoye',  label: 'Renvoyer',                desc: 'Proroger et renvoyer au client',     icon: <Send size={14}/>,        color: 'text-blue' },
  ],
  annule: [
    { statut: 'brouillon', label: 'Remettre en brouillon', desc: 'Réouvrir et modifier',              icon: <RotateCcw size={14}/>,   color: 'text-text-muted' },
  ],
  converti: [], // terminal
}

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [devis, setDevis] = useState<Devis | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [converting, setConverting] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase.rpc('get_devis', { p_id: id })
    if (data) setDevis(data as unknown as Devis)
    setLoading(false)
  }

  async function updateStatut(nouveauStatut: string) {
    if (!devis) return
    const prevStatut = devis.statut

    // Mise à jour optimiste — badge change immédiatement
    setDevis(prev => prev ? { ...prev, statut: nouveauStatut } : prev)
    setUpdating(true)

    const { error } = await supabase.rpc('update_devis_statut', {
      p_id: id,
      p_statut: nouveauStatut,
    })

    if (error) {
      setDevis(prev => prev ? { ...prev, statut: prevStatut } : prev)
      setUpdating(false)
      return
    }

    // Effet de bord : email client à l'envoi
    if (nouveauStatut === 'envoye' && devis.client?.email_principal) {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'devis_envoye',
          payload: {
            to: devis.client.email_principal,
            clientNom: devis.client.nom_entreprise || '',
            devisNumero: devis.numero,
            montantTtc: formatMontant(devis.montant_ttc, devis.devise),
            dateValidite: devis.date_validite ? formatDate(devis.date_validite) : '—',
            entiteNom: devis.entite?.nom || 'Sama Digital',
          },
        }),
      })
    }

    setUpdating(false)
  }

  async function convertirEnFacture() {
    if (!devis) return
    setConverting(true)
    const { data: factureId, error } = await supabase.rpc('convertir_devis_en_facture', {
      p_devis_id: id,
    })
    if (!error && factureId) {
      // Mise à jour optimiste du statut
      setDevis(prev => prev ? { ...prev, statut: 'converti' } : prev)
      router.push(`/finance/factures/${factureId}`)
    }
    setConverting(false)
  }

  async function exportPDF() {
    setPdfError('')
    setPdfLoading(true)
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'devis', id }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setPdfError(err.error || `Erreur ${response.status}`)
        setPdfLoading(false)
        return
      }
      const { data } = await response.json()
      if (!data) { setPdfError('Données PDF introuvables'); setPdfLoading(false); return }

      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, M = 15

      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text(data.entite?.nom || 'Sama Digital', M, 25)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
      if (data.entite?.adresse) doc.text(data.entite.adresse, M, 31)
      if (data.entite?.email_contact) doc.text(data.entite.email_contact, M, 36)

      doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text('DEVIS', W - M, 25, { align: 'right' })
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
      doc.text(data.numero, W - M, 32, { align: 'right' })
      doc.text(`Émis le ${formatDate(data.date_emission)}`, W - M, 38, { align: 'right' })
      if (data.date_validite) doc.text(`Valide jusqu'au ${formatDate(data.date_validite)}`, W - M, 44, { align: 'right' })

      doc.setFontSize(9); doc.setTextColor(120, 120, 120)
      doc.text('DESTINATAIRE', M, 55)
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(data.client?.nom_entreprise || '—', M, 61)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      if (data.client?.adresse) doc.text(data.client.adresse, M, 67)

      doc.setDrawColor(230, 230, 230); doc.line(M, 78, W - M, 78)
      const colX = [M, 85, 120, 145, 170]
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100)
      doc.text('DÉSIGNATION', colX[0], 85)
      doc.text('P.U. HT', colX[1], 85, { align: 'right' })
      doc.text('QTÉ', colX[2], 85, { align: 'right' })
      doc.text('TVA', colX[3], 85, { align: 'right' })
      doc.text('TOTAL TTC', colX[4], 85, { align: 'right' })
      doc.line(M, 87, W - M, 87)

      let y = 93
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30); doc.setFontSize(9)
      for (const l of (data.lignes || [])) {
        doc.text(l.designation || l.description || '', colX[0], y)
        doc.text(formatMontant(l.prix_unitaire), colX[1], y, { align: 'right' })
        doc.text(String(l.quantite), colX[2], y, { align: 'right' })
        doc.text(`${l.taux_tva}%`, colX[3], y, { align: 'right' })
        doc.text(formatMontant(l.montant_ttc), colX[4], y, { align: 'right' })
        y += 7
      }

      doc.line(M, y + 2, W - M, y + 2); y += 10
      const totalsX = 135
      doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      doc.text('Total HT', totalsX, y); doc.text(formatMontant(data.montant_ht), W - M, y, { align: 'right' }); y += 6
      doc.text('TVA', totalsX, y); doc.text(formatMontant(data.montant_tva), W - M, y, { align: 'right' }); y += 6
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 30)
      doc.text('TOTAL TTC', totalsX, y); doc.text(formatMontant(data.montant_ttc), W - M, y, { align: 'right' })

      if (data.notes) {
        y += 16; doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
        doc.text('Notes :', M, y); doc.text(data.notes, M, y + 5)
      }

      doc.save(`${data.numero}.pdf`)
    } catch (e: any) {
      setPdfError(e?.message || 'Erreur génération PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    )
  }

  if (!devis) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
        <p className="text-text-muted">Devis introuvable</p>
        <Link href="/finance/devis" className="text-blue text-sm mt-2 inline-block hover:underline">Retour aux devis</Link>
      </div>
    )
  }

  const cfg = STATUT_CFG[devis.statut] || STATUT_CFG.brouillon
  const transitions = TRANSITIONS[devis.statut] ?? []

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/finance/devis" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Devis
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary font-mono">{devis.numero}</span>
      </div>

      {/* Header actions */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{devis.numero}</h1>
            <span className={`px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          {devis.titre && <p className="text-sm text-text-secondary mb-1">{devis.titre}</p>}
          <p className="text-xs text-text-muted">
            Émis le {formatDate(devis.date_emission)}
            {devis.date_validite && ` · Valide jusqu'au ${formatDate(devis.date_validite)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Convertir en facture — action principale pour statut accepté */}
          {devis.statut === 'accepte' && (
            <Button
              size="sm"
              className="bg-violet hover:bg-violet/90"
              icon={<ArrowRight size={13} />}
              loading={converting}
              disabled={converting}
              onClick={convertirEnFacture}
            >
              Convertir en facture
            </Button>
          )}

          {/* Menu statut */}
          {transitions.length > 0 && (
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                icon={<BadgeCheck size={13} />}
                loading={updating}
                disabled={updating}
                onClick={() => setShowStatusMenu(v => !v)}
              >
                Statut <ChevronDown size={12} className={`ml-0.5 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
              </Button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-background-overlay border border-surface-border rounded-xl shadow-dropdown w-64 py-1.5 overflow-hidden">
                    <p className="text-2xs text-text-muted font-medium uppercase tracking-wider px-3 pt-1.5 pb-2">
                      Changer le statut
                    </p>
                    {transitions.map((t, i) => {
                      const showSep = t.destructive && i > 0
                      return (
                        <div key={t.statut}>
                          {showSep && <div className="my-1 border-t border-surface-border" />}
                          <button
                            onClick={() => { setShowStatusMenu(false); updateStatut(t.statut) }}
                            className={`w-full flex items-start gap-2.5 px-3 py-2.5 transition-colors text-left ${
                              t.destructive ? 'hover:bg-red/10' : 'hover:bg-surface-hover'
                            }`}
                          >
                            <span className={`mt-0.5 shrink-0 ${t.color}`}>{t.icon}</span>
                            <div>
                              <p className={`text-sm font-medium ${t.color}`}>{t.label}</p>
                              <p className="text-2xs text-text-muted mt-0.5">{t.desc}</p>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportPDF} loading={pdfLoading} disabled={pdfLoading}>PDF</Button>
        </div>
      </div>

      {pdfError && (
        <div className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">{pdfError}</div>
      )}

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-2">
            <Building2 size={11} /> ÉMETTEUR
          </div>
          <p className="text-sm font-semibold text-text-primary">{devis.entite?.nom || '—'}</p>
          {devis.entite?.email_contact && <p className="text-xs text-text-muted">{devis.entite.email_contact}</p>}
          {devis.entite?.adresse && <p className="text-xs text-text-muted">{devis.entite.adresse}</p>}
          {devis.entite?.ninea && <p className="text-2xs text-text-muted">NINEA : {devis.entite.ninea}</p>}
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-2">
            <User size={11} /> CLIENT
          </div>
          <p className="text-sm font-semibold text-text-primary">{devis.client?.nom_entreprise || '—'}</p>
          {devis.client?.adresse && <p className="text-xs text-text-muted">{devis.client.adresse}</p>}
          {devis.client?.ninea && <p className="text-2xs text-text-muted">NINEA : {devis.client.ninea}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center gap-2">
          <FileText size={14} className="text-blue" />
          <h3 className="text-sm font-semibold text-text-primary">Détail du devis</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th className="text-right">P.U. HT</th>
                <th className="text-right">Qté</th>
                <th className="text-right">TVA</th>
                <th className="text-right">Remise</th>
                <th className="text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {(devis.lignes || []).map(l => (
                <tr key={l.id}>
                  <td>
                    <p className="text-sm text-text-primary">{l.designation}</p>
                    {l.description && <p className="text-2xs text-text-muted mt-0.5">{l.description}</p>}
                  </td>
                  <td className="text-right text-xs">{formatMontant(l.prix_unitaire)}</td>
                  <td className="text-right text-xs">{l.quantite}</td>
                  <td className="text-right text-xs">{l.taux_tva}%</td>
                  <td className="text-right text-xs">{l.remise_pct ? `${l.remise_pct}%` : '—'}</td>
                  <td className="text-right text-sm font-semibold text-text-primary">{formatMontant(l.montant_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-surface-border">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-8 text-xs text-text-muted">
              <span>Total HT</span>
              <span className="w-28 text-right text-text-secondary">{formatMontant(devis.montant_ht)}</span>
            </div>
            <div className="flex gap-8 text-xs text-text-muted">
              <span>TVA</span>
              <span className="w-28 text-right text-text-secondary">{formatMontant(devis.montant_tva)}</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-text-primary mt-1 pt-2 border-t border-surface-border">
              <span>Total TTC</span>
              <span className="w-28 text-right text-blue">{formatMontant(devis.montant_ttc)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & conditions */}
      {(devis.notes || devis.conditions_paiement) && (
        <div className="grid grid-cols-2 gap-4">
          {devis.notes && (
            <div className="bg-surface border border-surface-border rounded-xl p-4">
              <p className="text-2xs text-text-muted mb-1.5 font-medium">NOTES</p>
              <p className="text-xs text-text-secondary">{devis.notes}</p>
            </div>
          )}
          {devis.conditions_paiement && (
            <div className="bg-surface border border-surface-border rounded-xl p-4">
              <p className="text-2xs text-text-muted mb-1.5 font-medium">CONDITIONS DE PAIEMENT</p>
              <p className="text-xs text-text-secondary">{devis.conditions_paiement}</p>
            </div>
          )}
        </div>
      )}

      {/* CTA conversion si accepté */}
      {devis.statut === 'accepte' && (
        <div className="bg-violet/5 border border-violet/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Ce devis est accepté</p>
            <p className="text-xs text-text-muted mt-0.5">Convertissez-le en facture en un clic pour facturer le client.</p>
          </div>
          <Button
            size="sm"
            className="bg-violet hover:bg-violet/90 shrink-0"
            icon={<ArrowRight size={13} />}
            loading={converting}
            disabled={converting}
            onClick={convertirEnFacture}
          >
            Créer la facture
          </Button>
        </div>
      )}
    </div>
  )
}
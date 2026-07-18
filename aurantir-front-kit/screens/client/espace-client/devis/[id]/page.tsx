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
import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'
import { downloadDevisPDF } from '@/aurantir-front-kit/lib/pdf/devis'
import {
  ChevronRight, Download, AlertTriangle, FileText, Building2, User, Loader2,
  CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'

interface LigneDevis {
  designation: string; description?: string
  quantite: number; prix_unitaire: number; taux_tva: number
  remise_pct?: number; montant_ttc: number
}

interface Devis {
  id: string; numero: string; titre?: string; statut: string
  date_emission: string; date_validite?: string
  montant_ht: number; montant_tva: number; montant_ttc: number
  notes?: string; conditions_paiement?: string
  entite?: { nom: string; email_contact?: string; adresse?: string; ninea?: string }
  client?: { nom_entreprise: string; email_principal?: string; adresse?: string; ninea?: string }
  lignes?: LigneDevis[]
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  brouillon:      { label: 'Brouillon',       cls: 'bg-white/5 text-white/40 border-white/10' },
  envoye:         { label: 'À répondre',      cls: 'bg-violet/10 text-violet border-violet/20' },
  en_negociation: { label: 'En négociation',  cls: 'bg-amber/10 text-amber border-amber/20' },
  accepte:        { label: 'Accepté',         cls: 'bg-green/10 text-green border-green/20' },
  refuse:         { label: 'Refusé',          cls: 'bg-red/10 text-red border-red/20' },
  expire:         { label: 'Expiré',          cls: 'bg-white/5 text-white/30 border-white/10' },
  converti:       { label: 'Converti',        cls: 'bg-blue/10 text-blue border-blue/20' },
}

const ACTIONS: Record<string, { label: string; desc: string; icon: React.ReactNode; cls: string }> = {
  accepte:        { label: 'Accepter le devis',     desc: 'Vous confirmez votre accord sur ce devis.',          icon: <CheckCircle size={16} />, cls: 'bg-green/10 text-green border-green/20 hover:bg-green/15' },
  en_negociation: { label: 'Demander une négociation', desc: 'Vous souhaitez discuter des termes du devis.',     icon: <Clock size={16} />,       cls: 'bg-amber/10 text-amber border-amber/20 hover:bg-amber/15' },
  refuse:         { label: 'Refuser le devis',      desc: 'Vous refusez ce devis.',                              icon: <XCircle size={16} />,     cls: 'bg-red/10 text-red border-red/20 hover:bg-red/15' },
}

export default function ClientDevisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [devis, setDevis] = useState<Devis | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [confirmAction, setConfirmAction] = useState<keyof typeof ACTIONS | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setNotFound(false)
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'devis', id }),
      })
      if (!response.ok) { setNotFound(true); return }
      const { data } = await response.json()
      if (!data) { setNotFound(true); return }
      setDevis(data as Devis)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function exportPDF() {
    setPdfError('')
    setPdfLoading(true)
    try {
      await downloadDevisPDF(id)
    } catch (e: any) {
      setPdfError(e?.message || 'Erreur lors du téléchargement')
    } finally {
      setPdfLoading(false)
    }
  }

  async function respondDevis(statut: keyof typeof ACTIONS) {
    setActionLoading(true)
    setActionError('')
    const { error } = await supabase.rpc('update_devis_statut_client', { p_id: id, p_statut: statut })
    if (error) {
      setActionError(error.message || 'Erreur lors de la mise à jour')
      setActionLoading(false)
      return
    }
    setDevis(prev => prev ? { ...prev, statut } : prev)
    setConfirmAction(null)
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
        <div className="h-96 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (notFound || !devis) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-white/40">Devis introuvable</p>
        <Link href="/espace-client/devis" className="text-blue text-sm mt-2 inline-block hover:underline">Retour aux devis</Link>
      </div>
    )
  }

  const cfg = STATUT_CFG[devis.statut] || STATUT_CFG.brouillon

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Link href="/espace-client/devis" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Devis
        </Link>
        <ChevronRight size={12} />
        <span className="text-white font-mono">{devis.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">{devis.numero}</h1>
            <span className={`px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          {devis.titre && <p className="text-sm text-white/60">{devis.titre}</p>}
          <p className="text-xs text-white/40 mt-0.5">
            Émis le {formatDate(devis.date_emission)}
            {devis.date_validite && <> · Valide jusqu&apos;au {formatDate(devis.date_validite)}</>}
          </p>
        </div>

        <button
          onClick={exportPDF}
          disabled={pdfLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          PDF
        </button>
      </div>

      {pdfError && (
        <div className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">{pdfError}</div>
      )}

      {/* Réponse au devis */}
      {(devis.statut === 'envoye' || devis.statut === 'en_negociation') && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Votre réponse</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {Object.entries(ACTIONS).map(([statut, a]) => (
              <button key={statut} onClick={() => { setActionError(''); setConfirmAction(statut as keyof typeof ACTIONS) }}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${a.cls}`}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
          {actionError && (
            <div className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">{actionError}</div>
          )}
        </div>
      )}

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-white/40 mb-2">
            <Building2 size={11} /> ÉMETTEUR
          </div>
          <p className="text-sm font-semibold text-white">{devis.entite?.nom || '—'}</p>
          {devis.entite?.email_contact && <p className="text-xs text-white/40">{devis.entite.email_contact}</p>}
          {devis.entite?.adresse && <p className="text-xs text-white/40">{devis.entite.adresse}</p>}
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-white/40 mb-2">
            <User size={11} /> CLIENT
          </div>
          <p className="text-sm font-semibold text-white">{devis.client?.nom_entreprise || '—'}</p>
          {devis.client?.email_principal && <p className="text-xs text-white/40">{devis.client.email_principal}</p>}
          {devis.client?.adresse && <p className="text-xs text-white/40">{devis.client.adresse}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <FileText size={14} className="text-blue" />
          <h3 className="text-sm font-semibold text-white">Détail du devis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-2xs text-white/30 uppercase tracking-wider">
                <th className="text-left font-medium px-4 py-2.5">Désignation</th>
                <th className="text-right font-medium px-4 py-2.5">P.U. HT</th>
                <th className="text-right font-medium px-4 py-2.5">Qté</th>
                <th className="text-right font-medium px-4 py-2.5">TVA</th>
                <th className="text-right font-medium px-4 py-2.5">Remise</th>
                <th className="text-right font-medium px-4 py-2.5">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {(devis.lignes || []).map((l, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="text-sm text-white px-4 py-2.5">{l.designation}</td>
                  <td className="text-right text-xs text-white/60 px-4 py-2.5">{formatMontant(l.prix_unitaire)}</td>
                  <td className="text-right text-xs text-white/60 px-4 py-2.5">{l.quantite}</td>
                  <td className="text-right text-xs text-white/60 px-4 py-2.5">{l.taux_tva}%</td>
                  <td className="text-right text-xs text-white/60 px-4 py-2.5">{l.remise_pct ? `${l.remise_pct}%` : '—'}</td>
                  <td className="text-right text-sm font-semibold text-white px-4 py-2.5">{formatMontant(l.montant_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="p-4 border-t border-white/5">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-8 text-xs text-white/40">
              <span>Total HT</span>
              <span className="w-28 text-right text-white/60">{formatMontant(devis.montant_ht)}</span>
            </div>
            <div className="flex gap-8 text-xs text-white/40">
              <span>TVA</span>
              <span className="w-28 text-right text-white/60">{formatMontant(devis.montant_tva)}</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-white mt-1 pt-2 border-t border-white/5">
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
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <p className="text-2xs text-white/40 mb-1.5 font-medium">NOTES</p>
              <p className="text-xs text-white/60">{devis.notes}</p>
            </div>
          )}
          {devis.conditions_paiement && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <p className="text-2xs text-white/40 mb-1.5 font-medium">CONDITIONS DE PAIEMENT</p>
              <p className="text-xs text-white/60">{devis.conditions_paiement}</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !actionLoading && setConfirmAction(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-[#0D1017] p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${ACTIONS[confirmAction].cls}`}>
                {ACTIONS[confirmAction].icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{ACTIONS[confirmAction].label}</h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">{ACTIONS[confirmAction].desc}</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmAction(null)} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50">
                Annuler
              </button>
              <button onClick={() => respondDevis(confirmAction)} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-blue hover:bg-blue/80 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {actionLoading && <Loader2 size={12} className="animate-spin" />} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
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
import { downloadFacturePDF } from '@/aurantir-front-kit/lib/pdf/facture'
import {
  ChevronRight, Download, AlertTriangle, FileText, Building2, User, Loader2,
} from 'lucide-react'

interface LigneFacture {
  id: string; designation: string
  quantite: number; prix_unitaire: number; taux_tva: number
  remise_pct?: number; montant_ttc: number
}

interface Facture {
  id: string; numero: string; statut: string
  date_emission: string; date_echeance: string
  montant_ht: number; montant_tva: number; montant_ttc: number
  notes?: string; conditions_paiement?: string
  entite?: { nom: string; email_contact?: string; adresse?: string; ninea?: string }
  client?: { nom_entreprise: string; email_principal?: string; adresse?: string; ninea?: string }
  lignes?: LigneFacture[]
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  brouillon:  { label: 'Brouillon',   cls: 'bg-white/5 text-white/40 border-white/10' },
  envoyee:    { label: 'À régler',    cls: 'bg-blue/10 text-blue border-blue/20' },
  signee:     { label: 'Signée',      cls: 'bg-violet/10 text-violet border-violet/20' },
  payee:      { label: 'Payée',       cls: 'bg-green/10 text-green border-green/20' },
  en_retard:  { label: 'En retard',   cls: 'bg-red/10 text-red border-red/20' },
  annulee:    { label: 'Annulée',     cls: 'bg-white/5 text-white/30 border-white/10' },
}

export default function ClientFactureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [facture, setFacture] = useState<Facture | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setNotFound(false)
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'facture', id }),
      })
      if (!response.ok) { setNotFound(true); return }
      const { data } = await response.json()
      if (!data) { setNotFound(true); return }
      setFacture(data as Facture)
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
      await downloadFacturePDF(id)
    } catch (e: any) {
      setPdfError(e?.message || 'Erreur lors du téléchargement')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
        <div className="h-96 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (notFound || !facture) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-white/40">Facture introuvable</p>
        <Link href="/espace-client/factures" className="text-blue text-sm mt-2 inline-block hover:underline">Retour aux factures</Link>
      </div>
    )
  }

  const cfg = STATUT_CFG[facture.statut] || STATUT_CFG.brouillon

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Link href="/espace-client/factures" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Factures
        </Link>
        <ChevronRight size={12} />
        <span className="text-white font-mono">{facture.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">{facture.numero}</h1>
            <span className={`px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-white/40">
            Émise le {formatDate(facture.date_emission)} · Échéance {formatDate(facture.date_echeance)}
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

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-white/40 mb-2">
            <Building2 size={11} /> ÉMETTEUR
          </div>
          <p className="text-sm font-semibold text-white">{facture.entite?.nom || '—'}</p>
          {facture.entite?.email_contact && <p className="text-xs text-white/40">{facture.entite.email_contact}</p>}
          {facture.entite?.adresse && <p className="text-xs text-white/40">{facture.entite.adresse}</p>}
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-white/40 mb-2">
            <User size={11} /> CLIENT
          </div>
          <p className="text-sm font-semibold text-white">{facture.client?.nom_entreprise || '—'}</p>
          {facture.client?.email_principal && <p className="text-xs text-white/40">{facture.client.email_principal}</p>}
          {facture.client?.adresse && <p className="text-xs text-white/40">{facture.client.adresse}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <FileText size={14} className="text-blue" />
          <h3 className="text-sm font-semibold text-white">Détail de la facture</h3>
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
              {(facture.lignes || []).map(l => (
                <tr key={l.id} className="border-t border-white/5">
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
              <span className="w-28 text-right text-white/60">{formatMontant(facture.montant_ht)}</span>
            </div>
            <div className="flex gap-8 text-xs text-white/40">
              <span>TVA</span>
              <span className="w-28 text-right text-white/60">{formatMontant(facture.montant_tva)}</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-white mt-1 pt-2 border-t border-white/5">
              <span>Total TTC</span>
              <span className="w-28 text-right text-blue">{formatMontant(facture.montant_ttc)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & conditions */}
      {(facture.notes || facture.conditions_paiement) && (
        <div className="grid grid-cols-2 gap-4">
          {facture.notes && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <p className="text-2xs text-white/40 mb-1.5 font-medium">NOTES</p>
              <p className="text-xs text-white/60">{facture.notes}</p>
            </div>
          )}
          {facture.conditions_paiement && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <p className="text-2xs text-white/40 mb-1.5 font-medium">CONDITIONS DE PAIEMENT</p>
              <p className="text-xs text-white/60">{facture.conditions_paiement}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
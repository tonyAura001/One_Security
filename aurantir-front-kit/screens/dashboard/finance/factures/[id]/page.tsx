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
  FileText, Building2, User, Truck, ChevronDown,
  Ban, RotateCcw, BadgeCheck, Hourglass, Receipt, CreditCard,
} from 'lucide-react'
import { downloadFacturePDF } from '@/aurantir-front-kit/lib/pdf/facture'

interface LigneFacture {
  id: string
  designation: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  remise_pct?: number
  montant_ht: number
  montant_tva: number
  montant_ttc: number
}

interface Facture {
  id: string
  numero: string
  type: string
  statut: string
  date_emission: string
  date_echeance: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  devise: string
  notes?: string
  conditions_paiement?: string
  entite?: { nom: string; email_contact?: string; adresse?: string; ninea?: string }
  client?: { nom_entreprise: string; email_principal?: string; adresse?: string; ninea?: string }
  fournisseur?: { nom: string; email?: string; adresse?: string; ninea?: string }
  lignes?: LigneFacture[]
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  brouillon:           { label: 'Brouillon',       cls: 'bg-surface text-text-muted border-surface-border' },
  envoyee:             { label: 'Envoyée',          cls: 'bg-blue/10 text-blue border-blue/20' },
  signee:              { label: 'Signée',           cls: 'bg-violet/10 text-violet border-violet/20' },
  payee:               { label: 'Payée',            cls: 'bg-green/10 text-green border-green/20' },
  en_retard:           { label: 'En retard',        cls: 'bg-red/10 text-red border-red/20' },
  annulee:             { label: 'Annulée',          cls: 'bg-surface text-text-disabled border-surface-border' },
  avoir_emis:          { label: 'Avoir émis',       cls: 'bg-amber/10 text-amber border-amber/20' },
  // Fournisseur
  recue:               { label: 'Reçue',            cls: 'bg-blue/10 text-blue border-blue/20' },
  validee:             { label: 'Validée',          cls: 'bg-violet/10 text-violet border-violet/20' },
  partiellement_payee: { label: 'Part. payée',      cls: 'bg-amber/10 text-amber border-amber/20' },
}

type Transition = {
  statut: string; label: string; desc: string
  icon: React.ReactNode; color: string; destructive?: boolean
}

// ── Transitions factures clients ───────────────────────────────
const TRANSITIONS_CLIENT: Record<string, Transition[]> = {
  brouillon: [
    { statut: 'envoyee',   label: 'Marquer comme envoyée',    desc: 'Transmettre la facture au client',    icon: <Send size={14}/>,          color: 'text-blue' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  envoyee: [
    { statut: 'payee',     label: 'Marquer comme payée',      desc: 'Paiement reçu et confirmé',           icon: <CheckCircle size={14}/>,    color: 'text-green' },
    { statut: 'en_retard', label: 'Mettre en retard',         desc: 'Échéance dépassée sans paiement',     icon: <Hourglass size={14}/>,      color: 'text-amber' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  en_retard: [
    { statut: 'payee',     label: 'Marquer comme payée',      desc: 'Paiement finalement reçu',            icon: <CheckCircle size={14}/>,    color: 'text-green' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  payee:   [],
  annulee: [
    { statut: 'brouillon', label: 'Remettre en brouillon',    desc: 'Réouvrir et modifier la facture',     icon: <RotateCcw size={14}/>,      color: 'text-text-muted' },
  ],
}

// ── Transitions factures fournisseurs ──────────────────────────
const TRANSITIONS_FOURN: Record<string, Transition[]> = {
  brouillon: [
    { statut: 'recue',     label: 'Marquer comme reçue',      desc: 'Facture reçue du fournisseur',        icon: <Receipt size={14}/>,        color: 'text-blue' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  recue: [
    { statut: 'validee',   label: 'Valider la facture',       desc: 'Facture vérifiée et approuvée',       icon: <BadgeCheck size={14}/>,     color: 'text-violet' },
    { statut: 'en_retard', label: 'Mettre en retard',         desc: 'Échéance dépassée sans paiement',     icon: <Hourglass size={14}/>,      color: 'text-amber' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  validee: [
    { statut: 'payee',              label: 'Marquer comme payée',      desc: 'Paiement intégral effectué — génère une sortie de trésorerie',  icon: <CheckCircle size={14}/>,  color: 'text-green' },
    { statut: 'partiellement_payee',label: 'Paiement partiel',         desc: 'Une partie du montant a été réglée',                            icon: <CreditCard size={14}/>,   color: 'text-amber' },
    { statut: 'en_retard',          label: 'Mettre en retard',         desc: 'Échéance dépassée sans paiement',                               icon: <Hourglass size={14}/>,    color: 'text-amber' },
    { statut: 'annulee',            label: 'Annuler la facture',       desc: 'Annuler définitivement',                                        icon: <Ban size={14}/>,          color: 'text-red', destructive: true },
  ],
  partiellement_payee: [
    { statut: 'payee',     label: 'Marquer comme payée',      desc: 'Solde intégral réglé',                icon: <CheckCircle size={14}/>,    color: 'text-green' },
    { statut: 'en_retard', label: 'Mettre en retard',         desc: 'Solde restant en retard',             icon: <Hourglass size={14}/>,      color: 'text-amber' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  en_retard: [
    { statut: 'payee',     label: 'Marquer comme payée',      desc: 'Paiement finalement effectué',        icon: <CheckCircle size={14}/>,    color: 'text-green' },
    { statut: 'annulee',   label: 'Annuler la facture',       desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  payee:   [],
  annulee: [
    { statut: 'brouillon', label: 'Remettre en brouillon',    desc: 'Réouvrir et modifier la facture',     icon: <RotateCcw size={14}/>,      color: 'text-text-muted' },
  ],
}

// ── Transitions avoirs (simples) ───────────────────────────────
const TRANSITIONS_AVOIR: Record<string, Transition[]> = {
  brouillon: [
    { statut: 'envoyee',   label: "Émettre l'avoir",          desc: 'Transmettre l\'avoir au client',      icon: <Send size={14}/>,           color: 'text-blue' },
    { statut: 'annulee',   label: 'Annuler l\'avoir',         desc: 'Annuler définitivement',              icon: <Ban size={14}/>,            color: 'text-red', destructive: true },
  ],
  envoyee: [],
  annulee: [
    { statut: 'brouillon', label: 'Remettre en brouillon',    desc: 'Réouvrir l\'avoir',                   icon: <RotateCcw size={14}/>,      color: 'text-text-muted' },
  ],
}

function getTransitions(type: string, statut: string): Transition[] {
  if (type === 'facture_fournisseur') return TRANSITIONS_FOURN[statut] ?? []
  if (type === 'avoir_client' || type === 'avoir_fournisseur') return TRANSITIONS_AVOIR[statut] ?? []
  return TRANSITIONS_CLIENT[statut] ?? []
}

function isFournisseurType(type: string) {
  return type === 'facture_fournisseur' || type === 'avoir_fournisseur'
}

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [facture, setFacture] = useState<Facture | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase.rpc('get_facture', { p_id: id })
    if (data) setFacture(data as unknown as Facture)
    setLoading(false)
  }

  async function updateStatut(nouveauStatut: string) {
    if (!facture) return
    const prevStatut = facture.statut

    setFacture(prev => prev ? { ...prev, statut: nouveauStatut } : prev)
    setUpdating(true)
    setShowStatusMenu(false)

    const { error: rpcError } = await supabase.rpc('update_facture_statut', {
      p_id: id,
      p_statut: nouveauStatut,
    })

    if (rpcError) {
      setFacture(prev => prev ? { ...prev, statut: prevStatut } : prev)
      setUpdating(false)
      return
    }

    // Email au client lors de l'envoi (facture client seulement)
    if (nouveauStatut === 'envoyee' && facture.client?.email_principal) {
      await supabase.from('envois_facture').insert({
        facture_id: id,
        destinataire_email: facture.client.email_principal,
        statut: 'envoye',
      })
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'facture_envoyee',
          payload: {
            to: facture.client.email_principal,
            clientNom: facture.client.nom_entreprise || '',
            factureNumero: facture.numero,
            montantTtc: formatMontant(facture.montant_ttc, facture.devise),
            dateEcheance: formatDate(facture.date_echeance),
            entiteNom: facture.entite?.nom || 'Sama Digital',
          },
        }),
      }).catch(() => {})
    }

    setUpdating(false)
    // La trésorerie est mise à jour automatiquement par le RPC update_facture_statut
    // lors du passage au statut 'payee' (ENTRÉE client ou SORTIE fournisseur)
  }

  async function exportPDF() {
    setPdfError('')
    setPdfLoading(true)
    try {
      await downloadFacturePDF(id)
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

  if (!facture) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
        <p className="text-text-muted">Facture introuvable</p>
        <Link href="/finance/factures" className="text-blue text-sm mt-2 inline-block hover:underline">Retour aux factures</Link>
      </div>
    )
  }

  const cfg = STATUT_CFG[facture.statut] || STATUT_CFG.brouillon
  const transitions = getTransitions(facture.type, facture.statut)
  const isFourn = isFournisseurType(facture.type)
  const isAvoir = facture.type === 'avoir_client' || facture.type === 'avoir_fournisseur'

  const tiersLabel = isFourn ? 'FOURNISSEUR' : 'CLIENT'
  const tiersNom   = isFourn
    ? (facture.fournisseur?.nom || '—')
    : (facture.client?.nom_entreprise || '—')
  const tiersEmail = isFourn ? facture.fournisseur?.email : facture.client?.email_principal
  const tiersAdresse = isFourn ? facture.fournisseur?.adresse : facture.client?.adresse
  const tiersNINEA   = isFourn ? facture.fournisseur?.ninea : facture.client?.ninea

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/finance/factures" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Factures
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary font-mono">{facture.numero}</span>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{facture.numero}</h1>
            <span className={`px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>{cfg.label}</span>
            {isFourn && (
              <span className="px-2 py-0.5 rounded-full text-2xs border font-medium bg-violet/10 text-violet border-violet/20">
                Fournisseur
              </span>
            )}
            {isAvoir && (
              <span className="px-2 py-0.5 rounded-full text-2xs border font-medium bg-amber/10 text-amber border-amber/20">
                Avoir
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            Émise le {formatDate(facture.date_emission)} · Échéance {formatDate(facture.date_echeance)}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-background-overlay border border-surface-border rounded-xl shadow-dropdown w-72 py-1.5 overflow-hidden">
                    <p className="text-2xs text-text-muted font-medium uppercase tracking-wider px-3 pt-1.5 pb-2">
                      Changer le statut
                    </p>
                    {transitions.map((t, i) => {
                      const showSep = t.destructive && i > 0
                      return (
                        <div key={t.statut}>
                          {showSep && <div className="my-1 border-t border-surface-border" />}
                          <button
                            onClick={() => updateStatut(t.statut)}
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

      {/* Alerte trésorerie pour paiement fournisseur */}
      {isFourn && facture.statut === 'payee' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green/10 border border-green/20 rounded-lg text-xs text-green">
          <CheckCircle size={13} className="flex-shrink-0" />
          Paiement enregistré — une sortie de trésorerie a été générée automatiquement
        </div>
      )}

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-2">
            <Building2 size={11} /> ÉMETTEUR
          </div>
          <p className="text-sm font-semibold text-text-primary">{facture.entite?.nom || '—'}</p>
          {facture.entite?.email_contact && <p className="text-xs text-text-muted">{facture.entite.email_contact}</p>}
          {facture.entite?.adresse && <p className="text-xs text-text-muted">{facture.entite.adresse}</p>}
          {facture.entite?.ninea && <p className="text-2xs text-text-muted">NINEA : {facture.entite.ninea}</p>}
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-2">
            {isFourn ? <Truck size={11} /> : <User size={11} />} {tiersLabel}
          </div>
          <p className="text-sm font-semibold text-text-primary">{tiersNom}</p>
          {tiersEmail && <p className="text-xs text-text-muted">{tiersEmail}</p>}
          {tiersAdresse && <p className="text-xs text-text-muted">{tiersAdresse}</p>}
          {tiersNINEA && <p className="text-2xs text-text-muted">NINEA : {tiersNINEA}</p>}
        </div>
      </div>

      {/* Lignes */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center gap-2">
          <FileText size={14} className="text-blue" />
          <h3 className="text-sm font-semibold text-text-primary">
            {isAvoir ? "Détail de l'avoir" : 'Détail de la facture'}
          </h3>
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
              {(facture.lignes || []).map(l => (
                <tr key={l.id}>
                  <td className="text-sm text-text-primary">{l.designation}</td>
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

        {/* Totaux */}
        <div className="p-4 border-t border-surface-border">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-8 text-xs text-text-muted">
              <span>Total HT</span>
              <span className="w-28 text-right text-text-secondary">{formatMontant(facture.montant_ht)}</span>
            </div>
            <div className="flex gap-8 text-xs text-text-muted">
              <span>TVA</span>
              <span className="w-28 text-right text-text-secondary">{formatMontant(facture.montant_tva)}</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-text-primary mt-1 pt-2 border-t border-surface-border">
              <span>Total TTC</span>
              <span className={`w-28 text-right ${isFourn ? 'text-violet' : 'text-blue'}`}>
                {formatMontant(facture.montant_ttc)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & conditions */}
      {(facture.notes || facture.conditions_paiement) && (
        <div className="grid grid-cols-2 gap-4">
          {facture.notes && (
            <div className="bg-surface border border-surface-border rounded-xl p-4">
              <p className="text-2xs text-text-muted mb-1.5 font-medium">NOTES</p>
              <p className="text-xs text-text-secondary">{facture.notes}</p>
            </div>
          )}
          {facture.conditions_paiement && (
            <div className="bg-surface border border-surface-border rounded-xl p-4">
              <p className="text-2xs text-text-muted mb-1.5 font-medium">CONDITIONS DE PAIEMENT</p>
              <p className="text-xs text-text-secondary">{facture.conditions_paiement}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
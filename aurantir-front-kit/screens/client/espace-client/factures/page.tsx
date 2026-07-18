// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'
import { downloadFacturePDF } from '@/aurantir-front-kit/lib/pdf/facture'
import { FileText, Clock, CheckCircle, AlertTriangle, Download, ChevronRight, Loader2 } from 'lucide-react'

interface Facture {
  id: string
  numero: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut: string
  date_emission: string
  date_echeance: string
  notes?: string
  entite?: { nom: string }
}

const STATUT_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  brouillon:  { label: 'Brouillon',   cls: 'bg-white/5 text-white/40 border-white/10',      icon: <FileText size={10} /> },
  envoyee:    { label: 'En attente',  cls: 'bg-amber/10 text-amber border-amber/20',          icon: <Clock size={10} /> },
  signee:     { label: 'Signée',      cls: 'bg-violet/10 text-violet border-violet/20',       icon: <CheckCircle size={10} /> },
  payee:      { label: 'Payée',       cls: 'bg-green/10 text-green border-green/20',          icon: <CheckCircle size={10} /> },
  en_retard:  { label: 'En retard',   cls: 'bg-red/10 text-red border-red/20',                icon: <AlertTriangle size={10} /> },
  annulee:    { label: 'Annulée',     cls: 'bg-white/5 text-white/30 border-white/10',       icon: <FileText size={10} /> },
}

export default function ClientFacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    // RLS (factures_client_own + factures_client_assignation_individuelle) filtre déjà
    // sur les factures du client : celles de son entreprise ET celles assignées individuellement
    const { data } = await supabase
      .from('factures')
      .select('id, numero, montant_ht, montant_tva, montant_ttc, statut, date_emission, date_echeance, notes, entite:entites_legales(nom)')
      .eq('type', 'facture_client')
      .neq('statut', 'brouillon')
      .order('date_emission', { ascending: false })

    const all = (data || []) as unknown as Facture[]
    const today = new Date().toISOString().split('T')[0]
    const list = all.map(f => ({
      ...f,
      statut: ['envoyee', 'signee'].includes(f.statut) && f.date_echeance < today ? 'en_retard' : f.statut,
    }))
    setFactures(list)
    setLoading(false)
  }

  async function handleDownload(id: string) {
    setDownloadError('')
    setDownloadingId(id)
    try {
      await downloadFacturePDF(id)
    } catch (e: any) {
      setDownloadError(e?.message || 'Erreur lors du téléchargement')
    } finally {
      setDownloadingId(null)
    }
  }

  const filtres = ['tous', 'envoyee', 'en_retard', 'payee', 'annulee']
  const filtered = filtre === 'tous' ? factures : factures.filter(f => f.statut === filtre)
  const totalEnAttente = factures.filter(f => ['envoyee', 'signee', 'en_retard'].includes(f.statut)).reduce((s, f) => s + f.montant_ttc, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Mes factures</h1>
        <p className="text-sm text-white/40 mt-0.5">{factures.length} facture{factures.length !== 1 ? 's' : ''}</p>
      </div>

      {totalEnAttente > 0 && (
        <div className="bg-amber/5 border border-amber/20 rounded-xl p-4 flex items-center gap-3">
          <Clock size={16} className="text-amber flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">{formatMontant(totalEnAttente)} en attente</p>
            <p className="text-xs text-white/40">Montant total de vos factures à régler</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      {downloadError && (
        <div className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">{downloadError}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filtres.map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtre === f ? 'bg-blue/20 text-blue border border-blue/30' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'
            }`}>
            {f === 'tous' ? 'Toutes' : (STATUT_CFG[f]?.label || f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/30">Aucune facture</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const cfg = STATUT_CFG[f.statut] || STATUT_CFG.brouillon
            return (
              <div key={f.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/espace-client/factures/${f.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-white/50 group-hover:text-white transition-colors">{f.numero}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                      {f.entite && (
                        <span className="text-2xs text-white/30">{f.entite.nom}</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-white">{formatMontant(f.montant_ttc)}</p>
                    <div className="flex gap-4 mt-1.5">
                      <p className="text-2xs text-white/30">HT : {formatMontant(f.montant_ht)}</p>
                      <p className="text-2xs text-white/30">TVA : {formatMontant(f.montant_tva)}</p>
                    </div>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs text-white/40">Émise le {formatDate(f.date_emission)}</p>
                      <p className={`text-xs ${f.statut === 'en_retard' ? 'text-red font-medium' : 'text-white/40'}`}>
                        Échéance : {formatDate(f.date_echeance)}
                      </p>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(f.id)}
                      disabled={downloadingId === f.id}
                      title="Télécharger le PDF"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors disabled:opacity-50">
                      {downloadingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    </button>
                    <Link href={`/espace-client/factures/${f.id}`} title="Voir le détail"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
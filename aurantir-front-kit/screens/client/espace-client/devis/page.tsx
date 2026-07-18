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
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react'

interface Devis {
  id: string
  numero: string
  titre?: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut: string
  date_validite?: string
  notes?: string
  created_at: string
  entite?: { nom: string }
}

const STATUT_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  brouillon:      { label: 'Brouillon',       cls: 'bg-white/5 text-white/40 border-white/10',   icon: <FileText size={10} /> },
  envoye:         { label: 'À répondre',      cls: 'bg-violet/10 text-violet border-violet/20',  icon: <Clock size={10} /> },
  en_negociation: { label: 'En négociation',  cls: 'bg-amber/10 text-amber border-amber/20',     icon: <Clock size={10} /> },
  accepte:        { label: 'Accepté',         cls: 'bg-green/10 text-green border-green/20',     icon: <CheckCircle size={10} /> },
  refuse:         { label: 'Refusé',          cls: 'bg-red/10 text-red border-red/20',           icon: <XCircle size={10} /> },
  expire:         { label: 'Expiré',          cls: 'bg-white/5 text-white/30 border-white/10',  icon: <AlertTriangle size={10} /> },
  converti:       { label: 'Converti',        cls: 'bg-blue/10 text-blue border-blue/20',        icon: <CheckCircle size={10} /> },
}

export default function ClientDevisPage() {
  const [devis, setDevis] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    // RLS (devis_client_own + devis_client_assignation_individuelle) filtre déjà
    // sur les devis du client : ceux de son entreprise ET ceux assignés individuellement
    const { data } = await supabase
      .from('devis')
      .select('id, numero, titre, montant_ht, montant_tva, montant_ttc, statut, date_validite, notes, created_at, entite:entites_legales(nom)')
      .order('created_at', { ascending: false })

    const all = (data || []) as unknown as Devis[]
    const today = new Date().toISOString().split('T')[0]
    const list = all.map(d => ({
      ...d,
      statut: d.statut === 'envoye' && d.date_validite && d.date_validite < today ? 'expire' : d.statut,
    }))
    setDevis(list)
    setLoading(false)
  }

  const enAttenteCount = devis.filter(d => d.statut === 'envoye').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Mes devis</h1>
        <p className="text-sm text-white/40 mt-0.5">{devis.length} devis</p>
      </div>

      {enAttenteCount > 0 && (
        <div className="bg-violet/5 border border-violet/20 rounded-xl p-4 flex items-center gap-3">
          <Clock size={16} className="text-violet flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">{enAttenteCount} devis en attente de réponse</p>
            <p className="text-xs text-white/40">Ouvrez le devis pour accepter, refuser ou demander une négociation</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : devis.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/30">Aucun devis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devis.map(d => {
            const cfg = STATUT_CFG[d.statut] || STATUT_CFG.brouillon
            return (
              <Link key={d.id} href={`/espace-client/devis/${d.id}`}
                className="block border border-white/5 bg-white/[0.03] rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-white/50 group-hover:text-white transition-colors">{d.numero}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                      {d.entite && <span className="text-2xs text-white/30">{d.entite.nom}</span>}
                    </div>
                    {d.titre && <h3 className="text-sm font-semibold text-white mb-1">{d.titre}</h3>}
                    <p className="text-lg font-bold text-white">{formatMontant(d.montant_ttc)}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-2xs text-white/30">HT : {formatMontant(d.montant_ht)}</span>
                      <span className="text-2xs text-white/30">TVA : {formatMontant(d.montant_tva)}</span>
                      {d.date_validite && (
                        <span className={`text-2xs ${d.statut === 'expire' ? 'text-red' : 'text-white/30'}`}>
                          Valide jusqu&apos;au {formatDate(d.date_validite)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="p-1.5 rounded-lg bg-white/5 text-white/40 flex-shrink-0" title="Voir le détail">
                    <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
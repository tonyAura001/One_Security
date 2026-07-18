// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatDate } from '@/aurantir-front-kit/lib/utils'
import { FolderOpen, Clock, CheckCircle, Calendar, ArrowRight, FolderTree } from 'lucide-react'
import Link from 'next/link'

interface Projet {
  id: string
  titre: string
  description?: string
  statut: string
  avancement: number
  date_debut?: string
  date_fin_prevue?: string
  date_fin_reelle?: string
  chef_projet?: { prenom: string; nom: string }
  parent_id?: string | null
}

const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  planifie:  { label: 'Planifié',  cls: 'bg-amber/10 text-amber border-amber/20' },
  en_cours:  { label: 'En cours', cls: 'bg-blue/10 text-blue border-blue/20' },
  en_pause:  { label: 'En pause', cls: 'bg-white/10 text-white/50 border-white/10' },
  termine:   { label: 'Terminé',  cls: 'bg-green/10 text-green border-green/20' },
  annule:    { label: 'Annulé',   cls: 'bg-red/10 text-red border-red/20' },
}

export default function ClientProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')
  const [parentTitres, setParentTitres] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()
    if (!userData) { setLoading(false); return }

    const { data } = await supabase
      .from('membres_projet')
      .select(`
        projets(
          id, titre, description, statut, avancement,
          date_debut, date_fin_prevue, date_fin_reelle, parent_id,
          chef_projet:users!responsable_id(prenom, nom)
        )
      `)
      .eq('user_id', userData.id)
      .eq('statut', 'actif')
      .is('revoque_at', null)
      .not('projets', 'is', null)

    const list = (data || [])
      .map((r: any) => r.projets)
      .filter(Boolean) as Projet[]

    list.sort((a, b) => a.titre.localeCompare(b.titre))
    setProjets(list)

    const parentIds = Array.from(new Set(list.map(p => p.parent_id).filter(Boolean))) as string[]
    if (parentIds.length > 0) {
      const { data: parents } = await supabase.from('projets').select('id, titre').in('id', parentIds)
      setParentTitres(Object.fromEntries((parents || []).map((p: any) => [p.id, p.titre])))
    } else {
      setParentTitres({})
    }
    setLoading(false)
  }

  const FILTRES = ['tous', 'en_cours', 'planifie', 'termine']
  const filtered = filtre === 'tous' ? projets : projets.filter(p => p.statut === filtre)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Mes projets</h1>
        <p className="text-sm text-white/40 mt-0.5">{projets.length} projet{projets.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {FILTRES.map(f => {
          const cfg = STATUT_CFG[f]
          return (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtre === f
                  ? 'bg-blue/20 text-blue border border-blue/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'
              }`}>
              {f === 'tous' ? 'Tous' : (cfg?.label || f)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/30">Aucun projet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const cfg = STATUT_CFG[p.statut] || STATUT_CFG.planifie
            const avancementColor = p.avancement === 100 ? 'bg-green' : p.avancement >= 50 ? 'bg-blue' : 'bg-amber'
            return (
              <Link key={p.id} href={`/espace-client/projets/${p.id}`}
                className="block bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/15 hover:bg-white/[0.05] transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue transition-colors">{p.titre}</h3>
                    {p.parent_id && parentTitres[p.parent_id] ? (
                      <p className="text-2xs text-white/30 mt-0.5 flex items-center gap-1 truncate">
                        <FolderTree size={10} className="flex-shrink-0" /> {parentTitres[p.parent_id]}
                      </p>
                    ) : p.description && (
                      <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${p.avancement === 100 ? 'text-green' : 'text-blue'}`}>
                        {p.avancement}%
                      </p>
                      <p className="text-2xs text-white/30">avancement</p>
                    </div>
                    <ArrowRight size={14} className="text-white/20 group-hover:text-blue transition-colors" />
                  </div>
                </div>

                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div className={`h-full ${avancementColor} rounded-full transition-all duration-500`}
                    style={{ width: `${p.avancement}%` }} />
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {p.date_debut && (
                    <div className="flex items-center gap-1.5 text-2xs text-white/30">
                      <Calendar size={11} />
                      Début : {formatDate(p.date_debut)}
                    </div>
                  )}
                  {p.date_fin_prevue && (
                    <div className="flex items-center gap-1.5 text-2xs text-white/30">
                      <Clock size={11} />
                      Fin prévue : {formatDate(p.date_fin_prevue)}
                    </div>
                  )}
                  {p.date_fin_reelle && (
                    <div className="flex items-center gap-1.5 text-2xs text-green">
                      <CheckCircle size={11} />
                      Terminé le {formatDate(p.date_fin_reelle)}
                    </div>
                  )}
                  {p.chef_projet && (
                    <div className="flex items-center gap-1.5 text-2xs text-white/30 ml-auto">
                      <div className="w-4 h-4 rounded-full bg-violet/20 flex items-center justify-center text-violet text-2xs font-bold">
                        {p.chef_projet.prenom[0]}
                      </div>
                      {p.chef_projet.prenom} {p.chef_projet.nom}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
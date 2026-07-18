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
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { StatutProjetBadge, EntiteBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { formatDate, formatMontant } from '@/aurantir-front-kit/lib/utils'
import type { Projet, ProjetStatut } from '@/aurantir-front-kit/types/database.types'
import {
  Plus, Search, Filter, FolderKanban, Users, Calendar,
  TrendingUp, MoreHorizontal, Grid, List, Kanban, FolderTree
} from 'lucide-react'
import Link from 'next/link'

type ViewMode = 'grid' | 'list'

const STATUT_OPTIONS: { value: ProjetStatut | 'tous'; label: string; color: string }[] = [
  { value: 'tous', label: 'Tous', color: '#6B7280' },
  { value: 'planifie', label: 'Planifiés', color: '#6B7280' },
  { value: 'en_cours', label: 'En cours', color: '#3B82F6' },
  { value: 'en_pause', label: 'En pause', color: '#F59E0B' },
  { value: 'termine', label: 'Terminés', color: '#10B981' },
  { value: 'annule', label: 'Annulés', color: '#EF4444' },
]

export default function ProjetsPage() {
  const { entiteActive, user } = useAppStore()
  const [projets, setProjets] = useState<Projet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState<ProjetStatut | 'tous'>('tous')
  const [view, setView] = useState<ViewMode>('grid')
  const [parentTitres, setParentTitres] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    loadProjets()
  }, [entiteActive?.id, statutFiltre])

  async function loadProjets() {
    setLoading(true)
    let query = supabase
      .from('projets')
      .select(`
        *,
        entite:entites_legales(nom, couleur),
        client:entreprises_clientes(nom_entreprise),
        responsable:users!responsable_id(prenom, nom, avatar_url)
      `)
      .order('updated_at', { ascending: false })

    const rolesExternes = ['client_externe', 'invite_lecture']
    if (entiteActive?.id && !rolesExternes.includes(user?.role || '')) {
      query = query.eq('entite_id', entiteActive.id)
    }
    if (statutFiltre !== 'tous') query = query.eq('statut', statutFiltre)

    const { data } = await query.limit(50)
    const list = (data || []) as Projet[]
    setProjets(list)

    const parentIds = Array.from(new Set(list.map(p => (p as any).parent_id).filter(Boolean)))
    if (parentIds.length > 0) {
      const { data: parents } = await supabase.from('projets').select('id, titre').in('id', parentIds)
      setParentTitres(Object.fromEntries((parents || []).map((p: any) => [p.id, p.titre])))
    } else {
      setParentTitres({})
    }
    setLoading(false)
  }

  const projetsFiltres = projets.filter(p =>
    !search || p.titre.toLowerCase().includes(search.toLowerCase())
  )

  const statsParStatut = STATUT_OPTIONS.slice(1).map(s => ({
    ...s,
    count: projets.filter(p => p.statut === s.value).length
  }))

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projets</h1>
          <p className="page-subtitle">{projets.length} projet{projets.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-surface-border rounded-lg p-0.5 bg-background-elevated">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <List size={14} />
            </button>
          </div>
          <Link href="/projets/nouveau">
            <Button size="sm" icon={<Plus size={14} />}>
              Nouveau projet
            </Button>
          </Link>
        </div>
      </div>

      {/* Statut pills */}
      <div className="flex flex-wrap gap-2">
        {[{ value: 'tous', label: 'Tous', color: '#6B7280', count: projets.length }, ...statsParStatut].map((s) => (
          <button
            key={s.value}
            onClick={() => setStatutFiltre(s.value as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              statutFiltre === s.value
                ? 'border-current bg-current/10'
                : 'border-surface-border text-text-muted hover:border-surface-border-hover'
            }`}
            style={statutFiltre === s.value ? { color: s.color, borderColor: `${s.color}50` } : {}}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
            <span className={`px-1 py-0.5 rounded text-2xs ${statutFiltre === s.value ? 'bg-current/20' : 'bg-surface'}`}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-8"
        />
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-xl" />
            ))
          ) : projetsFiltres.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <FolderKanban size={40} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted">Aucun projet trouvé</p>
              <Link href="/projets/nouveau" className="mt-4 inline-block">
                <Button size="sm" icon={<Plus size={14} />}>Créer un projet</Button>
              </Link>
            </div>
          ) : (
            projetsFiltres.map((projet) => (
              <Link key={projet.id} href={`/projets/${projet.id}`}>
                <Card hover className="p-5 space-y-4 group">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center group-hover:bg-blue/20 transition-colors">
                      <FolderKanban size={18} className="text-blue" />
                    </div>
                    <div className="flex items-center gap-2">
                      {(projet as any).entite && (
                        <EntiteBadge nom={(projet as any).entite.nom} />
                      )}
                      <StatutProjetBadge statut={projet.statut} />
                    </div>
                  </div>

                  {/* Titre */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-blue transition-colors line-clamp-1">
                      {projet.titre}
                    </h3>
                    {(projet as any).parent_id && parentTitres[(projet as any).parent_id] ? (
                      <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1 truncate">
                        <FolderTree size={10} className="flex-shrink-0" /> {parentTitres[(projet as any).parent_id]}
                      </p>
                    ) : (projet as any).client && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {(projet as any).client.nom_entreprise}
                      </p>
                    )}
                  </div>

                  {/* Avancement */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Avancement</span>
                      <span className="text-xs font-semibold text-text-primary">{projet.avancement}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${projet.avancement}%`,
                          backgroundColor: projet.avancement >= 75 ? '#10B981' : projet.avancement >= 40 ? '#3B82F6' : '#F59E0B'
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Calendar size={11} />
                      {projet.date_fin_prevue ? formatDate(projet.date_fin_prevue) : 'Sans échéance'}
                    </div>
                    {projet.budget_prevu > 0 && (
                      <span className="text-xs text-text-muted">
                        {formatMontant(projet.budget_prevu)}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Client</th>
                <th>Entité</th>
                <th>Avancement</th>
                <th>Échéance</th>
                <th>Budget</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                projetsFiltres.map((projet) => (
                  <tr key={projet.id}>
                    <td>
                      <Link href={`/projets/${projet.id}`} className="text-blue hover:text-blue-light font-medium text-xs">
                        {projet.titre}
                      </Link>
                      {(projet as any).parent_id && parentTitres[(projet as any).parent_id] && (
                        <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1">
                          <FolderTree size={9} /> {parentTitres[(projet as any).parent_id]}
                        </p>
                      )}
                    </td>
                    <td className="text-xs">{(projet as any).client?.nom_entreprise || '—'}</td>
                    <td>
                      {(projet as any).entite && <EntiteBadge nom={(projet as any).entite.nom} />}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-border rounded-full">
                          <div className="h-full bg-blue rounded-full" style={{ width: `${projet.avancement}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{projet.avancement}%</span>
                      </div>
                    </td>
                    <td className="text-xs text-text-muted">
                      {projet.date_fin_prevue ? formatDate(projet.date_fin_prevue) : '—'}
                    </td>
                    <td className="text-xs">
                      {projet.budget_prevu > 0 ? formatMontant(projet.budget_prevu) : '—'}
                    </td>
                    <td><StatutProjetBadge statut={projet.statut} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
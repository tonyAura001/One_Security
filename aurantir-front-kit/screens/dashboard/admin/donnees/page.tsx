// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { Trash2, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@/aurantir-front-kit/components/ui/Card'

interface EntityItem {
  id: string
  label: string
  subtitle?: string
  created_at?: string
}

interface GroupState {
  key: string
  label: string
  color: string
  items: EntityItem[]
}

const GROUP_META: { key: string; label: string; color: string }[] = [
  { key: 'projets',      label: 'Projets',         color: 'text-blue'       },
  { key: 'factures',     label: 'Factures',         color: 'text-green'      },
  { key: 'devis',        label: 'Devis',            color: 'text-amber'      },
  { key: 'contrats',     label: 'Contrats',         color: 'text-purple'     },
  { key: 'clients',      label: 'Clients',          color: 'text-blue'       },
  { key: 'prospects',    label: 'Prospects',        color: 'text-amber'      },
  { key: 'fournisseurs', label: 'Fournisseurs',     color: 'text-text-muted' },
  { key: 'tresorerie',   label: 'Trésorerie',       color: 'text-green'      },
  { key: 'rapports',     label: 'Rapports',         color: 'text-blue'       },
  { key: 'dossiers',     label: 'Dossiers',         color: 'text-text-muted' },
  { key: 'notes',        label: 'Notes',            color: 'text-amber'      },
  { key: 'objectifs',    label: 'Objectifs (OKR)',  color: 'text-purple'     },
  { key: 'calendrier',   label: 'Événements',       color: 'text-blue'       },
  { key: 'editorial',    label: 'Éditorial',        color: 'text-amber'      },
]

const SAMA_ID     = 'a0000000-0000-0000-0000-000000000001'
const AURANTIR_ID = 'a0000000-0000-0000-0000-000000000002'

type EntiteFilter = 'all' | 'sama' | 'aurantir'

const ENTITE_OPTIONS: { key: EntiteFilter; label: string; id: string | null }[] = [
  { key: 'all',     label: 'Tous',         id: null        },
  { key: 'sama',    label: 'Sama Digital', id: SAMA_ID     },
  { key: 'aurantir',label: 'Aurantir',     id: AURANTIR_ID },
]

export default function AdminDonneesPage() {
  const [groups, setGroups] = useState<GroupState[]>(GROUP_META.map(g => ({ ...g, items: [] })))
  const [loading, setLoading] = useState(true)
  const [groupFilters, setGroupFilters] = useState<Record<string, EntiteFilter>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ type: 'item' | 'all'; key: string; id?: string; label?: string } | null>(null)

  async function load(entiteFilter?: EntiteFilter) {
    setLoading(true)
    const entiteId = entiteFilter && entiteFilter !== 'all'
      ? ENTITE_OPTIONS.find(o => o.key === entiteFilter)?.id
      : null
    const url = entiteId ? `/api/admin/entities?entite_id=${entiteId}` : '/api/admin/entities'
    const res = await fetch(url)
    const data = await res.json()
    setGroups(GROUP_META.map(g => ({ ...g, items: data[g.key] ?? [] })))
    setLoading(false)
  }

  async function loadGroup(key: string, filter: EntiteFilter) {
    const entiteId = filter !== 'all' ? ENTITE_OPTIONS.find(o => o.key === filter)?.id : null
    const url = `/api/admin/entities?group=${key}${entiteId ? `&entite_id=${entiteId}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    setGroups(prev => prev.map(g => g.key === key ? { ...g, items: data[key] ?? [] } : g))
  }

  async function changeFilter(key: string, filter: EntiteFilter) {
    setGroupFilters(prev => ({ ...prev, [key]: filter }))
    await loadGroup(key, filter)
  }

  useEffect(() => { load() }, [])

  async function doDelete(key: string, id?: string) {
    setDeleting(id ?? `all-${key}`)
    await fetch('/api/admin/entities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, id }),
    })
    setGroups(prev => prev.map(g =>
      g.key !== key ? g :
      id ? { ...g, items: g.items.filter(i => i.id !== id) } : { ...g, items: [] }
    ))
    setDeleting(null)
    setConfirm(null)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des données</h1>
          <p className="page-subtitle">Supprimer des entités du système — action irréversible</p>
        </div>
        <button onClick={() => load()} disabled={loading} className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition-colors disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-red/20 bg-red/5">
        <AlertTriangle size={16} className="text-red flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red">Les suppressions sont définitives et entraînent la suppression en cascade des données liées. Chaque action est enregistrée dans l'Audit Trail.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <Card key={g.key} className="overflow-hidden">
              <div className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === g.key ? null : g.key)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${g.color}`}>{g.label}</span>
                    <span className="text-2xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-surface-border">
                      {g.items.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.items.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirm({ type: 'all', key: g.key, label: g.label }) }}
                        className="flex items-center gap-1 px-2 py-1 text-2xs text-red border border-red/20 rounded hover:bg-red/10 transition-colors"
                      >
                        <Trash2 size={10} /> Tout supprimer
                      </button>
                    )}
                    {expanded === g.key ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                  </div>
                </div>
                {/* Filtres entité */}
                <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                  {ENTITE_OPTIONS.map(opt => {
                    const active = (groupFilters[g.key] ?? 'all') === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => changeFilter(g.key, opt.key)}
                        className={`px-2 py-0.5 text-2xs rounded-full border transition-colors ${
                          active
                            ? 'bg-blue/10 text-blue border-blue/30'
                            : 'text-text-muted border-surface-border hover:text-text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {expanded === g.key && (
                <div className="border-t border-surface-border">
                  {g.items.length === 0 ? (
                    <p className="p-4 text-xs text-text-muted text-center">Aucune entrée</p>
                  ) : (
                    <div className="divide-y divide-surface-border max-h-80 overflow-y-auto">
                      {g.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary truncate">{item.label}</p>
                            <p className="text-2xs text-text-muted">
                              {item.subtitle && <span className="mr-2 opacity-70">{item.subtitle}</span>}
                              {item.created_at && formatRelativeTime(item.created_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => setConfirm({ type: 'item', key: g.key, id: item.id, label: item.label })}
                            disabled={deleting === item.id}
                            className="ml-3 p-1.5 text-text-muted hover:text-red hover:bg-red/10 rounded transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {confirm.type === 'all' ? `Supprimer tous les ${confirm.label} ?` : `Supprimer "${confirm.label}" ?`}
                </p>
                <p className="text-2xs text-text-muted">Action irréversible — enregistrée dans l'Audit Trail.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-xs text-text-muted hover:text-text-primary border border-surface-border rounded-lg transition-colors">
                Annuler
              </button>
              <button
                onClick={() => doDelete(confirm.key, confirm.id)}
                disabled={deleting !== null}
                className="px-4 py-2 text-xs text-white bg-red rounded-lg hover:bg-red/80 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
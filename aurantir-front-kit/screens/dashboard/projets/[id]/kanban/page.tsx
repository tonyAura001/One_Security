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
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { formatDate, initiales } from '@/aurantir-front-kit/lib/utils'
import type { Tache, TacheStatut } from '@/aurantir-front-kit/types/database.types'
import { Plus, MoreHorizontal, AlertCircle, Clock, User } from 'lucide-react'

const COLONNES: { statut: TacheStatut; label: string; color: string; bg: string }[] = [
  { statut: 'backlog', label: 'Backlog', color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  { statut: 'a_faire', label: 'À faire', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
  { statut: 'en_cours', label: 'En cours', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { statut: 'en_review', label: 'En review', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { statut: 'termine', label: 'Terminé', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
]

const PRIORITE_CONFIG = {
  urgente: { label: 'Urgente', color: '#EF4444', bg: 'bg-red/10 text-red border-red/20' },
  haute: { label: 'Haute', color: '#F59E0B', bg: 'bg-amber/10 text-amber border-amber/20' },
  normale: { label: 'Normale', color: '#6B7280', bg: 'bg-surface text-text-muted border-surface-border' },
  basse: { label: 'Basse', color: '#4B5563', bg: 'bg-surface text-text-disabled border-surface-border' },
}

interface NouvellesTache {
  titre: string
  description: string
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  date_echeance: string
}

export default function KanbanPage() {
  const { id: projetId } = useParams<{ id: string }>()
  const [taches, setTaches] = useState<Tache[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState<TacheStatut | null>(null)
  const [newTask, setNewTask] = useState<NouvellesTache>({ titre: '', description: '', priorite: 'normale', date_echeance: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTaches()

    // Realtime updates
    const channel = supabase
      .channel(`kanban-${projetId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'taches',
        filter: `projet_id=eq.${projetId}`,
      }, () => loadTaches())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projetId])

  async function loadTaches() {
    const { data } = await supabase
      .from('taches')
      .select('*, assigne:users!assigne_a(prenom, nom, avatar_url)')
      .eq('projet_id', projetId)
      .order('ordre')
    setTaches((data || []) as Tache[])
    setLoading(false)
  }

  async function moveTask(taskId: string, newStatut: TacheStatut) {
    await supabase
      .from('taches')
      .update({ statut: newStatut })
      .eq('id', taskId)

    setTaches(prev => prev.map(t => t.id === taskId ? { ...t, statut: newStatut } : t))
  }

  async function createTask(statut: TacheStatut) {
    if (!newTask.titre.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user!.id)
      .single()

    const { error: insertError } = await supabase.from('taches').insert({
      projet_id: projetId,
      titre: newTask.titre,
      description: newTask.description || null,
      priorite: newTask.priorite,
      date_echeance: newTask.date_echeance || null,
      statut,
      created_by: userData!.id,
    })

    setSaving(false)
    if (insertError) return
    setNewTask({ titre: '', description: '', priorite: 'normale', date_echeance: '' })
    setShowNewTask(null)
    loadTaches()
  }

  // Drag & Drop handlers
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, newStatut: TacheStatut) {
    e.preventDefault()
    if (draggedId) {
      moveTask(draggedId, newStatut)
      setDraggedId(null)
    }
  }

  const tachesParStatut = (statut: TacheStatut) => taches.filter(t => t.statut === statut)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Kanban</h1>
          <p className="text-xs text-text-muted">{taches.length} tâche{taches.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNewTask('backlog')}
        >
          Nouvelle tâche
        </Button>
      </div>

      {/* Colonnes */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 no-scrollbar">
        {COLONNES.map(col => {
          const colTaches = tachesParStatut(col.statut)
          return (
            <div
              key={col.statut}
              className="flex-shrink-0 w-72 flex flex-col rounded-xl border border-surface-border overflow-hidden"
              style={{ background: col.bg }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.statut)}
            >
              {/* Col header */}
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-surface-border/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold text-text-primary">{col.label}</span>
                  <span className="text-2xs text-text-muted bg-surface px-1.5 py-0.5 rounded-full">
                    {colTaches.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowNewTask(col.statut)}
                  className="text-text-muted hover:text-text-primary transition-colors p-0.5"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Tâches */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))
                ) : (
                  colTaches.map(tache => (
                    <TaskCard
                      key={tache.id}
                      tache={tache}
                      onDragStart={(e) => handleDragStart(e, tache.id)}
                      isDragging={draggedId === tache.id}
                    />
                  ))
                )}

                {/* Nouvelle tâche inline */}
                {showNewTask === col.statut && (
                  <div className="bg-surface border border-blue/30 rounded-lg p-3 space-y-2 animate-scale-in">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Titre de la tâche..."
                      value={newTask.titre}
                      onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') createTask(col.statut); if (e.key === 'Escape') setShowNewTask(null) }}
                      className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted border-none outline-none"
                    />
                    <select
                      value={newTask.priorite}
                      onChange={(e) => setNewTask({ ...newTask, priorite: e.target.value as any })}
                      className="w-full text-2xs bg-background-elevated border border-surface-border rounded px-2 py-1 text-text-secondary"
                    >
                      <option value="basse">Basse</option>
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                      <option value="urgente">Urgente</option>
                    </select>
                    <input
                      type="date"
                      value={newTask.date_echeance}
                      onChange={(e) => setNewTask({ ...newTask, date_echeance: e.target.value })}
                      className="w-full text-2xs bg-background-elevated border border-surface-border rounded px-2 py-1 text-text-secondary"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => createTask(col.statut)}
                        disabled={!newTask.titre.trim() || saving}
                        className="flex-1 py-1 rounded bg-blue text-white text-2xs font-medium hover:bg-blue-hover disabled:opacity-50"
                      >
                        {saving ? '...' : 'Ajouter'}
                      </button>
                      <button
                        onClick={() => setShowNewTask(null)}
                        className="px-2 py-1 rounded text-text-muted hover:text-text-primary text-2xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({
  tache,
  onDragStart,
  isDragging,
}: {
  tache: Tache
  onDragStart: (e: React.DragEvent) => void
  isDragging: boolean
}) {
  const prio = PRIORITE_CONFIG[tache.priorite]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`bg-surface border border-surface-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all hover:border-blue/30 hover:shadow-card group ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      {/* Priorité + menu */}
      <div className="flex items-start justify-between gap-1">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-2xs font-medium ${prio.bg}`}>
          {tache.priorite === 'urgente' && <AlertCircle size={9} className="mr-1" />}
          {prio.label}
        </span>
        <button className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={12} />
        </button>
      </div>

      {/* Titre */}
      <p className="text-xs font-medium text-text-primary leading-tight">{tache.titre}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {tache.date_echeance ? (
          <div className="flex items-center gap-1 text-2xs text-text-muted">
            <Clock size={9} />
            {formatDate(tache.date_echeance)}
          </div>
        ) : <span />}

        {(tache as any).assigne ? (
          <div className="w-5 h-5 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue" title={`${(tache as any).assigne.prenom} ${(tache as any).assigne.nom}`}>
            {(tache as any).assigne.prenom?.[0]}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-dashed border-surface-border flex items-center justify-center">
            <User size={8} className="text-text-muted" />
          </div>
        )}
      </div>
    </div>
  )
}
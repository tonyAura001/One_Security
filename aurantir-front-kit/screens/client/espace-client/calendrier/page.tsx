// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Calendar, ChevronLeft, ChevronRight, MapPin, Video } from 'lucide-react'

interface Evenement {
  id: string
  titre: string
  description?: string
  type: string
  date_debut: string
  date_fin?: string
  lieu?: string
  est_en_ligne: boolean
  couleur?: string
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const TYPE_COULEURS: Record<string, string> = {
  planification: '#6366F1', reunion: '#3B82F6', deadline: '#EF4444',
  presentation: '#8B5CF6', formation: '#10B981', conge: '#F59E0B',
  tache_kanban: '#0EA5E9', jalon: '#F97316', rappel: '#A78BFA', autre: '#6B7280',
}

const TYPE_LABELS: Record<string, string> = {
  planification: 'Planification', reunion: 'Réunion', deadline: 'Deadline',
  presentation: 'Présentation', formation: 'Formation', conge: 'Congé',
  tache_kanban: 'Tâche', jalon: 'Jalon', rappel: 'Rappel', autre: 'Autre',
}

function capitalize(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export default function EspaceClientCalendrierPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [currentDate])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()
    if (!userData) { setLoading(false); return }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)

    const { data } = await supabase
      .from('evenements_calendrier')
      .select('id, titre, description, type, date_debut, date_fin, lieu, est_en_ligne, couleur')
      .contains('participants', [{ user_id: userData.id }])
      .gte('date_debut', start.toISOString())
      .lte('date_debut', end.toISOString())
      .order('date_debut')

    setEvenements((data || []) as Evenement[])
    setLoading(false)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7 // Lundi = 0
    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  function eventsForDay(d: Date) {
    const dateStr = d.toISOString().slice(0, 10)
    return evenements.filter(e => e.date_debut.startsWith(dateStr))
  }

  const today = new Date()
  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const isSelected = (d: Date) => !!selectedDate && d.toDateString() === selectedDate.toDateString()

  const upcoming = useMemo(() => {
    const list = selectedDate ? eventsForDay(selectedDate) : evenements
    return [...list].sort((a, b) => a.date_debut.localeCompare(b.date_debut))
  }, [evenements, selectedDate])

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Calendrier</h1>
          <p className="text-sm text-white/40 mt-1">Vos événements et rendez-vous à venir</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium text-white w-36 text-center">{MOIS[month]} {year}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Grille du mois */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {JOURS.map(j => (
                <div key={j} className="text-2xs text-white/30 text-center font-medium py-1">{j}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                if (!d) return <div key={i} className="aspect-square" />
                const dayEvents = eventsForDay(d)
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected(d) ? null : d)}
                    className={`aspect-square rounded-lg p-1 sm:p-1.5 flex flex-col items-center sm:items-start transition-colors text-left ${
                      isSelected(d) ? 'bg-blue/15 border border-blue/30'
                        : isToday(d) ? 'bg-white/[0.06] border border-white/10'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <span className={`text-xs ${isToday(d) ? 'text-blue font-semibold' : 'text-white/60'}`}>{d.getDate()}</span>
                    <div className="flex flex-wrap gap-0.5 mt-auto sm:mt-1">
                      {dayEvents.slice(0, 3).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.couleur || TYPE_COULEURS[e.type] || '#3B82F6' }} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Liste des événements */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={14} className="text-white/30" />
                {selectedDate
                  ? capitalize(selectedDate.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' }))
                  : 'Tous les événements du mois'}
              </h2>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="text-2xs text-white/30 hover:text-white transition-colors">
                  Voir tout
                </button>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar size={24} className="mx-auto mb-2 text-white/15" />
                <p className="text-xs text-white/40">Aucun événement</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map(e => {
                  const color = e.couleur || TYPE_COULEURS[e.type] || '#3B82F6'
                  return (
                    <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{e.titre}</p>
                        <p className="text-2xs text-white/30 mt-0.5">
                          {new Date(e.date_debut).toLocaleDateString('fr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-2xs px-1.5 py-0.5 rounded" style={{ background: `${color}1A`, color }}>
                            {TYPE_LABELS[e.type] || e.type}
                          </span>
                          {e.lieu && (
                            <span className="flex items-center gap-1 text-2xs text-white/30">
                              <MapPin size={10} />{e.lieu}
                            </span>
                          )}
                          {e.est_en_ligne && (
                            <span className="flex items-center gap-1 text-2xs bg-blue/10 text-blue px-1.5 py-0.5 rounded">
                              <Video size={10} />En ligne
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
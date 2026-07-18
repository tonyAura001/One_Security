// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  X, Edit2, Trash2, Globe, Video, RefreshCw, Check, Minus, Link2,
  Paperclip, Download, FileText, Image, Archive, File,
  Lock, Users2, Building2, Eye,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface Participant {
  user_id?: string
  prenom: string
  nom: string
  statut: 'accepte' | 'en_attente' | 'refuse'
}

interface PieceJointe {
  nom: string
  url_stockage: string
  taille: number
  type: string
}

interface Evenement {
  id: string
  entite_id: string
  titre: string
  description?: string
  type: string
  date_debut: string
  date_fin?: string
  lieu?: string
  est_en_ligne: boolean
  lien_reunion?: string
  couleur?: string
  recurrence?: string
  recurrence_config?: Record<string, unknown>
  projet_id?: string
  client_id?: string
  fuseau_horaire?: string
  participants?: Participant[]
  pieces_jointes?: PieceJointe[]
  client_nom?: string
  visibilite?: string
  created_at: string
  createur?: { prenom: string; nom: string }
  projet?: { id: string; titre: string }
  client?: { id: string; nom_entreprise: string }
}

interface Projet { id: string; titre: string }
interface Client { id: string; nom_entreprise: string }
interface Membre { id: string; prenom: string; nom: string; role: string }

// ── Constants ──────────────────────────────────────────────────
const JOURS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS   = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
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

const RECURRENCE_LABELS: Record<string, string> = {
  aucune: 'Ne pas répéter', quotidienne: 'Tous les jours',
  hebdomadaire: 'Chaque semaine', mensuelle: 'Chaque mois', personnalisee: 'Personnalisé',
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={13} className="text-violet" />
  if (type.includes('pdf') || type.includes('word') || type.includes('text')) return <FileText size={13} className="text-blue" />
  if (type.includes('zip') || type.includes('rar')) return <Archive size={13} className="text-amber" />
  return <File size={13} className="text-text-muted" />
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

const TIMEZONES = [
  'Africa/Dakar', 'Africa/Abidjan', 'Africa/Lagos', 'Africa/Nairobi',
  'Europe/Paris', 'Europe/London', 'Europe/Brussels',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Asia/Dubai', 'UTC',
]

// ── Main Page ─────────────────────────────────────────────────
// ── Tiny component to read ?event= without polluting the main page ──
function EventUrlWatcher({ onEventId }: { onEventId: (id: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const id = searchParams.get('event')
    if (id) onEventId(id)
  }, [searchParams])
  return null
}

export default function CalendrierPage() {
  const { entiteActive } = useAppStore()
  const [evenements,  setEvenements]  = useState<Evenement[]>([])
  const [projets,     setProjets]     = useState<Projet[]>([])
  const [clients,     setClients]     = useState<Client[]>([])
  const [membres,     setMembres]     = useState<Membre[]>([])
  const [loading,     setLoading]     = useState(true)
  const [queryError,  setQueryError]  = useState<string | null>(null)
  const [viewMode,    setViewMode]    = useState<'month' | 'week' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm,    setShowForm]    = useState(false)
  const [selectedDate,setSelectedDate]= useState<Date | null>(null)
  const [editTarget,  setEditTarget]  = useState<Evenement | null>(null)
  const [drawer,      setDrawer]      = useState<Evenement | null>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [entiteActive?.id, currentDate])

  async function openEventById(eventId: string) {
    const found = evenements.find(e => e.id === eventId)
    if (found) { setDrawer(found); return }
    const { data } = await supabase.from('evenements_calendrier').select('*').eq('id', eventId).single()
    if (data) {
      const normalized = {
        ...data,
        pieces_jointes: typeof data.pieces_jointes === 'string'
          ? (() => { try { return JSON.parse(data.pieces_jointes) } catch { return [] } })()
          : (Array.isArray(data.pieces_jointes) ? data.pieces_jointes : []),
      }
      setDrawer(normalized as Evenement)
      setCurrentDate(new Date(data.date_debut))
    }
  }

  async function loadAll() {
    setLoading(true)
    setQueryError(null)
    const start = new Date(currentDate.getFullYear() - 1, 0, 1)
    const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

    const { data: evData, error: evError } = await supabase
      .from('evenements_calendrier')
      .select('*')
      .gte('date_debut', start.toISOString())
      .lte('date_debut', end.toISOString())
      .order('date_debut')

    if (evError) {
      setQueryError(evError.message)
      setEvenements([])
    } else {
      const normalize = (e: any) => ({
        ...e,
        pieces_jointes: typeof e.pieces_jointes === 'string'
          ? (() => { try { return JSON.parse(e.pieces_jointes) } catch { return [] } })()
          : (Array.isArray(e.pieces_jointes) ? e.pieces_jointes : []),
      })
      const filtered = entiteActive?.id
        ? (evData || []).filter((e: Evenement) => e.entite_id === entiteActive.id || !e.entite_id).map(normalize)
        : (evData || []).map(normalize)
      setEvenements(filtered as Evenement[])
    }

    const projetsQuery = entiteActive?.id
      ? supabase.from('projets').select('id, titre').eq('entite_id', entiteActive.id).order('titre')
      : supabase.from('projets').select('id, titre').order('titre')
    const { data: pData } = await projetsQuery
    setProjets((pData || []) as Projet[])

    const clientsQuery = entiteActive?.id
      ? supabase.from('entreprises_clientes').select('id, nom_entreprise').eq('entite_id', entiteActive.id).order('nom_entreprise')
      : supabase.from('entreprises_clientes').select('id, nom_entreprise').order('nom_entreprise')
    const { data: cData } = await clientsQuery
    setClients((cData || []) as Client[])

    const { data: mData } = await supabase
      .from('users')
      .select('id, prenom, nom, role')
      .eq('statut', 'actif')
      .not('email', 'like', '%@deleted.local')
      .order('prenom')
    setMembres((mData || []) as Membre[])

    setLoading(false)
  }

  function navigate(dir: number) {
    setCurrentDate(d => {
      const nd = new Date(d)
      nd.setMonth(nd.getMonth() + dir)
      return nd
    })
  }

  // ── Recurring logic ──────────────────────────────────────────
  function eventAppliesOnDay(e: Evenement, targetDate: Date): boolean {
    const dateStr = targetDate.toISOString().split('T')[0]
    if (e.date_debut.startsWith(dateStr)) return true
    if (!e.recurrence || e.recurrence === 'aucune') return false
    const original = new Date(e.date_debut)
    if (targetDate <= original) return false
    switch (e.recurrence) {
      case 'quotidienne':   return true
      case 'hebdomadaire':  return targetDate.getDay() === original.getDay()
      case 'mensuelle':     return targetDate.getDate() === original.getDate()
      default:              return false
    }
  }

  // ── Month grid ───────────────────────────────────────────────
  const year     = currentDate.getFullYear()
  const month    = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const totalCells = startPad + lastDay.getDate()
  const weeks    = Math.ceil(totalCells / 7)

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  function getEventsForDay(day: number): Evenement[] {
    const d = new Date(year, month, day)
    return evenements.filter(e => eventAppliesOnDay(e, d))
  }

  // ── Week helpers ─────────────────────────────────────────────
  const weekStart = useMemo(() => {
    const d = new Date(currentDate)
    const dow = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dow)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentDate])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart])

  // ── Event color ──────────────────────────────────────────────
  const evColor = (e: Evenement) => e.couleur || TYPE_COULEURS[e.type] || '#3B82F6'

  function openEdit(e: Evenement) { setEditTarget(e); setDrawer(null); setShowForm(true) }

  async function deleteEvent(e: Evenement) {
    await supabase.from('evenements_calendrier').delete().eq('id', e.id)
    setDrawer(null)
    loadAll()
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Suspense fallback={null}>
        <EventUrlWatcher onEventId={openEventById} />
      </Suspense>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendrier</h1>
          <p className="page-subtitle">
            {evenements.filter(e => e.date_debut.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} événement{evenements.length !== 1 ? 's' : ''} ce mois
          </p>
          {queryError && (
            <p className="text-xs text-red mt-1">⚠ Erreur DB : {queryError}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center h-8 border border-surface-border rounded-md overflow-hidden">
            {(['month', 'week', 'list'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`h-full px-3 text-xs font-medium transition-colors ${viewMode === v ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Liste'}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="h-8 flex items-center gap-1.5 px-3 rounded-md bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors"
          >
            <Plus size={13} /> Événement
          </button>
        </div>
      </div>

      {/* Navigation — alignée, hauteurs uniformes */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="h-7 w-7 flex items-center justify-center hover:bg-surface-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
          <ChevronLeft size={14} />
        </button>
        <h2 className="text-sm font-semibold text-text-primary w-44 text-center tabular-nums">
          {viewMode === 'week'
            ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MOIS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
            : `${MOIS[month]} ${year}`}
        </h2>
        <button onClick={() => navigate(1)} className="h-7 w-7 flex items-center justify-center hover:bg-surface-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="h-7 px-2.5 rounded-md border border-surface-border text-xs text-text-muted hover:text-text-primary hover:border-surface-hover transition-colors ml-1"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {/* ── Month view ─────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 border-b border-white/5">
            {JOURS.map(j => (
              <div key={j} className="py-2.5 text-center text-2xs font-medium text-text-muted/60 uppercase tracking-widest">{j}</div>
            ))}
          </div>
          {/* Grille */}
          <div className="grid grid-cols-7">
            {Array.from({ length: weeks * 7 }).map((_, idx) => {
              const day = idx - startPad + 1
              const isValid = day >= 1 && day <= lastDay.getDate()
              const events = isValid ? getEventsForDay(day) : []
              return (
                <div
                  key={idx}
                  onClick={() => { if (isValid) { setSelectedDate(new Date(year, month, day)); setEditTarget(null); setShowForm(true) } }}
                  className={`min-h-[80px] p-2 border-b border-r border-surface-border/30 transition-all duration-200 ${
                    isValid
                      ? 'cursor-pointer hover:bg-white/[0.02]'
                      : 'opacity-20 pointer-events-none'
                  }`}
                >
                  {isValid && (
                    <>
                      {/* Numéro du jour — badge compact en haut à droite */}
                      <div className="flex justify-end mb-1.5">
                        <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-2xs font-medium transition-colors ${
                          isToday(day)
                            ? 'text-blue font-semibold ring-1 ring-blue/40 bg-blue/10'
                            : 'text-text-muted/70'
                        }`}>
                          {day}
                        </span>
                      </div>
                      {/* Événements */}
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map(e => (
                          <button
                            key={e.id}
                            onClick={ev => { ev.stopPropagation(); setDrawer(e) }}
                            className="w-full text-left px-1.5 py-px rounded text-2xs font-medium truncate transition-colors hover:brightness-110"
                            style={{
                              backgroundColor: evColor(e) + '18',
                              color: evColor(e),
                              borderLeft: `2px solid ${evColor(e)}50`,
                            }}
                          >
                            {e.recurrence && e.recurrence !== 'aucune' && (
                              <span className="inline-block w-1 h-1 rounded-full mr-1 opacity-70 align-middle" style={{ backgroundColor: evColor(e) }} />
                            )}
                            {e.titre}
                          </button>
                        ))}
                        {events.length > 3 && (
                          <p className="text-2xs text-text-muted/50 px-1.5">+{events.length - 3}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Week view ──────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/5">
            {weekDays.map((d, i) => {
              const isTd = d.toDateString() === today.toDateString()
              return (
                <div key={i} className="py-3 text-center">
                  <p className="text-2xs font-medium text-text-muted/60 uppercase tracking-widest">{JOURS[i]}</p>
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mt-1 transition-colors ${isTd ? 'text-blue font-semibold ring-1 ring-blue/40 bg-blue/10' : 'text-text-muted/70'}`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[200px]">
            {weekDays.map((d, i) => {
              const events = evenements.filter(e => eventAppliesOnDay(e, d))
              return (
                <div key={i} className="min-h-[200px] p-1.5 border-r border-surface-border/30 space-y-1">
                  {events.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setDrawer(e)}
                      className="w-full text-left px-2 py-1 rounded text-2xs font-medium transition-colors hover:brightness-110"
                      style={{ backgroundColor: evColor(e) + '18', color: evColor(e), borderLeft: `2px solid ${evColor(e)}50` }}
                    >
                      <p className="font-medium truncate">{e.titre}</p>
                      <p className="opacity-50 text-2xs">{new Date(e.date_debut).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}</p>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── List view ──────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
            : evenements.length === 0
              ? (
                <div className="text-center py-12 text-text-muted">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun événement ce mois</p>
                </div>
              )
              : evenements
                  .filter(e => e.date_debut.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                  .map(e => (
                    <button
                      key={e.id}
                      onClick={() => setDrawer(e)}
                      className="w-full bg-surface border border-surface-border rounded-xl p-4 flex items-start gap-3 hover:border-blue/20 transition-all duration-200 text-left group"
                    >
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: evColor(e) }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">{e.titre}</p>
                          {e.recurrence && e.recurrence !== 'aucune' && (
                            <span className="text-2xs text-text-muted flex items-center gap-0.5">
                              <RefreshCw size={9} />{RECURRENCE_LABELS[e.recurrence]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-2xs text-text-muted">
                            <Clock size={10} />
                            {new Date(e.date_debut).toLocaleDateString('fr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {e.lieu && <span className="flex items-center gap-1 text-2xs text-text-muted"><MapPin size={10} />{e.lieu}</span>}
                          {e.est_en_ligne && <span className="text-2xs bg-blue/10 text-blue px-1.5 py-0.5 rounded">En ligne</span>}
                          {e.projet_id && projets.find(p => p.id === e.projet_id) && <span className="text-2xs text-purple/80">📁 {projets.find(p => p.id === e.projet_id)!.titre}</span>}
                          {e.client_nom && <span className="text-2xs text-text-muted">👤 {e.client_nom}</span>}
                        </div>
                      </div>
                      <span className="text-2xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0"
                        style={{ color: evColor(e), borderColor: evColor(e) + '40', background: evColor(e) + '15' }}>
                        {TYPE_LABELS[e.type] || e.type}
                      </span>
                    </button>
                  ))
          }
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      {showForm && (
        <EvenementModal
          entiteId={entiteActive?.id || ''}
          dateInitiale={selectedDate}
          projets={projets}
          clients={clients}
          membres={membres}
          evenement={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); setSelectedDate(null) }}
          onSuccess={() => { setShowForm(false); setEditTarget(null); setSelectedDate(null); loadAll() }}
        />
      )}

      {drawer && (
        <EventDrawer
          evenement={drawer}
          projets={projets}
          onClose={() => setDrawer(null)}
          onEdit={() => openEdit(drawer)}
          onDelete={() => deleteEvent(drawer)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── EventDrawer ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function EventDrawer({
  evenement: e, projets, onClose, onEdit, onDelete,
}: { evenement: Evenement; projets: Projet[]; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const color = e.couleur || TYPE_COULEURS[e.type] || '#3B82F6'

  const participants: Participant[] = Array.isArray(e.participants) && e.participants.length > 0
    ? e.participants
    : e.createur
      ? [{ prenom: e.createur.prenom, nom: e.createur.nom, statut: 'accepte' }]
      : []

  const STATUT_CONFIG = {
    accepte:    { label: 'Accepté',   dot: 'bg-green',  icon: <Check size={8} /> },
    en_attente: { label: 'En attente',dot: 'bg-slate-400', icon: <Minus size={8} /> },
    refuse:     { label: 'Décliné',   dot: 'bg-red',    icon: <X size={8} /> },
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-40 w-80 border-l-2 border-surface-border shadow-2xl flex flex-col animate-slide-in-right" style={{ backgroundColor: 'rgb(var(--rgb-bg-primary))' }}>

        {/* ── Top bar : actions + close ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface hover:bg-surface-hover border border-surface-border transition-colors text-text-secondary hover:text-text-primary"
            >
              <Edit2 size={12} /> Modifier
            </button>
            {confirmDel ? (
              <span className="flex items-center gap-1">
                <button onClick={onDelete} className="px-2 py-1.5 text-xs font-medium rounded-lg bg-red/10 text-red hover:bg-red/20 border border-red/20 transition-colors">
                  Confirmer
                </button>
                <button onClick={() => setConfirmDel(false)} className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                  Annuler
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-red/10 border border-transparent hover:border-red/20 transition-colors text-text-muted hover:text-red"
              >
                <Trash2 size={12} /> Supprimer
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Title + type badge */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-text-primary leading-tight flex-1">{e.titre}</h2>
              <span
                className="text-2xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 font-medium"
                style={{ color, borderColor: color + '40', background: color + '15' }}
              >
                {TYPE_LABELS[e.type] || e.type}
              </span>
            </div>
            <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: color }} />
            {e.visibilite && e.visibilite !== 'equipe' && (() => {
              const VIS: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
                prive:      { icon: <Lock size={10} />,      label: 'Privé',      cls: 'text-text-muted border-surface-border bg-surface' },
                fondateurs: { icon: <Building2 size={10} />, label: 'Fondateurs', cls: 'text-amber border-amber/20 bg-amber/10' },
                public:     { icon: <Globe size={10} />,     label: 'Public',     cls: 'text-green border-green/20 bg-green/10' },
              }
              const v = VIS[e.visibilite] || null
              if (!v) return null
              return (
                <span className={`inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-full border font-medium ${v.cls}`}>
                  {v.icon} {v.label}
                </span>
              )
            })()}
          </div>

          {/* Date/heure */}
          <div className="space-y-1.5">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide">Date & Heure</p>
            <div className="flex items-start gap-2 text-sm text-text-secondary">
              <Clock size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
              <div>
                <p>{new Date(e.date_debut).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-text-muted">
                  {new Date(e.date_debut).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                  {e.date_fin && ` → ${new Date(e.date_fin).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}`}
                  {e.fuseau_horaire && e.fuseau_horaire !== 'Africa/Dakar' && ` (${e.fuseau_horaire})`}
                </p>
              </div>
            </div>
          </div>

          {/* Récurrence */}
          {e.recurrence && e.recurrence !== 'aucune' && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <RefreshCw size={13} />
              <span>{RECURRENCE_LABELS[e.recurrence] || e.recurrence}</span>
            </div>
          )}

          {/* Lieu / En ligne */}
          {(e.lieu || e.est_en_ligne) && (
            <div className="space-y-1.5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide">Lieu</p>
              {e.lieu && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin size={14} className="flex-shrink-0 text-text-muted" />
                  <span>{e.lieu}</span>
                </div>
              )}
              {e.est_en_ligne && (
                <div className="flex items-center gap-2">
                  <Video size={14} className="flex-shrink-0 text-blue" />
                  <span className="text-xs text-blue">Événement en ligne</span>
                  {e.lien_reunion && (
                    <a href={e.lien_reunion} target="_blank" rel="noreferrer"
                      className="ml-auto flex items-center gap-1 text-2xs text-blue hover:underline">
                      <Link2 size={10} />Rejoindre
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Projet / Client */}
          {(e.projet_id || e.client_nom) && (
            <div className="space-y-1.5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide">Contexte</p>
              <div className="space-y-1">
                {e.projet_id && projets.find(p => p.id === e.projet_id) && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Globe size={12} className="text-purple flex-shrink-0" />
                    <span className="text-purple/90">Projet : {projets.find(p => p.id === e.projet_id)!.titre}</span>
                  </div>
                )}
                {e.client_nom && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Globe size={12} className="text-blue flex-shrink-0" />
                    <span className="text-text-secondary">Client : {e.client_nom}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {e.description && (
            <div className="space-y-1.5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide">Description</p>
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{e.description}</p>
            </div>
          )}

          {/* Pièces jointes */}
          {e.pieces_jointes && e.pieces_jointes.length > 0 && (
            <PiecesJointesDrawer pieces={e.pieces_jointes} />
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide">
                Participants ({participants.length})
              </p>
              <div className="space-y-1.5">
                {participants.map((p, i) => {
                  const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                  return (
                    <div key={i} className="flex items-center gap-2.5 py-1">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-2xs font-semibold text-text-secondary flex-shrink-0 relative">
                        {p.prenom[0]}{p.nom[0]}
                        {/* Statut badge */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background-DEFAULT flex items-center justify-center ${cfg.dot}`}>
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary font-medium truncate">{p.prenom} {p.nom}</p>
                        <p className={`text-2xs ${p.statut === 'accepte' ? 'text-green' : p.statut === 'refuse' ? 'text-red' : 'text-text-muted'}`}>
                          {cfg.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── PiecesJointesDrawer ───────────────────────────────────────
function PiecesJointesDrawer({ pieces }: { pieces: PieceJointe[] }) {
  const supabase = createClient()

  async function download(pj: PieceJointe) {
    await downloadFromStorage(supabase, 'calendrier', pj.url_stockage, pj.nom, 300)
  }

  return (
    <div className="space-y-2">
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
        <Paperclip size={11} /> Pièces jointes ({pieces.length})
      </p>
      <div className="space-y-1.5">
        {pieces.map((pj, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background-elevated border border-slate-800 group">
            <span className="flex-shrink-0">{fileIcon(pj.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary font-medium truncate">{pj.nom}</p>
              <p className="text-2xs text-text-muted">{formatBytes(pj.taille)}</p>
            </div>
            <button
              onClick={() => download(pj)}
              className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-blue transition-colors opacity-0 group-hover:opacity-100"
              title="Télécharger"
            >
              <Download size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── EvenementModal (création + modification) ──────────────────
// ══════════════════════════════════════════════════════════════
function EvenementModal({
  entiteId, dateInitiale, projets, clients, membres, evenement, onClose, onSuccess,
}: {
  entiteId: string
  dateInitiale: Date | null
  projets: Projet[]
  clients: Client[]
  membres: Membre[]
  evenement: Evenement | null
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!evenement
  const localTZ = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'Africa/Dakar'

  const toLocalDatetime = (iso?: string) => {
    if (!iso) return ''
    // Keep as is for datetime-local (strip timezone)
    return iso.substring(0, 16)
  }

  const defaultDate = evenement
    ? toLocalDatetime(evenement.date_debut)
    : (dateInitiale || new Date()).toISOString().substring(0, 16)

  const [form, setForm] = useState({
    titre:          evenement?.titre || '',
    type:           evenement?.type || 'reunion',
    date_debut:     defaultDate,
    date_fin:       toLocalDatetime(evenement?.date_fin),
    lieu:           evenement?.lieu || '',
    est_en_ligne:   evenement?.est_en_ligne ?? false,
    lien_reunion:   evenement?.lien_reunion || '',
    description:    evenement?.description || '',
    recurrence:     evenement?.recurrence || 'aucune',
    fuseau_horaire: evenement?.fuseau_horaire || localTZ,
    projet_id:      evenement?.projet_id || '',
    client_id:      evenement?.client_id || '',
    visibilite:     evenement?.visibilite || 'equipe',
  })
  const [participants, setParticipants] = useState<Participant[]>(
    Array.isArray(evenement?.participants) ? evenement.participants : []
  )
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingPJs,  setExistingPJs]  = useState<PieceJointe[]>(
    Array.isArray(evenement?.pieces_jointes) ? evenement.pieces_jointes : []
  )
  const supabase = createClient()

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function addFiles(files: FileList | null) {
    if (!files) return
    setPendingFiles(prev => [...prev, ...Array.from(files)])
  }

  function removePending(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function removeExisting(idx: number) {
    setExistingPJs(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleParticipant(m: Membre) {
    setParticipants(prev =>
      prev.some(p => p.user_id === m.id)
        ? prev.filter(p => p.user_id !== m.id)
        : [...prev, { user_id: m.id, prenom: m.prenom, nom: m.nom, statut: 'en_attente' }]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre.trim()) return
    setSaving(true); setError('')

    // Upload pending files
    const uploadedPJs: PieceJointe[] = []
    for (const file of pendingFiles) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')
      const path = `${entiteId}/${Date.now()}-${safeName}`
      const { storedPath, error: upErr } = await uploadToStorage(supabase, 'calendrier', path, file)
      if (!upErr) {
        uploadedPJs.push({ nom: file.name, url_stockage: storedPath, taille: file.size, type: file.type })
      }
    }

    const allPJs = [...existingPJs, ...uploadedPJs]

    const selectedClient = clients.find(c => c.id === form.client_id)

    const payload = {
      entite_id:       entiteId || null,
      titre:           form.titre.trim(),
      type:            form.type,
      date_debut:      form.date_debut,
      date_fin:        form.date_fin || null,
      lieu:            form.lieu.trim() || null,
      est_en_ligne:    form.est_en_ligne,
      lien_reunion:    form.lien_reunion.trim() || null,
      description:     form.description.trim() || null,
      couleur:         TYPE_COULEURS[form.type] || null,
      recurrence:      form.recurrence,
      fuseau_horaire:  form.fuseau_horaire,
      projet_id:       form.projet_id || null,
      client_id:       form.client_id || null,
      client_nom:      selectedClient?.nom_entreprise || null,
      visibilite:      form.visibilite,
      pieces_jointes:  JSON.stringify(allPJs),
      participants:    JSON.stringify(participants),
    }

    let err = null
    if (isEdit) {
      const { error: updErr } = await supabase
        .from('evenements_calendrier').update(payload).eq('id', evenement!.id)
      err = updErr
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authUser!.id).single()
      const { error: insErr } = await supabase.from('evenements_calendrier').insert({
        ...payload,
        created_by:   userData!.id,
      })
      err = insErr
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
  }

  const inputCls = "w-full bg-background-elevated border border-slate-800 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue/50 transition-colors"
  const selectCls = inputCls

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Titre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Titre *</label>
            <input
              type="text" className={inputCls} value={form.titre} required autoFocus
              onChange={e => set('titre', e.target.value)}
              placeholder="Nom de l'événement"
            />
          </div>

          {/* Type + Récurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Type</label>
              <select className={selectCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Répétition</label>
              <select className={selectCls} value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Date début + Fuseau */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Date & heure de début</label>
            <div className="flex gap-2">
              <input
                type="datetime-local" className={inputCls + ' flex-1'} value={form.date_debut} required
                onChange={e => set('date_debut', e.target.value)}
              />
              <select
                className="bg-background-elevated border border-slate-800 rounded-lg px-2 py-2 text-xs text-text-muted focus:outline-none focus:border-blue/50 transition-colors flex-shrink-0 max-w-[130px]"
                value={form.fuseau_horaire}
                onChange={e => set('fuseau_horaire', e.target.value)}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Date fin + Lieu */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Date de fin</label>
              <input
                type="datetime-local" className={inputCls} value={form.date_fin}
                onChange={e => set('date_fin', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Lieu</label>
              <input
                type="text" className={inputCls} value={form.lieu}
                onChange={e => set('lieu', e.target.value)}
                placeholder="Salle, adresse..."
              />
            </div>
          </div>

          {/* En ligne */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox" className="rounded border-slate-700"
              checked={form.est_en_ligne}
              onChange={e => set('est_en_ligne', e.target.checked)}
            />
            <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors flex items-center gap-1.5">
              <Video size={12} className="text-blue" /> Événement en ligne
            </span>
          </label>
          {form.est_en_ligne && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Lien de réunion</label>
              <input
                type="url" className={inputCls} value={form.lien_reunion}
                onChange={e => set('lien_reunion', e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {/* Contexte : Projet + Client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                <Globe size={11} className="text-purple" /> Lier à un projet
              </label>
              <select className={selectCls} value={form.projet_id} onChange={e => set('projet_id', e.target.value)}>
                <option value="">Aucun projet</option>
                {projets.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                <Globe size={11} className="text-blue" /> Lier à un client
              </label>
              <select className={selectCls} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">Aucun client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom_entreprise}</option>)}
              </select>
            </div>
          </div>

          {/* Visibilité */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Eye size={11} /> Visibilité & Diffusion
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'prive',      icon: <Lock size={14} />,      label: 'Privé',       desc: 'Visible uniquement par vous' },
                { value: 'equipe',     icon: <Users2 size={14} />,    label: 'Équipe',      desc: "Toute l'équipe peut consulter" },
                { value: 'fondateurs', icon: <Building2 size={14} />, label: 'Fondateurs',  desc: 'Réservé aux fondateurs' },
                { value: 'public',     icon: <Globe size={14} />,     label: 'Public',      desc: 'Accessible à tous les collaborateurs' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('visibilite', opt.value)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    form.visibilite === opt.value
                      ? 'border-blue bg-blue/10 text-blue'
                      : 'border-slate-800 bg-background-elevated text-text-muted hover:border-slate-600 hover:text-text-secondary'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">{opt.icon}</span>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                    <p className="text-2xs opacity-70 mt-0.5 leading-tight">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Users2 size={11} /> Participants
            </label>
            <p className="text-2xs text-text-muted/70">
              Les membres sélectionnés verront cet événement dans leur propre interface.
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-800 bg-background-elevated p-2">
              {membres.length === 0 ? (
                <p className="text-2xs text-text-muted px-1 py-1">Aucun membre disponible</p>
              ) : (
                membres.map(m => (
                  <label key={m.id} className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-slate-700"
                      checked={participants.some(p => p.user_id === m.id)}
                      onChange={() => toggleParticipant(m)}
                    />
                    <span className="text-xs text-text-secondary">{m.prenom} {m.nom}</span>
                    <span className="text-2xs text-text-muted/60 capitalize ml-auto">{m.role.replace('_', ' ')}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Description</label>
            <textarea
              className={inputCls + ' resize-none h-20'}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Notes, ordre du jour..."
            />
          </div>

          {/* Pièces jointes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <Paperclip size={11} /> Pièces jointes
            </label>

            {/* Existing attachments (edit mode) */}
            {existingPJs.length > 0 && (
              <div className="space-y-1">
                {existingPJs.map((pj, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background-elevated border border-slate-800">
                    <span className="flex-shrink-0">{fileIcon(pj.type)}</span>
                    <span className="flex-1 text-xs text-text-primary truncate">{pj.nom}</span>
                    <span className="text-2xs text-text-muted flex-shrink-0">{formatBytes(pj.taille)}</span>
                    <button
                      type="button"
                      onClick={() => removeExisting(i)}
                      className="p-0.5 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors flex-shrink-0"
                      title="Supprimer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending files to upload */}
            {pendingFiles.length > 0 && (
              <div className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue/5 border border-blue/20">
                    <span className="flex-shrink-0">{fileIcon(f.type)}</span>
                    <span className="flex-1 text-xs text-text-primary truncate">{f.name}</span>
                    <span className="text-2xs text-text-muted flex-shrink-0">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="p-0.5 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors flex-shrink-0"
                      title="Retirer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone / browse */}
            <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-blue/40 hover:bg-blue/5 cursor-pointer transition-colors group">
              <Paperclip size={13} className="text-text-muted group-hover:text-blue transition-colors" />
              <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">
                Ajouter des fichiers
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </label>
          </div>

          {error && <p className="text-xs text-red">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
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
import { Badge, RoleBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { cn, formatDate, formatRelativeTime, initiales } from '@/aurantir-front-kit/lib/utils'
import type { User } from '@/aurantir-front-kit/types/database.types'
import { AssignProjetsModal, AssignDocumentsModal } from '@/aurantir-front-kit/components/shared/AssignResourceModals'
import { ActionsMenu } from '@/aurantir-front-kit/components/shared/ActionsMenu'
import { InviteMemberModal } from '@/aurantir-front-kit/components/shared/InviteMemberModal'
import {
  memberStatusMenuItems, MemberStatusActionModal, DeleteMemberModal,
  type StatusAction,
} from '@/aurantir-front-kit/components/shared/MemberStatusActions'
import {
  Plus, Search, Shield, Crown, Laptop, Smartphone, Monitor, Tablet,
  X, MapPin, Clock, Loader2, RefreshCw, Globe, Cpu, Archive,
  FolderPlus, FileText, Receipt,
} from 'lucide-react'

const ICON_STROKE = 1.5

interface SessionSummary {
  session_count: number
  last_seen_at:  string
  last_ua:       string | null
}

interface UserSession {
  id:           string
  session_id:   string
  ip_address:   string | null
  user_agent:   string | null
  city:         string | null
  country:      string | null
  last_seen_at: string
  created_at:   string
}

// ── Helpers ────────────────────────────────────────────────────
interface ParsedUA {
  label:          string
  isMobile:       boolean
  browser:        string
  browserVersion: string
  os:             string
  osVersion:      string
  deviceType:     'mobile' | 'tablet' | 'desktop'
}

function parseUA(ua: string | null): ParsedUA {
  const unknown: ParsedUA = { label: 'Appareil inconnu', isMobile: false, browser: 'Inconnu', browserVersion: '', os: 'Inconnu', osVersion: '', deviceType: 'desktop' }
  if (!ua) return unknown

  const isMobile = /Mobi|Android/i.test(ua) && !/iPad/i.test(ua)
  const isTablet = /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))
  const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  let browser = 'Navigateur', browserVersion = ''
  const edgeM    = ua.match(/Edg\/(\d+)/)
  const firefoxM = ua.match(/Firefox\/(\d+)/)
  const chromeM  = ua.match(/Chrome\/(\d+)/)
  const safariM  = ua.match(/Version\/(\d+)[^)]*Safari/)
  if (edgeM)                                    { browser = 'Edge';    browserVersion = edgeM[1] }
  else if (firefoxM)                            { browser = 'Firefox'; browserVersion = firefoxM[1] }
  else if (chromeM && !/Chromium/.test(ua))     { browser = 'Chrome';  browserVersion = chromeM[1] }
  else if (safariM)                             { browser = 'Safari';  browserVersion = safariM[1] }
  else if (/Safari/.test(ua))                   { browser = 'Safari' }

  let os = '', osVersion = ''
  const iphoneM  = ua.match(/iPhone OS ([\d_]+)/)
  const ipadM    = ua.match(/iPad.*OS ([\d_]+)/)
  const androidM = ua.match(/Android ([\d.]+)/)
  const winM     = ua.match(/Windows NT ([\d.]+)/)
  const macM     = ua.match(/Mac OS X ([\d_]+)/)
  const ntMap: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }
  if (iphoneM)       { os = 'iOS';     osVersion = iphoneM[1].replace(/_/g, '.') }
  else if (ipadM)    { os = 'iPadOS';  osVersion = ipadM[1].replace(/_/g, '.') }
  else if (androidM) { os = 'Android'; osVersion = androidM[1] }
  else if (winM)     { os = 'Windows'; osVersion = ntMap[winM[1]] || winM[1] }
  else if (macM)     { os = 'macOS';   osVersion = macM[1].replace(/_/g, '.') }
  else if (/Linux/.test(ua)) { os = 'Linux' }

  const bLabel = browser + (browserVersion ? ` ${browserVersion}` : '')
  const oLabel = os      + (osVersion      ? ` ${osVersion}`      : '')
  const label  = os ? `${bLabel} — ${oLabel}` : bLabel

  return { label, isMobile: isMobile || isTablet, browser, browserVersion, os, osVersion, deviceType }
}

function isOnline(lastSeen: string | undefined | null): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000
}

// ══════════════════════════════════════════════════════════════
// ── Page principale ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function MembresAdminPage() {
  const { user: currentUser } = useAppStore()
  const [membres,          setMembres]          = useState<User[]>([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [showActionModal,  setShowActionModal]  = useState<StatusAction | null>(null)
  const [showDeleteModal,        setShowDeleteModal]        = useState<User | null>(null)
  const [showInviteModal,        setShowInviteModal]        = useState(false)
  const [showAssignProjetsModal, setShowAssignProjetsModal] = useState<User | null>(null)
  const [showAssignDevisModal, setShowAssignDevisModal] = useState<User | null>(null)
  const [showAssignFacturesModal, setShowAssignFacturesModal] = useState<User | null>(null)
  const [showArchives, setShowArchives] = useState(false)

  // ── Sessions state ────────────────────────────────────────
  const [sessionsSummary,  setSessionsSummary]  = useState<Map<string, SessionSummary>>(new Map())
  const [sessionsDrawer,   setSessionsDrawer]   = useState<{ membre: User; sessions: UserSession[] } | null>(null)
  const [loadingDrawerFor, setLoadingDrawerFor] = useState<string | null>(null)
  const [onlineUsers,      setOnlineUsers]      = useState<{ id: string; prenom: string; nom: string; role: string; last_seen_at: string }[]>([])

  const supabase    = createClient()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const canViewSessions = isSuperAdmin || currentUser?.role === 'fondateur'

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    loadMembres()
    if (canViewSessions) loadSessionsSummary()
    loadOnlineUsers()
    const interval = setInterval(loadOnlineUsers, 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOnlineUsers() {
    const { data } = await supabase.rpc('get_online_users')
    if (data) setOnlineUsers(data as { id: string; prenom: string; nom: string; role: string; last_seen_at: string }[])
  }

  async function loadMembres() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, entite_principale:entites_legales(nom, couleur)')
      .order('role')
      .order('prenom')
    setMembres((data || []) as User[])
    setLoading(false)
  }

  async function loadSessionsSummary() {
    const { data } = await supabase.rpc('admin_sessions_summary')
    if (!data) return
    const map = new Map<string, SessionSummary>()
    // Clé = public.users.id (toujours présent, pas besoin de auth_user_id)
    ;(data as { public_user_id: string; session_count: number; last_seen_at: string; last_user_agent: string | null }[])
      .forEach(row => {
        map.set(row.public_user_id, {
          session_count: row.session_count,
          last_seen_at:  row.last_seen_at,
          last_ua:       row.last_user_agent,
        })
      })
    setSessionsSummary(map)
  }

  async function openSessionsDrawer(membre: User) {
    setLoadingDrawerFor(membre.id)
    const { data } = await supabase.rpc('admin_get_user_sessions', { p_user_id: membre.id })
    setLoadingDrawerFor(null)
    setSessionsDrawer({ membre, sessions: (data as UserSession[]) ?? [] })
  }

  async function refreshSessionsDrawer(membre: User) {
    const { data } = await supabase.rpc('admin_get_user_sessions', { p_user_id: membre.id })
    setSessionsDrawer({ membre, sessions: (data as UserSession[]) ?? [] })
  }

  const membresVisibles = membres.filter(m => !m.email.endsWith('@deleted.local'))
  const nbArchives = membresVisibles.filter(m => m.statut === 'inactif').length

  const membresFiltres = membresVisibles
    .filter(m => showArchives ? m.statut === 'inactif' : m.statut !== 'inactif')
    .filter(m =>
      !search ||
      m.prenom.toLowerCase().includes(search.toLowerCase()) ||
      m.nom?.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    )

  const statsRoles = {
    super_admin: membresVisibles.filter(m => m.role === 'super_admin').length,
    fondateur:   membresVisibles.filter(m => m.role === 'fondateur').length,
    manager:     membresVisibles.filter(m => m.role === 'manager').length,
    employe:     membresVisibles.filter(m => m.role === 'employe_interne').length,
    actifs:      membresVisibles.filter(m => m.statut === 'actif').length,
    suspendus:   membresVisibles.filter(m => m.statut === 'bloque').length,
    revoques:    membresVisibles.filter(m => m.statut === 'revoque').length,
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield size={20} className="text-violet" />
            Gestion des membres
          </h1>
          <p className="page-subtitle">{membresVisibles.length} compte{membresVisibles.length !== 1 ? 's' : ''} enregistré{membresVisibles.length !== 1 ? 's' : ''}</p>
        </div>
        {isSuperAdmin && (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowInviteModal(true)}>
            Inviter un membre
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'Super Admin', count: statsRoles.super_admin, color: '#8B5CF6' },
          { label: 'Fondateurs',  count: statsRoles.fondateur,   color: '#3B82F6' },
          { label: 'Managers',    count: statsRoles.manager,     color: '#10B981' },
          { label: 'Employés',    count: statsRoles.employe,     color: '#6B7280' },
          { label: 'Actifs',      count: statsRoles.actifs,      color: '#10B981' },
          { label: 'Suspendus',   count: statsRoles.suspendus,   color: '#F59E0B' },
          { label: 'Révoqués',    count: statsRoles.revoques,    color: '#EF4444' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-2xs text-text-muted mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* En ligne */}
      {canViewSessions && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-surface-border/50 bg-surface/40">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {onlineUsers.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineUsers.length > 0 ? 'bg-green' : 'bg-text-disabled'}`} />
          </span>
          <span className="text-2xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">
            En ligne
          </span>

          {onlineUsers.length === 0 ? (
            <span className="text-2xs text-text-disabled">Aucun membre actif récemment</span>
          ) : (
            <div className="flex items-center -space-x-2">
              {onlineUsers.slice(0, 8).map(u => {
                const diff = Math.floor((Date.now() - new Date(u.last_seen_at).getTime()) / 1000)
                const label = diff < 60 ? 'à l\'instant' : diff < 120 ? 'il y a 1 min' : `il y a ${Math.floor(diff / 60)} min`
                return (
                  <div key={u.id} title={`${u.prenom} ${u.nom} · ${label}`} className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold ring-2 ring-background ${
                    u.role === 'super_admin' ? 'bg-violet/20 text-violet' :
                    u.role === 'fondateur'   ? 'bg-blue/20 text-blue' :
                    'bg-surface text-text-secondary'
                  }`}>
                    {u.prenom?.[0]?.toUpperCase()}
                  </div>
                )
              })}
            </div>
          )}

          <span className="ml-auto text-2xs text-text-muted whitespace-nowrap">
            {onlineUsers.length} connecté{onlineUsers.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8"
          />
        </div>
        <button
          onClick={() => setShowArchives(v => !v)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
            showArchives
              ? 'bg-violet/10 text-violet border-violet/30'
              : 'border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-border-hover'
          )}
        >
          <Archive size={13} strokeWidth={ICON_STROKE} />
          Archivés <span className="opacity-60">· {nbArchives}</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table [&_td]:py-3.5 [&_th]:py-2.5">
          <thead>
            <tr>
              <th>Membre</th>
              <th className="hidden md:table-cell">Email</th>
              <th>Rôle</th>
              <th className="hidden lg:table-cell">Entité</th>
              <th>Statut</th>
              <th className="hidden lg:table-cell">Depuis</th>
              <th>Actions</th>
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
              membresFiltres.map((membre) => {
                const isSelf      = membre.id === currentUser?.id
                const isProtected = membre.role === 'super_admin' && isSelf
                const canActOnUser = isSuperAdmin && !isProtected

                const summary  = sessionsSummary.get(membre.id)
                const online   = isOnline(summary?.last_seen_at)
                const { isMobile: lastIsMobile } = parseUA(summary?.last_ua ?? null)

                return (
                  <tr key={membre.id} className={
                    membre.statut === 'revoque' ? 'opacity-50' :
                    membre.statut === 'bloque'  ? 'opacity-70' : ''
                  }>

                    {/* ── Membre ── */}
                    <td>
                      <div className="flex items-center gap-3">
                        {/* Avatar avec indicateur en ligne */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            membre.role === 'super_admin' ? 'bg-violet/20 text-violet' :
                            membre.role === 'fondateur'   ? 'bg-blue/20 text-blue' :
                            'bg-surface text-text-secondary'
                          }`}>
                            {initiales(membre.prenom, membre.nom)}
                          </div>
                          {/* Dot présence */}
                          {isSelf ? (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
                          ) : summary && (
                            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-surface ${
                              online ? 'bg-emerald-400' : 'bg-slate-600'
                            }`} />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-medium text-text-primary">
                            {membre.prenom} {membre.nom}
                            {isSelf && <span className="ml-1 text-2xs text-text-muted">(vous)</span>}
                          </p>
                          {membre.role === 'super_admin' && (
                            <div className="flex items-center gap-1">
                              <Crown size={10} className="text-violet" />
                              <span className="text-2xs text-violet">Admin</span>
                            </div>
                          )}
                          {/* Sessions summary inline */}
                          {summary && canViewSessions && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {lastIsMobile
                                ? <Smartphone size={10} className="text-text-disabled" />
                                : <Laptop     size={10} className="text-text-disabled" />
                              }
                              <span className={`text-2xs ${online ? 'text-emerald-400' : 'text-text-disabled'}`}>
                                {online
                                  ? 'En ligne'
                                  : `Vu ${formatRelativeTime(summary.last_seen_at)}`
                                }
                              </span>
                              {summary.session_count > 1 && (
                                <span className="text-2xs text-text-disabled">
                                  · {summary.session_count} appareils
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="hidden md:table-cell text-xs text-text-muted">{membre.email}</td>
                    <td><RoleBadge role={membre.role} size="sm" /></td>
                    <td className="hidden lg:table-cell text-xs text-text-muted">
                      {(membre as any).entite_principale?.nom || '—'}
                    </td>

                    {/* ── Statut ── */}
                    <td>
                      <Badge
                        size="sm"
                        variant={
                          membre.statut === 'actif'    ? 'green' :
                          membre.statut === 'revoque'  ? 'red'   :
                          membre.statut === 'bloque'   ? 'amber' : 'gray'
                        }
                        dot
                      >
                        {membre.statut === 'actif'   ? 'Actif'    :
                         membre.statut === 'revoque' ? 'Révoqué'  :
                         membre.statut === 'bloque'  ? 'Suspendu' : 'Inactif'}
                      </Badge>
                    </td>

                    <td className="hidden lg:table-cell text-xs text-text-muted">
                      {formatDate(membre.created_at)}
                    </td>

                    {/* ── Actions ── */}
                    <td>
                      {isProtected ? (
                        <div className="flex items-center gap-1 text-xs text-violet">
                          <Shield size={12} strokeWidth={ICON_STROKE} /><span>Protégé</span>
                        </div>
                      ) : (
                        <ActionsMenu items={[
                          // Sessions & appareils
                          ...(canViewSessions && membre.auth_user_id ? [{
                            label: 'Sessions & appareils',
                            icon: loadingDrawerFor === membre.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Monitor size={13} strokeWidth={ICON_STROKE} />,
                            onClick: () => openSessionsDrawer(membre),
                          }] : []),
                          // Assignation projets — fondateurs/admin pour les rôles non-fondateurs
                          ...((currentUser?.role === 'fondateur' || isSuperAdmin) &&
                            (membre.role === 'client_externe' || membre.role === 'prestataire' || membre.role === 'manager' || membre.role === 'employe_interne' || membre.role === 'invite_lecture') ? [{
                            label: 'Assigner des projets',
                            icon: <FolderPlus size={13} strokeWidth={ICON_STROKE} />,
                            onClick: () => setShowAssignProjetsModal(membre),
                          }] : []),
                          // Assignation devis/factures — réservés aux clients externes
                          ...((currentUser?.role === 'fondateur' || isSuperAdmin) && membre.role === 'client_externe' ? [{
                            label: 'Assigner des devis',
                            icon: <FileText size={13} strokeWidth={ICON_STROKE} />,
                            onClick: () => setShowAssignDevisModal(membre),
                          }, {
                            label: 'Assigner des factures',
                            icon: <Receipt size={13} strokeWidth={ICON_STROKE} />,
                            onClick: () => setShowAssignFacturesModal(membre),
                          }] : []),
                          // Statut du compte (suspendre / révoquer / réactiver / archiver / supprimer)
                          ...memberStatusMenuItems(membre, canActOnUser, setShowActionModal, setShowDeleteModal),
                        ]} />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Drawer sessions ─────────────────────────────────── */}
      {sessionsDrawer && (
        <SessionsDrawer
          membre={sessionsDrawer.membre}
          sessions={sessionsDrawer.sessions}
          onClose={() => setSessionsDrawer(null)}
          onRefresh={() => refreshSessionsDrawer(sessionsDrawer.membre)}
        />
      )}

      {/* ── Modal invitation ─────────────────────────────────── */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); loadMembres() }}
        />
      )}

      {/* ── Modal assignation projets ────────────────────────── */}
      {showAssignProjetsModal && (
        <AssignProjetsModal
          client={showAssignProjetsModal}
          onClose={() => setShowAssignProjetsModal(null)}
        />
      )}

      {/* ── Modal assignation devis ───────────────────────────── */}
      {showAssignDevisModal && (
        <AssignDocumentsModal
          client={showAssignDevisModal}
          typeDocument="devis"
          onClose={() => setShowAssignDevisModal(null)}
        />
      )}

      {/* ── Modal assignation factures ────────────────────────── */}
      {showAssignFacturesModal && (
        <AssignDocumentsModal
          client={showAssignFacturesModal}
          typeDocument="facture"
          onClose={() => setShowAssignFacturesModal(null)}
        />
      )}

      {/* ── Modal action (suspendre / révoquer / réactiver / archiver) ── */}
      {showActionModal && currentUser && (
        <MemberStatusActionModal
          statusAction={showActionModal}
          currentUserId={currentUser.id}
          onClose={() => setShowActionModal(null)}
          onSuccess={() => { setShowActionModal(null); loadMembres() }}
        />
      )}

      {/* ── Modal suppression définitive ──────────────────────── */}
      {showDeleteModal && (
        <DeleteMemberModal
          membre={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onSuccess={() => { setShowDeleteModal(null); loadMembres() }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── SessionsDrawer ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function SessionsDrawer({
  membre,
  sessions,
  onClose,
  onRefresh,
}: {
  membre:    User
  sessions:  UserSession[]
  onClose:   () => void
  onRefresh: () => Promise<void>
}) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface border-l border-surface-border flex flex-col shadow-2xl animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              membre.role === 'super_admin' ? 'bg-violet/20 text-violet' :
              membre.role === 'fondateur'   ? 'bg-blue/20 text-blue'   :
              'bg-surface-hover text-text-secondary'
            }`}>
              {initiales(membre.prenom, membre.nom)}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary leading-tight">{membre.prenom} {membre.nom}</p>
              <p className="text-2xs text-text-muted">{membre.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sub-header */}
        <div className="px-5 pt-3 pb-3 border-b border-surface-border flex-shrink-0 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Monitor size={13} />Appareils connectés
          </h3>
          <span className="text-2xs bg-surface-hover text-text-muted px-2 py-0.5 rounded-full">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center">
                <Monitor size={24} className="text-text-muted opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Aucune session enregistrée</p>
                <p className="text-xs text-text-muted mt-1 max-w-[220px]">Utilisez le bouton actualiser ↑ pour recharger.</p>
              </div>
            </div>
          ) : (
            sessions.map((s, idx) => {
              const ua       = parseUA(s.user_agent)
              const online   = isOnline(s.last_seen_at)
              const location = [s.city, s.country].filter(Boolean).join(', ')

              const DeviceIcon = ua.deviceType === 'mobile' ? Smartphone
                               : ua.deviceType === 'tablet' ? Tablet
                               : Laptop

              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 space-y-3 ${
                    online ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-background-elevated border-surface-border'
                  }`}
                >
                  {/* Device header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      online ? 'bg-emerald-900/30 text-emerald-400' : 'bg-surface text-text-muted'
                    }`}>
                      <DeviceIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-text-primary">
                          {ua.browser}{ua.browserVersion ? ` ${ua.browserVersion}` : ''}
                        </p>
                        {idx === 0 && online && (
                          <span className="inline-flex items-center gap-1 text-2xs font-medium text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            En ligne
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-text-muted mt-0.5">
                        {ua.os}{ua.osVersion ? ` ${ua.osVersion}` : ''} · {
                          ua.deviceType === 'mobile' ? 'Mobile' :
                          ua.deviceType === 'tablet' ? 'Tablette' : 'Ordinateur'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {s.ip_address && (
                      <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-surface">
                        <Globe size={11} className="text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-2xs text-text-disabled">Adresse IP</p>
                          <p className="text-xs font-mono text-text-primary truncate">{s.ip_address}</p>
                        </div>
                      </div>
                    )}
                    {location && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-surface">
                        <MapPin size={11} className="text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-2xs text-text-disabled">Localisation</p>
                          <p className="text-xs text-text-primary truncate">{location}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface">
                      <Clock size={11} className="text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-2xs text-text-disabled">Dernière activité</p>
                        <p className="text-xs text-text-primary truncate">
                          {online ? 'Actif maintenant' : formatRelativeTime(s.last_seen_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface">
                      <Cpu size={11} className="text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-2xs text-text-disabled">Première connexion</p>
                        <p className="text-xs text-text-primary truncate">{formatDate(s.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Raw UA collapsible */}
                  {s.user_agent && (
                    <details className="group">
                      <summary className="text-2xs text-text-disabled cursor-pointer select-none hover:text-text-muted list-none flex items-center gap-1">
                        <span className="group-open:hidden">▶</span>
                        <span className="hidden group-open:inline">▼</span>
                        User-Agent brut
                      </summary>
                      <p className="mt-1.5 text-2xs font-mono text-text-disabled break-all leading-relaxed bg-surface p-2 rounded-lg">
                        {s.user_agent}
                      </p>
                    </details>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-surface-border flex-shrink-0">
          <p className="text-2xs text-text-disabled text-center">Sessions mises à jour toutes les 5 min · Cliquez ↻ pour actualiser</p>
        </div>
      </div>
    </div>
  )
}
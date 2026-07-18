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
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import {
  Shield, AlertTriangle, Activity, RefreshCw,
  Monitor, Globe, CheckCircle, XCircle, Smartphone, Laptop, LogOut,
  ChevronLeft, ChevronRight, History, User,
} from 'lucide-react'

interface AuditEntry {
  id: string
  acteur_id?: string
  acteur_label?: string
  action: string
  module?: string
  entite_type?: string
  entite_id?: string
  valeur_avant?: Record<string, unknown>
  valeur_apres?: Record<string, unknown>
  ip?: string
  created_at: string
  acteur?: { prenom: string; nom: string; role: string }
}

interface Incident {
  id: string
  titre: string
  description?: string
  type?: string
  type_incident?: string
  severite?: 'critique' | 'haute' | 'moyenne' | 'basse'
  priorite?: string
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'ferme'
  ip_source?: string
  auto_detected?: boolean
  created_at: string
  resolu_at?: string
}

interface SessionInfo {
  id: string
  session_id: string
  user_public_id: string
  user_prenom: string
  user_nom: string
  user_email: string
  user_role: string
  ip_address?: string
  city?: string
  country?: string
  region?: string
  district?: string
  zip?: string
  lat?: number
  lon?: number
  isp?: string
  timezone?: string
  user_agent?: string
  last_seen_at?: string
  created_at: string
}

interface SessionHistEntry {
  id: string
  user_prenom: string
  user_nom: string
  user_email: string
  session_id: string
  ip_address?: string
  user_agent?: string
  city?: string
  country?: string
  region?: string
  started_at?: string
  ended_at: string
  end_reason: string
}

function parseUA(ua?: string): { browser: string; os: string; device: 'mobile' | 'tablet' | 'desktop' } {
  if (!ua) return { browser: '—', os: '—', device: 'desktop' }
  const isMobile = /Mobile|Android|iPhone/i.test(ua)
  const isTablet = /iPad|Tablet/i.test(ua)
  const browser =
    /Edg\//i.test(ua) ? 'Edge' :
    /OPR\//i.test(ua) ? 'Opera' :
    /Chrome\//i.test(ua) ? 'Chrome' :
    /Firefox\//i.test(ua) ? 'Firefox' :
    /Safari\//i.test(ua) ? 'Safari' : 'Autre'
  const os =
    /Windows NT/i.test(ua) ? 'Windows' :
    /Mac OS X/i.test(ua) ? 'macOS' :
    /Android/i.test(ua) ? 'Android' :
    /iPhone|iPad/i.test(ua) ? 'iOS' :
    /Linux/i.test(ua) ? 'Linux' : '—'
  return { browser, os, device: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop' }
}

const REASON_LABEL: Record<string, { label: string; cls: string }> = {
  revoked_by_admin: { label: 'Révoqué admin', cls: 'text-red bg-red/5 border-red/20' },
  revoked_by_user:  { label: 'Déconnexion',   cls: 'text-blue bg-blue/5 border-blue/20' },
  logout:           { label: 'Déconnexion',   cls: 'text-blue bg-blue/5 border-blue/20' },
  expired:          { label: 'Expiré',         cls: 'text-amber bg-amber/5 border-amber/20' },
  unknown:          { label: 'Inconnue',       cls: 'text-text-muted bg-surface border-surface-border' },
}

const SEVERITE_CONFIG = {
  critique: { label: 'Critique', className: 'bg-red/10 text-red border-red/20' },
  haute:    { label: 'Haute',    className: 'bg-amber/10 text-amber border-amber/20' },
  moyenne:  { label: 'Moyenne',  className: 'bg-blue/10 text-blue border-blue/20' },
  basse:    { label: 'Basse',    className: 'bg-surface text-text-muted border-surface-border' },
}

export default function SecuritePage() {
  const [audits, setAudits]         = useState<AuditEntry[]>([])
  const [incidents, setIncidents]   = useState<Incident[]>([])
  const [sessions, setSessions]     = useState<SessionInfo[]>([])
  const [history, setHistory]       = useState<SessionHistEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [revoking, setRevoking]     = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<'audit' | 'sessions' | 'historique' | 'incidents'>('audit')
  const [auditPage, setAuditPage]   = useState(1)
  const [histPage, setHistPage]     = useState(1)
  const AUDIT_PAGE_SIZE = 15
  const HIST_PAGE_SIZE  = 15
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        setCurrentSessionId(payload.session_id ?? null)
      } catch {}
    })
  }, [])

  useEffect(() => { load() }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    if (activeTab === 'audit') {
      const { data } = await supabase
        .from('audit_securite')
        .select('*, acteur:users!acteur_id(prenom, nom, role)')
        .order('created_at', { ascending: false })
        .limit(500)
      setAudits((data || []) as AuditEntry[])
      setAuditPage(1)
    } else if (activeTab === 'incidents') {
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      setIncidents((data || []) as Incident[])
    } else if (activeTab === 'sessions') {
      const { data } = await supabase.rpc('admin_get_all_sessions')
      setSessions((data || []) as SessionInfo[])
    } else if (activeTab === 'historique') {
      const { data } = await supabase.rpc('admin_get_session_history', { p_limit: 300 })
      setHistory((data || []) as SessionHistEntry[])
      setHistPage(1)
    }
    setLoading(false)
  }

  async function revokeSession(id: string, email: string) {
    if (!confirm(`Fermer cette session pour ${email} ?`)) return
    setRevoking(id)
    try {
      await fetch('/api/admin/revoke-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {}
    setSessions(prev => prev.filter(s => s.id !== id))
    setRevoking(null)
  }

  // Grouper les sessions par utilisateur
  const userGroups = useMemo(() => {
    const map = new Map<string, { id: string; prenom: string; nom: string; email: string; role: string; sessions: SessionInfo[] }>()
    sessions.forEach(s => {
      const key = s.user_public_id || s.user_email
      if (!map.has(key)) {
        map.set(key, { id: key, prenom: s.user_prenom, nom: s.user_nom, email: s.user_email, role: s.user_role, sessions: [] })
      }
      map.get(key)!.sessions.push(s)
    })
    return Array.from(map.values())
  }, [sessions])

  const incidentsOuverts = incidents.filter(i => i.statut === 'ouvert' || i.statut === 'en_cours').length

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sécurité</h1>
          <p className="page-subtitle">Audit trail, sessions actives et incidents</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Activity size={18} className="text-blue" />
          <div><p className="text-xs text-text-muted">Actions auditées</p><p className="text-xl font-bold text-text-primary">{audits.length}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Monitor size={18} className="text-green" />
          <div><p className="text-xs text-text-muted">Sessions actives</p><p className="text-xl font-bold text-text-primary">{sessions.length}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <History size={18} className="text-violet" />
          <div><p className="text-xs text-text-muted">Sessions archivées</p><p className="text-xl font-bold text-text-primary">{history.length}</p></div>
        </Card>
        <Card className={`p-4 flex items-center gap-3 ${incidentsOuverts > 0 ? 'border-red/20 bg-red/5' : ''}`}>
          <AlertTriangle size={18} className={incidentsOuverts > 0 ? 'text-red' : 'text-text-muted'} />
          <div><p className="text-xs text-text-muted">Incidents ouverts</p><p className={`text-xl font-bold ${incidentsOuverts > 0 ? 'text-red' : 'text-text-primary'}`}>{incidentsOuverts}</p></div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {[
          { key: 'audit',      label: 'Audit Trail',     icon: <Activity  size={13} /> },
          { key: 'sessions',   label: 'Sessions actives', icon: <Monitor   size={13} /> },
          { key: 'historique', label: 'Historique',       icon: <History   size={13} /> },
          { key: 'incidents',  label: 'Incidents',        icon: <AlertTriangle size={13} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-blue text-blue' : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : (
        <>
          {/* ── Audit Trail ── */}
          {activeTab === 'audit' && (() => {
            const totalPages = Math.max(1, Math.ceil(audits.length / AUDIT_PAGE_SIZE))
            const pageAudits = audits.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE)
            const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
            const visiblePages = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - auditPage) <= 1)
            return (
              <div className="space-y-3">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Table</th><th>IP</th></tr>
                    </thead>
                    <tbody>
                      {pageAudits.length === 0
                        ? <tr><td colSpan={5} className="py-8 text-center text-text-muted text-sm">Aucune entrée d&apos;audit</td></tr>
                        : pageAudits.map(a => (
                          <tr key={a.id}>
                            <td className="text-2xs text-text-muted whitespace-nowrap">{formatRelativeTime(a.created_at)}</td>
                            <td className="text-xs text-text-primary">
                              {a.acteur
                                ? `${(a.acteur as any).prenom} ${(a.acteur as any).nom}`
                                : a.acteur_label
                                ? <span className="text-text-muted italic">{a.acteur_label}</span>
                                : '—'}
                            </td>
                            <td>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-mono border ${
                                a.action.includes('DELETE') ? 'text-red border-red/20 bg-red/5'
                                : a.action.includes('INSERT') ? 'text-green border-green/20 bg-green/5'
                                : a.action.includes('UPDATE') ? 'text-blue border-blue/20 bg-blue/5'
                                : 'text-text-muted border-surface-border'
                              }`}>
                                {a.action}
                              </span>
                            </td>
                            <td className="text-2xs font-mono text-text-muted">{a.entite_type || a.module || '—'}</td>
                            <td className="text-2xs font-mono text-text-muted">{a.ip || '—'}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-2xs text-text-muted">
                      {(auditPage - 1) * AUDIT_PAGE_SIZE + 1}–{Math.min(auditPage * AUDIT_PAGE_SIZE, audits.length)} sur {audits.length} entrées
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}
                        className="h-7 w-7 flex items-center justify-center rounded border border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
                        <ChevronLeft size={13} />
                      </button>
                      {visiblePages.map((p, i) => {
                        const prev = visiblePages[i - 1]
                        return (
                          <span key={p} className="flex items-center gap-1">
                            {prev && p - prev > 1 && <span className="text-text-muted text-2xs px-0.5">…</span>}
                            <button onClick={() => setAuditPage(p)}
                              className={`h-7 min-w-[28px] px-2 rounded border text-xs transition-colors ${
                                p === auditPage ? 'border-blue bg-blue/10 text-blue font-medium' : 'border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover'
                              }`}>{p}</button>
                          </span>
                        )
                      })}
                      <button onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))} disabled={auditPage === totalPages}
                        className="h-7 w-7 flex items-center justify-center rounded border border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Sessions actives — groupées par utilisateur ── */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {userGroups.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <Monitor size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune session active</p>
                </div>
              ) : userGroups.map(group => (
                <div key={group.id} className="rounded-xl border border-surface-border overflow-hidden">
                  {/* Header utilisateur */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-hover border-b border-surface-border">
                    <div className="h-8 w-8 rounded-full bg-blue/15 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{group.prenom} {group.nom}</p>
                      <p className="text-2xs text-text-muted">{group.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs px-2 py-0.5 rounded-full border border-surface-border text-text-muted capitalize">{group.role?.replace('_', ' ')}</span>
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20">
                        {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''} active{group.sessions.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Sessions de cet utilisateur */}
                  <div className="divide-y divide-surface-border">
                    {group.sessions.map(s => {
                      const { browser, os, device } = parseUA(s.user_agent)
                      const isCurrentSession = currentSessionId !== null && s.session_id === currentSessionId
                      return (
                        <div key={s.id} className={`flex items-center gap-4 px-4 py-3 ${isCurrentSession ? 'bg-blue/3' : 'hover:bg-surface-hover/50'} transition-colors`}>
                          {/* Appareil */}
                          <div className="flex items-center gap-2 w-32 flex-shrink-0">
                            <div className="text-text-muted">
                              {device === 'mobile' ? <Smartphone size={14} /> : <Laptop size={14} />}
                            </div>
                            <div>
                              <p className="text-xs text-text-primary">{browser}</p>
                              <p className="text-2xs text-text-muted">{os}</p>
                            </div>
                          </div>

                          {/* IP & Localisation */}
                          <div className="flex-1 min-w-0">
                            <p className="text-2xs font-mono text-text-muted">{s.ip_address || '—'}</p>
                            {(s.city || s.country) && (
                              <span className="flex items-center gap-1 text-2xs text-text-muted">
                                <Globe size={10} />
                                {[s.district, s.city, s.region, s.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                            {s.lat && s.lon && (
                              <a href={`https://www.google.com/maps?q=${s.lat},${s.lon}`} target="_blank" rel="noopener noreferrer"
                                className="text-2xs text-blue opacity-60 hover:opacity-100">
                                {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                              </a>
                            )}
                          </div>

                          {/* Temps */}
                          <div className="text-right w-36 flex-shrink-0">
                            <p className="text-2xs text-text-muted">Connecté {formatRelativeTime(s.created_at)}</p>
                            <p className="text-2xs text-text-muted opacity-60">
                              Actif {s.last_seen_at ? formatRelativeTime(s.last_seen_at) : '—'}
                            </p>
                          </div>

                          {/* Badge / Action */}
                          <div className="w-24 flex justify-end flex-shrink-0">
                            {isCurrentSession ? (
                              <span className="flex items-center gap-1.5 text-2xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                </span>
                                Ma session
                              </span>
                            ) : (
                              <button
                                onClick={() => revokeSession(s.id, group.email)}
                                disabled={revoking === s.id}
                                className="flex items-center gap-1 px-2.5 py-1 text-2xs text-red border border-red/20 rounded-lg hover:bg-red/10 transition-colors disabled:opacity-50"
                              >
                                <LogOut size={10} />
                                {revoking === s.id ? '...' : 'Fermer'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Historique des sessions ── */}
          {activeTab === 'historique' && (() => {
            const totalPages = Math.max(1, Math.ceil(history.length / HIST_PAGE_SIZE))
            const pageHist = history.slice((histPage - 1) * HIST_PAGE_SIZE, histPage * HIST_PAGE_SIZE)
            const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
            const visiblePages = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - histPage) <= 1)
            return (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-text-muted">
                    <History size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune session archivée</p>
                    <p className="text-2xs mt-1 opacity-60">Les sessions fermées ou expirées apparaîtront ici</p>
                  </div>
                ) : (
                  <>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Utilisateur</th>
                            <th>Appareil</th>
                            <th>IP · Localisation</th>
                            <th>Début</th>
                            <th>Fin</th>
                            <th>Raison</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageHist.map(h => {
                            const { browser, os, device } = parseUA(h.user_agent)
                            const reason = REASON_LABEL[h.end_reason] || REASON_LABEL.unknown
                            return (
                              <tr key={h.id}>
                                <td>
                                  <p className="text-xs font-medium text-text-primary">{h.user_prenom} {h.user_nom}</p>
                                  <p className="text-2xs text-text-muted">{h.user_email}</p>
                                </td>
                                <td>
                                  <span className="flex items-center gap-1 text-2xs text-text-muted">
                                    {device === 'mobile' ? <Smartphone size={11} /> : <Laptop size={11} />}
                                    {browser} · {os}
                                  </span>
                                </td>
                                <td>
                                  <p className="text-2xs font-mono text-text-muted">{h.ip_address || '—'}</p>
                                  {(h.city || h.country) && (
                                    <span className="flex items-center gap-1 text-2xs text-text-muted">
                                      <Globe size={10} />
                                      {[h.city, h.country].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </td>
                                <td className="text-2xs text-text-muted whitespace-nowrap">
                                  {h.started_at ? formatRelativeTime(h.started_at) : '—'}
                                </td>
                                <td className="text-2xs text-text-muted whitespace-nowrap">
                                  {formatRelativeTime(h.ended_at)}
                                </td>
                                <td>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs border ${reason.cls}`}>
                                    {reason.label}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-1">
                        <p className="text-2xs text-text-muted">
                          {(histPage - 1) * HIST_PAGE_SIZE + 1}–{Math.min(histPage * HIST_PAGE_SIZE, history.length)} sur {history.length} sessions
                        </p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1}
                            className="h-7 w-7 flex items-center justify-center rounded border border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
                            <ChevronLeft size={13} />
                          </button>
                          {visiblePages.map((p, i) => {
                            const prev = visiblePages[i - 1]
                            return (
                              <span key={p} className="flex items-center gap-1">
                                {prev && p - prev > 1 && <span className="text-text-muted text-2xs px-0.5">…</span>}
                                <button onClick={() => setHistPage(p)}
                                  className={`h-7 min-w-[28px] px-2 rounded border text-xs transition-colors ${
                                    p === histPage ? 'border-blue bg-blue/10 text-blue font-medium' : 'border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover'
                                  }`}>{p}</button>
                              </span>
                            )
                          })}
                          <button onClick={() => setHistPage(p => Math.min(totalPages, p + 1))} disabled={histPage === totalPages}
                            className="h-7 w-7 flex items-center justify-center rounded border border-surface-border text-text-muted hover:text-text-primary hover:border-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {/* ── Incidents ── */}
          {activeTab === 'incidents' && (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <Shield size={32} className="mx-auto mb-3 opacity-30 text-green" />
                  <p className="text-sm text-green">Aucun incident — système sécurisé</p>
                </div>
              ) : (
                incidents.map(inc => {
                  const sevKey = (inc.severite || (inc.priorite === 'P0' ? 'critique' : inc.priorite === 'P1' ? 'haute' : inc.priorite === 'P2' ? 'moyenne' : 'basse')) as keyof typeof SEVERITE_CONFIG
                  const sev = SEVERITE_CONFIG[sevKey] || SEVERITE_CONFIG.basse
                  const isCritique = sevKey === 'critique'
                  return (
                    <div key={inc.id} className={`p-4 rounded-xl border flex items-start gap-3 ${isCritique ? 'border-red/20 bg-red/5' : 'bg-surface border-surface-border'}`}>
                      <AlertTriangle size={14} className={isCritique ? 'text-red' : 'text-amber'} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{inc.titre}</p>
                          {inc.auto_detected && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/20">Auto</span>}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium border ${sev.className}`}>{sev.label}</span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${
                            inc.statut === 'resolu' ? 'bg-green/10 text-green border-green/20'
                            : inc.statut === 'en_cours' ? 'bg-blue/10 text-blue border-blue/20'
                            : 'bg-amber/10 text-amber border-amber/20'
                          }`}>{inc.statut}</span>
                        </div>
                        {inc.description && <p className="text-2xs text-text-muted mt-1 line-clamp-2">{inc.description}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-2xs text-text-muted">{formatRelativeTime(inc.created_at)}</p>
                          {inc.ip_source && <p className="text-2xs font-mono text-text-muted opacity-70">{inc.ip_source}</p>}
                        </div>
                      </div>
                      {inc.statut === 'resolu'
                        ? <CheckCircle size={14} className="text-green flex-shrink-0" />
                        : <XCircle size={14} className="text-red flex-shrink-0" />}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
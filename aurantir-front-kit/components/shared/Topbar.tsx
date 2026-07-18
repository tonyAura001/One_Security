'use client'
// ─────────────────────────────────────────────────────────────
// Topbar du kit Aurantir — style à l'identique. Piloté par la session
// PilotePME (useSession/RBAC) + le store thème du kit. Ajoute le sélecteur
// de rôle « Vue démo ». Aucun appel réseau.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/aurantir-front-kit/lib/utils'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Bell, Search, ChevronDown, Moon, Sun, Menu, Check } from 'lucide-react'
import { useSession } from '@/lib/store/session'
import { ROLE_ORDER, ROLES } from '@/lib/rbac'
import { NOTIFICATIONS } from '@/lib/api/data'
import { formatRelative } from '@/lib/format'

const TONE_DOT: Record<string, string> = {
  info: 'bg-blue',
  success: 'bg-green',
  warning: 'bg-amber',
  danger: 'bg-red',
}

export function Topbar() {
  const router = useRouter()
  const { theme, setTheme, toggleMobileNav, sidebarCollapsed } = useAppStore()
  const { role, config, org, user, setRole } = useSession()
  const [showRoles, setShowRoles] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [search, setSearch] = useState('')

  const isDark = theme === 'sombre'
  const nonLues = NOTIFICATIONS.filter((n) => !n.read).length

  function pickRole(id: (typeof ROLE_ORDER)[number]) {
    setRole(id)
    setShowRoles(false)
    router.push(`/${ROLES[id].home}`)
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-14 flex items-center gap-3 px-3 md:px-4',
        'bg-background-secondary/80 backdrop-blur-md border-b border-surface-border',
        'transition-all duration-300 left-0',
        sidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64',
      )}
    >
      {/* Hamburger mobile */}
      <button
        onClick={toggleMobileNav}
        className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>

      {/* Organisation (entité) */}
      <div className="hidden items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border bg-surface sm:flex">
        <span className="w-2 h-2 rounded-full bg-blue" />
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">
          {org.name}
        </span>
      </div>

      {/* Sélecteur de rôle « Vue démo » */}
      <div className="relative">
        <button
          onClick={() => setShowRoles((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue/40 bg-blue/10 transition-all duration-200 hover:bg-blue/15"
          title="Changer de rôle (démo)"
        >
          <span className="text-2xs font-bold uppercase tracking-wider text-blue">
            Vue démo
          </span>
          <span className="max-w-[150px] truncate text-sm font-semibold text-text-primary">
            {config.fonction}
          </span>
          <ChevronDown size={12} className="text-blue" />
        </button>
        {showRoles && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowRoles(false)} />
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-surface border border-surface-border rounded-xl shadow-dropdown z-20 overflow-hidden animate-scale-in">
              <p className="px-3 pt-2.5 pb-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
                Choisir un rôle à démontrer
              </p>
              <div className="p-1.5 pt-0.5 space-y-0.5 max-h-[70vh] overflow-y-auto">
                {ROLE_ORDER.map((id) => {
                  const r = ROLES[id]
                  const selected = id === role
                  return (
                    <button
                      key={id}
                      onClick={() => pickRole(id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        selected
                          ? 'bg-blue/10 text-blue'
                          : 'text-text-primary hover:bg-surface-hover',
                      )}
                    >
                      <span className="flex-1 truncate">
                        {r.fonction} · {r.name}
                      </span>
                      {selected && <Check size={12} className="text-blue" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recherche */}
      <div className="flex-1 max-w-xs md:max-w-sm relative hidden sm:block">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Rechercher client, facture, agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Recherche globale"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background-elevated border border-surface-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue/40 focus:ring-1 focus:ring-blue/20 transition-all"
        />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Thème */}
        <button
          onClick={() => setTheme(isDark ? 'clair' : 'sombre')}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
          aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
            aria-label={`Notifications (${nonLues} non lues)`}
          >
            <Bell size={16} />
            {nonLues > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red text-white text-2xs font-bold border-2 border-background-secondary">
                {nonLues}
              </span>
            )}
          </button>
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
              <div className="absolute top-full right-0 mt-1.5 w-80 bg-surface border border-surface-border rounded-xl shadow-dropdown z-20 overflow-hidden animate-scale-in">
                <div className="px-3 py-2.5 border-b border-surface-border">
                  <p className="text-sm font-semibold text-text-primary">
                    Notifications
                  </p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {NOTIFICATIONS.map((n) => (
                    <div
                      key={n.id}
                      className="flex gap-2.5 px-3 py-2.5 border-b border-surface-border/50 hover:bg-surface-hover transition-colors last:border-0"
                    >
                      <span
                        className={cn(
                          'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                          TONE_DOT[n.tone] ?? 'bg-text-muted',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text-primary">
                          {n.title}
                        </p>
                        <p className="text-2xs text-text-secondary">{n.detail}</p>
                        <p className="text-2xs text-text-muted mt-0.5">
                          {formatRelative(n.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div
          className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{
            background: `linear-gradient(145deg, ${user.gradient[0]}, ${user.gradient[1]})`,
          }}
          title={`${user.name} · ${user.fonction}`}
          aria-label={`${user.name}, ${user.fonction}`}
        >
          {user.initials}
        </div>
      </div>
    </header>
  )
}

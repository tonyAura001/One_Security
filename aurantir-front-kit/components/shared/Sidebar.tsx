'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/aurantir-front-kit/lib/utils'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import {
  LayoutDashboard, FolderKanban, Users, FileText, BarChart3,
  BookOpen, Calendar, MessageSquare, Target, Settings,
  ChevronLeft, ChevronRight, TrendingUp, Building2, Briefcase,
  Package, Megaphone, Shield, CreditCard, Receipt,
  Wallet, ChevronDown, Zap, X, StickyNote, Database, LogOut
} from 'lucide-react'

const ICON_STROKE = 1.5

export interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  children?: NavItem[]
  roles?: string[]
  separator?: boolean
}

const ROLES_INTERNES = ['super_admin', 'fondateur', 'manager', 'employe_interne', 'prestataire']

const navigation: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} strokeWidth={ICON_STROKE} /> },
  { href: '/projets', label: 'Projets', icon: <FolderKanban size={16} strokeWidth={ICON_STROKE} />, roles: ROLES_INTERNES },
  {
    href: '/finance',
    label: 'Finance',
    icon: <TrendingUp size={16} strokeWidth={ICON_STROKE} />,
    roles: ['super_admin', 'fondateur'],
    children: [
      { href: '/finance/tresorerie', label: 'Trésorerie', icon: <Wallet size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/finance/budget', label: 'Budget', icon: <BarChart3 size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/finance/factures', label: 'Factures', icon: <Receipt size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/finance/devis', label: 'Devis', icon: <FileText size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/finance/fournisseurs', label: 'Fournisseurs', icon: <Package size={14} strokeWidth={ICON_STROKE} /> },
    ],
  },
  {
    href: '/crm',
    label: 'CRM',
    icon: <Users size={16} strokeWidth={ICON_STROKE} />,
    roles: ['super_admin', 'fondateur'],
    children: [
      { href: '/crm/clients', label: 'Clients', icon: <Building2 size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/crm/acces', label: 'Accès clients', icon: <Users size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/crm/prospects', label: 'Prospects', icon: <Target size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/crm/contrats', label: 'Contrats', icon: <Briefcase size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/crm/satisfaction', label: 'Satisfaction', icon: <BarChart3 size={14} strokeWidth={ICON_STROKE} /> },
    ],
  },
  { href: '/rapports', label: 'Rapports', icon: <FileText size={16} strokeWidth={ICON_STROKE} />, roles: ROLES_INTERNES },
  { href: '/bibliotheque', label: 'Bibliothèque', icon: <BookOpen size={16} strokeWidth={ICON_STROKE} /> },
  { href: '/notes', label: 'Notes', icon: <StickyNote size={16} strokeWidth={ICON_STROKE} /> },
  { href: '/calendrier', label: 'Calendrier', icon: <Calendar size={16} strokeWidth={ICON_STROKE} /> },
  { href: '/messagerie', label: 'Messagerie', icon: <MessageSquare size={16} strokeWidth={ICON_STROKE} /> },
  { href: '/objectifs', label: 'Objectifs', icon: <Target size={16} strokeWidth={ICON_STROKE} />, roles: ROLES_INTERNES },
  {
    href: '/calendrier-editorial',
    label: 'Éditorial',
    icon: <Megaphone size={16} strokeWidth={ICON_STROKE} />,
    roles: ['super_admin', 'fondateur', 'manager'],
    separator: true,
  },
  {
    href: '/admin',
    label: 'Administration',
    icon: <Shield size={16} strokeWidth={ICON_STROKE} />,
    roles: ['super_admin'],
    children: [
      { href: '/admin/membres',  label: 'Membres',   icon: <Users size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/admin/securite', label: 'Sécurité',  icon: <Shield size={14} strokeWidth={ICON_STROKE} /> },
      { href: '/admin/donnees',  label: 'Données',   icon: <Database size={14} strokeWidth={ICON_STROKE} /> },
    ],
  },
]

function NavItemComponent({
  item,
  collapsed,
  userRole,
}: {
  item: NavItem
  collapsed: boolean
  userRole?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = pathname === item.href ||
    (item.children && item.children.some(c => pathname.startsWith(c.href)))

  useEffect(() => {
    if (item.children && item.children.some(c => pathname.startsWith(c.href))) {
      setOpen(true)
    }
  }, [pathname, item.children])

  if (item.roles && !item.roles.includes(userRole || '')) return null

  if (item.children && !collapsed) {
    return (
      <div>
        {item.separator && <div className="divider mb-2" />}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cn(
            'sidebar-item w-full justify-between',
            isActive && 'active'
          )}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <span>{item.label}</span>
          </div>
          <ChevronDown size={12} strokeWidth={ICON_STROKE} className={cn(
            'transition-transform duration-200',
            open && 'rotate-180'
          )} />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-surface-border pl-3 animate-fade-in">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'sidebar-item text-xs',
                  pathname === child.href && 'active'
                )}
              >
                {child.icon}
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {item.separator && <div className="divider mb-2" />}
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'sidebar-item relative',
          isActive && 'active',
          collapsed && 'justify-center'
        )}
      >
        {item.icon}
        {!collapsed && <span>{item.label}</span>}
        {item.badge && item.badge > 0 && (
          <span className={cn(
            'absolute bg-red text-white text-2xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1',
            collapsed ? '-top-1 -right-1' : 'ml-auto'
          )}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    </div>
  )
}

// ── Intégration PilotePME (édition minimale documentée) ──
// La nav, la marque et le profil peuvent être injectés en PROPS (sinon on
// retombe sur les valeurs Aurantir d'origine). Le COMPORTEMENT de repli, les
// largeurs, transitions, tooltips et le trigger « Réduire » restent inchangés.
export interface SidebarProps {
  nav?: NavItem[]
  brand?: { name: string; tagline: string }
  userRole?: string
  profile?: { name: string; initials: string; role: string }
  /** Server action de déconnexion (injectée par l'app — cf. kit-shell). */
  onLogout?: () => void | Promise<void>
}

export function Sidebar({ nav, brand, userRole, profile, onLogout }: SidebarProps = {}) {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, closeMobileNav, user, entiteActive, messagerieUnread } = useAppStore()
  const items = nav ?? navigation
  const role = userRole ?? user?.role

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full flex flex-col bg-background-secondary border-r border-surface-border z-40',
      'transition-all duration-300 ease-smooth',
      // Mobile: hors écran par défaut, glisse quand ouvert
      '-translate-x-full lg:translate-x-0',
      mobileNavOpen && 'translate-x-0',
      // Largeur
      sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
    )}>
      {/* Logo + bouton fermer mobile */}
      <div className={cn(
        'flex items-center border-b border-surface-border',
        sidebarCollapsed ? 'h-14 justify-center px-3' : 'h-14 px-4 gap-3'
      )}>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-blue flex items-center justify-center shadow-glow-blue">
          <Zap size={14} strokeWidth={ICON_STROKE} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">
                {brand?.name || entiteActive?.nom || 'Aurantir Workspace'}
              </p>
              <p className="text-2xs text-text-muted">{brand?.tagline || 'Platform'}</p>
            </div>
            {/* Bouton fermer visible uniquement sur mobile */}
            <button
              onClick={closeMobileNav}
              className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
            >
              <X size={16} strokeWidth={ICON_STROKE} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-0.5">
        {items.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item.href === '/messagerie' && messagerieUnread > 0
              ? { ...item, badge: messagerieUnread }
              : item
            }
            collapsed={sidebarCollapsed}
            userRole={role}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-border p-3 space-y-1">
        <Link
          href="/parametres"
          className={cn('sidebar-item', sidebarCollapsed && 'justify-center')}
        >
          <Settings size={16} strokeWidth={ICON_STROKE} />
          {!sidebarCollapsed && <span>Paramètres</span>}
        </Link>

        {/* User profile */}
        {!sidebarCollapsed && (profile || user) && (
          <div className="mt-3 p-2 rounded-lg bg-surface border border-surface-border flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue/20 flex items-center justify-center text-blue text-xs font-bold flex-shrink-0">
              {profile ? profile.initials : user?.prenom?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text-primary truncate">
                {profile ? profile.name : `${user?.prenom} ${user?.nom}`}
              </p>
              <p className="text-2xs text-text-muted capitalize">
                {profile ? profile.role : user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        {/* Déconnexion — câblée à la Server Action logout() */}
        {onLogout && (
          <form action={onLogout} className="mt-1">
            <button
              type="submit"
              title="Se déconnecter"
              className={cn(
                'sidebar-item w-full text-red hover:bg-red/10',
                sidebarCollapsed && 'justify-center',
              )}
            >
              <LogOut size={16} strokeWidth={ICON_STROKE} />
              {!sidebarCollapsed && <span>Se déconnecter</span>}
            </button>
          </form>
        )}

        {/* Toggle collapse (desktop seulement) */}
        <button
          onClick={toggleSidebar}
          className={cn('sidebar-item w-full mt-1 hidden lg:flex', sidebarCollapsed && 'justify-center')}
        >
          {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={ICON_STROKE} /> : (
            <>
              <ChevronLeft size={16} strokeWidth={ICON_STROKE} />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

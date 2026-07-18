'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar, type SidebarProps } from '@/aurantir-front-kit/components/shared/Sidebar'
import { Topbar } from '@/aurantir-front-kit/components/shared/Topbar'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { cn } from '@/aurantir-front-kit/lib/utils'
import type { User, EntiteLegale, Notification } from '@/aurantir-front-kit/types/database.types'

/**
 * DashboardShell — version PRÉSENTATIONNELLE du shell (Sidebar + Topbar).
 * ────────────────────────────────────────────────────────────
 * Contrairement au `DashboardLayoutClient` d'origine (components/shared), ce
 * shell ne fait AUCUN appel réseau. Il :
 *   - applique le thème (`data-theme`) depuis le store Zustand ;
 *   - hydrate optionnellement le store avec des données de démo passées en
 *     props (user / entités / notifications) ;
 *   - rend Sidebar, Topbar et le contenu.
 *
 * TODO(intégration): brancher données réelles.
 *   → Remplacez les props de démo par vos vraies données (fetch côté serveur,
 *     puis passage en props), ou réintroduisez un effet de chargement.
 */
export interface DashboardShellProps {
  children: React.ReactNode
  /** Données de démonstration injectées dans le store au montage (facultatif). */
  demoUser?: User | null
  demoEntites?: EntiteLegale[]
  demoNotifications?: Notification[]
  /** Nav/marque/profil de la Sidebar (injectés en props — cf. intégration PilotePME). */
  sidebar?: SidebarProps
}

export function DashboardShell({
  children,
  demoUser,
  demoEntites,
  demoNotifications,
  sidebar,
}: DashboardShellProps) {
  const {
    sidebarCollapsed, mobileNavOpen, closeMobileNav, theme,
    setUser, setEntites, setNotifications,
  } = useAppStore()
  const pathname = usePathname()

  // Applique le thème sur <html data-theme="...">
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Ferme le nav mobile à chaque changement de route
  useEffect(() => {
    closeMobileNav()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate le store avec les données de démo (une seule fois)
  useEffect(() => {
    if (demoUser !== undefined) setUser(demoUser)
    if (demoEntites) setEntites(demoEntites)
    if (demoNotifications) setNotifications(demoNotifications)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background-DEFAULT">
      {/* Overlay mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      <Sidebar {...sidebar} />

      <div className={cn(
        'transition-all duration-300 ease-smooth',
        'ml-0',
        sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
      )}>
        <Topbar />
        <main className="pt-14 min-h-screen">
          <div className="p-4 md:p-6 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

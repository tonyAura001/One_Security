import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, EntiteLegale, Notification } from '@/aurantir-front-kit/types/database.types'

interface AppState {
  // Utilisateur courant
  user: User | null
  setUser: (user: User | null) => void

  // Entité active (Sama Digital | Aurantir | null = Tout)
  entiteActive: EntiteLegale | null
  setEntiteActive: (entite: EntiteLegale | null) => void

  // Toutes les entités disponibles
  entites: EntiteLegale[]
  setEntites: (entites: EntiteLegale[]) => void

  // Notifications
  notifications: Notification[]
  setNotifications: (notifs: Notification[]) => void
  addNotification: (notif: Notification) => void
  marquerLu: (id: string) => void
  notificationsNonLues: () => number

  // UI State
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  mobileNavOpen: boolean
  toggleMobileNav: () => void
  closeMobileNav: () => void

  // Thème
  theme: 'clair' | 'sombre'
  setTheme: (theme: 'clair' | 'sombre') => void

  // Messagerie — compteur non-lus global (badge sidebar)
  messagerieUnread: number
  setMessagerieUnread: (n: number) => void

  // Chargement global
  loading: boolean
  setLoading: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      entiteActive: null,
      setEntiteActive: (entite) => set({ entiteActive: entite }),

      entites: [],
      setEntites: (entites) => set({ entites }),

      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notif) =>
        set((state) => ({ notifications: [notif, ...state.notifications] })),
      marquerLu: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, lu: true } : n
          ),
        })),
      notificationsNonLues: () =>
        get().notifications.filter((n) => !n.lu).length,

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      mobileNavOpen: false,
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
      closeMobileNav: () => set({ mobileNavOpen: false }),

      theme: 'clair', // défaut CLAIR (PilotePME) — cf. MANIFEST §3
      setTheme: (theme) => set({ theme }),

      messagerieUnread: 0,
      setMessagerieUnread: (n) => set({ messagerieUnread: Math.max(0, n) }),

      loading: false,
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'sama-digital-app',
      partialize: (state) => ({
        entiteActive: state.entiteActive,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)

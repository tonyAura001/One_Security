// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/aurantir-front-kit/components/shared/Sidebar'
import { Topbar } from '@/aurantir-front-kit/components/shared/Topbar'
import { InactivityGuard } from '@/aurantir-front-kit/components/providers/InactivityGuard'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { cn } from '@/aurantir-front-kit/lib/utils'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, mobileNavOpen, closeMobileNav, setUser, setEntites, setEntiteActive, entiteActive, setNotifications, theme } = useAppStore()
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()

  // Appliquer le thème sur l'élément html
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Fermer le nav mobile à chaque changement de route
  useEffect(() => {
    closeMobileNav()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userData } = await supabase
        .from('users')
        .select('*, entite_principale:entites_legales(*)')
        .eq('auth_user_id', authUser.id)
        .single()
      if (userData) setUser(userData)

      const { data: entitesData } = await supabase
        .from('entites_legales')
        .select('*')
        .order('nom')
      if (entitesData) {
        setEntites(entitesData)
        if (!entiteActive && entitesData.length > 0) {
          const entitePrincipale = (userData?.entite_principale as any) ?? null
          setEntiteActive(entitePrincipale || entitesData[0])
        }
      }

      const { data: notifsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('destinataire_id', userData?.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (notifsData) setNotifications(notifsData)

    }

    loadData()

    // Enregistrer la session courante pour le suivi des appareils connectés
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ currentSessionId }) => {
        if (!currentSessionId) return

        // Géolocalisation précise — ne re-demande que toutes les 30 min
        if (navigator.geolocation) {
          const GEO_KEY = 'geo_last_update'
          const lastUpdate = parseInt(localStorage.getItem(GEO_KEY) ?? '0', 10)
          if (Date.now() - lastUpdate >= 30 * 60 * 1000) {
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => {
                supabase.rpc('upsert_user_session', {
                  p_session_id: currentSessionId,
                  p_lat: coords.latitude,
                  p_lon: coords.longitude,
                }).then(() => localStorage.setItem(GEO_KEY, String(Date.now())))
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          }
        }

        // Écouter la suppression de cette session spécifique → kick ciblé
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (!authUser) return
          const sessionWatchChannel = supabase
            .channel(`session-watch-${currentSessionId}`)
            .on('postgres_changes', {
              event: 'DELETE',
              schema: 'public',
              table: 'user_sessions',
              filter: `user_id=eq.${authUser.id}`,
            }, async (payload: any) => {
              if ((payload.old as any)?.session_id === currentSessionId) {
                await supabase.auth.signOut()
                router.push('/login?error=session_revoquee')
              }
            })
            .subscribe()
          // Nettoyage géré par le return du useEffect parent
          ;(window as any).__sessionWatchChannel = sessionWatchChannel
        })
      })
      .catch(() => {})

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload: any) => {
        if (payload.new) {
          const store = useAppStore.getState()
          if (payload.new.destinataire_id === store.user?.id) {
            store.addNotification(payload.new as any)
          }
        }
      })
      .subscribe()

    // Écouter la révocation de session en temps réel
    let sessionChannel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      sessionChannel = supabase
        .channel('session-revocation')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `auth_user_id=eq.${authUser.id}`,
        }, async (payload: any) => {
          if ((payload.new as any).session_invalidated_at) {
            await supabase.auth.signOut()
            router.push('/login?error=session_revoquee')
          }
        })
        .subscribe()
    })

    return () => {
      supabase.removeChannel(channel)
      if (sessionChannel) supabase.removeChannel(sessionChannel)
      const sw = (window as any).__sessionWatchChannel
      if (sw) supabase.removeChannel(sw)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background-DEFAULT">
      {/* Déconnexion automatique après 30 min d'inactivité */}
      <InactivityGuard />

      {/* Overlay mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      <Sidebar />

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
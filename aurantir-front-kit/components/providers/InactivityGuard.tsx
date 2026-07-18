// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'

// ── Config ──────────────────────────────────────────────────────
const IDLE_MS      = 30 * 60 * 1_000  // 30 min → déconnexion
const HEARTBEAT_MS =  5 * 60 * 1_000  // 5 min  → màj last_seen_at
const EVENTS       = [
  'mousemove', 'mousedown', 'click',
  'keydown',   'scroll',    'touchstart',
] as const

// ── Helpers ─────────────────────────────────────────────────────
function parseSessionId(accessToken: string): string | null {
  try {
    return JSON.parse(atob(accessToken.split('.')[1])).session_id ?? null
  } catch {
    return null
  }
}

// ── Component ───────────────────────────────────────────────────
// Rendu nul — n'affiche rien. Doit être monté une seule fois dans
// DashboardLayoutClient, juste après l'authentification confirmée.
export function InactivityGuard() {
  const router   = useRouter()
  const supabase = createClient()

  // Tous les timers/état dans des refs → zéro re-render
  const idleTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const heartTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const activeRef    = useRef(false)

  useEffect(() => {
    let mounted = true
    const cleanupFns: (() => void)[] = []

    async function boot() {
      // ── 1. Vérifier la session ─────────────────────────────
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !mounted) return

      sessionIdRef.current = parseSessionId(session.access_token)
      activeRef.current    = true

      // ── 2. Déconnexion forcée après IDLE_MS ───────────────
      async function forceSignOut() {
        if (!activeRef.current) return
        activeRef.current = false
        clearTimers()
        try {
          if (sessionIdRef.current) {
            await supabase.rpc('end_user_session', { p_session_id: sessionIdRef.current, p_reason: 'expired' })
          }
        } catch {}
        await supabase.auth.signOut()
        router.replace('/login?reason=timeout')
      }

      function resetIdleTimer() {
        if (!activeRef.current) return
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(forceSignOut, IDLE_MS)
      }

      // ── 3. Heartbeat : maintenir last_seen_at à jour ───────
      async function sendHeartbeat() {
        if (!sessionIdRef.current || !activeRef.current) return
        try {
          await supabase.rpc('touch_user_session', {
            p_session_id: sessionIdRef.current,
          })
        } catch {
          // Non-bloquant : le heartbeat échoue silencieusement
        }
      }

      // ── 4. Attacher les écouteurs d'activité ─────────────
      const onActivity = () => resetIdleTimer()
      const onVisible  = () => {
        if (document.visibilityState === 'visible') resetIdleTimer()
      }

      EVENTS.forEach(e => document.addEventListener(e, onActivity, { passive: true }))
      document.addEventListener('visibilitychange', onVisible)

      // ── 5. Démarrer les timers ─────────────────────────────
      resetIdleTimer()
      heartTimer.current = setInterval(sendHeartbeat, HEARTBEAT_MS)

      // ── 6. Écouter les déconnexions extérieures ───────────
      // (expiration naturelle, révocation admin, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') {
          activeRef.current = false
          clearTimers()
        }
      })

      cleanupFns.push(() => {
        EVENTS.forEach(e => document.removeEventListener(e, onActivity))
        document.removeEventListener('visibilitychange', onVisible)
        subscription.unsubscribe()
        clearTimers()
      })
    }

    function clearTimers() {
      if (idleTimer.current)  { clearTimeout(idleTimer.current);  idleTimer.current  = null }
      if (heartTimer.current) { clearInterval(heartTimer.current); heartTimer.current = null }
    }

    boot()

    return () => {
      mounted = false
      activeRef.current = false
      cleanupFns.forEach(fn => fn())
      clearTimers()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
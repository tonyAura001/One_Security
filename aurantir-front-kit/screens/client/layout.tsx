// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { LayoutDashboard, FileText, FolderOpen, LogOut, Menu, X, Building2, MessageSquare, Calendar } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/espace-client', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/espace-client/projets', label: 'Mes projets', icon: FolderOpen },
  { href: '/espace-client/factures', label: 'Mes factures', icon: FileText },
  { href: '/espace-client/devis', label: 'Mes devis', icon: FileText },
  { href: '/espace-client/calendrier', label: 'Calendrier', icon: Calendar },
  { href: '/espace-client/messagerie', label: 'Messagerie', icon: MessageSquare },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ prenom: string; nom: string; email: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let userId: string | null = null
    let pollId: ReturnType<typeof setInterval> | null = null

    async function loadUnread() {
      if (!userId) return
      const { data } = await supabase
        .from('conversations')
        .select('messages_prives(auteur_id, lu)')
        .contains('participants', [userId])
      const total = (data || []).reduce((sum: any, c: any) => {
        const msgs = (c.messages_prives || []) as { auteur_id: string; lu: boolean }[]
        return sum + msgs.filter(m => m.auteur_id !== userId && !m.lu).length
      }, 0)
      setUnreadCount(total)
    }

    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase
        .from('users')
        .select('id, prenom, nom, email, role')
        .eq('auth_user_id', authUser.id)
        .single()
      if (!data || data.role !== 'client_externe') {
        router.replace('/login')
        return
      }
      setUser({ prenom: data.prenom, nom: data.nom, email: data.email })
      userId = data.id
      loadUnread()
      pollId = setInterval(loadUnread, 5000)
    })

    return () => { if (pollId) clearInterval(pollId) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initiales = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#0A0D14] flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-white/5 bg-[#0D1017]">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue/20 flex items-center justify-center">
              <Building2 size={14} className="text-blue" />
            </div>
            <span className="text-sm font-semibold text-white">Espace Client</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/espace-client' && pathname.startsWith(href))
            const badge = href === '/espace-client/messagerie' ? unreadCount : 0
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-blue/10 text-blue font-medium' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={14} />
                {label}
                {badge > 0 && (
                  <span className="ml-auto bg-red text-white text-2xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet/20 flex items-center justify-center text-violet text-xs font-bold">
              {initiales}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-2xs text-white/30 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red hover:bg-red/5 transition-colors">
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0D1017] border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue" />
          <span className="text-sm font-semibold text-white">Espace Client</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/50 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0A0D14]/95 pt-14">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const badge = href === '/espace-client/messagerie' ? unreadCount : 0
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <Icon size={16} /> {label}
                  {badge > 0 && (
                    <span className="ml-auto bg-red text-white text-2xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red/70 hover:text-red transition-colors">
              <LogOut size={16} /> Déconnexion
            </button>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
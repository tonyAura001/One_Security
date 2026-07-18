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
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { Pagination } from '@/aurantir-front-kit/components/ui/Pagination'
import {
  Bell, CheckCheck, Trash2, Info, AlertTriangle,
  CheckCircle, DollarSign, FolderKanban, FileText, Users,
  MessageSquare, Target, Shield
} from 'lucide-react'

const PAGE_SIZE = 20

interface Notification {
  id: string
  type: string
  titre: string
  message: string
  lu: boolean
  lien?: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  finance:    { icon: <DollarSign size={14} />,    color: 'text-green'      },
  projet:     { icon: <FolderKanban size={14} />,  color: 'text-blue'       },
  rapport:    { icon: <FileText size={14} />,       color: 'text-violet'     },
  membre:     { icon: <Users size={14} />,          color: 'text-amber'      },
  alerte:     { icon: <AlertTriangle size={14} />,  color: 'text-red'        },
  message:    { icon: <MessageSquare size={14} />,  color: 'text-blue'       },
  crm:        { icon: <Target size={14} />,         color: 'text-purple'     },
  securite:   { icon: <Shield size={14} />,         color: 'text-red'        },
  info:       { icon: <Info size={14} />,           color: 'text-blue'       },
  succes:     { icon: <CheckCircle size={14} />,    color: 'text-green'      },
  default:    { icon: <Bell size={14} />,           color: 'text-text-muted' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [nonLues, setNonLues] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<'toutes' | 'non_lues'>('toutes')
  const supabase = createClient()

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { setPage(1) }, [filtre])
  useEffect(() => { load() }, [filtre, page])

  async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single()
    return userData?.id ?? null
  }

  async function load() {
    setLoading(true)
    const userId = await getUserId()
    if (!userId) { setLoading(false); return }

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let q = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('destinataire_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filtre === 'non_lues') q = q.eq('lu', false)
    const [{ data, count }, { count: unreadCount }] = await Promise.all([
      q,
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('destinataire_id', userId).eq('lu', false),
    ])
    setNotifications((data || []) as Notification[])
    setTotal(count || 0)
    setNonLues(unreadCount || 0)
    setLoading(false)
  }

  async function marquerToutLu() {
    const userId = await getUserId()
    if (!userId) return
    await supabase.from('notifications').update({ lu: true }).eq('destinataire_id', userId).eq('lu', false)
    load()
  }

  async function marquerLu(id: string) {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    if (filtre === 'non_lues') { load(); return }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
    setNonLues(prev => Math.max(0, prev - 1))
  }

  async function supprimer(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    if (notifications.length === 1 && page > 1) { setPage(p => p - 1); return }
    load()
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Tout est lu'}</p>
        </div>
        {nonLues > 0 && (
          <button onClick={marquerToutLu} className="flex items-center gap-1.5 text-xs text-blue hover:underline">
            <CheckCheck size={13} /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {(['toutes', 'non_lues'] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filtre === f ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted'}`}>
            {f === 'toutes' ? 'Toutes' : 'Non lues'}
            {f === 'non_lues' && nonLues > 0 && <span className="ml-1 bg-blue text-white text-2xs px-1 rounded-full">{nonLues}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
          : notifications.length === 0
            ? (
              <div className="text-center py-16 text-text-muted">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{filtre === 'non_lues' ? 'Aucune notification non lue' : 'Aucune notification'}</p>
              </div>
            )
            : notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
              return (
                <div
                  key={n.id}
                  onClick={() => !n.lu && marquerLu(n.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all group cursor-pointer ${
                    !n.lu
                      ? 'bg-blue/5 border-blue/15 hover:border-blue/30'
                      : 'bg-surface border-surface-border hover:border-surface-border-hover opacity-70'
                  }`}
                >
                  <div className={`mt-0.5 ${cfg.color} flex-shrink-0`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.lu ? 'text-text-secondary' : 'text-text-primary'}`}>{n.titre}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-2xs text-text-muted mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!n.lu && (
                      <button onClick={(e) => { e.stopPropagation(); marquerLu(n.id) }} className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-blue" title="Marquer comme lu">
                        <CheckCheck size={12} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); supprimer(n.id) }} className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-red" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {!n.lu && <div className="w-1.5 h-1.5 rounded-full bg-blue flex-shrink-0 mt-1.5" />}
                </div>
              )
            })
        }
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="pt-2" />
    </div>
  )
}
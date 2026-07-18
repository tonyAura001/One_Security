// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { formatRelativeTime, formatShortTime, initiales, cn } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  Send, Plus, Search, MessageSquare, Lock, Paperclip, X,
  Download, FileText, Trash2, Check, CheckCheck, Archive, ArchiveRestore,
  ChevronDown, Hash, Settings2, Users, Smile, Edit2, MoreHorizontal,
  ArrowLeft, AlertTriangle,
} from 'lucide-react'
// Alias local (évite la dépendance @supabase dans le kit présentationnel)
type RealtimeChannel = any

// ── Types ─────────────────────────────────────────────────────

interface Conversation {
  id: string; participants: string[]; archived_by: string[]
  created_at: string; dernierMessage?: string; dernierMessageAt?: string
  interlocuteur?: { id: string; prenom: string; nom: string; avatar_url?: string }
  unread?: number
}
interface PieceJointe { nom: string; path: string; taille: number; mime: string }
interface Message {
  id: string; conversation_id: string; auteur_id: string
  contenu: string; lu: boolean; created_at: string
  pieces_jointes?: PieceJointe[]
  auteur?: { prenom: string; nom: string; avatar_url?: string }
}
interface Channel {
  id: string; entite_id: string; nom: string; description?: string
  cree_par: string; archive: boolean; created_at: string; updated_at: string
  channel_members?: { user_id: string }[]
}
interface ChannelMember { id: string; channel_id: string; user_id: string; user?: UserItem }
interface ChannelMessage {
  id: string; channel_id: string; auteur_id: string; contenu: string
  modifie: boolean; created_at: string; updated_at: string
  auteur?: UserItem
  attachments?: { id: string; nom: string; url_stockage: string; taille?: number; mime?: string }[]
  reactions?: { emoji: string; count: number; mine: boolean; users: string[] }[]
}
interface UserItem { id: string; prenom: string; nom: string; role: string; statut?: string; avatar_url?: string }

type ActiveItem = { type: 'dm'; conv: Conversation } | { type: 'channel'; channel: Channel } | null

// ── Helpers ───────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}
function sanitizeFilename(n: string) { return n.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '') }
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '✅']

// ── ChannelModal ───────────────────────────────────────────────
function ChannelModal({ onClose, onSaved, entiteId, allUsers, editing, currentMembers }: {
  onClose: () => void; onSaved: () => void; entiteId: string; allUsers: UserItem[]
  editing?: Channel | null; currentMembers?: ChannelMember[]
}) {
  const { user } = useAppStore()
  const supabase = createClient()
  const [nom, setNom] = useState(editing?.nom || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [selectedUsers, setSelectedUsers] = useState<string[]>(currentMembers?.map(m => m.user_id) || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!nom.trim()) { setError('Le nom est requis'); return }
    if (!entiteId) { setError('Sélectionnez une entité active'); return }
    if (!user) return
    setSaving(true); setError('')
    if (editing) {
      const { error: err } = await supabase.from('channels').update({ nom: nom.trim(), description: description.trim() || null }).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
      const toAdd = selectedUsers.filter(uid => !currentMembers?.find(m => m.user_id === uid))
      const toRemove = currentMembers?.filter(m => !selectedUsers.includes(m.user_id)).map(m => m.id) || []
      if (toAdd.length > 0) await supabase.from('channel_members').insert(toAdd.map(uid => ({ channel_id: editing.id, user_id: uid })))
      if (toRemove.length > 0) await supabase.from('channel_members').delete().in('id', toRemove)
    } else {
      const { data: ch, error: err } = await supabase.from('channels').insert({ entite_id: entiteId, nom: nom.trim(), description: description.trim() || null, cree_par: user.id }).select().single()
      if (err || !ch) { setError(err?.message || 'Erreur'); setSaving(false); return }
      const members = [...new Set([user.id, ...selectedUsers])]
      await supabase.from('channel_members').insert(members.map(uid => ({ channel_id: ch.id, user_id: uid })))
    }
    setSaving(false); onSaved(); onClose()
  }

  const toggleUser = (uid: string) => {
    if (uid === user?.id) return
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid])
  }
  const inputCls = "w-full bg-background/60 border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-surface-border/80 shadow-2xl overflow-hidden bg-background" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Hash size={13} className="text-blue-400" /></div>
            <h2 className="text-sm font-semibold text-white">{editing ? 'Modifier le groupe' : 'Nouveau groupe'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text-disabled hover:text-text-secondary hover:bg-surface transition-all"><X size={15} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">Nom du groupe *</label>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Marketing, Tech…" className={inputCls} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="À quoi sert ce groupe ?" className={inputCls} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">Membres</label>
              <span className="text-[11px] text-text-disabled">{selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {allUsers.map(u => {
                const isSelected = selectedUsers.includes(u.id)
                const isSelf = u.id === user?.id
                return (
                  <button key={u.id} onClick={() => toggleUser(u.id)} disabled={isSelf}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all', isSelected ? 'bg-blue-500/10 border border-blue-500/20' : 'border border-transparent hover:bg-surface/40', isSelf && 'opacity-40 cursor-default')}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0', isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-surface text-text-muted')}>
                      {initiales(u.prenom, u.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium truncate', isSelected ? 'text-text-primary' : 'text-text-muted')}>{u.prenom} {u.nom}</p>
                      <p className="text-[11px] text-text-disabled capitalize truncate">{u.role?.replace('_', ' ')}</p>
                    </div>
                    <div className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all', isSelected ? 'bg-blue-500' : 'border border-surface-border')}>
                      {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-text-muted bg-surface/60 hover:bg-surface border border-surface-border/40 transition-all">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20">
            {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer le groupe'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function MessageriePage() {
  const { user, entiteActive, messagerieUnread, setMessagerieUnread } = useAppStore()
  const supabase = createClient()
  const isAdmin = user?.role === 'fondateur' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // ── DM state ──
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showNewConv, setShowNewConv] = useState(false)
  const [dmUsers, setDmUsers] = useState<UserItem[]>([])
  const [showArchivedDm, setShowArchivedDm] = useState(false)
  const [hoveredConv, setHoveredConv] = useState<string | null>(null)
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<string | null>(null)

  // ── Channel state ──
  const [channels, setChannels] = useState<Channel[]>([])
  const [archivedChannels, setArchivedChannels] = useState<Channel[]>([])
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([])
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([])
  const [channelUsers, setChannelUsers] = useState<UserItem[]>([])
  const [newChannelMsg, setNewChannelMsg] = useState('')
  const [sendingChannel, setSendingChannel] = useState(false)
  const [pendingChannelFiles, setPendingChannelFiles] = useState<File[]>([])
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [showArchivedCh, setShowArchivedCh] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [confirmDeleteCh, setConfirmDeleteCh] = useState<Channel | null>(null)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({})

  // ── Shared state ──
  const [active, setActive] = useState<ActiveItem>(null)
  const [search, setSearch] = useState('')
  const [loadingDm, setLoadingDm] = useState(true)
  const [loadingCh, setLoadingCh] = useState(true)

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dmRealtimeRef = useRef<RealtimeChannel | null>(null)
  const chRealtimeRef = useRef<RealtimeChannel | null>(null)
  const pollDmRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollChRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chFileInputRef = useRef<HTMLInputElement>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const loadConvsRef = useRef<(silent?: boolean) => Promise<void>>()
  const loadChUnreadsRef = useRef<() => Promise<void>>()
  const dmUnreadTotalRef = useRef(0)
  const chUnreadTotalRef = useRef(0)

  useEffect(() => { loadConvsRef.current = loadConversations })
  useEffect(() => { loadChUnreadsRef.current = loadChannelUnreads })
  useEffect(() => {
    loadConversations()
    pollDmRef.current = setInterval(() => loadConvsRef.current?.(true), 5000)
    return () => { if (pollDmRef.current) clearInterval(pollDmRef.current) }
  }, []) // eslint-disable-line

  useEffect(() => {
    loadChannels()
    const t = setInterval(() => loadChUnreadsRef.current?.(), 20000)
    return () => clearInterval(t)
  }, [entiteActive?.id, user?.id]) // eslint-disable-line

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, channelMessages])

  // ── DM: realtime + poll ──
  useEffect(() => {
    if (active?.type !== 'dm') return
    const convId = active.conv.id
    loadMessages(convId); markAsRead(convId)
    if (dmRealtimeRef.current) supabase.removeChannel(dmRealtimeRef.current)
    dmRealtimeRef.current = supabase.channel(`dm-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_prives', filter: `conversation_id=eq.${convId}` },
        () => { loadMessages(convId); markAsRead(convId); loadConvsRef.current?.(true) })
      .subscribe()
    if (pollDmRef.current) clearInterval(pollDmRef.current)
    pollDmRef.current = setInterval(() => { loadMessages(convId); markAsRead(convId) }, 3000)
    return () => {
      if (dmRealtimeRef.current) supabase.removeChannel(dmRealtimeRef.current)
      if (pollDmRef.current) clearInterval(pollDmRef.current)
    }
  }, [active?.type === 'dm' ? active.conv.id : null]) // eslint-disable-line

  // ── Channel: realtime + poll ──
  useEffect(() => {
    if (active?.type !== 'channel') return
    const chId = active.channel.id
    loadChannelMessages(chId); loadChannelMembers(chId)
    if (chRealtimeRef.current) supabase.removeChannel(chRealtimeRef.current)
    chRealtimeRef.current = supabase.channel(`ch-${chId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${chId}` }, () => { loadChannelMessages(chId, true); supabase.rpc('mark_channel_read', { p_channel_id: chId }) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${chId}` }, () => loadChannelMessages(chId, true))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${chId}` }, () => loadChannelMessages(chId, true))
      .subscribe()
    if (pollChRef.current) clearInterval(pollChRef.current)
    pollChRef.current = setInterval(() => loadChannelMessages(chId, true), 15000)
    return () => {
      if (chRealtimeRef.current) supabase.removeChannel(chRealtimeRef.current)
      if (pollChRef.current) clearInterval(pollChRef.current)
    }
  }, [active?.type === 'channel' ? active.channel.id : null]) // eslint-disable-line

  // ── Helpers ──
  async function getCurrentUserId(): Promise<string | null> {
    if (currentUserIdRef.current) return currentUserIdRef.current
    const { data: { user: au } } = await supabase.auth.getUser()
    if (!au) return null
    const { data } = await supabase.from('users').select('id').eq('auth_user_id', au.id).single()
    if (data) currentUserIdRef.current = data.id
    return data?.id ?? null
  }

  // ── DM functions ──
  async function loadConversations(silent = false) {
    if (!silent) setLoadingDm(true)
    const uid = await getCurrentUserId()
    if (!uid) { if (!silent) setLoadingDm(false); return }
    const { data } = await supabase.from('conversations').select('*, messages_prives(contenu, created_at, auteur_id, lu)').contains('participants', [uid]).order('created_at', { ascending: false })
    const usersMap: Record<string, UserItem> = {}
    if (data) {
      const all = Array.from(new Set(data.flatMap((c: any) => c.participants || [])))
      const { data: ud } = await supabase.from('users').select('id, prenom, nom, avatar_url, role, statut').in('id', all)
      ;(ud || []).forEach((u: UserItem) => { usersMap[u.id] = u })
    }
    const enriched: Conversation[] = (data || []).map((c: any) => {
      const interId = (c.participants || []).find((p: string) => p !== uid)
      const msgs = (c.messages_prives || []) as { contenu: string; created_at: string; auteur_id: string; lu: boolean }[]
      const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const last = sorted[0]
      return { id: c.id, participants: c.participants, archived_by: c.archived_by || [], created_at: c.created_at, dernierMessage: last?.contenu, dernierMessageAt: last?.created_at, unread: msgs.filter(m => m.auteur_id !== uid && !m.lu).length, interlocuteur: interId ? usersMap[interId] as unknown as Conversation['interlocuteur'] : undefined }
    })
    setConversations(enriched)
    const activeUnread = enriched.filter(c => !(c.archived_by || []).includes(uid)).reduce((s, c) => s + (c.unread || 0), 0)
    dmUnreadTotalRef.current = activeUnread
    setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
    setLoadingDm(false)
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase.from('messages_prives').select('*, auteur:users!auteur_id(prenom, nom, avatar_url)').eq('conversation_id', convId).order('created_at')
    setMessages((data || []) as Message[])
  }

  async function markAsRead(convId: string) {
    const uid = await getCurrentUserId()
    if (!uid) return
    await supabase.from('messages_prives').update({ lu: true }).eq('conversation_id', convId).neq('auteur_id', uid).eq('lu', false)
  }

  function openConversation(conv: Conversation) {
    const prevUnread = conv.unread || 0
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))
    dmUnreadTotalRef.current = Math.max(0, dmUnreadTotalRef.current - prevUnread)
    setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
    setActive({ type: 'dm', conv })
  }

  function openChannel(ch: Channel) {
    const prevUnread = channelUnreads[ch.id] || 0
    if (prevUnread > 0) {
      setChannelUnreads(prev => ({ ...prev, [ch.id]: 0 }))
      chUnreadTotalRef.current = Math.max(0, chUnreadTotalRef.current - prevUnread)
      setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
    }
    setActive({ type: 'channel', channel: ch })
    supabase.rpc('mark_channel_read', { p_channel_id: ch.id })
  }

  async function archiveConversation(conv: Conversation) {
    const uid = await getCurrentUserId()
    if (!uid) return
    const newArchived = [...new Set([...(conv.archived_by || []), uid])]
    await supabase.from('conversations').update({ archived_by: newArchived }).eq('id', conv.id)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archived_by: newArchived } : c))
    dmUnreadTotalRef.current = Math.max(0, dmUnreadTotalRef.current - (conv.unread || 0))
    setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
    if (active?.type === 'dm' && active.conv.id === conv.id) setActive(null)
  }

  async function unarchiveConversation(conv: Conversation) {
    const uid = await getCurrentUserId()
    if (!uid) return
    const newArchived = (conv.archived_by || []).filter(id => id !== uid)
    await supabase.from('conversations').update({ archived_by: newArchived }).eq('id', conv.id)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archived_by: newArchived } : c))
    dmUnreadTotalRef.current = dmUnreadTotalRef.current + (conv.unread || 0)
    setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
  }

  async function deleteConversation(convId: string) {
    await supabase.from('messages_prives').delete().eq('conversation_id', convId)
    await supabase.from('conversations').delete().eq('id', convId)
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (active?.type === 'dm' && active.conv.id === convId) setActive(null)
    setConfirmDeleteConv(null)
  }

  async function sendMessage() {
    if (active?.type !== 'dm' || (!newMsg.trim() && pendingFiles.length === 0) || sending) return
    setSending(true)
    const uid = await getCurrentUserId()
    if (!uid) { setSending(false); return }
    const pjs: PieceJointe[] = []
    for (const f of pendingFiles) {
      const safe = f.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
      const path = `${active.conv.id}/${Date.now()}-${safe}`
      const { storedPath, error } = await uploadToStorage(supabase, 'messagerie-prive', path, f)
      if (!error) pjs.push({ nom: f.name, path: storedPath, taille: f.size, mime: f.type })
    }
    await supabase.from('messages_prives').insert({ conversation_id: active.conv.id, auteur_id: uid, contenu: newMsg.trim(), lu: false, pieces_jointes: pjs })
    setNewMsg(''); setPendingFiles([]); setSending(false)
    await loadMessages(active.conv.id)
  }

  async function downloadAttachment(pj: PieceJointe) {
    await downloadFromStorage(supabase, 'messagerie-prive', pj.path, pj.nom)
  }

  async function startConversation(targetUserId: string) {
    const uid = await getCurrentUserId()
    if (!uid) return
    const existing = conversations.find(c => c.participants.includes(uid) && c.participants.includes(targetUserId))
    if (existing) { openConversation(existing); setShowNewConv(false); return }
    const { data } = await supabase.from('conversations').insert({ participants: [uid, targetUserId] }).select().single()
    if (data) { await loadConversations(); setActive({ type: 'dm', conv: data as Conversation }) }
    setShowNewConv(false)
  }

  // ── Channel functions ──
  async function loadChannels(silent = false) {
    if (!silent) setLoadingCh(true)
    const entityId = entiteActive?.id || user?.entite_principale_id
    if (!entityId) { if (!silent) setLoadingCh(false); return }
    const [{ data }, { data: archived }] = await Promise.all([
      supabase.from('channels').select('*, channel_members(user_id)').eq('entite_id', entityId).eq('archive', false).order('nom'),
      supabase.from('channels').select('*, channel_members(user_id)').eq('entite_id', entityId).eq('archive', true).order('nom'),
    ])
    setChannels(data || [])
    setArchivedChannels(archived || [])
    if (!silent) setLoadingCh(false)
    const { data: ud } = await supabase.from('users').select('id, prenom, nom, role, avatar_url').eq('entite_principale_id', entityId).eq('statut', 'actif')
    setChannelUsers(ud || [])
    await loadChannelUnreads()
  }

  async function loadChannelUnreads() {
    const uid = await getCurrentUserId()
    if (!uid) return
    const { data } = await supabase.rpc('get_channel_unreads', { p_user_id: uid })
    if (!data) return
    const map: Record<string, number> = {}
    for (const row of data as { channel_id: string; unread_count: number }[]) {
      map[row.channel_id] = Number(row.unread_count)
    }
    setChannelUnreads(map)
    chUnreadTotalRef.current = Object.values(map).reduce((s, n) => s + n, 0)
    setMessagerieUnread(dmUnreadTotalRef.current + chUnreadTotalRef.current)
  }

  async function loadChannelMessages(channelId: string, silent = false) {
    if (!silent) setChannelMessages([])
    const { data } = await supabase.from('channel_messages').select('*, auteur:users!channel_messages_auteur_id_fkey(id, prenom, nom, role, avatar_url), channel_attachments(*)').eq('channel_id', channelId).order('created_at', { ascending: true })
    if (!data) return
    const msgIds = data.map((m: any) => m.id)
    const { data: reactions } = msgIds.length > 0 ? await supabase.from('channel_reactions').select('*').in('message_id', msgIds) : { data: [] }
    type RR = { message_id: string; emoji: string; user_id: string }
    const rMap: Record<string, RR[]> = {}
    for (const r of (reactions || []) as RR[]) { if (!rMap[r.message_id]) rMap[r.message_id] = []; rMap[r.message_id].push(r) }
    const enriched: ChannelMessage[] = data.map((m: any) => {
      const raw = rMap[m.id] || []
      const grouped: Record<string, { emoji: string; count: number; mine: boolean; users: string[] }> = {}
      for (const r of raw) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, mine: false, users: [] }
        grouped[r.emoji].count++; grouped[r.emoji].users.push(r.user_id)
        if (r.user_id === user?.id) grouped[r.emoji].mine = true
      }
      return { ...m, auteur: Array.isArray(m.auteur) ? m.auteur[0] : m.auteur, attachments: m.channel_attachments || [], reactions: Object.values(grouped) }
    })
    setChannelMessages(enriched)
  }

  async function loadChannelMembers(channelId: string) {
    const { data } = await supabase.from('channel_members').select('*, user:users!channel_members_user_id_fkey(id, prenom, nom, role, avatar_url)').eq('channel_id', channelId)
    setChannelMembers(data || [])
  }

  async function sendChannelMessage() {
    if (active?.type !== 'channel' || (!newChannelMsg.trim() && pendingChannelFiles.length === 0) || sendingChannel) return
    setSendingChannel(true)
    const { data: msg, error } = await supabase.from('channel_messages').insert({ channel_id: active.channel.id, auteur_id: user!.id, contenu: newChannelMsg.trim() }).select().single()
    if (error || !msg) { setSendingChannel(false); return }
    for (const f of pendingChannelFiles) {
      const safe = sanitizeFilename(f.name)
      const path = `${entiteActive?.id}/${msg.id}/${Date.now()}-${safe}`
      const { storedPath, error: upErr } = await uploadToStorage(supabase, 'messages-interne', path, f)
      if (!upErr) await supabase.from('channel_attachments').insert({ message_id: msg.id, nom: f.name, url_stockage: storedPath, taille: f.size, mime: f.type })
    }
    setNewChannelMsg(''); setPendingChannelFiles([]); setSendingChannel(false)
    await loadChannelMessages(active.channel.id)
  }

  async function handleArchiveChannel(ch: Channel) {
    await supabase.from('channels').update({ archive: true }).eq('id', ch.id)
    if (active?.type === 'channel' && active.channel.id === ch.id) setActive(null)
    await loadChannels(true)
  }
  async function handleUnarchiveChannel(ch: Channel) { await supabase.from('channels').update({ archive: false }).eq('id', ch.id); await loadChannels(true) }
  async function handleDeleteChannel(ch: Channel) {
    const { error } = await supabase.from('channels').delete().eq('id', ch.id)
    if (error) await supabase.from('channels').update({ archive: true }).eq('id', ch.id)
    setConfirmDeleteCh(null)
    if (active?.type === 'channel' && active.channel.id === ch.id) setActive(null)
    await loadChannels(true)
  }
  async function toggleReaction(msgId: string, emoji: string) {
    if (!user || active?.type !== 'channel') return
    const existing = channelMessages.find(m => m.id === msgId)?.reactions?.find(r => r.emoji === emoji && r.mine)
    if (existing) await supabase.from('channel_reactions').delete().eq('message_id', msgId).eq('user_id', user.id).eq('emoji', emoji)
    else await supabase.from('channel_reactions').insert({ message_id: msgId, user_id: user.id, emoji })
    setShowEmojiPicker(null)
    await loadChannelMessages(active.channel.id)
  }
  async function handleDownloadChannelAttachment(att: { nom: string; url_stockage: string }) {
    await downloadFromStorage(supabase, 'messages-interne', att.url_stockage, att.nom)
  }

  // ── Computed ──
  const uid = currentUserIdRef.current || user?.id || ''
  const activeConvs = conversations.filter(c => !(c.archived_by || []).includes(uid) && (!search || `${c.interlocuteur?.prenom} ${c.interlocuteur?.nom}`.toLowerCase().includes(search.toLowerCase())))
  const archivedConvs = conversations.filter(c => (c.archived_by || []).includes(uid) && (!search || `${c.interlocuteur?.prenom} ${c.interlocuteur?.nom}`.toLowerCase().includes(search.toLowerCase())))
  const filteredChannels = channels.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()))
  const activeChannel = active?.type === 'channel' ? active.channel : null
  const isMember = activeChannel ? channels.find(c => c.id === activeChannel.id)?.channel_members?.some((m: { user_id: string }) => m.user_id === user?.id) : false
  const canSend = isMember || isSuperAdmin

  function getDateLabel(d: string) {
    const dt = new Date(d); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    if (dt.toDateString() === today.toDateString()) return "Aujourd'hui"
    if (dt.toDateString() === yesterday.toDateString()) return 'Hier'
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const msgsWithSeparators = channelMessages.reduce<Array<ChannelMessage | { separator: true; label: string }>>((acc, msg, i) => {
    const prev = channelMessages[i - 1]
    if (prev ? new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString() : true) acc.push({ separator: true, label: getDateLabel(msg.created_at) })
    acc.push(msg); return acc
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ══ Sidebar ══════════════════════════════════════════════ */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-surface-border bg-background-secondary">

        {/* Header + search */}
        <div className="p-3 border-b border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Messagerie</h2>
            <button onClick={() => { setShowNewConv(true); supabase.from('users').select('id, prenom, nom, role, statut').eq('statut', 'actif').order('prenom').then(({ data }) => setDmUsers((data || []) as UserItem[])) }}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-blue transition-all" title="Nouveau message">
              <Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-7 py-1.5 text-xs bg-background border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-surface-border focus:ring-1 focus:ring-slate-700/40 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Messages directs ── */}
          <div className="pt-2 pb-1">
            <p className="px-3 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Messages directs</p>
            {loadingDm ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 flex gap-2.5"><div className="skeleton w-7 h-7 rounded-full" /><div className="flex-1 space-y-1"><div className="skeleton h-2.5 rounded w-20" /><div className="skeleton h-2.5 rounded w-28" /></div></div>
              ))
            ) : activeConvs.length === 0 && archivedConvs.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-muted">Aucune conversation</p>
            ) : (
              <>
                {activeConvs.map(c => (
                  <div key={c.id} className="relative group/dm" onMouseEnter={() => setHoveredConv(c.id)} onMouseLeave={() => setHoveredConv(null)}>
                    <button onClick={() => openConversation(c)}
                      className={cn('w-full p-2.5 flex items-center gap-2.5 hover:bg-surface-hover transition-colors text-left', active?.type === 'dm' && active.conv.id === c.id ? 'bg-blue/5 border-l-2 border-blue' : '')}>
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue">{c.interlocuteur ? initiales(c.interlocuteur.prenom, c.interlocuteur.nom) : '?'}</div>
                        {(c.unread ?? 0) > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue text-white text-2xs flex items-center justify-center font-bold">{c.unread}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs truncate', (c.unread ?? 0) > 0 ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary')}>{c.interlocuteur ? `${c.interlocuteur.prenom} ${c.interlocuteur.nom}` : 'Inconnu'}</p>
                        {c.dernierMessage && <p className="text-2xs text-text-muted truncate">{c.dernierMessage}</p>}
                      </div>
                    </button>
                    {hoveredConv === c.id && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); archiveConversation(c) }} className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-400/10 transition-all" title="Archiver"><Archive size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteConv(c.id) }} className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-all" title="Supprimer"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {archivedConvs.length > 0 && (
                  <>
                    <button onClick={() => setShowArchivedDm(v => !v)} className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
                      <Archive size={10} /><span>Archivées ({archivedConvs.length})</span>
                      <ChevronDown size={10} className={cn('ml-auto transition-transform', showArchivedDm && 'rotate-180')} />
                    </button>
                    {showArchivedDm && archivedConvs.map(c => (
                      <div key={c.id} className="relative group/dm opacity-60 hover:opacity-100 transition-opacity" onMouseEnter={() => setHoveredConv(c.id)} onMouseLeave={() => setHoveredConv(null)}>
                        <button onClick={() => openConversation(c)} className="w-full p-2.5 flex items-center gap-2.5 hover:bg-surface-hover transition-colors text-left">
                          <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue">{c.interlocuteur ? initiales(c.interlocuteur.prenom, c.interlocuteur.nom) : '?'}</div>
                          <p className="text-xs font-medium text-text-secondary truncate">{c.interlocuteur ? `${c.interlocuteur.prenom} ${c.interlocuteur.nom}` : 'Inconnu'}</p>
                        </button>
                        {hoveredConv === c.id && (
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button onClick={e => { e.stopPropagation(); unarchiveConversation(c) }} className="p-1.5 rounded-lg text-blue hover:bg-blue/10 transition-all"><ArchiveRestore size={11} /></button>
                            <button onClick={e => { e.stopPropagation(); setConfirmDeleteConv(c.id) }} className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-all"><Trash2 size={11} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Groupes ── */}
          <div className="pt-2 pb-2 border-t border-surface-border/50 mt-1">
            <div className="flex items-center justify-between px-3 pb-1">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Groupes</p>
              {isAdmin && (
                <button onClick={() => setShowNewChannel(true)} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-blue transition-all" title="Nouveau groupe"><Plus size={12} /></button>
              )}
            </div>
            {loadingCh ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="px-3 py-2 flex gap-2 items-center"><div className="skeleton w-4 h-4 rounded" /><div className="skeleton h-2.5 rounded flex-1" /></div>
              ))
            ) : filteredChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-muted">{isAdmin ? 'Créez votre premier groupe' : 'Aucun groupe'}</p>
            ) : (
              filteredChannels.map(ch => {
                const isActive = active?.type === 'channel' && active.channel.id === ch.id
                return (
                  <div key={ch.id} className="group/ch relative">
                    <button onClick={() => openChannel(ch)}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all', isActive ? 'bg-blue/10 text-blue' : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary')}>
                      <Hash size={13} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{ch.nom}</p>
                      </div>
                      {(channelUnreads[ch.id] ?? 0) > 0 && !isActive && (
                        <span className="w-4 h-4 rounded-full bg-blue text-white text-2xs flex items-center justify-center font-bold flex-shrink-0">
                          {channelUnreads[ch.id]}
                        </span>
                      )}
                    </button>
                    {isAdmin && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/ch:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); handleArchiveChannel(ch) }} className="p-1.5 rounded-md bg-surface-border hover:bg-amber-500/15 text-text-muted hover:text-amber-400 transition-all" title="Archiver"><Archive size={10} /></button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteCh(ch) }} className="p-1.5 rounded-md bg-surface-border hover:bg-red/15 text-text-muted hover:text-red transition-all" title="Supprimer"><Trash2 size={10} /></button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {isAdmin && archivedChannels.length > 0 && (
              <div className="mt-1">
                <button onClick={() => setShowArchivedCh(v => !v)} className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
                  <Archive size={10} /><span>Archivés ({archivedChannels.length})</span>
                  <ChevronDown size={10} className={cn('ml-auto transition-transform', showArchivedCh && 'rotate-180')} />
                </button>
                {showArchivedCh && archivedChannels.map(ch => (
                  <div key={ch.id} className="group/arch relative">
                    <div className="flex items-center gap-2 px-3 py-2 opacity-50"><Archive size={12} className="text-text-muted flex-shrink-0" /><p className="text-xs text-text-muted truncate">{ch.nom}</p></div>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/arch:opacity-100 transition-opacity">
                      <button onClick={() => handleUnarchiveChannel(ch)} className="p-1.5 rounded-md bg-surface-border hover:bg-green/15 text-text-muted hover:text-green transition-all" title="Désarchiver"><ArchiveRestore size={10} /></button>
                      <button onClick={() => setConfirmDeleteCh(ch)} className="p-1.5 rounded-md bg-surface-border hover:bg-red/15 text-text-muted hover:text-red transition-all" title="Supprimer"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Main area ════════════════════════════════════════════ */}
      {!active ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-blue/10 flex items-center justify-center"><MessageSquare size={26} className="text-blue" /></div>
          <p className="text-text-primary font-medium text-sm">Sélectionnez une conversation</p>
          <p className="text-xs text-text-muted max-w-xs">Choisissez un message direct ou un groupe dans la liste pour commencer.</p>
        </div>

      ) : active.type === 'dm' ? (
        /* ── DM View ── */
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 flex items-center gap-2.5 px-4 border-b border-surface-border bg-background-secondary flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue">
              {active.conv.interlocuteur ? initiales(active.conv.interlocuteur.prenom, active.conv.interlocuteur.nom) : '?'}
            </div>
            <p className="text-sm font-medium text-text-primary flex-1">{active.conv.interlocuteur ? `${active.conv.interlocuteur.prenom} ${active.conv.interlocuteur.nom}` : '—'}</p>
            <div className="flex items-center gap-1 text-2xs text-text-muted"><Lock size={9} /> Chiffré</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(m => {
              const isMe = m.auteur_id === user?.id
              return (
                <div key={m.id} className={cn('flex gap-2 group', isMe && 'flex-row-reverse')} onMouseEnter={() => setHoveredMsg(m.id)} onMouseLeave={() => setHoveredMsg(null)}>
                  {!isMe && <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0 mt-1">{(m as any).auteur?.prenom?.[0]}</div>}
                  <div className={cn('max-w-xs lg:max-w-md flex flex-col gap-0.5', isMe && 'items-end')}>
                    {m.contenu && <div className={cn('px-3 py-2 rounded-xl text-xs leading-relaxed', isMe ? 'bg-blue text-white rounded-tr-sm' : 'bg-surface text-text-primary rounded-tl-sm border border-surface-border')}>{m.contenu}</div>}
                    {m.pieces_jointes && m.pieces_jointes.length > 0 && (
                      <div className="space-y-1">
                        {m.pieces_jointes.map((pj, i) => (
                          <button key={i} onClick={() => downloadAttachment(pj)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all', isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-surface hover:bg-surface-hover border border-surface-border text-text-secondary')}>
                            <FileText size={12} /><span className="truncate max-w-[140px]">{pj.nom}</span><span className="opacity-60">{formatBytes(pj.taille)}</span><Download size={11} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={cn('flex items-center gap-1 px-1', isMe && 'flex-row-reverse')}>
                      <span className="text-2xs text-text-muted">{formatRelativeTime(m.created_at)}</span>
                      {isMe && (m.lu ? <CheckCheck size={12} className="text-blue" /> : <Check size={12} className="text-text-muted" />)}
                    </div>
                  </div>
                  {isMe && hoveredMsg === m.id && (
                    <button onClick={() => { supabase.from('messages_prives').delete().eq('id', m.id); setMessages(prev => prev.filter(x => x.id !== m.id)) }} className="self-center p-1 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={13} /></button>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-3 pb-3 pt-2 border-t border-surface-border flex-shrink-0 space-y-2">
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary">
                    <Paperclip size={11} /><span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-text-muted hover:text-red transition-colors"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-xl overflow-hidden px-3 py-2">
              <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={e => { const files = Array.from(e.target.files || []); if (files.length) setPendingFiles(p => [...p, ...files]); e.target.value = '' }} />
              <label onClick={() => fileInputRef.current?.click()} className="cursor-pointer p-1 rounded-lg text-text-muted hover:text-blue transition-colors flex-shrink-0"><Paperclip size={15} /></label>
              <input type="text" placeholder="Écrire un message…" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none" />
              <button onClick={sendMessage} disabled={(!newMsg.trim() && pendingFiles.length === 0) || sending} className="p-1.5 rounded-lg text-blue hover:bg-blue/10 disabled:opacity-40 transition-all flex-shrink-0">{sending ? <div className="w-3.5 h-3.5 rounded-full border-2 border-blue border-t-transparent animate-spin" /> : <Send size={15} />}</button>
            </div>
          </div>
        </div>

      ) : (
        /* ── Channel View ── */
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-surface-border bg-background-secondary flex-shrink-0">
            <Hash size={16} className="text-blue flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{active.channel.nom}</p>
              {active.channel.description && <p className="text-2xs text-text-muted truncate">{active.channel.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowMembersPanel(v => !v)} className={cn('p-1.5 rounded-lg transition-all text-text-muted', showMembersPanel ? 'bg-blue/10 text-blue' : 'hover:bg-surface-hover hover:text-text-primary')} title="Membres"><Users size={15} /></button>
              {isAdmin && (
                <div className="relative group/menu">
                  <button className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all"><MoreHorizontal size={15} /></button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-background-secondary border border-surface-border rounded-xl shadow-xl z-30 opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all overflow-hidden">
                    <button onClick={() => setEditingChannel(active.channel)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"><Settings2 size={12} /> Modifier le groupe</button>
                    <button onClick={() => handleArchiveChannel(active.channel)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-surface-hover transition-all"><Archive size={12} /> Archiver</button>
                    <div className="h-px bg-surface-border mx-2" />
                    <button onClick={() => setConfirmDeleteCh(active.channel)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red hover:bg-red/10 transition-all"><Trash2 size={12} /> Supprimer le groupe</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
                {channelMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <Hash size={32} className="text-text-muted mb-3" />
                    <p className="text-sm font-medium text-text-primary">Début de #{active.channel.nom}</p>
                    <p className="text-xs text-text-muted mt-1">Soyez le premier à envoyer un message</p>
                  </div>
                ) : (
                  msgsWithSeparators.map((item, idx) => {
                    if ('separator' in item) return (
                      <div key={`sep-${idx}`} className="flex items-center gap-3 py-4">
                        <div className="flex-1 h-px bg-surface/70" />
                        <span className="text-[11px] font-medium tracking-widest uppercase text-text-muted px-3 flex-shrink-0">{item.label}</span>
                        <div className="flex-1 h-px bg-surface/70" />
                      </div>
                    )
                    const msg = item as ChannelMessage
                    const isMe = msg.auteur_id === user?.id
                    const isFondateur = msg.auteur?.role === 'fondateur' || msg.auteur?.role === 'super_admin'
                    const isEditing = editingMessage === msg.id
                    return (
                      <div key={msg.id} className={cn('group flex gap-2.5 py-1 px-2 rounded-xl hover:bg-surface-hover/40 transition-all', isMe && 'flex-row-reverse')}>
                        {!isMe && <div className="w-7 h-7 rounded-full bg-blue/20 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0 mt-0.5">{msg.auteur ? initiales(msg.auteur.prenom, msg.auteur.nom) : '?'}</div>}
                        <div className={cn('max-w-[70%] min-w-0', isMe && 'items-end flex flex-col')}>
                          <div className={cn('flex items-center gap-1.5 mb-1', isMe ? 'justify-end' : 'justify-start')}>
                            {!isMe && <span className={cn('text-xs font-semibold', isFondateur ? 'text-blue' : 'text-text-primary')}>{msg.auteur ? `${msg.auteur.prenom} ${msg.auteur.nom}` : 'Inconnu'}</span>}
                            <span className="text-[11px] text-text-muted">{formatShortTime(msg.created_at)}</span>
                            {msg.modifie && <span className="text-[11px] text-text-muted italic">(modifié)</span>}
                          </div>
                          {isEditing ? (
                            <div className="w-full">
                              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="input-field w-full text-xs resize-none min-h-[60px]" autoFocus />
                              <div className="flex gap-2 mt-1">
                                <button onClick={async () => { await supabase.from('channel_messages').update({ contenu: editContent.trim(), modifie: true }).eq('id', editingMessage!); setEditingMessage(null); if (activeChannel) await loadChannelMessages(activeChannel.id) }} className="btn-primary text-xs py-1">Enregistrer</button>
                                <button onClick={() => setEditingMessage(null)} className="btn-secondary text-xs py-1">Annuler</button>
                              </div>
                            </div>
                          ) : (
                            <div className={cn('px-3 py-2 rounded-2xl text-sm leading-relaxed break-words', isMe ? 'bg-blue text-white rounded-tr-sm' : isFondateur ? 'bg-blue/10 text-text-primary border border-blue/20 rounded-tl-sm' : 'bg-surface border border-surface-border text-text-primary rounded-tl-sm')}>
                              {msg.contenu}
                            </div>
                          )}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {msg.attachments.map(att => (
                                <button key={att.id} onClick={() => handleDownloadChannelAttachment(att)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all', isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-surface hover:bg-surface-hover border border-surface-border text-text-secondary')}>
                                  <Download size={12} /><span className="truncate max-w-[180px]">{att.nom}</span>{att.taille && <span className="opacity-70">{formatBytes(att.taille)}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={cn('flex flex-wrap gap-1 mt-1', isMe && 'justify-end')}>
                              {msg.reactions.map(r => (
                                <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all', r.mine ? 'bg-blue/15 border-blue/40 text-blue' : 'bg-surface border-surface-border text-text-secondary hover:border-blue/30')}>
                                  <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Hover actions */}
                        <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all self-start mt-1', isMe && 'flex-row-reverse')}>
                          <div className="relative">
                            <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all"><Smile size={13} /></button>
                            {showEmojiPicker === msg.id && (
                              <div className={cn('absolute top-full mt-1 bg-background-secondary border border-surface-border rounded-xl shadow-xl z-20 p-2 flex gap-1', isMe ? 'right-0' : 'left-0')}>
                                {QUICK_EMOJIS.map(e => <button key={e} onClick={() => toggleReaction(msg.id, e)} className="text-base hover:scale-125 transition-transform p-0.5">{e}</button>)}
                              </div>
                            )}
                          </div>
                          {isMe && !isEditing && (
                            <>
                              <button onClick={() => { setEditingMessage(msg.id); setEditContent(msg.contenu) }} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all"><Edit2 size={13} /></button>
                              <button onClick={() => { supabase.from('channel_messages').delete().eq('id', msg.id); setChannelMessages(prev => prev.filter(m => m.id !== msg.id)) }} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-red transition-all"><Trash2 size={13} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Channel input */}
              {canSend ? (
                <div className="px-4 pb-4 pt-2 border-t border-surface-border bg-background-secondary flex-shrink-0">
                  {pendingChannelFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pendingChannelFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary">
                          <Paperclip size={11} /><span className="max-w-[120px] truncate">{f.name}</span>
                          <button onClick={() => setPendingChannelFiles(p => p.filter((_, j) => j !== i))} className="text-text-muted hover:text-red transition-colors ml-0.5"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2 bg-surface border border-surface-border rounded-xl overflow-hidden px-3 py-2">
                    <input ref={chFileInputRef} type="file" multiple className="sr-only" onChange={e => { const files = Array.from(e.target.files || []); if (files.length) setPendingChannelFiles(p => [...p, ...files]); e.target.value = '' }} />
                    <label onClick={() => chFileInputRef.current?.click()} className="cursor-pointer p-1 rounded-lg text-text-muted hover:text-blue transition-colors flex-shrink-0 mb-0.5"><Paperclip size={16} /></label>
                    <textarea value={newChannelMsg} onChange={e => setNewChannelMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChannelMessage() } }} placeholder={`Message dans #${active.channel.nom}…`} rows={1} className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none min-h-[24px] max-h-[120px] py-0.5 leading-6" style={{ scrollbarWidth: 'none' }} />
                    <button onClick={sendChannelMessage} disabled={sendingChannel || (!newChannelMsg.trim() && pendingChannelFiles.length === 0)} className={cn('p-1.5 rounded-lg transition-all flex-shrink-0 mb-0.5', sendingChannel ? 'opacity-50' : 'text-blue hover:bg-blue/10')}>
                      {sendingChannel ? <div className="w-4 h-4 rounded-full border-2 border-blue border-t-transparent animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-2xs text-text-muted mt-1.5 ml-1">Entrée pour envoyer · Maj+Entrée pour aller à la ligne</p>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-surface-border bg-background-secondary text-center">
                  <p className="text-xs text-text-muted flex items-center justify-center gap-1.5"><Lock size={12} /> Vous n'êtes pas membre de ce groupe</p>
                </div>
              )}
            </div>

            {/* Members panel */}
            {showMembersPanel && (
              <div className="w-52 flex-shrink-0 border-l border-surface-border bg-background-secondary flex flex-col">
                <div className="p-3 border-b border-surface-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Membres ({channelMembers.length})</span>
                  {isAdmin && <button onClick={() => setEditingChannel(active.channel)} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-blue transition-all"><Users size={13} /></button>}
                </div>
                <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                  {channelMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-blue/20 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0">{m.user ? initiales(m.user.prenom, m.user.nom) : '?'}</div>
                      <div className="min-w-0 flex-1"><p className="text-xs text-text-primary truncate">{m.user?.prenom} {m.user?.nom}</p><p className="text-2xs text-text-muted capitalize">{m.user?.role?.replace('_', ' ')}</p></div>
                      {(m.user?.role === 'fondateur' || m.user?.role === 'super_admin') && <span className="text-2xs text-blue font-medium">Admin</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Modals ═══════════════════════════════════════════════ */}

      {/* New DM */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewConv(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-surface-border/80 shadow-2xl overflow-hidden bg-background" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/60">
              <h3 className="text-sm font-semibold text-white">Nouveau message</h3>
              <button onClick={() => setShowNewConv(false)} className="p-2 rounded-xl text-text-disabled hover:text-text-secondary hover:bg-surface transition-all"><X size={14} /></button>
            </div>
            <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
              {dmUsers.filter(u => u.id !== user?.id).map(u => (
                <button key={u.id} onClick={() => startConversation(u.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface/40 transition-all text-left">
                  <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0">{initiales(u.prenom, u.nom)}</div>
                  <div><p className="text-xs font-medium text-text-secondary">{u.prenom} {u.nom}</p><p className="text-[11px] text-text-disabled capitalize">{u.role}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New/Edit channel */}
      {(showNewChannel || editingChannel) && (
        <ChannelModal
          onClose={() => { setShowNewChannel(false); setEditingChannel(null) }}
          onSaved={() => loadChannels(true)}
          entiteId={entiteActive?.id || user?.entite_principale_id || ''}
          allUsers={channelUsers}
          editing={editingChannel}
          currentMembers={editingChannel ? channelMembers : undefined}
        />
      )}

      {/* Delete channel confirm */}
      {confirmDeleteCh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteCh(null)}>
          <div className="w-full max-w-sm bg-background-secondary border border-surface-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center flex-shrink-0"><AlertTriangle size={18} className="text-red" /></div>
                <div><h3 className="text-sm font-semibold text-text-primary">Supprimer #{confirmDeleteCh.nom} ?</h3><p className="text-xs text-text-muted mt-1 leading-relaxed">Tous les messages et fichiers seront supprimés définitivement. Cette action est irréversible.</p></div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDeleteCh(null)} className="flex-1 py-2 rounded-xl text-xs font-medium text-text-secondary bg-surface hover:bg-surface-hover border border-surface-border transition-all">Annuler</button>
                <button onClick={() => handleDeleteChannel(confirmDeleteCh)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-red hover:bg-red/80 transition-all shadow-lg shadow-red/20">Supprimer définitivement</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete DM confirm */}
      {confirmDeleteConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteConv(null)}>
          <div className="w-full max-w-sm bg-background-secondary border border-surface-border rounded-xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Supprimer la conversation ?</h3>
            <p className="text-xs text-text-muted mb-5">Tous les messages seront définitivement supprimés.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteConv(null)} className="btn-secondary flex-1 text-xs">Annuler</button>
              <button onClick={() => deleteConversation(confirmDeleteConv)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-red/10 border border-red/20 text-red hover:bg-red/20 transition-all font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Emoji picker backdrop */}
      {showEmojiPicker && <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(null)} />}
    </div>
  )
}
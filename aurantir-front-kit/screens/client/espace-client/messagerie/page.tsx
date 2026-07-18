// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatRelativeTime, initiales, cn } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  Send, Plus, Search, MessageSquare, Paperclip, X,
  Download, FileText, Trash2, Check, CheckCheck, ArrowLeft, Lock,
} from 'lucide-react'
// Alias local (évite la dépendance @supabase dans le kit présentationnel)
type RealtimeChannel = any

interface Conversation {
  id: string; participants: string[]
  created_at: string; dernierMessage?: string; dernierMessageAt?: string
  interlocuteur?: { id: string; prenom: string; nom: string; role: string }
  unread?: number
}
interface PieceJointe { nom: string; path: string; taille: number; mime: string }
interface Message {
  id: string; conversation_id: string; auteur_id: string
  contenu: string; lu: boolean; created_at: string
  pieces_jointes?: PieceJointe[]
  auteur?: { prenom: string; nom: string }
}
interface UserItem { id: string; prenom: string; nom: string; role: string }

function formatBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

// Normalise (sans accents, minuscules) pour identifier les contacts indépendamment des variantes orthographiques
function normalizeName(prenom: string, nom: string) {
  return `${prenom} ${nom}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Seuls ces interlocuteurs sont visibles par les clients pour démarrer une conversation
const CLIENT_VISIBLE_STAFF = new Set(['abdou hamid toure', 'abdoul hamid toure'])

// Intitulés affichés au client (au lieu du rôle interne brut)
const STAFF_ROLE_LABELS: Record<string, string> = {
  'abdou hamid toure': 'Responsable de la Relation Client',
  'abdoul hamid toure': 'Responsable de la Relation Client',
  'salam toure': 'Directeur des Opérations',
  'thierno sadou diallo': 'CTO (Chief Technology Officer)',
}

export default function ClientMessageriePage() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showNewConv, setShowNewConv] = useState(false)
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realtimeRef = useRef<RealtimeChannel | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const loadConvsRef = useRef<(silent?: boolean) => Promise<void>>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadConvsRef.current = loadConversations })
  useEffect(() => {
    loadConversations()
    pollRef.current = setInterval(() => loadConvsRef.current?.(true), 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!active) return
    const convId = active.id
    loadMessages(convId); markAsRead(convId)
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
    realtimeRef.current = supabase.channel(`dm-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_prives', filter: `conversation_id=eq.${convId}` },
        () => { loadMessages(convId); markAsRead(convId); loadConvsRef.current?.(true) })
      .subscribe()
    const t = setInterval(() => { loadMessages(convId); markAsRead(convId) }, 3000)
    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
      clearInterval(t)
    }
  }, [active?.id]) // eslint-disable-line

  async function getCurrentUserId(): Promise<string | null> {
    if (currentUserIdRef.current) return currentUserIdRef.current
    const { data: { user: au } } = await supabase.auth.getUser()
    if (!au) return null
    const { data } = await supabase.from('users').select('id').eq('auth_user_id', au.id).single()
    if (data) currentUserIdRef.current = data.id
    return data?.id ?? null
  }

  async function loadConversations(silent = false) {
    if (!silent) setLoading(true)
    const uid = await getCurrentUserId()
    if (!uid) { if (!silent) setLoading(false); return }
    const { data } = await supabase.from('conversations').select('*, messages_prives(contenu, created_at, auteur_id, lu)').contains('participants', [uid]).order('created_at', { ascending: false })
    const usersMap: Record<string, UserItem> = {}
    if (data) {
      const all = Array.from(new Set(data.flatMap((c: any) => c.participants || [])))
      const { data: ud } = await supabase.from('users').select('id, prenom, nom, role').in('id', all)
      ;(ud || []).forEach((u: UserItem) => { usersMap[u.id] = u })
    }
    const enriched: Conversation[] = (data || []).map((c: any) => {
      const interId = (c.participants || []).find((p: string) => p !== uid)
      const msgs = (c.messages_prives || []) as { contenu: string; created_at: string; auteur_id: string; lu: boolean }[]
      const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const last = sorted[0]
      return {
        id: c.id, participants: c.participants, created_at: c.created_at,
        dernierMessage: last?.contenu, dernierMessageAt: last?.created_at,
        unread: msgs.filter(m => m.auteur_id !== uid && !m.lu).length,
        interlocuteur: interId ? usersMap[interId] as unknown as Conversation['interlocuteur'] : undefined,
      }
    })
    setConversations(enriched)
    setLoading(false)
    setActive(prev => prev ? enriched.find(c => c.id === prev.id) || prev : prev)
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase.from('messages_prives').select('*, auteur:users!auteur_id(prenom, nom)').eq('conversation_id', convId).order('created_at')
    setMessages((data || []) as Message[])
  }

  async function markAsRead(convId: string) {
    const uid = await getCurrentUserId()
    if (!uid) return
    await supabase.from('messages_prives').update({ lu: true }).eq('conversation_id', convId).neq('auteur_id', uid).eq('lu', false)
  }

  function openConversation(conv: Conversation) {
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))
    setActive(conv)
  }

  async function sendMessage() {
    if (!active || (!newMsg.trim() && pendingFiles.length === 0) || sending) return
    setSending(true)
    const uid = await getCurrentUserId()
    if (!uid) { setSending(false); return }
    const pjs: PieceJointe[] = []
    for (const f of pendingFiles) {
      const safe = f.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
      const path = `${active.id}/${Date.now()}-${safe}`
      const { storedPath, error } = await uploadToStorage(supabase, 'messagerie-prive', path, f)
      if (!error) pjs.push({ nom: f.name, path: storedPath, taille: f.size, mime: f.type })
    }
    await supabase.from('messages_prives').insert({ conversation_id: active.id, auteur_id: uid, contenu: newMsg.trim(), lu: false, pieces_jointes: pjs })
    setNewMsg(''); setPendingFiles([]); setSending(false)
    await loadMessages(active.id)
    await loadConversations(true)
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
    if (data) { await loadConversations(); setActive(data as Conversation); await loadConversations() }
    setShowNewConv(false)
  }

  async function deleteMessage(id: string) {
    await supabase.from('messages_prives').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  function openNewConvModal() {
    setShowNewConv(true)
    supabase.from('users').select('id, prenom, nom, role').neq('role', 'client_externe').eq('statut', 'actif').order('prenom')
      .then(({ data }) => setStaffUsers(((data || []) as UserItem[]).filter(u => CLIENT_VISIBLE_STAFF.has(normalizeName(u.prenom, u.nom)))))
  }

  const uid = currentUserIdRef.current
  const filteredConvs = conversations.filter(c => !search || `${c.interlocuteur?.prenom} ${c.interlocuteur?.nom}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Messagerie</h1>
        <p className="text-sm text-white/40 mt-0.5">Échangez avec l&apos;équipe Sama Digital</p>
      </div>

      <div className="flex border border-white/5 rounded-2xl overflow-hidden bg-white/[0.02] h-[70vh] min-h-[420px]">
        {/* Liste des conversations */}
        <div className={cn('w-full sm:w-72 flex-shrink-0 flex flex-col border-r border-white/5', active && 'hidden sm:flex')}>
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Conversations</p>
              <button onClick={openNewConvModal} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue transition-colors" title="Nouveau message">
                <Plus size={14} />
              </button>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="w-full pl-7 py-1.5 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder:text-white/25 focus:outline-none focus:border-blue/40 transition-colors" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex-1 space-y-1.5"><div className="h-2.5 bg-white/5 rounded w-20 animate-pulse" /><div className="h-2.5 bg-white/5 rounded w-28 animate-pulse" /></div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare size={28} className="mx-auto mb-3 text-white/10" />
                <p className="text-sm text-white/30">Aucune conversation</p>
                <button onClick={openNewConvModal} className="mt-3 text-xs text-blue hover:underline">Démarrer une conversation</button>
              </div>
            ) : (
              filteredConvs.map(c => (
                <button key={c.id} onClick={() => openConversation(c)}
                  className={cn('w-full p-3 flex items-center gap-2.5 hover:bg-white/[0.04] transition-colors text-left border-l-2',
                    active?.id === c.id ? 'bg-blue/5 border-blue' : 'border-transparent')}>
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue">
                      {c.interlocuteur ? initiales(c.interlocuteur.prenom, c.interlocuteur.nom) : '?'}
                    </div>
                    {(c.unread ?? 0) > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue text-white text-2xs flex items-center justify-center font-bold">{c.unread}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs truncate', (c.unread ?? 0) > 0 ? 'font-semibold text-white' : 'font-medium text-white/70')}>
                      {c.interlocuteur ? `${c.interlocuteur.prenom} ${c.interlocuteur.nom}` : 'Inconnu'}
                    </p>
                    {c.dernierMessage && <p className="text-2xs text-white/30 truncate">{c.dernierMessage}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation active */}
        {!active ? (
          <div className="hidden sm:flex flex-1 items-center justify-center flex-col gap-3 text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-blue/10 flex items-center justify-center"><MessageSquare size={26} className="text-blue" /></div>
            <p className="text-white font-medium text-sm">Sélectionnez une conversation</p>
            <p className="text-xs text-white/30 max-w-xs">Choisissez une conversation dans la liste ou démarrez-en une nouvelle.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-12 flex items-center gap-2.5 px-4 border-b border-white/5 flex-shrink-0">
              <button onClick={() => setActive(null)} className="sm:hidden p-1 -ml-1 text-white/40 hover:text-white"><ArrowLeft size={16} /></button>
              <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue">
                {active.interlocuteur ? initiales(active.interlocuteur.prenom, active.interlocuteur.nom) : '?'}
              </div>
              <p className="text-sm font-medium text-white flex-1 truncate">{active.interlocuteur ? `${active.interlocuteur.prenom} ${active.interlocuteur.nom}` : '—'}</p>
              <div className="flex items-center gap-1 text-2xs text-white/30"><Lock size={9} /> Chiffré</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => {
                const isMe = m.auteur_id === uid
                return (
                  <div key={m.id} className={cn('flex gap-2 group', isMe && 'flex-row-reverse')} onMouseEnter={() => setHoveredMsg(m.id)} onMouseLeave={() => setHoveredMsg(null)}>
                    {!isMe && <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0 mt-1">{m.auteur?.prenom?.[0]}</div>}
                    <div className={cn('max-w-[75%] flex flex-col gap-0.5', isMe && 'items-end')}>
                      {m.contenu && <div className={cn('px-3 py-2 rounded-xl text-xs leading-relaxed', isMe ? 'bg-blue text-white rounded-tr-sm' : 'bg-white/5 text-white rounded-tl-sm border border-white/5')}>{m.contenu}</div>}
                      {m.pieces_jointes && m.pieces_jointes.length > 0 && (
                        <div className="space-y-1">
                          {m.pieces_jointes.map((pj, i) => (
                            <button key={i} onClick={() => downloadAttachment(pj)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all', isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/70')}>
                              <FileText size={12} /><span className="truncate max-w-[140px]">{pj.nom}</span><span className="opacity-60">{formatBytes(pj.taille)}</span><Download size={11} />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={cn('flex items-center gap-1 px-1', isMe && 'flex-row-reverse')}>
                        <span className="text-2xs text-white/30">{formatRelativeTime(m.created_at)}</span>
                        {isMe && (m.lu ? <CheckCheck size={12} className="text-blue" /> : <Check size={12} className="text-white/30" />)}
                      </div>
                    </div>
                    {isMe && hoveredMsg === m.id && (
                      <button onClick={() => deleteMessage(m.id)} className="self-center p-1 rounded-lg text-white/30 hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={13} /></button>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-3 pb-3 pt-2 border-t border-white/5 flex-shrink-0 space-y-2">
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/60">
                      <Paperclip size={11} /><span className="truncate max-w-[120px]">{f.name}</span>
                      <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-white/30 hover:text-red transition-colors"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden px-3 py-2">
                <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={e => { const files = Array.from(e.target.files || []); if (files.length) setPendingFiles(p => [...p, ...files]); e.target.value = '' }} />
                <label onClick={() => fileInputRef.current?.click()} className="cursor-pointer p-1 rounded-lg text-white/30 hover:text-blue transition-colors flex-shrink-0"><Paperclip size={15} /></label>
                <input type="text" placeholder="Écrire un message…" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none" />
                <button onClick={sendMessage} disabled={(!newMsg.trim() && pendingFiles.length === 0) || sending} className="p-1.5 rounded-lg text-blue hover:bg-blue/10 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <div className="w-3.5 h-3.5 rounded-full border-2 border-blue border-t-transparent animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nouveau message */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNewConv(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-[#0D1017]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Nouveau message</h3>
              <button onClick={() => setShowNewConv(false)} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all"><X size={14} /></button>
            </div>
            <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
              {staffUsers.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">Aucun contact disponible</p>
              ) : staffUsers.map(u => (
                <button key={u.id} onClick={() => startConversation(u.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
                  <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0">{initiales(u.prenom, u.nom)}</div>
                  <div><p className="text-xs font-medium text-white">{u.prenom} {u.nom}</p><p className="text-2xs text-white/30">{STAFF_ROLE_LABELS[normalizeName(u.prenom, u.nom)] || u.role?.replace('_', ' ')}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
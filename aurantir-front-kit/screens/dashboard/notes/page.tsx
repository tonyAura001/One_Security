// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  Plus, Search, Pin, Edit2, Trash2, X, Lock, Users,
  Globe, Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Undo2, StickyNote, Paperclip, FileText, Image as ImageIcon, File,
  ShieldCheck, Eye, Download, Clock, ThumbsUp, ThumbsDown,
  MessageCircle, Reply, Send, MoreHorizontal, Archive, ArchiveRestore,
  FileArchive, NotebookPen,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface PieceJointe { nom: string; url_stockage: string; taille: number; type: string }
interface NoteReaction { user_id: string; type: string }
interface NoteCommentReaction { user_id: string }
interface NoteCommentaire {
  id: string; note_id: string; user_id: string; parent_id: string | null
  contenu: string; created_at: string
  auteur: { prenom: string; nom: string }
  reactions: NoteCommentReaction[]
}
interface Note {
  id: string; entite_id: string; titre: string; contenu: string
  couleur: string; est_epinglee: boolean; is_archived: boolean
  visibilite: 'privee' | 'equipe' | 'fondateurs' | 'public'
  projet_id: string | null; client_id: string | null; client_nom: string | null
  tags: string[]; pieces_jointes?: PieceJointe[]
  created_by: string; created_at: string; updated_at: string
  auteur?: { id: string; prenom: string; nom: string }
  projet?: { id: string; titre: string } | null
  client?: { id: string; nom_entreprise: string } | null
}
interface Projet { id: string; titre: string }
interface Client { id: string; nom_entreprise: string }

type Tab    = 'actives' | 'archives'
type Filtre = 'toutes' | 'mes-notes' | 'epinglees'
type Visibilite = keyof typeof VISIBILITE_CFG

// ── Constantes ─────────────────────────────────────────────────
const COULEURS = [
  { hex: '#3B82F6', label: 'Bleu' },
  { hex: '#8B5CF6', label: 'Violet' },
  { hex: '#10B981', label: 'Vert' },
  { hex: '#F59E0B', label: 'Ambre' },
  { hex: '#EF4444', label: 'Rouge' },
  { hex: '#F43F5E', label: 'Rose' },
]

const VISIBILITE_CFG = {
  privee:     { icon: <Lock size={11} />,        label: 'Privé',      desc: 'Visible uniquement par moi',         accentCls: 'text-text-muted',  tagCls: 'bg-surface text-text-muted border-surface-border' },
  equipe:     { icon: <Users size={11} />,       label: 'Équipe',     desc: 'Visible par tous les membres',       accentCls: 'text-blue-400',   tagCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  fondateurs: { icon: <ShieldCheck size={11} />, label: 'Fondateurs', desc: 'Fondateurs et administrateurs',      accentCls: 'text-purple-400', tagCls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  public:     { icon: <Eye size={11} />,         label: 'Public',     desc: 'Visible par tous, dont les clients', accentCls: 'text-emerald-400',tagCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
} as const

// ── Utilitaires ───────────────────────────────────────────────
function initiales(prenom: string, nom: string) { return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase() }
function stripHtml(html: string) { return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
function formatBytes(b: number) { return b < 1024 ? `${b} o` : b < 1048576 ? `${(b/1024).toFixed(0)} Ko` : `${(b/1048576).toFixed(1)} Mo` }

function formatDateHeure(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function wasModified(note: Note) {
  return new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 90_000
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon size={13} className="text-emerald-400" />
  if (type.includes('pdf') || type.includes('word') || type.includes('text')) return <FileText size={13} className="text-blue-400" />
  return <File size={13} className="text-text-muted" />
}

function normalizePJ(raw: any): PieceJointe[] {
  if (!raw) return []
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return Array.isArray(raw) ? raw : []
}

// ── Hook: click outside ───────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose, active])
}

// ══════════════════════════════════════════════════════════════
// ── Main Page ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function NotesPage() {
  const { entiteActive, user } = useAppStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const [tab,        setTab]        = useState<Tab>('actives')
  const [notes,      setNotes]      = useState<Note[]>([])
  const [projets,    setProjets]    = useState<Projet[]>([])
  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filtre,     setFiltre]     = useState<Filtre>('toutes')
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<Note | null>(null)
  const [viewTarget, setViewTarget] = useState<Note | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('notes')
      .select('*, auteur:users!created_by(id, prenom, nom), projet:projets!projet_id(id, titre), client:entreprises_clientes!client_id(id, nom_entreprise)')
      .eq('is_archived', tab === 'archives')
      .order('est_epinglee', { ascending: false })
      .order('updated_at', { ascending: false })
    if (entiteActive?.id) q = q.eq('entite_id', entiteActive.id)
    const { data } = await q
    setNotes((data || []).map((n: any) => ({ ...n, pieces_jointes: normalizePJ(n.pieces_jointes) })) as Note[])
    if (entiteActive?.id) {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('projets').select('id, titre').eq('entite_id', entiteActive.id).order('titre'),
        supabase.from('entreprises_clientes').select('id, nom_entreprise').eq('entite_id', entiteActive.id).order('nom_entreprise'),
      ])
      setProjets((p || []) as Projet[])
      setClients((c || []) as Client[])
    }
    setLoading(false)
  }, [entiteActive?.id, tab])

  useEffect(() => { loadAll() }, [loadAll])

  async function togglePin(note: Note) {
    await supabase.from('notes').update({ est_epinglee: !note.est_epinglee }).eq('id', note.id)
    loadAll()
  }

  async function archiveNote(id: string) {
    await supabase.from('notes').update({ is_archived: true, est_epinglee: false }).eq('id', id)
    loadAll()
  }

  async function unarchiveNote(id: string) {
    await supabase.from('notes').update({ is_archived: false }).eq('id', id)
    loadAll()
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setConfirmDel(null)
    loadAll()
  }

  const filtered = notes.filter(n => {
    if (filtre === 'mes-notes' && n.auteur?.id !== user?.id) return false
    if (filtre === 'epinglees' && !n.est_epinglee) return false
    if (search) {
      const q = search.toLowerCase()
      return n.titre.toLowerCase().includes(q) || stripHtml(n.contenu).toLowerCase().includes(q)
    }
    return true
  })

  const pinned   = filtered.filter(n => n.est_epinglee)
  const unpinned = filtered.filter(n => !n.est_epinglee)

  return (
    <>
      <style>{`
        .tiptap-editor .ProseMirror { outline: none; min-height: 180px; font-size: 0.875rem; line-height: 1.7; color: rgb(var(--rgb-text-secondary)); }
        .tiptap-editor .ProseMirror p { margin-bottom: 0.6rem; }
        .tiptap-editor .ProseMirror p:last-child { margin-bottom: 0; }
        .tiptap-editor .ProseMirror h2 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 0.75rem; color: rgb(var(--rgb-text-primary)); }
        .tiptap-editor .ProseMirror h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; margin-top: 0.625rem; color: rgb(var(--rgb-text-primary)); }
        .tiptap-editor .ProseMirror h2:first-child, .tiptap-editor .ProseMirror h3:first-child { margin-top: 0; }
        .tiptap-editor .ProseMirror strong { font-weight: 700; }
        .tiptap-editor .ProseMirror em { font-style: italic; }
        .tiptap-editor .ProseMirror ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .tiptap-editor .ProseMirror ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .tiptap-editor .ProseMirror li { margin-bottom: 0.25rem; }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: rgb(var(--rgb-text-disabled)); float: left; pointer-events: none; height: 0; }
        .note-reader h2 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 1.25rem; color: rgb(var(--rgb-text-primary)); letter-spacing: -0.01em; }
        .note-reader h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.375rem; margin-top: 1rem; color: rgb(var(--rgb-text-secondary)); }
        .note-reader h2:first-child, .note-reader h3:first-child { margin-top: 0; }
        .note-reader strong { font-weight: 600; color: rgb(var(--rgb-text-secondary)); }
        .note-reader em { font-style: italic; color: rgb(var(--rgb-text-muted)); }
        .note-reader ul { list-style: none; padding-left: 0; margin-bottom: 0.75rem; }
        .note-reader ul li::before { content: "–"; color: rgb(var(--rgb-text-disabled)); margin-right: 0.5rem; }
        .note-reader ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.75rem; color: rgb(var(--rgb-text-muted)); }
        .note-reader li { margin-bottom: 0.375rem; }
        .note-reader p { margin-bottom: 0.75rem; }
        .note-reader p:last-child { margin-bottom: 0; }
      `}</style>

      <div className="space-y-5 animate-fade-up">

        {/* ── Header 3-col ── */}
        <div className="flex items-center gap-3">
          {/* Left: title + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <NotebookPen size={15} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-text-primary leading-none">Notes</h1>
                {notes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-surface border border-surface-border text-[11px] font-medium text-text-muted tabular-nums leading-none">
                    {notes.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-disabled mt-0.5 leading-none">Base de connaissance partagée</p>
            </div>
          </div>

          {/* Center: search */}
          <div className="flex-1 relative max-w-sm mx-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-10 py-2 text-xs bg-surface/60 border border-surface-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/15 focus:bg-surface transition-all duration-150"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center text-[10px] text-text-disabled bg-surface border border-surface-border/60 rounded px-1 py-0.5 font-mono leading-none select-none">/</kbd>
          </div>

          {/* Right: new note */}
          {tab === 'actives' && (
            <button
              onClick={() => { setEditTarget(null); setShowModal(true) }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold transition-all duration-150 shadow-md shadow-blue-500/25"
            >
              <Plus size={13} strokeWidth={2.5} /> Nouvelle note
            </button>
          )}
        </div>

        {/* ── Unified controls bar: tabs + filters ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab selector */}
          <div className="flex items-center gap-0.5 p-1 bg-surface/50 border border-surface-border rounded-xl">
            <button
              onClick={() => { setTab('actives'); setFiltre('toutes') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                tab === 'actives'
                  ? 'bg-background text-text-primary shadow-sm border border-surface-border/80'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <NotebookPen size={11} className={tab === 'actives' ? 'text-blue-400' : ''} />
              Actives
            </button>
            <button
              onClick={() => { setTab('archives'); setFiltre('toutes') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                tab === 'archives'
                  ? 'bg-background text-text-primary shadow-sm border border-surface-border/80'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <FileArchive size={11} className={tab === 'archives' ? 'text-amber-400' : ''} />
              Archives
            </button>
          </div>

          {/* Separator + filter pills (actives only) */}
          {tab === 'actives' && (
            <>
              <div className="w-px h-5 bg-surface-border flex-shrink-0" />
              <div className="flex items-center gap-0.5 p-1 bg-surface/50 border border-surface-border rounded-xl">
                {([['toutes', 'Toutes'], ['mes-notes', 'Mes notes'], ['epinglees', 'Épinglées']] as [Filtre, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setFiltre(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                      filtre === v
                        ? 'bg-background text-text-primary shadow-sm border border-surface-border/80'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Archive banner ── */}
        {tab === 'archives' && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
            <FileArchive size={14} />
            <span>Les notes archivées sont masquées de la vue principale. Elles peuvent être restaurées à tout moment.</span>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-surface/40 border border-surface-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mb-4">
              {tab === 'archives' ? <FileArchive size={22} className="text-text-disabled" /> : <StickyNote size={22} className="text-text-disabled" />}
            </div>
            <p className="text-sm font-medium text-text-muted">
              {tab === 'archives' ? 'Aucune note archivée' : 'Aucune note trouvée'}
            </p>
            <p className="text-xs text-text-disabled mt-1 max-w-xs">
              {search ? 'Aucun résultat pour cette recherche.'
                : tab === 'archives' ? 'Les notes que vous archivez apparaîtront ici.'
                : 'Créez votre première note pour commencer.'}
            </p>
            {!search && tab === 'actives' && (
              <button
                onClick={() => { setEditTarget(null); setShowModal(true) }}
                className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs font-medium text-text-secondary transition-all"
              >
                <Plus size={12} /> Nouvelle note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {tab === 'actives' && pinned.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Pin size={11} className="text-amber-400" style={{ fill: 'currentColor' }} />
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Épinglées</span>
                  <div className="flex-1 h-px bg-surface-border/40" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinned.map(n => (
                    <NoteCard key={n.id} note={n} currentUserId={user?.id} isSuperAdmin={isSuperAdmin} tab={tab}
                      onView={() => setViewTarget(n)}
                      onEdit={() => { setEditTarget(n); setShowModal(true) }}
                      onTogglePin={() => togglePin(n)}
                      onArchive={() => archiveNote(n.id)}
                      onUnarchive={() => unarchiveNote(n.id)}
                      onDelete={() => setConfirmDel(n.id)}
                    />
                  ))}
                </div>
              </section>
            )}
            <section className="space-y-3">
              {tab === 'actives' && pinned.length > 0 && unpinned.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Toutes les notes</span>
                  <div className="flex-1 h-px bg-surface-border/40" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(tab === 'actives' ? unpinned : filtered).map(n => (
                  <NoteCard key={n.id} note={n} currentUserId={user?.id} isSuperAdmin={isSuperAdmin} tab={tab}
                    onView={() => setViewTarget(n)}
                    onEdit={() => { setEditTarget(n); setShowModal(true) }}
                    onTogglePin={() => togglePin(n)}
                    onArchive={() => archiveNote(n.id)}
                    onUnarchive={() => unarchiveNote(n.id)}
                    onDelete={() => setConfirmDel(n.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── Read drawer ── */}
      {viewTarget && (
        <NoteReadDrawer
          note={viewTarget}
          currentUserId={user?.id}
          isSuperAdmin={isSuperAdmin}
          tab={tab}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); setShowModal(true) }}
          onDelete={() => { setConfirmDel(viewTarget.id); setViewTarget(null) }}
          onTogglePin={() => { togglePin(viewTarget); setViewTarget(null) }}
          onArchive={() => { archiveNote(viewTarget.id); setViewTarget(null) }}
          onUnarchive={() => { unarchiveNote(viewTarget.id); setViewTarget(null) }}
        />
      )}

      {/* ── Create / edit modal ── */}
      {showModal && (
        <NoteModal
          entiteId={entiteActive?.id || ''}
          projets={projets}
          clients={clients}
          note={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSuccess={() => { setShowModal(false); setEditTarget(null); loadAll() }}
        />
      )}

      {/* ── Confirm delete (super_admin only) ── */}
      {confirmDel && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-background border border-surface-border p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Supprimer définitivement ?</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Cette action est <strong className="text-red-400">permanente et irréversible</strong>. Réservée aux Super Admins.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-text-muted bg-surface hover:bg-surface-hover border border-surface-border transition-all">
                Annuler
              </button>
              <button onClick={() => deleteNote(confirmDel)}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-500/20">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// ── NoteCard ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function NoteCard({ note, currentUserId, isSuperAdmin, tab, onView, onEdit, onTogglePin, onArchive, onUnarchive, onDelete }: {
  note: Note; currentUserId?: string; isSuperAdmin: boolean; tab: Tab
  onView: () => void; onEdit: () => void; onTogglePin: () => void
  onArchive: () => void; onUnarchive: () => void; onDelete: () => void
}) {
  const isOwner     = note.auteur?.id === currentUserId
  const color       = note.couleur || '#3B82F6'
  const preview     = stripHtml(note.contenu)
  const visCfg      = VISIBILITE_CFG[note.visibilite as Visibilite] ?? VISIBILITE_CFG.equipe
  const clientLabel = note.client?.nom_entreprise || note.client_nom
  const pjCount     = note.pieces_jointes?.length ?? 0
  const modified    = wasModified(note)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  return (
    <div
      onClick={onView}
      className="group relative flex flex-col h-full min-h-[176px] rounded-2xl border cursor-pointer
        bg-surface border-surface-border/70
        hover:border-blue-500/30 hover:-translate-y-px
        hover:shadow-lg hover:shadow-black/[0.08] hover:bg-surface-hover/20
        transition-all duration-200 ease-out"
      style={{ borderLeftColor: color, borderLeftWidth: '2px' }}
    >
      {/* Top glow bar */}
      <div className="rounded-t-2xl absolute inset-x-0 top-0 h-[1.5px] opacity-50 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${color}90, transparent 65%)` }} />

      {/* Body */}
      <div className="flex-1 px-5 pt-5 pb-3 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-2 flex-1 tracking-tight">
            {note.titre}
          </h3>
          {/* Actions: pin + menu */}
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-px" onClick={e => e.stopPropagation()}>
            {tab === 'actives' && (
              <button
                onClick={e => { e.stopPropagation(); onTogglePin() }}
                className={`p-1 rounded-md transition-all duration-150 ${
                  note.est_epinglee
                    ? 'text-amber-400'
                    : 'text-text-disabled opacity-0 group-hover:opacity-100 hover:text-amber-400'
                }`}
              >
                <Pin size={12} style={note.est_epinglee ? { fill: '#f59e0b' } : {}} />
              </button>
            )}
            {/* ⋯ Dropdown menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
                className={`p-1.5 rounded-md transition-all duration-150 text-text-disabled hover:text-text-secondary hover:bg-surface-hover ${
                  menuOpen ? 'opacity-100 bg-surface-hover' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-surface-border bg-background shadow-xl py-1 overflow-hidden">
                  {(isOwner || isSuperAdmin) && tab === 'actives' && (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit() }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <Edit2 size={12} /> Modifier
                    </button>
                  )}
                  {tab === 'actives' && (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(false); onTogglePin() }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <Pin size={12} className={note.est_epinglee ? 'text-amber-400' : ''} />
                      {note.est_epinglee ? 'Désépingler' : 'Épingler'}
                    </button>
                  )}
                  {tab === 'actives' ? (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(false); onArchive() }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-amber-400 transition-colors"
                    >
                      <Archive size={12} /> Archiver
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(false); onUnarchive() }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-emerald-400 transition-colors"
                    >
                      <ArchiveRestore size={12} /> Désarchiver
                    </button>
                  )}
                  {isSuperAdmin && (
                    <>
                      <div className="h-px bg-surface-border mx-2 my-1" />
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/8 transition-colors"
                      >
                        <Trash2 size={12} /> Supprimer définitivement
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="relative" style={{ maxHeight: '60px', overflow: 'hidden' }}>
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'rgb(var(--rgb-text-muted) / 0.75)' }}>
              {preview}
            </p>
            <div className="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
          </div>
        )}

        {/* Context tags */}
        {(note.projet?.titre || clientLabel) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.projet?.titre && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Globe size={9} strokeWidth={2} /> {note.projet.titre}
              </span>
            )}
            {clientLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {clientLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-surface-border/40">
        <div className="flex items-center gap-2">
          {/* Author avatar */}
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ring-1 ring-surface-border"
            style={{ background: `${color}18`, color }}>
            {note.auteur ? initiales(note.auteur.prenom, note.auteur.nom) : '?'}
          </div>
          <span className="text-[11px] text-text-disabled flex-1 truncate leading-none">
            {modified ? formatDateHeure(note.updated_at) : formatRelativeTime(note.updated_at)}
          </span>
          {pjCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-text-disabled">
              <Paperclip size={10} /> {pjCount}
            </span>
          )}
          <span className={`flex items-center gap-1 text-[11px] ${visCfg.accentCls} opacity-60`} title={visCfg.label}>
            {visCfg.icon}
          </span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── NoteReadDrawer ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function NoteReadDrawer({ note, currentUserId, isSuperAdmin, tab, onClose, onEdit, onDelete, onTogglePin, onArchive, onUnarchive }: {
  note: Note; currentUserId?: string; isSuperAdmin: boolean; tab: Tab
  onClose: () => void; onEdit: () => void; onDelete: () => void; onTogglePin: () => void
  onArchive: () => void; onUnarchive: () => void
}) {
  const { user } = useAppStore()
  const isOwner     = note.auteur?.id === currentUserId
  const color       = note.couleur || '#3B82F6'
  const visCfg      = VISIBILITE_CFG[note.visibilite as Visibilite] ?? VISIBILITE_CFG.equipe
  const clientLabel = note.client?.nom_entreprise || note.client_nom
  const pjs         = note.pieces_jointes ?? []
  const modified    = wasModified(note)
  const supabase    = createClient()

  const [reactions,    setReactions]    = useState<NoteReaction[]>([])
  const [commentaires, setCommentaires] = useState<NoteCommentaire[]>([])
  const [newComment,   setNewComment]   = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const loadSocial = useCallback(async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('note_reactions').select('user_id, type').eq('note_id', note.id),
      supabase.from('note_commentaires')
        .select('*, auteur:users!user_id(prenom, nom), reactions:note_commentaire_reactions(user_id)')
        .eq('note_id', note.id)
        .order('created_at', { ascending: true }),
    ])
    setReactions((r || []) as NoteReaction[])
    setCommentaires((c || []) as NoteCommentaire[])
  }, [note.id])

  useEffect(() => { loadSocial() }, [loadSocial])

  async function download(pj: PieceJointe) {
    try {
      await downloadFromStorage(supabase, 'notes', pj.url_stockage, pj.nom, 300)
    } catch {}
  }

  async function toggleReaction(type: 'like' | 'dislike') {
    if (!currentUserId) return
    const current = reactions.find(r => r.user_id === currentUserId)
    if (current?.type === type) {
      setReactions(reactions.filter(r => r.user_id !== currentUserId))
    } else {
      setReactions([...reactions.filter(r => r.user_id !== currentUserId), { user_id: currentUserId, type }])
    }
    await supabase.rpc('toggler_reaction_note', { p_id: note.id, p_type: type })
  }

  async function submitComment() {
    if (!newComment.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_note', { p_note_id: note.id, p_contenu: newComment.trim() })
    setNewComment('')
    setSubmitting(false)
    loadSocial()
  }

  const likeCount    = reactions.filter(r => r.type === 'like').length
  const dislikeCount = reactions.filter(r => r.type === 'dislike').length
  const userReaction = currentUserId ? (reactions.find(r => r.user_id === currentUserId)?.type ?? null) : null
  const topLevel     = commentaires.filter(c => !c.parent_id)
  const repliesMap   = commentaires.filter(c => c.parent_id).reduce<Record<string, NoteCommentaire[]>>((acc, c) => {
    acc[c.parent_id!] = [...(acc[c.parent_id!] || []), c]
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/55 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg h-full flex flex-col shadow-2xl shadow-black/40 border-l border-surface-border bg-background"
        onClick={e => e.stopPropagation()}
      >
        {/* Left color accent */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: color }} />

        {/* ── Header section with distinct bg ── */}
        <div className="flex-shrink-0 bg-surface/30 border-b border-surface-border">
          {/* Top bar: title + action buttons */}
          <div className="flex items-start gap-3 px-6 pt-5 pb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-text-primary leading-tight">{note.titre}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {note.auteur && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ring-1 ring-surface-border"
                      style={{ background: `${color}20`, color }}>
                      {initiales(note.auteur.prenom, note.auteur.nom)}
                    </div>
                    <span className="text-[11px] text-text-muted">{note.auteur.prenom} {note.auteur.nom}</span>
                  </div>
                )}
                <span className="text-surface-border">·</span>
                <span className="flex items-center gap-1 text-[11px] text-text-disabled">
                  <Clock size={10} />{modified ? formatDateHeure(note.updated_at) : formatRelativeTime(note.updated_at)}
                </span>
                <span className="text-surface-border">·</span>
                <span className={`flex items-center gap-1 text-[11px] ${visCfg.accentCls}`}>{visCfg.icon} {visCfg.label}</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5">
              {tab === 'actives' && (
                <button onClick={onTogglePin} title={note.est_epinglee ? 'Désépingler' : 'Épingler'}
                  className={`p-2 rounded-xl transition-all duration-150 ${note.est_epinglee ? 'text-amber-400 bg-amber-400/10' : 'text-text-disabled hover:text-amber-400 hover:bg-amber-400/8'}`}>
                  <Pin size={14} style={note.est_epinglee ? { fill: '#f59e0b' } : {}} />
                </button>
              )}
              {(isOwner || isSuperAdmin) && tab === 'actives' && (
                <button onClick={onEdit} title="Modifier" className="p-2 rounded-xl text-text-disabled hover:text-blue-400 hover:bg-blue-500/8 transition-all duration-150">
                  <Edit2 size={14} />
                </button>
              )}
              {tab === 'actives' ? (
                <button onClick={onArchive} title="Archiver" className="p-2 rounded-xl text-text-disabled hover:text-amber-400 hover:bg-amber-500/8 transition-all duration-150">
                  <Archive size={14} />
                </button>
              ) : (
                <button onClick={onUnarchive} title="Désarchiver" className="p-2 rounded-xl text-text-disabled hover:text-emerald-400 hover:bg-emerald-500/8 transition-all duration-150">
                  <ArchiveRestore size={14} />
                </button>
              )}
              {isSuperAdmin && (
                <button onClick={onDelete} title="Supprimer" className="p-2 rounded-xl text-text-disabled hover:text-red-400 hover:bg-red-500/8 transition-all duration-150">
                  <Trash2 size={14} />
                </button>
              )}
              <div className="w-px h-5 bg-surface-border mx-1" />
              <button onClick={onClose} className="p-2 rounded-xl text-text-disabled hover:text-text-secondary hover:bg-surface-hover transition-all duration-150">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Context tags + engagement bar */}
          <div className="px-6 pb-4 space-y-3">
            {(note.projet?.titre || clientLabel) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {note.projet?.titre && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Globe size={9} /> {note.projet.titre}
                  </span>
                )}
                {clientLabel && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users size={9} /> {clientLabel}
                  </span>
                )}
              </div>
            )}

            {/* Engagement bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-surface-border/80 overflow-hidden bg-surface/40">
                <button onClick={() => toggleReaction('like')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all border-r border-surface-border/60 ${
                    userReaction === 'like' ? 'bg-blue-500/15 text-blue-400' : 'text-text-muted hover:bg-surface hover:text-blue-400'
                  }`}>
                  <ThumbsUp size={11} className={userReaction === 'like' ? 'fill-blue-400/30' : ''} />
                  <span>{likeCount > 0 ? likeCount : 'J\'aime'}</span>
                </button>
                <button onClick={() => toggleReaction('dislike')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all ${
                    userReaction === 'dislike' ? 'bg-red-500/15 text-red-400' : 'text-text-muted hover:bg-surface hover:text-red-400'
                  }`}>
                  <ThumbsDown size={11} className={userReaction === 'dislike' ? 'fill-red-400/30' : ''} />
                  {dislikeCount > 0 && <span>{dislikeCount}</span>}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-disabled">
                <MessageCircle size={12} />
                <span>{commentaires.length} commentaire{commentaires.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 border-b border-surface-border/40">
            {note.contenu && stripHtml(note.contenu) ? (
              <div className="note-reader text-sm text-text-secondary leading-[1.8]" dangerouslySetInnerHTML={{ __html: note.contenu }} />
            ) : (
              <p className="text-sm text-text-disabled italic">Aucun contenu.</p>
            )}
          </div>

          {/* Attachments */}
          {pjs.length > 0 && (
            <div className="px-6 py-4 border-b border-surface-border/40 space-y-2.5">
              <p className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest flex items-center gap-1.5">
                <Paperclip size={9} /> Pièces jointes · {pjs.length}
              </p>
              <div className="space-y-1.5">
                {pjs.map((pj, i) => {
                  const isPdf   = pj.type.includes('pdf')
                  const isImg   = pj.type.startsWith('image/')
                  const isDoc   = pj.type.includes('word') || pj.type.includes('text')
                  const iconEl  = isPdf
                    ? <FileText size={14} className="text-red-400" />
                    : isImg
                      ? <ImageIcon size={14} className="text-emerald-400" />
                      : isDoc
                        ? <FileText size={14} className="text-blue-400" />
                        : <File size={14} className="text-text-muted" />
                  const iconBg  = isPdf ? 'bg-red-500/10 border-red-500/20'
                    : isImg ? 'bg-emerald-500/10 border-emerald-500/20'
                    : isDoc ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-surface border-surface-border'
                  return (
                    <div key={i} className="group/pj flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-surface/50 border border-surface-border hover:border-surface-border-hover hover:bg-surface transition-all duration-150">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {iconEl}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-secondary truncate">{pj.nom}</p>
                        <p className="text-[10px] text-text-disabled">{formatBytes(pj.taille)}</p>
                      </div>
                      <button
                        onClick={() => download(pj)}
                        title={`Télécharger ${pj.nom}`}
                        className="p-1.5 rounded-lg text-text-disabled hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover/pj:opacity-100"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest flex items-center gap-1.5">
              <MessageCircle size={9} /> Commentaires {commentaires.length > 0 && `· ${commentaires.length}`}
            </p>
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20 mt-0.5">
                {user?.prenom?.[0] || '?'}
              </div>
              {/* Input with inline Send button */}
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment() }}
                  placeholder="Ajouter un commentaire…"
                  rows={newComment ? 3 : 2}
                  onFocus={e => { e.target.rows = 3 }}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3.5 py-2.5 pr-10 text-xs text-text-secondary placeholder:text-text-disabled focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 transition-all resize-none"
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !newComment.trim()}
                  title="Envoyer (⌘↵)"
                  className={`absolute bottom-2.5 right-2.5 p-1.5 rounded-lg transition-all duration-150 ${
                    newComment.trim()
                      ? 'text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                      : 'text-text-disabled opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
            <div className="space-y-5">
              {topLevel.map(c => (
                <NoteCommentItem key={c.id} comment={c} replies={repliesMap[c.id] || []}
                  currentUserId={currentUserId || ''} noteId={note.id} onRefresh={loadSocial} />
              ))}
              {commentaires.length === 0 && (
                <div className="text-center py-6">
                  <MessageCircle size={20} className="mx-auto mb-2 text-text-disabled" />
                  <p className="text-xs text-text-disabled">Aucun commentaire — soyez le premier à réagir</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-surface-border bg-surface/20">
          {(isOwner || isSuperAdmin) && tab === 'actives' ? (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-text-muted bg-surface hover:bg-surface-hover border border-surface-border transition-all">
                Fermer
              </button>
              <button onClick={onEdit}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5"
                style={{ backgroundColor: color, boxShadow: `0 4px 16px ${color}30` }}>
                <Edit2 size={12} /> Modifier
              </button>
            </div>
          ) : (
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-text-muted bg-surface hover:bg-surface-hover border border-surface-border transition-all">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── NoteCommentItem ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function NoteCommentItem({ comment, replies, currentUserId, noteId, onRefresh }: {
  comment: NoteCommentaire; replies: NoteCommentaire[]
  currentUserId: string; noteId: string; onRefresh: () => void
}) {
  const [liked,        setLiked]        = useState(() => comment.reactions.some(r => r.user_id === currentUserId))
  const [likeCount,    setLikeCount]    = useState(comment.reactions.length)
  const [replyOpen,    setReplyOpen]    = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)
  const supabase = createClient()

  async function toggleLike() {
    const next = !liked; setLiked(next); setLikeCount(c => next ? c + 1 : c - 1)
    await supabase.rpc('toggler_reaction_commentaire_note', { p_id: comment.id })
  }

  async function submitReply() {
    if (!replyContent.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_note', { p_note_id: noteId, p_contenu: replyContent.trim(), p_parent_id: comment.id })
    setReplyContent(''); setReplyOpen(false); setSubmitting(false); onRefresh()
  }

  async function deleteComment() {
    await supabase.rpc('supprimer_commentaire_note', { p_id: comment.id }); onRefresh()
  }

  const canDelete = comment.user_id === currentUserId

  return (
    <div>
      <div className="flex gap-3 group/cmt">
        <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-[11px] font-bold text-text-muted flex-shrink-0 mt-0.5">
          {comment.auteur.prenom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-secondary">{comment.auteur.prenom} {comment.auteur.nom}</span>
            <span className="text-[11px] text-text-disabled">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap break-words">{comment.contenu}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={toggleLike}
              className={`flex items-center gap-1 text-xs transition-all ${liked ? 'text-blue-400' : 'text-text-disabled hover:text-blue-400'}`}>
              <ThumbsUp size={11} className={liked ? 'fill-blue-400/30' : ''} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button onClick={() => { setReplyOpen(!replyOpen); setReplyContent('') }}
              className="flex items-center gap-1 text-xs text-text-disabled hover:text-text-secondary transition-all">
              <Reply size={11} /> Répondre
            </button>
            {canDelete && (
              confirmDel ? (
                <span className="flex items-center gap-1.5 text-[11px]">
                  <button onClick={deleteComment} className="text-red-400 hover:underline font-medium">Supprimer</button>
                  <span className="text-text-disabled">·</span>
                  <button onClick={() => setConfirmDel(false)} className="text-text-disabled hover:underline">Annuler</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="opacity-0 group-hover/cmt:opacity-100 text-text-disabled hover:text-red-400 transition-all">
                  <Trash2 size={11} />
                </button>
              )
            )}
          </div>
          {replyOpen && (
            <div className="mt-3 flex gap-2 items-start">
              <textarea
                autoFocus
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply() }}
                placeholder="Écrire une réponse…"
                rows={2}
                className="flex-1 bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-text-secondary placeholder:text-text-disabled focus:outline-none focus:border-blue-500/40 resize-none transition-all"
              />
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={submitReply} disabled={submitting || !replyContent.trim()}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
                  <Send size={11} />
                </button>
                <button onClick={() => { setReplyOpen(false); setReplyContent('') }}
                  className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted transition-all">
                  <X size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-10 mt-3 space-y-4 pl-4 border-l-2 border-surface-border">
          {replies.map(r => (
            <div key={r.id} className="flex gap-3 group/rep">
              <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0 mt-0.5">
                {r.auteur.prenom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text-muted">{r.auteur.prenom} {r.auteur.nom}</span>
                  <span className="text-[11px] text-text-disabled">{formatRelativeTime(r.created_at)}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap break-words">{r.contenu}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ── NoteModal ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function NoteModal({ entiteId, projets, clients, note, onClose, onSuccess }: {
  entiteId: string; projets: Projet[]; clients: Client[]
  note: Note | null; onClose: () => void; onSuccess: () => void
}) {
  const isEdit = !!note
  const [titre,        setTitre]        = useState(note?.titre || '')
  const [couleur,      setCouleur]      = useState(note?.couleur || '#3B82F6')
  const [visibilite,   setVisibilite]   = useState<Visibilite>((note?.visibilite as Visibilite) || 'equipe')
  const [projetId,     setProjetId]     = useState(note?.projet_id || '')
  const [clientId,     setClientId]     = useState(note?.client_id || '')
  const [existingPJs,  setExistingPJs]  = useState<PieceJointe[]>(note?.pieces_jointes || [])
  const [newFiles,     setNewFiles]     = useState<File[]>([])
  const [uploading,    setUploading]    = useState(false) // block submit during upload
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, blockquote: false, horizontalRule: false })],
    content: note?.contenu || '',
    editorProps: { attributes: { class: 'tiptap-editor' } },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim() || !editor) return
    if (uploading) return // block while upload in progress
    setSaving(true); setError('')

    // Upload new files
    setUploading(true)
    const uploadedPJs: PieceJointe[] = []
    for (const file of newFiles) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
      const path = `notes/${entiteId}/${Date.now()}_${safeName}`
      const { storedPath: sp, error: upErr } = await uploadToStorage(supabase, 'notes', path, file)
      if (!upErr) {
        uploadedPJs.push({ nom: file.name, url_stockage: sp, taille: file.size, type: file.type })
      }
    }
    setUploading(false)

    const allPJs = [...existingPJs, ...uploadedPJs]
    const payload = {
      entite_id: entiteId,
      titre: titre.trim(),
      contenu: editor.getHTML(),
      couleur,
      visibilite,
      projet_id: projetId || null,
      client_id: clientId || null,
      pieces_jointes: JSON.stringify(allPJs),
    }

    let err: any = null
    if (isEdit) {
      const { error: upErr } = await supabase.from('notes').update(payload).eq('id', note!.id)
      err = upErr
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setError('Non authentifié.'); setSaving(false); return }
      const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', authUser.id).single()
      if (!userData) { setError('Utilisateur introuvable.'); setSaving(false); return }
      const { error: insErr } = await supabase.from('notes').insert({ ...payload, created_by: userData.id, is_archived: false })
      err = insErr
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
  }

  const totalFiles = existingPJs.length + newFiles.length
  const isSubmitting = saving || uploading

  const Btn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 rounded-lg text-xs transition-all duration-150 ${active ? 'bg-blue-500/15 text-blue-400' : 'text-text-muted hover:text-text-secondary hover:bg-surface'}`}>
      {children}
    </button>
  )

  const fieldCls = "w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-surface-border/80 shadow-2xl shadow-black/40 overflow-hidden bg-background"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${couleur}20` }}>
              <StickyNote size={13} style={{ color: couleur }} />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              {isEdit ? 'Modifier la note' : 'Nouvelle note'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text-disabled hover:text-text-secondary hover:bg-surface transition-all">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[82vh] overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Title + color */}
            <div className="flex items-center gap-3">
              <input type="text" className={`${fieldCls} flex-1`}
                placeholder="Titre de la note…" value={titre}
                onChange={e => setTitre(e.target.value)} required autoFocus />
              <div className="flex items-center gap-2 flex-shrink-0 p-2 bg-surface border border-surface-border rounded-xl">
                {COULEURS.map(c => (
                  <button key={c.hex} type="button" title={c.label} onClick={() => setCouleur(c.hex)}
                    className={`rounded-full transition-all duration-150 ${couleur === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-offset-background' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c.hex, width: '18px', height: '18px', flexShrink: 0 }} />
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="bg-surface border border-surface-border rounded-xl overflow-hidden focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/10 transition-all">
              <div className="flex items-center gap-0.5 px-2 py-2 border-b border-surface-border">
                <Btn active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Gras"><Bold size={13} /></Btn>
                <Btn active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italique"><Italic size={13} /></Btn>
                <div className="w-px h-4 bg-surface-border mx-1" />
                <Btn active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 size={13} /></Btn>
                <Btn active={editor?.isActive('heading', { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 size={13} /></Btn>
                <div className="w-px h-4 bg-surface-border mx-1" />
                <Btn active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Liste"><List size={13} /></Btn>
                <Btn active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Liste numérotée"><ListOrdered size={13} /></Btn>
                <div className="w-px h-4 bg-surface-border mx-1 ml-auto" />
                <Btn onClick={() => editor?.chain().focus().undo().run()} title="Annuler"><Undo2 size={13} /></Btn>
              </div>
              <div className="tiptap-editor px-4 py-3">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Context */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={10} className="text-purple-400" /> Projet lié
                </label>
                <select className={fieldCls} value={projetId} onChange={e => setProjetId(e.target.value)}>
                  <option value="">Aucun projet</option>
                  {projets.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={10} className="text-blue-400" /> Client lié
                </label>
                <select className={fieldCls} value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Aucun client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_entreprise}</option>)}
                </select>
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider">Visibilité & diffusion</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(VISIBILITE_CFG) as [Visibilite, typeof VISIBILITE_CFG[Visibilite]][]).map(([val, cfg]) => (
                  <button key={val} type="button" onClick={() => setVisibilite(val)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                      visibilite === val
                        ? 'border-blue-500/25 bg-blue-500/5 shadow-sm'
                        : 'border-surface-border/70 bg-surface/30 hover:border-surface-border hover:bg-surface/50'
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      visibilite === val ? 'bg-blue-500/15' : 'bg-surface'
                    }`}>
                      <span className={visibilite === val ? 'text-blue-400' : cfg.accentCls}>{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-none mb-0.5 ${visibilite === val ? 'text-text-primary' : 'text-text-muted'}`}>{cfg.label}</p>
                      <p className="text-[10px] text-text-disabled leading-tight">{cfg.desc}</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-all ${
                      visibilite === val
                        ? 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-500/30'
                        : 'border-surface-border'
                    }`}>
                      {visibilite === val && <div className="w-full h-full rounded-full flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-white" /></div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip size={10} /> Pièces jointes {totalFiles > 0 && <span className="text-blue-400 normal-case">({totalFiles})</span>}
                  {uploading && <span className="text-amber-400 normal-case animate-pulse ml-1">Upload en cours…</span>}
                </label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium">
                  <Plus size={10} /> Ajouter
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) setNewFiles(prev => [...prev, ...f]) }} />
              </div>
              {existingPJs.map((pj, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-surface-border rounded-xl">
                  {fileIcon(pj.type)}
                  <span className="flex-1 text-xs text-text-muted truncate">{pj.nom}</span>
                  <span className="text-[11px] text-text-disabled">{formatBytes(pj.taille)}</span>
                  <button type="button" onClick={() => setExistingPJs(p => p.filter((_, j) => j !== i))}
                    className="p-1 text-text-disabled hover:text-red-400 transition-colors"><X size={11} /></button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  {fileIcon(f.type)}
                  <span className="flex-1 text-xs text-text-muted truncate">{f.name}</span>
                  <span className="text-[11px] text-text-disabled">{formatBytes(f.size)}</span>
                  <button type="button" onClick={() => setNewFiles(p => p.filter((_, j) => j !== i))}
                    className="p-1 text-text-disabled hover:text-red-400 transition-colors"><X size={11} /></button>
                </div>
              ))}
              {totalFiles === 0 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 border-2 border-dashed border-surface-border/60 rounded-xl text-xs text-text-disabled hover:border-blue-500/25 hover:text-blue-400 hover:bg-blue-500/3 transition-all duration-150 flex items-center justify-center gap-2 group">
                  <div className="w-6 h-6 rounded-lg bg-surface border border-surface-border group-hover:border-blue-500/20 group-hover:bg-blue-500/10 flex items-center justify-center transition-all">
                    <Paperclip size={11} className="group-hover:text-blue-400 transition-colors" />
                  </div>
                  Cliquer pour joindre des fichiers
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium text-text-muted bg-surface hover:bg-surface-hover border border-surface-border transition-all">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting || !titre.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {uploading ? 'Upload…' : 'Enregistrement…'}</>
              ) : (
                isEdit ? 'Enregistrer' : 'Créer la note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
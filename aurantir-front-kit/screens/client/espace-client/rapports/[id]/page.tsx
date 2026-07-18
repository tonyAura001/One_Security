// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatDate, formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  ChevronRight, FileText, Globe, Lock, Users, Building2,
  Download, CheckCircle, AlertTriangle, X,
  Eye, Briefcase, MessageCircle,
  ThumbsUp, ThumbsDown, Trash2, Reply, Send, Paperclip,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
type RapportStatut     = 'brouillon' | 'publie' | 'archive'
type RapportVisibilite = 'prive' | 'equipe' | 'fondateurs' | 'public'

interface Lecture {
  user_id: string
  lu_le: string
  lecteur: { prenom: string; nom: string; avatar_url?: string } | null
}

interface CommentReaction { user_id: string }

interface Commentaire {
  id: string
  rapport_id: string
  user_id: string
  parent_id: string | null
  contenu: string
  created_at: string
  auteur: { prenom: string; nom: string; avatar_url?: string }
  reactions: CommentReaction[]
}

interface PieceJointe {
  id: string
  rapport_id: string
  nom: string
  chemin: string
  taille?: number
  type_mime?: string
  created_at: string
}

interface Rapport {
  id: string
  numero?: string
  titre: string
  type: string
  statut: RapportStatut
  visibilite: RapportVisibilite
  resume?: string
  contenu?: string
  created_at: string
  published_at?: string
  redacteur?: { prenom: string; nom: string }
  projet?: { titre: string }
}

// ── Configs ───────────────────────────────────────────────────
const STATUT_CFG: Record<RapportStatut, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-surface text-text-muted border-surface-border' },
  publie:    { label: 'Publié',    cls: 'bg-green/10 text-green border-green/20' },
  archive:   { label: 'Archivé',  cls: 'bg-surface text-text-disabled border-surface-border' },
}

const VISI_CFG: Record<RapportVisibilite, { label: string; icon: React.ReactNode; cls: string }> = {
  prive:      { label: 'Privé',      icon: <Lock size={10} />,      cls: 'bg-red/10 text-red border-red/20' },
  equipe:     { label: 'Équipe',     icon: <Users size={10} />,     cls: 'bg-blue/10 text-blue border-blue/20' },
  fondateurs: { label: 'Fondateurs', icon: <Building2 size={10} />, cls: 'bg-violet/10 text-violet border-violet/20' },
  public:     { label: 'Public',     icon: <Globe size={10} />,     cls: 'bg-green/10 text-green border-green/20' },
}

const TYPE_LABELS: Record<string, string> = {
  rapport_activite:   'Rapport d\'activité',
  rapport_financier:  'Rapport financier',
  rapport_projet:     'Rapport projet',
  rapport_commercial: 'Rapport commercial',
  rapport_hebdo:      'Hebdomadaire',
  bilan:              'Bilan',
  note_interne:       'Note interne',
  autre:              'Autre',
}

// ── Page ──────────────────────────────────────────────────────
export default function ClientRapportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [me, setMe] = useState<{ id: string; prenom: string; nom: string } | null>(null)
  const [rapport,       setRapport]       = useState<Rapport | null>(null)
  const [lectures,      setLectures]      = useState<Lecture[]>([])
  const [reactions,     setReactions]     = useState<{ user_id: string; type: string }[]>([])
  const [piecesJointes, setPiecesJointes] = useState<PieceJointe[]>([])
  const [commentaires,  setCommentaires]  = useState<Commentaire[]>([])
  const [loading,       setLoading]       = useState(true)
  const [notFound,      setNotFound]      = useState(false)
  const [newComment,    setNewComment]    = useState('')
  const [submittingCmt, setSubmittingCmt] = useState(false)
  const supabase = createClient()
  const markedRead = useRef(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-mark read once for published reports
  useEffect(() => {
    if (!rapport || rapport.statut !== 'publie' || markedRead.current) return
    markedRead.current = true
    supabase.rpc('marquer_rapport_lu', { p_id: rapport.id })
  }, [rapport?.statut]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.replace('/login'); return }

    const { data: userData } = await supabase
      .from('users').select('id, prenom, nom')
      .eq('auth_user_id', authUser.id).single()
    if (!userData) { setNotFound(true); setLoading(false); return }
    setMe(userData)

    const [
      { data: rData },
      { data: lData },
      { data: reacData },
      { data: cData },
      { data: pjData },
    ] = await Promise.all([
      supabase.from('rapports')
        .select('*, redacteur:users!redacteur_id(prenom, nom), projet:projets(titre)')
        .eq('id', id).single(),
      supabase.from('rapport_lectures')
        .select('user_id, lu_le, lecteur:users!user_id(prenom, nom, avatar_url)')
        .eq('rapport_id', id).order('lu_le', { ascending: false }),
      supabase.from('rapport_reactions').select('user_id, type').eq('rapport_id', id),
      supabase.from('rapport_commentaires')
        .select('*, auteur:users!user_id(prenom, nom, avatar_url), reactions:rapport_commentaire_reactions(user_id)')
        .eq('rapport_id', id).order('created_at', { ascending: true }),
      supabase.from('rapport_pieces_jointes')
        .select('*').eq('rapport_id', id).order('created_at', { ascending: false }),
    ])

    // Un client externe ne peut consulter que les rapports publics
    if (!rData || (rData as unknown as Rapport).visibilite !== 'public') {
      setNotFound(true); setLoading(false); return
    }

    setRapport(rData as unknown as Rapport)
    setLectures((lData || []) as unknown as Lecture[])
    setReactions((reacData || []) as { user_id: string; type: string }[])
    setCommentaires((cData || []) as unknown as Commentaire[])
    setPiecesJointes((pjData || []) as PieceJointe[])
    setLoading(false)
  }

  async function loadEngagement() {
    const [{ data: lData }, { data: reacData }, { data: cData }] = await Promise.all([
      supabase.from('rapport_lectures').select('user_id, lu_le, lecteur:users!user_id(prenom, nom, avatar_url)').eq('rapport_id', id).order('lu_le', { ascending: false }),
      supabase.from('rapport_reactions').select('user_id, type').eq('rapport_id', id),
      supabase.from('rapport_commentaires').select('*, auteur:users!user_id(prenom, nom, avatar_url), reactions:rapport_commentaire_reactions(user_id)').eq('rapport_id', id).order('created_at', { ascending: true }),
    ])
    setLectures((lData || []) as unknown as Lecture[])
    setReactions((reacData || []) as { user_id: string; type: string }[])
    setCommentaires((cData || []) as unknown as Commentaire[])
  }

  async function setReactionRapport(type: 'like' | 'dislike') {
    if (!rapport || !me?.id) return
    const current = reactions.find(r => r.user_id === me.id)
    if (current?.type === type) {
      setReactions(reactions.filter(r => r.user_id !== me.id))
    } else {
      setReactions([...reactions.filter(r => r.user_id !== me.id), { user_id: me.id, type }])
    }
    await supabase.rpc('toggler_reaction_rapport', { p_id: rapport.id, p_type: type })
  }

  async function downloadPJ(pj: PieceJointe) {
    await downloadFromStorage(supabase, 'rapports', pj.chemin, pj.nom, 300)
  }

  async function submitComment() {
    if (!rapport || !newComment.trim()) return
    setSubmittingCmt(true)
    await supabase.rpc('creer_commentaire_rapport', {
      p_rapport_id: rapport.id,
      p_contenu: newComment.trim(),
      p_parent_id: null,
    })
    setNewComment('')
    setSubmittingCmt(false)
    loadEngagement()
  }

  // ── Loading / not found ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }
  if (notFound || !rapport) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
        <p className="text-text-muted">Rapport introuvable</p>
        <Link href="/espace-client/projets" className="text-blue text-sm mt-2 inline-block hover:underline">Retour à mes projets</Link>
      </div>
    )
  }

  const sCfg = STATUT_CFG[rapport.statut]
  const vCfg = VISI_CFG[rapport.visibilite]
  const likeCount    = reactions.filter(r => r.type === 'like').length
  const dislikeCount = reactions.filter(r => r.type === 'dislike').length
  const userReaction = me?.id ? (reactions.find(r => r.user_id === me.id)?.type ?? null) : null

  // Build comment tree (top-level + replies map)
  const topLevel  = commentaires.filter(c => !c.parent_id)
  const repliesMap: Record<string, Commentaire[]> = {}
  commentaires.filter(c => c.parent_id).forEach(c => {
    if (!repliesMap[c.parent_id!]) repliesMap[c.parent_id!] = []
    repliesMap[c.parent_id!].push(c)
  })

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto pb-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/espace-client/projets" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Mes projets
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary truncate max-w-48">{rapport.titre}</span>
      </div>

      {/* Banner */}
      {rapport.statut === 'publie' && (
        <div className="flex items-center gap-2 bg-green/5 border border-green/15 rounded-xl px-5 py-3">
          <CheckCircle size={14} className="text-green flex-shrink-0" />
          <p className="text-xs text-green">Publié le {formatDate(rapport.published_at || rapport.created_at)} · rapport public</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {rapport.numero && <span className="text-xs font-mono text-text-muted">{rapport.numero}</span>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs border font-medium ${sCfg.cls}`}>{sCfg.label}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs border font-medium ${vCfg.cls}`}>{vCfg.icon}{vCfg.label}</span>
            <span className="text-2xs text-text-muted">{TYPE_LABELS[rapport.type] || rapport.type}</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">{rapport.titre}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {rapport.redacteur && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-violet/10 flex items-center justify-center text-2xs font-bold text-violet">
                  {rapport.redacteur.prenom[0]}
                </div>
                <span className="text-xs text-text-muted">{rapport.redacteur.prenom} {rapport.redacteur.nom}</span>
              </div>
            )}
            <span className="text-xs text-text-muted">{formatRelativeTime(rapport.created_at)}</span>
            {rapport.projet && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Briefcase size={10} />
                {rapport.projet.titre}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement bar — publié + archivé */}
      {rapport.statut !== 'brouillon' && (
        <div className="flex items-center gap-3 py-1 flex-wrap">
          <div className="flex items-center rounded-full border border-surface-border overflow-hidden">
            <button
              onClick={() => setReactionRapport('like')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border-r border-surface-border ${
                userReaction === 'like'
                  ? 'bg-blue/10 text-blue'
                  : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-blue'
              }`}
            >
              <ThumbsUp size={13} className={userReaction === 'like' ? 'fill-blue/30' : ''} />
              <span>{likeCount > 0 ? likeCount : 'J\'aime'}</span>
            </button>
            <button
              onClick={() => setReactionRapport('dislike')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                userReaction === 'dislike'
                  ? 'bg-red/10 text-red'
                  : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-red'
              }`}
            >
              <ThumbsDown size={13} className={userReaction === 'dislike' ? 'fill-red/30' : ''} />
              {dislikeCount > 0 && <span>{dislikeCount}</span>}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Eye size={13} />
            <span>{lectures.length} vue{lectures.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MessageCircle size={13} />
            <span>{commentaires.length} commentaire{commentaires.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {rapport.resume && (
          <div className="bg-blue/5 border border-blue/15 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-blue">
              <Eye size={13} /> Résumé exécutif
            </div>
            <p className="text-sm text-text-secondary leading-relaxed break-words">{rapport.resume}</p>
          </div>
        )}
        {rapport.contenu ? (
          <div className="bg-surface border border-surface-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={14} className="text-blue" /> Contenu du rapport
            </h3>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
              {rapport.contenu}
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-surface-border rounded-xl p-10 text-center">
            <FileText size={28} className="mx-auto mb-3 text-text-muted opacity-30" />
            <p className="text-sm text-text-muted">Aucun contenu rédigé</p>
          </div>
        )}
      </div>

      {/* Pièces jointes (lecture seule) */}
      {piecesJointes.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Paperclip size={13} className="text-blue" />
            Pièces jointes <span className="font-normal normal-case">({piecesJointes.length})</span>
          </h3>
          <div className="space-y-1.5">
            {piecesJointes.map(pj => (
              <div key={pj.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg group hover:border-blue/30 transition-all">
                <FileText size={14} className="flex-shrink-0 text-blue" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{pj.nom}</p>
                  {pj.taille && <p className="text-2xs text-text-muted">{pj.taille < 1024 * 1024 ? `${(pj.taille / 1024).toFixed(1)} Ko` : `${(pj.taille / (1024 * 1024)).toFixed(1)} Mo`}</p>}
                </div>
                <button onClick={() => downloadPJ(pj)} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-blue transition-colors flex-shrink-0" title="Télécharger">
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lecteurs */}
      {rapport.statut !== 'brouillon' && lectures.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye size={13} className="text-blue" />
            Lu par {lectures.length} personne{lectures.length > 1 ? 's' : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {lectures.map(l => (
              <div key={l.user_id} className="flex items-center gap-1.5 bg-surface-elevated border border-surface-border rounded-full px-2.5 py-1">
                <div className="w-5 h-5 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0">
                  {l.lecteur?.prenom?.[0] || '?'}
                </div>
                <span className="text-2xs text-text-secondary">
                  {l.lecteur?.prenom} {l.lecteur?.nom}
                </span>
                <span className="text-2xs text-text-muted hidden sm:inline" title={formatDate(l.lu_le)}>
                  · {formatRelativeTime(l.lu_le)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {rapport.statut !== 'brouillon' && (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <MessageCircle size={15} className="text-blue" />
            Commentaires
            {commentaires.length > 0 && (
              <span className="text-text-muted font-normal">({commentaires.length})</span>
            )}
          </h3>

          {/* New comment */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-xs font-bold text-violet flex-shrink-0">
              {me?.prenom?.[0] || '?'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="input text-sm w-full resize-none"
                rows={newComment ? 3 : 1}
                onFocus={e => { e.target.rows = 3 }}
              />
              {newComment.trim() && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="secondary" size="sm" onClick={() => setNewComment('')}>Annuler</Button>
                  <Button size="sm" icon={<Send size={12} />} loading={submittingCmt} onClick={submitComment}>Commenter</Button>
                </div>
              )}
            </div>
          </div>

          {/* Comment list */}
          <div className="space-y-6">
            {topLevel.map(c => (
              <CommentItem
                key={c.id}
                comment={c}
                replies={repliesMap[c.id] || []}
                currentUserId={me?.id || ''}
                rapportId={rapport.id}
                onRefresh={loadEngagement}
              />
            ))}
            {commentaires.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <MessageCircle size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Aucun commentaire — soyez le premier à réagir</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CommentItem ───────────────────────────────────────────────
function CommentItem({
  comment, replies, currentUserId, rapportId, onRefresh,
}: {
  comment: Commentaire
  replies: Commentaire[]
  currentUserId: string
  rapportId: string
  onRefresh: () => void
}) {
  const [liked,         setLiked]         = useState(() => comment.reactions.some(r => r.user_id === currentUserId))
  const [likeCount,     setLikeCount]     = useState(comment.reactions.length)
  const [replyOpen,     setReplyOpen]     = useState(false)
  const [replyContent,  setReplyContent]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const supabase = createClient()

  const canDelete = comment.user_id === currentUserId

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    await supabase.rpc('toggler_reaction_commentaire', { p_id: comment.id })
  }

  async function submitReply() {
    if (!replyContent.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_rapport', {
      p_rapport_id: rapportId,
      p_contenu:    replyContent.trim(),
      p_parent_id:  comment.id,
    })
    setSubmitting(false)
    setReplyContent('')
    setReplyOpen(false)
    onRefresh()
  }

  async function deleteComment() {
    await supabase.rpc('supprimer_commentaire_rapport', { p_id: comment.id })
    onRefresh()
  }

  return (
    <div>
      <div className="flex gap-3 group">
        <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0 mt-0.5">
          {comment.auteur.prenom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-primary">
              {comment.auteur.prenom} {comment.auteur.nom}
            </span>
            <span className="text-2xs text-text-muted">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{comment.contenu}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={toggleLike} className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-blue' : 'text-text-muted hover:text-blue'}`}>
              <ThumbsUp size={12} className={liked ? 'fill-blue/30' : ''} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button
              onClick={() => { setReplyOpen(!replyOpen); setReplyContent('') }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-blue transition-colors"
            >
              <Reply size={12} /> Répondre
            </button>
            {canDelete && (
              confirmDel ? (
                <span className="flex items-center gap-1 text-2xs">
                  <button onClick={deleteComment} className="text-red hover:underline font-medium">Supprimer</button>
                  <span className="text-text-muted">·</span>
                  <button onClick={() => setConfirmDel(false)} className="text-text-muted hover:underline">Annuler</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red transition-all">
                  <Trash2 size={11} />
                </button>
              )
            )}
          </div>

          {/* Reply textarea */}
          {replyOpen && (
            <div className="mt-3 flex gap-2 items-start">
              <textarea
                autoFocus
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply() }}
                placeholder="Écrire une réponse..."
                className="input text-sm flex-1 resize-none"
                rows={2}
              />
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button size="sm" icon={<Send size={11} />} loading={submitting} onClick={submitReply} disabled={!replyContent.trim()} />
                <Button variant="secondary" size="sm" icon={<X size={11} />} onClick={() => { setReplyOpen(false); setReplyContent('') }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-4 pl-4 border-l-2 border-surface-border">
          {replies.map(r => (
            <ReplyItem
              key={r.id}
              reply={r}
              currentUserId={currentUserId}
              rapportId={rapportId}
              parentCommentId={comment.id}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ReplyItem ─────────────────────────────────────────────────
function ReplyItem({
  reply, currentUserId, rapportId, parentCommentId, onRefresh,
}: {
  reply: Commentaire
  currentUserId: string
  rapportId: string
  parentCommentId: string
  onRefresh: () => void
}) {
  const [liked,         setLiked]         = useState(() => reply.reactions.some(r => r.user_id === currentUserId))
  const [likeCount,     setLikeCount]     = useState(reply.reactions.length)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [replyOpen,     setReplyOpen]     = useState(false)
  const [replyContent,  setReplyContent]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const supabase = createClient()

  const canDelete = reply.user_id === currentUserId

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    await supabase.rpc('toggler_reaction_commentaire', { p_id: reply.id })
  }

  async function deleteReply() {
    await supabase.rpc('supprimer_commentaire_rapport', { p_id: reply.id })
    onRefresh()
  }

  async function submitReply() {
    if (!replyContent.trim()) return
    setSubmitting(true)
    await supabase.rpc('creer_commentaire_rapport', {
      p_rapport_id: rapportId,
      p_contenu:    replyContent.trim(),
      p_parent_id:  parentCommentId,
    })
    setSubmitting(false)
    setReplyContent('')
    setReplyOpen(false)
    onRefresh()
  }

  return (
    <div className="flex gap-2.5 group">
      <div className="w-6 h-6 rounded-full bg-violet/10 flex items-center justify-center text-2xs font-bold text-violet flex-shrink-0 mt-0.5">
        {reply.auteur.prenom[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text-primary">{reply.auteur.prenom} {reply.auteur.nom}</span>
          <span className="text-2xs text-text-muted">{formatRelativeTime(reply.created_at)}</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{reply.contenu}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <button onClick={toggleLike} className={`flex items-center gap-1 text-2xs transition-colors ${liked ? 'text-blue' : 'text-text-muted hover:text-blue'}`}>
            <ThumbsUp size={11} className={liked ? 'fill-blue/30' : ''} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button
            onClick={() => { setReplyOpen(!replyOpen); setReplyContent(`@${reply.auteur.prenom} `) }}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-blue transition-colors"
          >
            <Reply size={11} /> Répondre
          </button>
          {canDelete && (
            confirmDel ? (
              <span className="flex items-center gap-1 text-2xs">
                <button onClick={deleteReply} className="text-red hover:underline font-medium">Supprimer</button>
                <span className="text-text-muted">·</span>
                <button onClick={() => setConfirmDel(false)} className="text-text-muted hover:underline">Annuler</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red transition-all">
                <Trash2 size={10} />
              </button>
            )
          )}
        </div>

        {/* Chained reply textarea */}
        {replyOpen && (
          <div className="mt-2 flex gap-2 items-start">
            <textarea
              autoFocus
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply() }}
              placeholder="Écrire une réponse..."
              className="input text-sm flex-1 resize-none"
              rows={2}
            />
            <div className="flex flex-col gap-1 flex-shrink-0">
              <Button size="sm" icon={<Send size={11} />} loading={submitting} onClick={submitReply} disabled={!replyContent.trim()} />
              <Button variant="secondary" size="sm" icon={<X size={11} />} onClick={() => { setReplyOpen(false); setReplyContent('') }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
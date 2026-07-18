// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { formatDate, formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import { uploadToStorage, downloadFromStorage } from '@/aurantir-front-kit/lib/storage'
import {
  ChevronRight, FileText, Globe, Lock, Users, Building2,
  Download, Edit3, Save, X, CheckCircle, AlertTriangle,
  Eye, Archive, Tag, Briefcase, MessageCircle,
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
  uploaded_by?: string
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
  membres_concernes?: string[]
  entite_id?: string
  redacteur_id?: string
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

const VISI_OPTIONS: { value: RapportVisibilite; label: string }[] = [
  { value: 'prive',      label: 'Privé' },
  { value: 'equipe',     label: 'Équipe' },
  { value: 'fondateurs', label: 'Fondateurs' },
  { value: 'public',     label: 'Public' },
]

// ── Page ──────────────────────────────────────────────────────
export default function RapportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAppStore()

  const [rapport,       setRapport]       = useState<Rapport | null>(null)
  const [membres,       setMembres]       = useState<{ id: string; prenom: string; nom: string }[]>([])
  const [lectures,      setLectures]      = useState<Lecture[]>([])
  const [reactions,         setReactions]         = useState<{ user_id: string; type: string }[]>([])
  const [piecesJointes,     setPiecesJointes]     = useState<PieceJointe[]>([])
  const [uploadingPJ,       setUploadingPJ]       = useState(false)
  const [pjDragOver,        setPjDragOver]        = useState(false)
  const pjInputRef = useRef<HTMLInputElement>(null)
  const [commentaires,  setCommentaires]  = useState<Commentaire[]>([])
  const [loading,       setLoading]       = useState(true)
  const [editing,       setEditing]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [publishing,    setPublishing]    = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newComment,    setNewComment]    = useState('')
  const [submittingCmt, setSubmittingCmt] = useState(false)
  const [editForm, setEditForm] = useState({
    titre: '', type: '', visibilite: 'equipe' as RapportVisibilite,
    resume: '', contenu: '', membres_concernes: [] as string[],
  })
  const supabase = createClient()
  const markedRead = useRef(false)

  useEffect(() => { load() }, [id])

  // Auto-mark read once for published reports
  useEffect(() => {
    if (!rapport || rapport.statut !== 'publie' || markedRead.current) return
    markedRead.current = true
    supabase.rpc('marquer_rapport_lu', { p_id: rapport.id })
  }, [rapport?.statut])

  async function load() {
    const [
      { data: rData },
      { data: mData },
      { data: lData },
      { data: reacData },
      { data: cData },
      { data: pjData },
    ] = await Promise.all([
      supabase.from('rapports')
        .select('*, redacteur:users!redacteur_id(prenom, nom), projet:projets(titre)')
        .eq('id', id).single(),
      supabase.from('users').select('id, prenom, nom').order('prenom'),
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

    if (rData) {
      const r = rData as unknown as Rapport
      setRapport(r)
      setEditForm({
        titre:             r.titre,
        type:              r.type,
        visibilite:        r.visibilite,
        resume:            r.resume  || '',
        contenu:           r.contenu || '',
        membres_concernes: r.membres_concernes || [],
      })
    }
    setMembres(mData || [])
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

  function toggleEditMembre(memberId: string) {
    setEditForm(f => ({
      ...f,
      membres_concernes: f.membres_concernes.includes(memberId)
        ? f.membres_concernes.filter(m => m !== memberId)
        : [...f.membres_concernes, memberId],
    }))
  }

  async function save() {
    if (!rapport) return
    setSaving(true)
    const { error } = await supabase.rpc('update_rapport', {
      p_id:                rapport.id,
      p_titre:             editForm.titre,
      p_type:              editForm.type,
      p_visibilite:        editForm.visibilite,
      p_resume:            editForm.resume  || null,
      p_contenu:           editForm.contenu || null,
      p_membres_concernes: editForm.membres_concernes.length ? editForm.membres_concernes : null,
    })
    setSaving(false)
    if (!error) { setEditing(false); load() }
  }

  async function publier() {
    if (!rapport) return
    setPublishing(true)
    await supabase.rpc('publier_rapport', { p_id: rapport.id })
    setPublishing(false)
    load()
  }

  async function archiver() {
    if (!rapport) return
    setSaving(true)
    await supabase.from('rapports').update({ statut: 'archive' }).eq('id', id)
    setSaving(false)
    load()
  }

  async function deleteRapport() {
    if (!rapport) return
    setDeleting(true)
    const { error } = await supabase.rpc('supprimer_rapport', { p_id: rapport.id })
    setDeleting(false)
    if (!error) router.push('/rapports')
  }

  async function setReactionRapport(type: 'like' | 'dislike') {
    if (!rapport || !user?.id) return
    const current = reactions.find(r => r.user_id === user.id)
    if (current?.type === type) {
      setReactions(reactions.filter(r => r.user_id !== user.id))
    } else {
      setReactions([...reactions.filter(r => r.user_id !== user.id), { user_id: user.id, type }])
    }
    await supabase.rpc('toggler_reaction_rapport', { p_id: rapport.id, p_type: type })
  }

  async function downloadPJ(pj: PieceJointe) {
    await downloadFromStorage(supabase, 'rapports', pj.chemin, pj.nom, 300)
  }

  async function deletePJ(pj: PieceJointe) {
    const { data: chemin } = await supabase.rpc('supprimer_piece_jointe', { p_id: pj.id })
    if (chemin) await supabase.storage.from('rapports').remove([chemin as string])
    setPiecesJointes(prev => prev.filter(p => p.id !== pj.id))
  }

  async function uploadPJ(files: FileList | null) {
    if (!rapport || !files) return
    setUploadingPJ(true)
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
      const path = `${rapport.id}/${Date.now()}_${safe}`
      const { storedPath, error } = await uploadToStorage(supabase, 'rapports', path, file)
      if (!error) {
        await supabase.rpc('ajouter_piece_jointe', {
          p_rapport_id: rapport.id,
          p_nom:        file.name,
          p_chemin:     storedPath,
          p_taille:     file.size,
          p_type_mime:  file.type || null,
        })
      }
    }
    const { data } = await supabase.from('rapport_pieces_jointes').select('*').eq('rapport_id', rapport.id).order('created_at', { ascending: false })
    setPiecesJointes((data || []) as PieceJointe[])
    setUploadingPJ(false)
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

  async function exportPDF() {
    if (!rapport) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, M = 15
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
    doc.text('SAMA DIGITAL PLATFORM', M, 15)
    doc.text(rapport.numero || '', W - M, 15, { align: 'right' })
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
    const titleLines = doc.splitTextToSize(rapport.titre, W - M * 2)
    doc.text(titleLines, M, 30)
    let y = 30 + titleLines.length * 8 + 4
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
    doc.text(`${TYPE_LABELS[rapport.type] || rapport.type} · ${rapport.statut === 'publie' ? `Publié le ${formatDate(rapport.published_at || rapport.created_at)}` : `Créé le ${formatDate(rapport.created_at)}`}`, M, y)
    if (rapport.redacteur) { y += 5; doc.text(`Rédigé par ${rapport.redacteur.prenom} ${rapport.redacteur.nom}`, M, y) }
    y += 8; doc.setDrawColor(230, 230, 230); doc.line(M, y, W - M, y); y += 8
    if (rapport.resume) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text('Résumé exécutif', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      const resumeLines = doc.splitTextToSize(rapport.resume, W - M * 2)
      doc.text(resumeLines, M, y); y += resumeLines.length * 5 + 8
    }
    if (rapport.contenu) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text('Contenu', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      for (const line of doc.splitTextToSize(rapport.contenu, W - M * 2)) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(line, M, y); y += 5
      }
    }
    doc.save(`${rapport.numero || rapport.titre}.pdf`)
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
  if (!rapport) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
        <p className="text-text-muted">Rapport introuvable</p>
        <Link href="/rapports" className="text-blue text-sm mt-2 inline-block hover:underline">Retour aux rapports</Link>
      </div>
    )
  }

  const sCfg       = STATUT_CFG[rapport.statut]
  const vCfg       = VISI_CFG[rapport.visibilite]
  const isOwn        = rapport.redacteur_id === user?.id
  const isAdmin      = user?.role === 'super_admin' || user?.role === 'fondateur'
  const canDelete    = isOwn || isAdmin
  const likeCount    = reactions.filter(r => r.type === 'like').length
  const dislikeCount = reactions.filter(r => r.type === 'dislike').length
  const userReaction = user?.id ? (reactions.find(r => r.user_id === user.id)?.type ?? null) : null
  const membresTaggues = membres.filter(m => rapport.membres_concernes?.includes(m.id))

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
        <Link href="/rapports" className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Rapports
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary truncate max-w-48">{rapport.titre}</span>
      </div>

      {/* Banners */}
      {rapport.statut === 'brouillon' && isOwn && !editing && (
        <div className="flex items-center justify-between gap-4 bg-amber/5 border border-amber/20 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-amber flex-shrink-0" />
            <p className="text-xs text-amber font-medium">Ce rapport est en brouillon — visible uniquement par vous</p>
          </div>
          <Button size="sm" className="bg-green hover:bg-green/90 flex-shrink-0" icon={<CheckCircle size={13} />} loading={publishing} onClick={publier}>
            Publier maintenant
          </Button>
        </div>
      )}
      {rapport.statut === 'publie' && (
        <div className="flex items-center gap-2 bg-green/5 border border-green/15 rounded-xl px-5 py-3">
          <CheckCircle size={14} className="text-green flex-shrink-0" />
          <p className="text-xs text-green">Publié le {formatDate(rapport.published_at || rapport.created_at)} · accessible selon la visibilité</p>
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
          {!editing && <h1 className="text-xl font-bold text-text-primary">{rapport.titre}</h1>}
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
        <div className="flex items-center gap-2 flex-wrap">
          {rapport.statut === 'brouillon' && isOwn && !editing && (
            <Button variant="secondary" size="sm" icon={<Edit3 size={13} />} onClick={() => setEditing(true)}>Modifier</Button>
          )}
          {rapport.statut === 'publie' && isOwn && (
            <Button variant="secondary" size="sm" icon={<Archive size={13} />} loading={saving} onClick={archiver}>Archiver</Button>
          )}
          {editing && (
            <>
              <Button variant="secondary" size="sm" icon={<X size={13} />} onClick={() => setEditing(false)}>Annuler</Button>
              <Button size="sm" icon={<Save size={13} />} loading={saving} onClick={save}>Enregistrer</Button>
            </>
          )}
          {!editing && (
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportPDF}>PDF</Button>
          )}
          {canDelete && !editing && (
            confirmDelete ? (
              <div className="flex items-center gap-2 bg-surface border border-red/20 rounded-lg px-3 py-1.5">
                <span className="text-xs text-text-muted">Supprimer définitivement ?</span>
                <button onClick={deleteRapport} disabled={deleting} className="text-xs text-red font-semibold hover:underline disabled:opacity-50">
                  {deleting ? '...' : 'Confirmer'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:underline">Annuler</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-red/10 text-text-muted hover:text-red transition-colors" title="Supprimer le rapport">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Members tagged */}
      {membresTaggues.length > 0 && !editing && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-2xs text-text-muted">
            <Tag size={10} /> Membres concernés :
          </div>
          {membresTaggues.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet/10 text-violet border border-violet/20 text-2xs font-medium">
              <span className="w-4 h-4 rounded-full bg-violet text-white flex items-center justify-center text-2xs font-bold">{m.prenom[0]}</span>
              {m.prenom} {m.nom}
            </span>
          ))}
        </div>
      )}

      {/* Engagement bar — publie + archive */}
      {rapport.statut !== 'brouillon' && !editing && (
        <div className="flex items-center gap-3 py-1 flex-wrap">
          {/* Like / Dislike groupés */}
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
      {editing ? (
        <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="label">Titre</label>
            <input className="input" value={editForm.titre} onChange={e => setEditForm({ ...editForm, titre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Type</label>
              <select className="input" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Visibilité</label>
              <select className="input" value={editForm.visibilite} onChange={e => setEditForm({ ...editForm, visibilite: e.target.value as RapportVisibilite })}>
                {VISI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Résumé exécutif</label>
            <textarea className="input" rows={3} value={editForm.resume} onChange={e => setEditForm({ ...editForm, resume: e.target.value })} placeholder="Points clés..." />
          </div>
          <div className="space-y-1.5">
            <label className="label">Corps du rapport</label>
            <textarea className="input" rows={14} value={editForm.contenu} onChange={e => setEditForm({ ...editForm, contenu: e.target.value })} placeholder="Contenu détaillé..." style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: '1.6' }} />
          </div>
          {membres.length > 0 && (
            <div className="space-y-2">
              <label className="label">Membres concernés</label>
              <div className="flex flex-wrap gap-2">
                {membres.map(m => {
                  const selected = editForm.membres_concernes.includes(m.id)
                  return (
                    <button key={m.id} type="button" onClick={() => toggleEditMembre(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                        selected ? 'bg-violet/10 text-violet border-violet/30 font-medium' : 'bg-surface text-text-muted border-surface-border hover:border-violet/30'
                      }`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-2xs font-bold ${selected ? 'bg-violet text-white' : 'bg-surface-elevated text-text-muted'}`}>
                        {m.prenom[0]}
                      </span>
                      {m.prenom} {m.nom}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
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
              {rapport.statut === 'brouillon' && isOwn && (
                <button onClick={() => setEditing(true)} className="text-blue text-xs mt-2 hover:underline">Rédiger le contenu →</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pièces jointes */}
      {!editing && (piecesJointes.length > 0 || (isOwn || isAdmin)) && (
        <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Paperclip size={13} className="text-blue" />
              Pièces jointes {piecesJointes.length > 0 && <span className="font-normal normal-case">({piecesJointes.length})</span>}
            </h3>
            {(isOwn || isAdmin) && (
              <button
                onClick={() => pjInputRef.current?.click()}
                disabled={uploadingPJ}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue/10 text-blue text-xs font-medium hover:bg-blue/20 transition-colors disabled:opacity-50"
              >
                {uploadingPJ ? (
                  <span className="animate-spin w-3 h-3 border-2 border-blue/30 border-t-blue rounded-full" />
                ) : (
                  <Paperclip size={12} />
                )}
                {uploadingPJ ? 'Envoi…' : 'Ajouter'}
              </button>
            )}
          </div>

          {/* Upload zone drag & drop (visible si auteur/admin) */}
          {(isOwn || isAdmin) && piecesJointes.length === 0 && !uploadingPJ && (
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                pjDragOver ? 'border-blue bg-blue/5' : 'border-surface-border hover:border-blue/40'
              }`}
              onClick={() => pjInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setPjDragOver(true) }}
              onDragLeave={() => setPjDragOver(false)}
              onDrop={e => { e.preventDefault(); setPjDragOver(false); uploadPJ(e.dataTransfer.files) }}
            >
              <p className="text-xs text-text-muted">Glisser des fichiers ou <span className="text-blue">parcourir</span></p>
            </div>
          )}

          <input ref={pjInputRef} type="file" multiple className="hidden" onChange={e => uploadPJ(e.target.files)} />

          {piecesJointes.length > 0 && (
            <div className="space-y-1.5">
              {piecesJointes.map(pj => (
                <PieceJointeRow
                  key={pj.id}
                  pj={pj}
                  canDelete={pj.uploaded_by === user?.id || isAdmin}
                  onDownload={() => downloadPJ(pj)}
                  onDelete={() => deletePJ(pj)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lecteurs */}
      {rapport.statut !== 'brouillon' && lectures.length > 0 && !editing && (
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
      {rapport.statut !== 'brouillon' && !editing && (
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
              {user?.prenom?.[0] || '?'}
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
                currentUserId={user?.id || ''}
                isAdmin={isAdmin}
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
  comment, replies, currentUserId, isAdmin, rapportId, onRefresh,
}: {
  comment: Commentaire
  replies: Commentaire[]
  currentUserId: string
  isAdmin: boolean
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

  const canDelete = comment.user_id === currentUserId || isAdmin

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
              isAdmin={isAdmin}
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
  reply, currentUserId, isAdmin, rapportId, parentCommentId, onRefresh,
}: {
  reply: Commentaire
  currentUserId: string
  isAdmin: boolean
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

  const canDelete = reply.user_id === currentUserId || isAdmin

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

// ── PieceJointeRow ────────────────────────────────────────────
function PieceJointeRow({
  pj, canDelete, onDownload, onDelete,
}: {
  pj: PieceJointe
  canDelete: boolean
  onDownload: () => void
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const ext = pj.nom.split('.').pop()?.toLowerCase() || ''
  const iconColor = ext === 'pdf' ? 'text-red' : ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'text-violet' : ['xls','xlsx','csv'].includes(ext) ? 'text-green' : 'text-blue'

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg group hover:border-blue/30 transition-all">
      <FileText size={14} className={`flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary truncate">{pj.nom}</p>
        {pj.taille && <p className="text-2xs text-text-muted">{pj.taille < 1024 * 1024 ? `${(pj.taille / 1024).toFixed(1)} Ko` : `${(pj.taille / (1024 * 1024)).toFixed(1)} Mo`}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onDownload} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-blue transition-colors" title="Télécharger">
          <Download size={13} />
        </button>
        {canDelete && (
          confirmDel ? (
            <span className="flex items-center gap-1 text-2xs">
              <button onClick={onDelete} className="text-red hover:underline font-medium">Suppr.</button>
              <button onClick={() => setConfirmDel(false)} className="text-text-muted hover:underline">✕</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors opacity-0 group-hover:opacity-100" title="Supprimer">
              <Trash2 size={12} />
            </button>
          )
        )}
      </div>
    </div>
  )
}
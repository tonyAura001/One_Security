// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { formatDate } from '@/aurantir-front-kit/lib/utils'
import {
  Plus, Pencil, ExternalLink, Copy, CheckCircle2,
  BarChart3, Layers, Archive, Play, PauseCircle,
  ChevronLeft, Trash2, ClipboardList,
} from 'lucide-react'

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'closed'
  public_token: string
  created_at: string
  _response_count?: number
}

const STATUS_CFG = {
  draft:  { label: 'Brouillon', color: 'bg-slate-700 text-slate-300' },
  active: { label: 'Actif',     color: 'bg-emerald-900/60 text-emerald-400' },
  closed: { label: 'Clôturé',   color: 'bg-red-900/60 text-red-400' },
} as const

export default function SurveyBuilderListPage() {
  const router = useRouter()
  const { entiteActive } = useAppStore()
  const supabase = createClient()

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!entiteActive?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('surveys')
      .select('id, title, description, status, public_token, created_at')
      .eq('entite_id', entiteActive.id)
      .order('created_at', { ascending: false })
    if (data) {
      const enriched = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from('survey_responses')
            .select('id', { count: 'exact', head: true })
            .eq('survey_id', s.id)
            .eq('is_complete', true)
          return { ...s, _response_count: count ?? 0 }
        })
      )
      setSurveys(enriched)
    }
    setLoading(false)
  }, [entiteActive?.id])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newTitle.trim() || !entiteActive?.id) return
    setCreating(true)
    const { data } = await supabase.rpc('create_survey', {
      p_entite_id: entiteActive.id,
      p_title: newTitle.trim(),
    })
    setCreating(false)
    if (data) router.push(`/crm/satisfaction/builder/${data}`)
  }

  const handleStatus = async (id: string, status: string) => {
    await supabase.rpc('update_survey_status', { p_id: id, p_status: status })
    load()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('surveys').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  const copyLink = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/survey/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/crm/satisfaction" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList size={22} className="text-cyan-400" />
              Formulaires de satisfaction
            </h1>
            <p className="text-sm text-slate-400">{surveys.length} formulaire{surveys.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowForm(true)}
        >
          Nouveau formulaire
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border border-cyan-500/30 bg-slate-900/80 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Créer un formulaire</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Titre du formulaire (ex: Satisfaction Q2 2026)"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!newTitle.trim()}>
              Créer
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setNewTitle('') }}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">Aucun formulaire créé</p>
          <p className="text-slate-600 text-xs mt-1">Créez votre premier formulaire de satisfaction</p>
          <Button variant="primary" icon={<Plus size={16} />} className="mt-4" onClick={() => setShowForm(true)}>
            Créer un formulaire
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => {
            const cfg = STATUS_CFG[s.status]
            return (
              <Card key={s.id} className="p-4 hover:border-slate-600 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{s.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        {s._response_count} réponse{(s._response_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        Créé le {formatDate(s.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status toggle */}
                    {s.status === 'draft' && (
                      <button
                        title="Activer"
                        onClick={() => handleStatus(s.id, 'active')}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors"
                      >
                        <Play size={15} />
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button
                        title="Clôturer"
                        onClick={() => handleStatus(s.id, 'closed')}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
                      >
                        <PauseCircle size={15} />
                      </button>
                    )}
                    {s.status === 'closed' && (
                      <button
                        title="Réouvrir"
                        onClick={() => handleStatus(s.id, 'active')}
                        className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/20 transition-colors"
                      >
                        <Play size={15} />
                      </button>
                    )}

                    {/* Copy link */}
                    <button
                      title="Copier le lien public"
                      onClick={() => copyLink(s.public_token, s.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/20 transition-colors"
                    >
                      {copiedId === s.id ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>

                    {/* Open public */}
                    <a
                      href={`/survey/${s.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                      title="Voir le formulaire public"
                    >
                      <ExternalLink size={15} />
                    </a>

                    {/* Edit */}
                    <Link
                      href={`/crm/satisfaction/builder/${s.id}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </Link>

                    {/* Delete (only drafts) */}
                    {s.status === 'draft' && (
                      <button
                        title="Supprimer"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
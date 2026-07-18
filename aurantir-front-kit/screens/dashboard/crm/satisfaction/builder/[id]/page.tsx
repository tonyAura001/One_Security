// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import {
  ChevronLeft, Plus, GripVertical, Trash2, ChevronDown, ChevronUp,
  Copy, CheckCircle2, ExternalLink, Save, Play, PauseCircle,
  AlignLeft, List, ToggleLeft, Star, Hash, MessageSquare,
  Smile, Settings2, X, AlertCircle,
} from 'lucide-react'

type QuestionType = 'text_short' | 'text_long' | 'multiple_choice' | 'single_choice' | 'rating_5' | 'rating_10' | 'nps' | 'emojis' | 'boolean'

interface Question {
  id: string | null // null = not yet saved
  _local_id: string // always present for React key
  type: QuestionType
  question_text: string
  placeholder: string
  is_required: boolean
  sort_order: number
  choices: string[]
  logic_condition: {
    enabled: boolean
    source_question_id: string
    operator: string
    value: string
    action: 'show' | 'skip'
  } | null
  _dirty: boolean
  _saving: boolean
}

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'closed'
  public_token: string
}

const TYPE_OPTIONS: { value: QuestionType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'text_short',      label: 'Texte court',      icon: <AlignLeft size={15} />,    desc: 'Réponse courte' },
  { value: 'text_long',       label: 'Texte long',       icon: <MessageSquare size={15} />, desc: 'Réponse détaillée' },
  { value: 'single_choice',   label: 'Choix unique',     icon: <List size={15} />,          desc: 'Une seule réponse' },
  { value: 'multiple_choice', label: 'Choix multiple',   icon: <List size={15} />,          desc: 'Plusieurs réponses' },
  { value: 'rating_5',        label: 'Note /5',          icon: <Star size={15} />,          desc: 'Étoiles 1-5' },
  { value: 'rating_10',       label: 'Note /10',         icon: <Star size={15} />,          desc: 'Score 1-10' },
  { value: 'nps',             label: 'NPS',              icon: <Hash size={15} />,          desc: 'Net Promoter Score' },
  { value: 'emojis',          label: 'Émojis',           icon: <Smile size={15} />,         desc: '😞 → 😊' },
  { value: 'boolean',         label: 'Oui / Non',        icon: <ToggleLeft size={15} />,   desc: 'Booléen' },
]

let localIdCounter = 0
function newLocalId() { return `local_${++localIdCounter}` }

function makeQuestion(sort_order: number): Question {
  return {
    id: null,
    _local_id: newLocalId(),
    type: 'text_short',
    question_text: '',
    placeholder: '',
    is_required: false,
    sort_order,
    choices: [],
    logic_condition: null,
    _dirty: true,
    _saving: false,
  }
}

export default function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTitle, setSavingTitle] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const dragRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: s } = await supabase
      .from('surveys')
      .select('id, title, description, status, public_token')
      .eq('id', id)
      .single()
    if (!s) { router.push('/crm/satisfaction/builder'); return }
    setSurvey(s)

    const { data: qs } = await supabase
      .from('survey_questions')
      .select('id, type, question_text, placeholder, is_required, sort_order, choices, logic_condition')
      .eq('survey_id', id)
      .order('sort_order')
    setQuestions((qs ?? []).map((q: any) => ({
      ...q,
      _local_id: newLocalId(),
      choices: (q.choices as string[]) ?? [],
      logic_condition: (q.logic_condition as Question['logic_condition']) ?? null,
      _dirty: false,
      _saving: false,
    })))
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Auto-save a question after 800ms of inactivity
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const questionsRef = useRef<Question[]>([])
  useEffect(() => { questionsRef.current = questions }, [questions])

  const updateQuestion = (localId: string, patch: Partial<Question>, immediate = false) => {
    setQuestions(prev => prev.map(q =>
      q._local_id === localId ? { ...q, ...patch, _dirty: true } : q
    ))
    clearTimeout(saveTimers.current[localId])
    const delay = immediate ? 0 : 800
    saveTimers.current[localId] = setTimeout(() => persistQuestion(localId), delay)
  }

  const persistQuestion = async (localId: string) => {
    const current = questionsRef.current.find(q => q._local_id === localId)
    if (!current) return
    setQuestions(prev => prev.map(q => q._local_id === localId ? { ...q, _saving: true } : q))

    const { data: savedId } = await supabase.rpc('upsert_survey_question', {
      p_survey_id:       id,
      p_question_id:     current.id ?? undefined,
      p_type:            current.type,
      p_question_text:   current.question_text || 'Nouvelle question',
      p_placeholder:     current.placeholder || null,
      p_is_required:     current.is_required,
      p_sort_order:      current.sort_order,
      p_choices:         JSON.stringify(current.choices),
      p_logic_condition: current.logic_condition ? JSON.stringify(current.logic_condition) : null,
    })
    setQuestions(prev => prev.map(q =>
      q._local_id === localId
        ? { ...q, id: savedId ?? q.id, _dirty: false, _saving: false }
        : q
    ))
  }

  const addQuestion = () => {
    const q = makeQuestion(questions.length)
    setQuestions(prev => [...prev, q])
    setExpandedId(q._local_id)
  }

  const removeQuestion = async (q: Question) => {
    if (q.id) await supabase.from('survey_questions').delete().eq('id', q.id)
    setQuestions(prev => prev.filter(x => x._local_id !== q._local_id))
  }

  const moveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return
    const next = [...questions]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    const reordered = next.map((q, i) => ({ ...q, sort_order: i, _dirty: true }))
    setQuestions(reordered)
    reordered.forEach(q => {
      clearTimeout(saveTimers.current[q._local_id])
      saveTimers.current[q._local_id] = setTimeout(() => persistQuestion(q._local_id), 800)
    })
  }

  const handleTitleSave = async () => {
    if (!survey) return
    setSavingTitle(true)
    await supabase.from('surveys').update({ title: survey.title, description: survey.description, updated_at: new Date().toISOString() }).eq('id', id)
    setSavingTitle(false)
  }

  const handleStatus = async (status: string) => {
    if (!survey) return
    // Validate: need at least 1 question to activate
    if (status === 'active' && questions.length === 0) {
      setError('Ajoutez au moins une question avant d\'activer le formulaire.')
      return
    }
    await supabase.rpc('update_survey_status', { p_id: id, p_status: status })
    setSurvey(prev => prev ? { ...prev, status: status as Survey['status'] } : null)
  }

  const copyLink = async () => {
    if (!survey) return
    await navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.public_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !survey) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-lg" />
        <div className="h-40 bg-slate-800 rounded-xl" />
        <div className="h-24 bg-slate-800 rounded-xl" />
      </div>
    )
  }

  const statusColor = survey.status === 'active' ? 'text-emerald-400' : survey.status === 'closed' ? 'text-red-400' : 'text-slate-400'

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/crm/satisfaction/builder" className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Éditeur de formulaire</p>
          <h1 className="text-lg font-bold text-white truncate">{survey.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {survey.status === 'draft' && (
            <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={() => handleStatus('active')}>
              Activer
            </Button>
          )}
          {survey.status === 'active' && (
            <Button variant="secondary" size="sm" icon={<PauseCircle size={14} />} onClick={() => handleStatus('closed')}>
              Clôturer
            </Button>
          )}
          {survey.status === 'closed' && (
            <Button variant="secondary" size="sm" icon={<Play size={14} />} onClick={() => handleStatus('active')}>
              Réouvrir
            </Button>
          )}
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Lien public'}
          </button>
          <a
            href={`/survey/${survey.public_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Status badge */}
      <div className={`text-xs font-medium ${statusColor} flex items-center gap-1.5`}>
        <span className={`w-2 h-2 rounded-full ${survey.status === 'active' ? 'bg-emerald-400 animate-pulse' : survey.status === 'closed' ? 'bg-red-400' : 'bg-slate-500'}`} />
        {survey.status === 'active' ? 'Actif — accessible publiquement' : survey.status === 'closed' ? 'Clôturé' : 'Brouillon — non publié'}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Survey settings card */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Settings2 size={14} />
          Paramètres généraux
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Titre</label>
            <input
              type="text"
              value={survey.title}
              onChange={e => setSurvey(prev => prev ? { ...prev, title: e.target.value } : null)}
              onBlur={handleTitleSave}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description (optionnelle)</label>
            <textarea
              value={survey.description ?? ''}
              onChange={e => setSurvey(prev => prev ? { ...prev, description: e.target.value } : null)}
              onBlur={handleTitleSave}
              rows={2}
              placeholder="Décrivez le contexte de ce formulaire..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Questions <span className="text-slate-500 ml-1">({questions.length})</span>
          </h3>
          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addQuestion}>
            Ajouter une question
          </Button>
        </div>

        {questions.length === 0 && (
          <Card className="p-10 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-700 mb-3" />
            <p className="text-sm text-slate-400">Aucune question</p>
            <p className="text-xs text-slate-600 mt-1">Ajoutez des questions pour construire votre formulaire</p>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} className="mt-4" onClick={addQuestion}>
              Première question
            </Button>
          </Card>
        )}

        {questions.map((q, idx) => (
          <QuestionCard
            key={q._local_id}
            q={q}
            idx={idx}
            total={questions.length}
            expanded={expandedId === q._local_id}
            onToggle={() => setExpandedId(expandedId === q._local_id ? null : q._local_id)}
            onChange={(patch, immediate) => updateQuestion(q._local_id, patch, immediate)}
            onDelete={() => removeQuestion(q)}
            onMoveUp={() => moveQuestion(idx, idx - 1)}
            onMoveDown={() => moveQuestion(idx, idx + 1)}
            allQuestions={questions}
            showTypeMenu={showTypeMenu === q._local_id}
            onToggleTypeMenu={() => setShowTypeMenu(showTypeMenu === q._local_id ? null : q._local_id)}
            onCloseTypeMenu={() => setShowTypeMenu(null)}
          />
        ))}
      </div>

      {questions.length > 0 && (
        <Button variant="secondary" icon={<Plus size={15} />} className="w-full" onClick={addQuestion}>
          Ajouter une question
        </Button>
      )}
    </div>
  )
}

// ── Question Card ──────────────────────────────────────────────────────────────

interface QuestionCardProps {
  q: Question
  idx: number
  total: number
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<Question>, immediate?: boolean) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  allQuestions: Question[]
  showTypeMenu: boolean
  onToggleTypeMenu: () => void
  onCloseTypeMenu: () => void
}

function QuestionCard({
  q, idx, total, expanded, onToggle, onChange, onDelete,
  onMoveUp, onMoveDown, allQuestions,
  showTypeMenu, onToggleTypeMenu, onCloseTypeMenu,
}: QuestionCardProps) {
  const typeOpt = TYPE_OPTIONS.find(t => t.value === q.type)
  const needsChoices = q.type === 'multiple_choice' || q.type === 'single_choice'

  const addChoice = () => onChange({ choices: [...q.choices, ''] })
  const updateChoice = (i: number, val: string) => {
    const next = [...q.choices]; next[i] = val; onChange({ choices: next })
  }
  const removeChoice = (i: number) => {
    onChange({ choices: q.choices.filter((_, ci) => ci !== i) })
  }

  return (
    <Card className={`transition-all ${expanded ? 'border-cyan-500/40' : 'hover:border-slate-600'}`}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="text-xs text-slate-600 w-5 text-center font-mono">{idx + 1}</span>
        <GripVertical size={14} className="text-slate-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">
            {q.question_text || <span className="text-slate-600 italic">Nouvelle question</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{typeOpt?.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {q._saving && <span className="text-xs text-slate-600">Sauvegarde...</span>}
          {q.is_required && <span className="text-xs text-red-400">Obligatoire</span>}
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 py-4 space-y-4" onClick={e => e.stopPropagation()}>
          {/* Question text */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Question <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={q.question_text}
              onChange={e => onChange({ question_text: e.target.value })}
              placeholder="Rédigez votre question..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Type selector */}
          <div className="relative">
            <label className="text-xs text-slate-400 mb-1 block">Type de réponse</label>
            <button
              onClick={onToggleTypeMenu}
              className="flex items-center gap-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white hover:border-slate-600 transition-colors"
            >
              <span className="text-slate-400">{typeOpt?.icon}</span>
              <span>{typeOpt?.label}</span>
              <ChevronDown size={14} className="ml-auto text-slate-500" />
            </button>
            {showTypeMenu && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange({ type: opt.value, choices: opt.value === 'multiple_choice' || opt.value === 'single_choice' ? [''] : [] }, true)
                      onCloseTypeMenu()
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors text-left ${q.type === opt.value ? 'text-cyan-400 bg-slate-800' : 'text-slate-300'}`}
                  >
                    <span className="text-slate-500">{opt.icon}</span>
                    <div>
                      <p>{opt.label}</p>
                      <p className="text-xs text-slate-600">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placeholder (for text types) */}
          {(q.type === 'text_short' || q.type === 'text_long') && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Placeholder (optionnel)</label>
              <input
                type="text"
                value={q.placeholder}
                onChange={e => onChange({ placeholder: e.target.value })}
                placeholder="Texte d'aide..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Choices */}
          {needsChoices && (
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Options de réponse</label>
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border border-slate-600 shrink-0 ${q.type === 'multiple_choice' ? 'rounded' : ''}`} />
                    <input
                      type="text"
                      value={c}
                      onChange={e => updateChoice(ci, e.target.value)}
                      placeholder={`Option ${ci + 1}`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <button onClick={() => removeChoice(ci)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addChoice}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors mt-1"
                >
                  <Plus size={13} /> Ajouter une option
                </button>
              </div>
            </div>
          )}

          {/* Logic condition */}
          {idx > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-slate-400">Affichage conditionnel</label>
                <button
                  onClick={() => onChange({
                    logic_condition: q.logic_condition?.enabled === false || !q.logic_condition
                      ? { enabled: true, source_question_id: allQuestions[0]?.id ?? '', operator: 'eq', value: '', action: 'show' }
                      : { ...(q.logic_condition!), enabled: !q.logic_condition?.enabled }
                  }, true)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${q.logic_condition?.enabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${q.logic_condition?.enabled ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>

              {q.logic_condition?.enabled && (
                <div className="space-y-2 bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Afficher cette question si :</p>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={q.logic_condition.source_question_id}
                      onChange={e => onChange({ logic_condition: { ...q.logic_condition!, source_question_id: e.target.value } }, true)}
                      className="col-span-3 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {allQuestions.filter((_, qi) => qi < idx).map(sq => (
                        <option key={sq.id ?? sq._local_id} value={sq.id ?? ''}>
                          Q{allQuestions.indexOf(sq) + 1}: {sq.question_text || 'Sans titre'}
                        </option>
                      ))}
                    </select>
                    <select
                      value={q.logic_condition.operator}
                      onChange={e => onChange({ logic_condition: { ...q.logic_condition!, operator: e.target.value } }, true)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="eq">est égal à</option>
                      <option value="neq">est différent de</option>
                      <option value="gt">est supérieur à</option>
                      <option value="lt">est inférieur à</option>
                      <option value="contains">contient</option>
                    </select>
                    <input
                      type="text"
                      value={q.logic_condition.value}
                      onChange={e => onChange({ logic_condition: { ...q.logic_condition!, value: e.target.value } }, true)}
                      placeholder="Valeur..."
                      className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <span className="text-sm text-slate-300">Réponse obligatoire</span>
            <button
              onClick={() => onChange({ is_required: !q.is_required }, true)}
              className={`relative w-10 h-5 rounded-full transition-colors ${q.is_required ? 'bg-cyan-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${q.is_required ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Move / delete */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onMoveUp}
              disabled={idx === 0}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={idx === total - 1}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={15} />
            </button>
            <div className="flex-1" />
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1"
            >
              <Trash2 size={13} /> Supprimer
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
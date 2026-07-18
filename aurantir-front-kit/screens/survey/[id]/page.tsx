// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { ChevronRight, ChevronLeft, Send, CheckCircle2, Star, Loader2 } from 'lucide-react'

type QuestionType = 'text_short' | 'text_long' | 'multiple_choice' | 'single_choice' | 'rating_5' | 'rating_10' | 'nps' | 'emojis' | 'boolean'

interface Question {
  id: string
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
}

interface SurveyData {
  id: string
  title: string
  description: string | null
  status: string
  entite_nom: string
  questions: Question[]
}

const EMOJIS = ['😠', '😕', '😐', '🙂', '😊']
const STORAGE_KEY = (token: string) => `survey_progress_${token}`

function evaluateLogic(condition: Question['logic_condition'], answers: Record<string, any>): boolean {
  if (!condition || !condition.enabled) return true
  const srcAnswer = answers[condition.source_question_id]
  if (srcAnswer === undefined || srcAnswer === null) return false
  const val = String(srcAnswer)
  const cond = String(condition.value)
  switch (condition.operator) {
    case 'eq': return val === cond
    case 'neq': return val !== cond
    case 'gt': return Number(val) > Number(cond)
    case 'lt': return Number(val) < Number(cond)
    case 'contains': return val.includes(cond)
    default: return true
  }
}

export default function PublicSurveyPage() {
  const { id: token } = useParams<{ id: string }>()
  const supabase = createClient()

  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const startTime = useRef<number>(Date.now())

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_survey_public', { p_token: token })
    if (!data || data.status !== 'active') { setNotFound(true); setLoading(false); return }
    setSurvey(data)
    // Restore progress from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY(token))
      if (saved) {
        const { answers: savedAnswers, idx } = JSON.parse(saved)
        setAnswers(savedAnswers ?? {})
        setCurrentIdx(idx ?? 0)
      }
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  // Persist progress
  useEffect(() => {
    if (!survey) return
    localStorage.setItem(STORAGE_KEY(token), JSON.stringify({ answers, idx: currentIdx }))
  }, [answers, currentIdx, survey, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-white">Formulaire indisponible</h1>
          <p className="text-slate-400 text-sm">Ce formulaire n'existe pas ou n'est plus actif.</p>
        </div>
      </div>
    )
  }

  if (!survey) return null

  // Filter questions based on logic conditions
  const visibleQuestions = survey.questions.filter(q => evaluateLogic(q.logic_condition, answers))
  const current = visibleQuestions[currentIdx]
  const progress = visibleQuestions.length > 0 ? ((currentIdx) / visibleQuestions.length) * 100 : 0
  const isLast = currentIdx === visibleQuestions.length - 1

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Merci pour votre avis !</h1>
            <p className="text-slate-400 text-sm">Vos réponses ont bien été enregistrées.</p>
            {survey.entite_nom && (
              <p className="text-slate-500 text-xs mt-3">— {survey.entite_nom}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const goTo = (nextIdx: number, dir: 'forward' | 'back') => {
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setCurrentIdx(nextIdx)
      setAnimating(false)
    }, 220)
  }

  const handleNext = () => {
    if (!current) return
    if (current.is_required && (answers[current.id] === undefined || answers[current.id] === '' || answers[current.id] === null)) {
      setError('Cette question est obligatoire.')
      return
    }
    setError(null)
    if (isLast) { handleSubmit(); return }
    goTo(currentIdx + 1, 'forward')
  }

  const handleBack = () => {
    if (currentIdx === 0) return
    setError(null)
    goTo(currentIdx - 1, 'back')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const completionTime = Math.round((Date.now() - startTime.current) / 1000)
    const formattedAnswers = Object.entries(answers).map(([question_id, answer_value]) => ({
      question_id,
      answer_value,
    }))
    await supabase.rpc('submit_survey_response', {
      p_survey_id: survey.id,
      p_answers: formattedAnswers,
      p_completion_time: completionTime,
    })
    localStorage.removeItem(STORAGE_KEY(token))
    setSubmitting(false)
    setSubmitted(true)
  }

  const setAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setError(null)
  }

  const slideClass = animating
    ? direction === 'forward'
      ? 'opacity-0 translate-x-8'
      : 'opacity-0 -translate-x-8'
    : 'opacity-100 translate-x-0'

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Survey header */}
      <div className="pt-8 pb-4 px-6 text-center">
        {survey.entite_nom && (
          <p className="text-xs text-slate-500 mb-1">{survey.entite_nom}</p>
        )}
        <h1 className="text-base font-semibold text-slate-300">{survey.title}</h1>
        <p className="text-xs text-slate-600 mt-1">
          {currentIdx + 1} / {visibleQuestions.length}
        </p>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div
          className={`w-full max-w-xl transition-all duration-220 ease-out ${slideClass}`}
          style={{ transition: 'opacity 220ms ease-out, transform 220ms ease-out' }}
        >
          {current && (
            <QuestionBlock
              question={current}
              value={answers[current.id]}
              onChange={val => setAnswer(current.id, val)}
              onEnter={handleNext}
              error={error}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="pb-10 px-6">
        <div className="flex items-center justify-between max-w-xl mx-auto gap-4">
          <button
            onClick={handleBack}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all px-3 py-2"
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold text-sm transition-all disabled:opacity-70 shadow-lg shadow-cyan-500/20"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Envoi...</>
            ) : isLast ? (
              <><Send size={16} /> Envoyer</>
            ) : (
              <>Suivant <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        {!isLast && (
          <p className="text-center text-xs text-slate-700 mt-3">
            Appuyez sur <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">Entrée</kbd> pour continuer
          </p>
        )}
      </div>
    </div>
  )
}

// ── Question renderers ─────────────────────────────────────────────────────────

interface QuestionBlockProps {
  question: Question
  value: any
  onChange: (val: any) => void
  onEnter: () => void
  error: string | null
}

function QuestionBlock({ question, value, onChange, onEnter, error }: QuestionBlockProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white leading-snug">
          {question.question_text}
          {question.is_required && <span className="text-red-400 ml-1">*</span>}
        </h2>
      </div>

      <div className="space-y-3">
        {question.type === 'text_short' && (
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onEnter()}
            placeholder={question.placeholder || 'Votre réponse...'}
            autoFocus
            className="w-full bg-transparent border-b-2 border-slate-700 focus:border-cyan-500 px-0 py-3 text-lg text-white placeholder-slate-600 outline-none transition-colors"
          />
        )}

        {question.type === 'text_long' && (
          <textarea
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={question.placeholder || 'Votre réponse détaillée...'}
            autoFocus
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-2xl px-4 py-3 text-base text-white placeholder-slate-600 outline-none resize-none transition-colors"
          />
        )}

        {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
          <div className="space-y-3">
            {question.choices.map((c, i) => {
              const selected = question.type === 'multiple_choice'
                ? (Array.isArray(value) ? value : []).includes(c)
                : value === c
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (question.type === 'multiple_choice') {
                      const arr = Array.isArray(value) ? value : []
                      onChange(selected ? arr.filter((x: string) => x !== c) : [...arr, c])
                    } else {
                      onChange(c)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left text-sm font-medium transition-all ${
                    selected
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-600'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  {c}
                </button>
              )
            })}
          </div>
        )}

        {question.type === 'rating_5' && (
          <div className="flex items-center gap-3 justify-center py-4">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`transition-colors ${n <= (value ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                />
              </button>
            ))}
          </div>
        )}

        {question.type === 'rating_10' && (
          <div className="space-y-3">
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  onClick={() => onChange(n)}
                  className={`flex-1 aspect-square rounded-xl text-sm font-bold transition-all ${
                    value === n
                      ? 'bg-cyan-500 text-white scale-110'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Pas du tout satisfait</span>
              <span>Très satisfait</span>
            </div>
          </div>
        )}

        {question.type === 'nps' && (
          <div className="space-y-3">
            <div className="grid grid-cols-11 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  onClick={() => onChange(n)}
                  className={`aspect-square rounded-xl text-sm font-bold transition-all ${
                    value === n
                      ? n >= 9 ? 'bg-emerald-500 text-white scale-110'
                        : n >= 7 ? 'bg-amber-500 text-white scale-110'
                        : 'bg-red-500 text-white scale-110'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Pas du tout probable</span>
              <span>Très probable</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">Détracteurs (0-6)</span>
              <span className="text-amber-400">Passifs (7-8)</span>
              <span className="text-emerald-400">Promoteurs (9-10)</span>
            </div>
          </div>
        )}

        {question.type === 'emojis' && (
          <div className="flex items-center gap-4 justify-center py-4">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => onChange(i + 1)}
                className={`text-4xl transition-all ${value === i + 1 ? 'scale-150' : 'opacity-50 hover:opacity-100 hover:scale-125'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {question.type === 'boolean' && (
          <div className="flex items-center gap-4 justify-center py-2">
            {[{ val: true, label: 'Oui', color: 'emerald' }, { val: false, label: 'Non', color: 'red' }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => onChange(opt.val)}
                className={`px-12 py-4 rounded-2xl text-lg font-semibold border-2 transition-all ${
                  value === opt.val
                    ? opt.color === 'emerald'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-red-500/20 border-red-500 text-red-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 animate-pulse">{error}</p>
      )}
    </div>
  )
}
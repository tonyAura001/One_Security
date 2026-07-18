// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Input } from '@/aurantir-front-kit/components/ui/Input'
import { Eye, EyeOff, Zap, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [magicSent, setMagicSent] = useState(false)
  const supabase = createClient()

  const rawRedirect = searchParams.get('redirect') || '/'
  // Prevent open redirect: only allow same-origin relative paths
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
  const errorParam  = searchParams.get('error')
  const reasonParam = searchParams.get('reason')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` }
    })

    if (error) {
      setError('Erreur envoi du lien magique')
      setLoading(false)
      return
    }

    setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background-DEFAULT flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0A0D14 0%, #0D1117 40%, #111827 100%)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue flex items-center justify-center shadow-glow-blue">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-text-primary">Aurantir Workspace</p>
            <p className="text-xs text-text-muted">x Aurantir Platform</p>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue/30 bg-blue/10">
            <Sparkles size={12} className="text-blue" />
            <span className="text-xs text-blue">Plateforme collaborative</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
            L&apos;écosystème tout-en-un pour vos espaces de travail.
          </h2>
          <div className="space-y-6 divide-y divide-slate-800/40">
            {[
              {
                num: '01',
                title: 'Gestion des espaces',
                desc: 'Planification, attribution et optimisation de vos ressources physiques en temps réel.',
              },
              {
                num: '02',
                title: 'CRM Intégré',
                desc: 'Automatisation complète du suivi, facturation et gestion des contrats de vos membres.',
              },
              {
                num: '03',
                title: 'Pilotage Centralisé',
                desc: 'Analyse des performances et des indicateurs clés via un tableau de bord unique.',
              },
            ].map((f, i) => (
              <div key={f.num} className={`flex items-start gap-4 ${i > 0 ? 'pt-6' : ''}`}>
                <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  {f.num}
                </span>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-slate-200">{f.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-text-muted">
            © 2025 Aurantir Workspace · Dakar, Sénégal
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <p className="font-bold text-text-primary">Aurantir Workspace</p>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {mode === 'magic' ? 'Connexion par lien' : 'Connexion'}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Accédez à votre espace de travail
            </p>
          </div>

          {reasonParam === 'timeout' && (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/40">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-sm mt-0.5">⏱</span>
                <div>
                  <p className="text-xs font-semibold text-amber-300">Session expirée</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    Vous avez été déconnecté après 30 minutes d&apos;inactivité. Veuillez vous reconnecter pour des raisons de sécurité.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(errorParam === 'compte_revoque' || errorParam === 'session_revoquee' || errorParam === 'session_invalid') && (
            <div className="p-3 rounded-lg bg-red/10 border border-red/20">
              <p className="text-xs text-red">
                {errorParam === 'compte_revoque'
                  ? "Votre compte a été révoqué. Contactez l'administrateur."
                  : errorParam === 'session_invalid'
                  ? 'Profil introuvable. Reconnectez-vous ou contactez l\'administrateur.'
                  : 'Votre session a été invalidée.'}
              </p>
            </div>
          )}

          <div className="flex rounded-xl border border-surface-border p-1 bg-background-elevated">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'password'
                  ? 'bg-surface text-text-primary shadow-card'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Mot de passe
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'magic'
                  ? 'bg-surface text-text-primary shadow-card'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Lien magique
            </button>
          </div>

          {magicSent ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green/10 border border-green/20 flex items-center justify-center mx-auto">
                <Mail size={24} className="text-green" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">Vérifiez votre email</p>
                <p className="text-sm text-text-muted mt-1">
                  Lien envoyé à <strong className="text-text-primary">{email}</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMagicSent(false); setMode('password') }}
              >
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={mode === 'password' ? handleLogin : handleMagicLink} className="space-y-4">
              <Input
                label="Email professionnel"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@samadigital.sn"
                required
                autoFocus
                icon={<Mail size={14} />}
              />

              {mode === 'password' && (
                <Input
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  icon={<Lock size={14} />}
                  iconRight={
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red/10 border border-red/20">
                  <p className="text-xs text-red">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                icon={mode === 'magic' ? <Mail size={14} /> : undefined}
                iconRight={!loading ? <ArrowRight size={14} /> : undefined}
              >
                {mode === 'password' ? 'Se connecter' : 'Envoyer le lien'}
              </Button>

              {mode === 'password' && (
                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-text-muted hover:text-blue transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
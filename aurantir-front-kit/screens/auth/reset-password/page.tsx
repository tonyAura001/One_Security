// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Input } from '@/aurantir-front-kit/components/ui/Input'
import { Zap, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [exchangeError, setExchangeError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Echange le code PKCE pour établir la session avant de montrer le form
  useEffect(() => {
    async function exchangeCode() {
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setExchangeError('Lien invalide ou expiré. Redemandez un nouveau lien.')
        }
      } else if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (error) {
          setExchangeError('Lien invalide ou expiré. Redemandez un nouveau lien.')
        }
      } else {
        // Pas de code → vérifier si l'utilisateur a déjà une session (accès direct)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setExchangeError('Aucun lien de réinitialisation détecté. Utilisez le lien reçu par email.')
        }
      }
      setExchanging(false)
    }
    exchangeCode()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Impossible de mettre à jour le mot de passe. Réessayez.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <p className="font-bold text-text-primary">Aurantir Workspace</p>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Nouveau mot de passe</h1>
          <p className="text-sm text-text-muted mt-1">Choisissez un mot de passe sécurisé</p>
        </div>

        {exchanging ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
          </div>
        ) : exchangeError ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red/10 border border-red/20 flex items-start gap-3">
              <AlertCircle size={16} className="text-red mt-0.5 shrink-0" />
              <p className="text-sm text-red">{exchangeError}</p>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/forgot-password')}>
              Redemander un lien
            </Button>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green/10 border border-green/20 flex items-start gap-3">
              <CheckCircle size={16} className="text-green mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">Mot de passe mis à jour</p>
                <p className="text-xs text-text-muted mt-0.5">Redirection vers la connexion…</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              iconRight={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
            <Input
              label="Confirmer le mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && (
              <div className="p-3 rounded-lg bg-red/10 border border-red/20">
                <p className="text-xs text-red">{error}</p>
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Mettre à jour le mot de passe
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
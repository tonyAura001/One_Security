// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Input } from '@/aurantir-front-kit/components/ui/Input'
import { ArrowLeft, Mail, CheckCircle2, Zap } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'lien_invalide') {
      setError('Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      setError('Erreur lors de l\'envoi. Vérifiez l\'email saisi.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background-DEFAULT flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <p className="font-bold text-text-primary">Aurantir Workspace</p>
        </div>

        {sent ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-green/10 border border-green/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Email envoyé</h1>
              <p className="text-sm text-text-muted mt-2">
                Un lien de réinitialisation a été envoyé à <strong className="text-text-primary">{email}</strong>.
                Le lien expire dans 15 minutes.
              </p>
            </div>
            <Link href="/login">
              <Button variant="secondary" className="w-full" icon={<ArrowLeft size={14} />}>
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Mot de passe oublié</h1>
              <p className="text-sm text-text-muted mt-1">
                Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && (
                <div className="p-3 rounded-lg bg-red/10 border border-red/20">
                  <p className="text-xs text-red">{error}</p>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Envoyer le lien
              </Button>
            </form>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-blue transition-colors">
                <ArrowLeft size={12} />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
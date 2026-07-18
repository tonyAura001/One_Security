// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Zap, Check, Eye, EyeOff } from 'lucide-react'

const ETAPES = [
  { id: 1, titre: 'Bienvenue', desc: 'Configurez votre profil' },
  { id: 2, titre: 'Sécurité', desc: 'Choisissez votre mot de passe' },
  { id: 3, titre: 'Préférences', desc: 'Personnalisez votre expérience' },
  { id: 4, titre: 'Prêt !', desc: 'Démarrez avec la plateforme' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMdp, setShowMdp] = useState(false)
  const supabase = createClient()

  const [profil, setProfil] = useState({ prenom: '', telephone: '' })
  const [mdp, setMdp] = useState({ nouveau: '', confirmation: '' })
  const [theme, setTheme] = useState<'sombre' | 'clair'>('clair')

  async function continuer() {
    setError('')
    if (etape === 1) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && profil.prenom) {
        await supabase.from('users').update({
          prenom: profil.prenom, telephone: profil.telephone || null,
        }).eq('auth_user_id', user.id)
      }
      setEtape(2)
      return
    }
    if (etape === 2) {
      if (mdp.nouveau.length < 8) { setError('Minimum 8 caractères'); return }
      if (mdp.nouveau !== mdp.confirmation) { setError('Les mots de passe ne correspondent pas'); return }
      const { error: e } = await supabase.auth.updateUser({ password: mdp.nouveau })
      if (e) { setError(e.message); return }
      setEtape(3)
      return
    }
    if (etape === 3) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ theme }).eq('auth_user_id', user.id)
      }
      setEtape(4)
    }
  }

  async function terminerOnboarding() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ premiere_connexion: false }).eq('auth_user_id', user.id)
      await supabase.from('onboarding').upsert({ user_id: user.id, complete: true, progression: 100 }, { onConflict: 'user_id' })
    }
    router.push('/')
    router.refresh()
  }

  const canContinue =
    (etape === 1 && profil.prenom.length > 0) ||
    (etape === 2 && mdp.nouveau.length >= 8) ||
    etape === 3

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-8 animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <p className="font-bold text-white">Sama Digital Platform</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2">
          {ETAPES.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                e.id < etape ? 'bg-[#10B981] text-white' :
                e.id === etape ? 'bg-[#3B82F6] text-white' :
                'bg-[#1F2937] text-[#6B7280]'
              }`}>
                {e.id < etape ? <Check size={12} /> : e.id}
              </div>
              {i < ETAPES.length - 1 && (
                <div className={`flex-1 h-0.5 ${e.id < etape ? 'bg-[#10B981]' : 'bg-[#1F2937]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">{ETAPES[etape - 1].titre}</h2>
            <p className="text-sm text-[#9CA3AF] mt-1">{ETAPES[etape - 1].desc}</p>
          </div>

          {etape === 4 ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto">
                <Check size={24} className="text-[#10B981]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">Votre compte est configuré. Bienvenue dans la plateforme !</p>
              <Button onClick={terminerOnboarding} loading={loading} className="w-full">
                Accéder à la plateforme
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {etape === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#9CA3AF]">Prénom *</label>
                    <input className="w-full bg-[#0A0D14] border border-[#374151] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3B82F6] transition-colors"
                      value={profil.prenom} onChange={e => setProfil({ ...profil, prenom: e.target.value })} placeholder="Votre prénom" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#9CA3AF]">Téléphone</label>
                    <input className="w-full bg-[#0A0D14] border border-[#374151] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3B82F6] transition-colors"
                      type="tel" value={profil.telephone} onChange={e => setProfil({ ...profil, telephone: e.target.value })} placeholder="+221 XX XXX XX XX" />
                  </div>
                </div>
              )}
              {etape === 2 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#9CA3AF]">Nouveau mot de passe</label>
                    <div className="relative">
                      <input className="w-full bg-[#0A0D14] border border-[#374151] rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3B82F6] transition-colors"
                        type={showMdp ? 'text' : 'password'} value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} placeholder="••••••••" autoFocus />
                      <button onClick={() => setShowMdp(!showMdp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white">
                        {showMdp ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-2xs text-[#6B7280]">8 caractères minimum</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#9CA3AF]">Confirmer le mot de passe</label>
                    <input className="w-full bg-[#0A0D14] border border-[#374151] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3B82F6] transition-colors"
                      type="password" value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} placeholder="••••••••" />
                  </div>
                  {mdp.nouveau && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(n => {
                        const score = [mdp.nouveau.length >= 8, /[A-Z]/.test(mdp.nouveau), /[0-9]/.test(mdp.nouveau), /[^a-zA-Z0-9]/.test(mdp.nouveau)].filter(Boolean).length
                        return <div key={n} className={`flex-1 h-1 rounded-full ${n <= score ? score >= 4 ? 'bg-[#10B981]' : score >= 2 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]' : 'bg-[#1F2937]'}`} />
                      })}
                    </div>
                  )}
                </div>
              )}
              {etape === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-[#9CA3AF]">Choisissez votre thème d&apos;affichage.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'sombre', label: 'Sombre', bg: 'bg-[#0A0D14]' },
                      { value: 'clair',  label: 'Clair',  bg: 'bg-white' },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => setTheme(opt.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${theme === opt.value ? 'border-[#3B82F6]' : 'border-[#1F2937] hover:border-[#374151]'}`}>
                        <div className={`h-12 rounded-lg border border-[#374151] ${opt.bg} mb-2`} />
                        <p className="text-xs font-medium text-white">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-[#EF4444]">{error}</p>}
              <Button className="w-full" onClick={continuer} disabled={!canContinue}>
                Continuer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
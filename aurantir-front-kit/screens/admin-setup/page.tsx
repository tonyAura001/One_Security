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
import { Zap, Shield, Users, CheckCircle, AlertTriangle } from 'lucide-react'

const FONDATEURS_INITIAUX = [
  {
    prenom: 'Thierno Sadou',
    nom: 'Diallo',
    email: 'thierno@samadigital.sn',
    role: 'super_admin',
    titre: 'Directeur Technique & Co-fondateur',
    couleur: '#3B82F6',
  },
  {
    prenom: 'Salam',
    nom: '',
    email: 'salam@samadigital.sn',
    role: 'fondateur',
    titre: 'Directeur Financier & Co-fondateur',
    couleur: '#10B981',
  },
  {
    prenom: 'Hamid',
    nom: '',
    email: 'hamid@samadigital.sn',
    role: 'fondateur',
    titre: 'Directeur Commercial & Co-fondateur',
    couleur: '#8B5CF6',
  },
]

interface SetupStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
}

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState(
    FONDATEURS_INITIAUX.map(f => ({ ...f, password: '', parts: f.role === 'super_admin' ? '34' : '33' }))
  )
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [setupKey, setSetupKey] = useState('')
  const supabase = createClient()

  function updateStep(id: string, update: Partial<SetupStep>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s))
  }

  async function runSetup() {
    // La validation se fait côté serveur — ne jamais exposer SETUP_KEY en NEXT_PUBLIC_
    if (!setupKey) {
      alert('Clé de setup requise')
      return
    }

    const initialSteps: SetupStep[] = [
      { id: 'thierno', label: 'Créer Thierno Sadou Diallo (super_admin)', status: 'pending' },
      { id: 'salam', label: 'Créer Salam (fondateur Finance)', status: 'pending' },
      { id: 'hamid', label: 'Créer Hamid (fondateur Commercial)', status: 'pending' },
      { id: 'fondateurs', label: 'Enregistrer dans table fondateurs', status: 'pending' },
      { id: 'seuils', label: 'Vérifier seuils d\'approbation', status: 'pending' },
    ]
    setSteps(initialSteps)
    setRunning(true)

    const userIds: string[] = []

    for (let i = 0; i < form.length; i++) {
      const f = form[i]
      const stepId = ['thierno', 'salam', 'hamid'][i]
      updateStep(stepId, { status: 'running' })

      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: f.email,
          password: f.password || crypto.randomUUID(),
          options: {
            data: { prenom: f.prenom, nom: f.nom },
          },
        })

        if (authError) throw authError
        const authUserId = authData.user?.id
        if (!authUserId) throw new Error('No user ID returned')

        await new Promise(r => setTimeout(r, 500))

        const { data: userData, error: userError } = await supabase.from('users').insert({
          auth_user_id: authUserId,
          prenom: f.prenom,
          nom: f.nom || null,
          email: f.email,
          role: f.role,
          statut: 'actif',
        }).select().single()

        if (userError) throw userError
        userIds.push(userData.id)
        updateStep(stepId, { status: 'done', message: `ID: ${userData.id}` })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        updateStep(stepId, { status: 'error', message })
      }
    }

    if (userIds.length > 0) {
      updateStep('fondateurs', { status: 'running' })
      try {
        const ENTITE_ID = 'a0000000-0000-0000-0000-000000000001'
        for (let i = 0; i < Math.min(userIds.length, form.length); i++) {
          await supabase.from('fondateurs').upsert({
            user_id: userIds[i],
            entite_id: ENTITE_ID,
            titre: form[i].titre,
            parts_sociales: parseInt(form[i].parts),
            date_entree: new Date().toISOString().split('T')[0],
            est_actif: true,
          })
        }
        updateStep('fondateurs', { status: 'done' })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        updateStep('fondateurs', { status: 'error', message })
      }
    }

    updateStep('seuils', { status: 'running' })
    const { data: seuils } = await supabase.from('seuils_approbation').select('id').limit(1)
    if (seuils && seuils.length > 0) {
      updateStep('seuils', { status: 'done', message: 'Seuils déjà configurés' })
    } else {
      await supabase.from('seuils_approbation').insert([
        { entite_id: 'a0000000-0000-0000-0000-000000000001', seuil_solo: 500000, seuil_deux_fondateurs: 2000000 },
        { entite_id: 'a0000000-0000-0000-0000-000000000002', seuil_solo: 500000, seuil_deux_fondateurs: 2000000 },
      ])
      updateStep('seuils', { status: 'done', message: 'Seuils créés' })
    }

    setRunning(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 animate-fade-up">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green/10 border border-green/20 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Setup terminé</h1>
            <p className="text-sm text-text-muted">La plateforme Sama Digital est prête</p>
          </div>
          <div className="space-y-2">
            {steps.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${s.status === 'done' ? 'border-green/20 bg-green/5' : s.status === 'error' ? 'border-red/20 bg-red/5' : 'border-surface-border'}`}>
                {s.status === 'done' ? <CheckCircle size={13} className="text-green" /> : <AlertTriangle size={13} className="text-red" />}
                <span className="flex-1 text-text-primary">{s.label}</span>
                {s.message && <span className="text-text-muted">{s.message}</span>}
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => router.push('/login')}>Aller à la connexion</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 animate-fade-up">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue flex items-center justify-center mx-auto shadow-glow-blue">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Setup initial — Sama Digital</h1>
          <p className="text-sm text-text-muted">Créez les comptes des 3 co-fondateurs</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20">
            <Shield size={12} className="text-amber" />
            <span className="text-2xs text-amber">Opération unique — ne pas répéter</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Clé de setup (variable NEXT_PUBLIC_SETUP_KEY)</label>
          <input
            type="password"
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue/50"
            placeholder="Entrez la clé secrète..."
            value={setupKey}
            onChange={e => setSetupKey(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {form.map((f, i) => (
            <div key={i} className="p-5 rounded-xl border border-surface-border bg-surface space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: f.couleur }}>
                  {f.prenom[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{f.prenom} {f.nom}</p>
                  <p className="text-2xs text-text-muted">{f.titre}</p>
                </div>
                <span className={`ml-auto text-2xs px-2 py-0.5 rounded-full border font-medium ${f.role === 'super_admin' ? 'bg-blue/10 text-blue border-blue/20' : 'bg-violet/10 text-violet border-violet/20'}`}>
                  {f.role}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-2xs font-medium text-text-muted">Email</label>
                  <input
                    type="email"
                    className="w-full bg-background-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-blue/50"
                    value={f.email}
                    onChange={e => setForm(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-2xs font-medium text-text-muted">Mot de passe initial</label>
                  <input
                    type="password"
                    className="w-full bg-background-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-blue/50"
                    placeholder="••••••••"
                    value={f.password}
                    onChange={e => setForm(prev => prev.map((x, j) => j === i ? { ...x, password: e.target.value } : x))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-2xs font-medium text-text-muted">Parts sociales</label>
                  <input
                    type="number"
                    className="w-full bg-background-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-blue/50"
                    value={f.parts}
                    onChange={e => setForm(prev => prev.map((x, j) => j === i ? { ...x, parts: e.target.value } : x))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${s.status === 'done' ? 'text-green' : s.status === 'error' ? 'text-red' : s.status === 'running' ? 'text-blue' : 'text-text-muted'}`}>
                {s.status === 'running' && <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
                {s.status === 'done' && <CheckCircle size={12} />}
                {s.status === 'error' && <AlertTriangle size={12} />}
                {s.status === 'pending' && <div className="w-3 h-3 rounded-full border border-current opacity-30" />}
                <span className="flex-1">{s.label}</span>
                {s.message && <span className="text-2xs opacity-70">{s.message}</span>}
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          loading={running}
          onClick={runSetup}
          icon={<Users size={15} />}
        >
          Créer les comptes fondateurs
        </Button>

        <p className="text-center text-2xs text-text-muted">
          Cette page doit être supprimée après le setup initial
        </p>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { formatDate, formatRelativeTime, initiales } from '@/aurantir-front-kit/lib/utils'
import {
  Crown, Shield, Eye, EyeOff, AlertTriangle,
  CheckCircle, Clock, FileText, Users, Lock
} from 'lucide-react'

interface Fondateur {
  id: string
  user_id: string
  titre: string
  parts_sociales: number
  date_entree: string
  est_actif: boolean
  created_at: string
  user?: {
    prenom: string; nom: string; email?: string;
    role: string; statut: string; avatar_url?: string; derniere_connexion?: string
  }
}

interface DocFondateur {
  id: string
  fondateur_id: string
  type: string
  titre: string
  statut: string
  created_at: string
}

export default function FondateursPage() {
  const [fondateurs, setFondateurs] = useState<Fondateur[]>([])
  const [docs, setDocs] = useState<DocFondateur[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Fondateur | null>(null)
  const [showParts, setShowParts] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: fData }, { data: dData }] = await Promise.all([
      supabase
        .from('fondateurs')
        .select('*, user:users!user_id(prenom, nom, email, role, statut, avatar_url, derniere_connexion)')
        .eq('est_actif', true)
        .order('created_at'),
      supabase
        .from('docs_fondateurs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    setFondateurs((fData || []) as Fondateur[])
    setDocs((dData || []) as DocFondateur[])
    setLoading(false)
  }

  const totalParts = fondateurs.reduce((s, f) => s + f.parts_sociales, 0)

  const FONDATEUR_COLORS: Record<string, string> = {
    'Thierno Sadou Diallo': '#3B82F6',
    'Salam': '#10B981',
    'Hamid': '#8B5CF6',
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fondateurs</h1>
          <p className="page-subtitle">Gouvernance, droits et répartition</p>
        </div>
        <button
          onClick={() => setShowParts(!showParts)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          {showParts ? <EyeOff size={13} /> : <Eye size={13} />}
          {showParts ? 'Masquer' : 'Afficher'} les parts
        </button>
      </div>

      {/* Cartes fondateurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)
          : fondateurs.map(f => {
            const nom = `${f.user?.prenom} ${f.user?.nom}`
            const color = Object.entries(FONDATEUR_COLORS).find(([k]) => nom.includes(k.split(' ')[0]))?.[1] || '#6B7280'
            const pct = totalParts > 0 ? Math.round(f.parts_sociales / totalParts * 100) : 0
            const isThierno = f.user?.role === 'super_admin'

            return (
              <Card key={f.id} className={`p-5 space-y-4 cursor-pointer hover:border-blue/30 transition-all ${selected?.id === f.id ? 'border-blue/50 bg-blue/5' : ''}`}><div onClick={() => setSelected(f)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: color }}>
                      {initiales(f.user?.prenom || '', f.user?.nom || '')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{f.user?.prenom} {f.user?.nom}</p>
                      <p className="text-2xs text-text-muted capitalize">{f.titre}</p>
                    </div>
                  </div>
                  {isThierno && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs bg-blue/10 text-blue border border-blue/20">
                      <Shield size={9} /> Protégé
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Parts sociales</span>
                    <span className="font-semibold text-text-primary">
                      {showParts ? `${f.parts_sociales.toLocaleString('fr-FR')} parts (${pct}%)` : '●●●●●'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-surface-border/50">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-text-muted">Statut</span>
                    <span className={`font-medium ${f.user?.statut === 'actif' ? 'text-green' : 'text-red'}`}>
                      {f.user?.statut || '—'}
                    </span>
                  </div>
                  {f.user?.derniere_connexion && (
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-text-muted">Dernière connexion</span>
                      <span className="text-text-secondary">{formatRelativeTime(f.user.derniere_connexion)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-text-muted">Membre depuis</span>
                    <span className="text-text-secondary">{formatDate(f.date_entree)}</span>
                  </div>
                </div>
              </div></Card>
            )
          })
        }
      </div>

      {/* Répartition */}
      {!loading && fondateurs.length > 0 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Répartition du capital</h3>
          <div className="flex h-3 rounded-full overflow-hidden">
            {fondateurs.map(f => {
              const nom = `${f.user?.prenom} ${f.user?.nom}`
              const color = Object.entries(FONDATEUR_COLORS).find(([k]) => nom.includes(k.split(' ')[0]))?.[1] || '#6B7280'
              const pct = totalParts > 0 ? f.parts_sociales / totalParts * 100 : 0
              return <div key={f.id} style={{ width: `${pct}%`, backgroundColor: color }} />
            })}
          </div>
          <div className="flex items-center gap-6">
            {fondateurs.map(f => {
              const nom = `${f.user?.prenom} ${f.user?.nom}`
              const color = Object.entries(FONDATEUR_COLORS).find(([k]) => nom.includes(k.split(' ')[0]))?.[1] || '#6B7280'
              const pct = totalParts > 0 ? Math.round(f.parts_sociales / totalParts * 100) : 0
              return (
                <div key={f.id} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-text-secondary">{f.user?.prenom}</span>
                  <span className="font-semibold text-text-primary">{pct}%</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Documents fondateurs */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Documents fondateurs</h3>
        {docs.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">Aucun document</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Type</th><th>Titre</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id}>
                    <td className="text-2xs font-medium text-text-muted capitalize">{d.type}</td>
                    <td className="text-xs text-text-primary">{d.titre}</td>
                    <td><span className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${d.statut === 'signe' ? 'bg-green/10 text-green border-green/20' : 'bg-amber/10 text-amber border-amber/20'}`}>{d.statut}</span></td>
                    <td className="text-2xs text-text-muted">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Règles de gouvernance */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Crown size={14} className="text-amber" />Règles de gouvernance</h3>
        <div className="space-y-2">
          {[
            { icon: <Lock size={11} />, text: 'Compte Thierno (super_admin) : non révocable par les autres fondateurs', color: 'text-blue' },
            { icon: <CheckCircle size={11} />, text: 'Révocation immédiate : toutes les sessions actives sont blacklistées (0 secondes)', color: 'text-green' },
            { icon: <AlertTriangle size={11} />, text: 'Dépenses > 2M FCFA : accord unanime des 3 fondateurs requis', color: 'text-red' },
            { icon: <Users size={11} />, text: 'Dépenses 500K–2M FCFA : Salam + Hamid requis', color: 'text-amber' },
          ].map((r, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs ${r.color}`}>
              <span className="mt-0.5 flex-shrink-0">{r.icon}</span>
              <span className="text-text-secondary">{r.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
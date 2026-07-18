// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { FolderKanban, Eye } from 'lucide-react'

interface ProjetPublic {
  id: string; titre: string; avancement: number; statut: string
}

const STATUT: Record<string, { label: string; color: string }> = {
  planifie: { label: 'Planifié', color: 'blue'  },
  en_cours: { label: 'En cours', color: 'green' },
  en_pause: { label: 'En pause', color: 'amber' },
  termine:  { label: 'Terminé',  color: 'default' },
}

export default function InviteDashboard() {
  const { user } = useAppStore()
  const supabase = createClient()
  const [projets, setProjets] = useState<ProjetPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase.from('projets')
        .select('id, titre, avancement, statut')
        .in('statut', ['en_cours', 'planifie'])
        .order('updated_at', { ascending: false })
        .limit(6)
      setProjets((data || []) as ProjetPublic[])
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bonjour, {user?.prenom} 👋</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {new Date().toLocaleDateString('fr-SN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border">
          <Eye size={13} className="text-text-muted" />
          <span className="text-xs text-text-muted">Accès lecture seule</span>
        </div>
      </div>

      {/* Message d'accueil */}
      <Card className="p-6 border-blue/20 bg-blue/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue/20 flex items-center justify-center flex-shrink-0">
            <Eye size={18} className="text-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">Accès invité</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Vous avez un accès en lecture seule à cette plateforme. Vous pouvez consulter les projets
              partagés avec vous. Pour un accès complet, contactez votre administrateur.
            </p>
          </div>
        </div>
      </Card>

      {/* Projets visibles */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Projets actifs</h3>
          <span className="text-2xs text-text-muted">{projets.length} projet{projets.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-2">
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />) :
           projets.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Aucun projet disponible</p>
            </div>
          ) : projets.map(p => {
            const st = STATUT[p.statut] ?? { label: p.statut, color: 'default' }
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border">
                <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                  <FolderKanban size={14} className="text-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-medium text-text-primary truncate">{p.titre}</p>
                    <Badge variant={st.color as any} size="sm">{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-surface-border rounded-full overflow-hidden">
                      <div className="h-full bg-blue rounded-full" style={{ width: `${p.avancement}%` }} />
                    </div>
                    <span className="text-2xs text-text-muted">{p.avancement}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
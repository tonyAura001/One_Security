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
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import { downloadFacturePDF } from '@/aurantir-front-kit/lib/pdf/facture'
import { downloadDevisPDF } from '@/aurantir-front-kit/lib/pdf/devis'
import {
  FileText, Receipt, FolderKanban, Clock, CheckCircle2,
  AlertTriangle, ArrowRight, CalendarDays, Building2,
  File, Archive, Image, Share2, Download, Loader2, Calendar,
} from 'lucide-react'
import Link from 'next/link'

interface MonDevis {
  id: string; numero: string; statut: string
  montant_ttc: number; created_at: string; date_validite: string | null
  entite_nom: string
}
interface MaFacture {
  id: string; numero: string; statut: string
  montant_ttc: number; montant_restant_ttc: number | null
  date_echeance: string | null; entite_nom: string
}
interface MonProjet {
  id: string; titre: string; avancement: number; statut: string
  date_fin_prevue: string | null
}
interface MonDocument {
  id: string; nom: string; type: string; taille?: number
  url_stockage?: string; created_at: string; projet_id: string; projet_titre: string
}
interface MonEvenement {
  id: string; titre: string; type: string; date_debut: string
  lieu?: string; est_en_ligne: boolean; couleur?: string
}

const EVENEMENT_TYPE_COULEURS: Record<string, string> = {
  planification: '#6366F1', reunion: '#3B82F6', deadline: '#EF4444',
  presentation: '#8B5CF6', formation: '#10B981', conge: '#F59E0B',
  tache_kanban: '#0EA5E9', jalon: '#F97316', rappel: '#A78BFA', autre: '#6B7280',
}

const DEVIS_STATUT: Record<string, { label: string; color: 'blue'|'amber'|'green'|'red'|'gray'|'violet' }> = {
  brouillon:      { label: 'Brouillon',   color: 'gray'  },
  envoye:         { label: 'En attente',  color: 'blue'  },
  en_negociation: { label: 'Négociation', color: 'amber' },
  accepte:        { label: 'Accepté',     color: 'green' },
  refuse:         { label: 'Refusé',      color: 'red'   },
  expire:         { label: 'Expiré',      color: 'gray'  },
}
const FACTURE_STATUT: Record<string, { label: string; color: 'blue'|'amber'|'green'|'red'|'gray'|'violet' }> = {
  brouillon: { label: 'Brouillon',  color: 'gray'  },
  envoyee:   { label: 'À régler',   color: 'blue'    },
  signee:    { label: 'Signée',     color: 'violet'  },
  payee:     { label: 'Payée',      color: 'green'   },
  retard:    { label: 'En retard',  color: 'red'     },
  avoir:     { label: 'Avoir',      color: 'amber'   },
}
const PROJET_STATUT: Record<string, { label: string; color: 'blue'|'amber'|'green'|'red'|'gray'|'violet' }> = {
  planifie: { label: 'Planifié',  color: 'blue'  },
  en_cours: { label: 'En cours',  color: 'green' },
  en_pause: { label: 'En pause',  color: 'amber' },
  termine:  { label: 'Terminé',   color: 'gray'  },
  annule:   { label: 'Annulé',    color: 'red'   },
}

export default function ClientExterneDashboard() {
  const { user } = useAppStore()
  const supabase = createClient()

  const [devis,     setDevis]     = useState<MonDevis[]>([])
  const [factures,  setFactures]  = useState<MaFacture[]>([])
  const [projets,   setProjets]   = useState<MonProjet[]>([])
  const [documents, setDocuments] = useState<MonDocument[]>([])
  const [evenements, setEvenements] = useState<MonEvenement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload(type: 'devis' | 'facture', id: string) {
    setDownloadError('')
    setDownloadingId(id)
    try {
      if (type === 'devis') await downloadDevisPDF(id)
      else await downloadFacturePDF(id)
    } catch (e: any) {
      setDownloadError(e?.message || 'Erreur lors du téléchargement')
    } finally {
      setDownloadingId(null)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const [{ data: dData }, { data: fData }, { data: mpData }, { data: docData }, { data: evData }] = await Promise.all([
        // Devis filtrés par RLS client_externe
        supabase.from('devis')
          .select('id, numero, statut, montant_ttc, created_at, date_validite, entites_legales(nom)')
          .order('created_at', { ascending: false })
          .limit(6),
        // Factures filtrées par RLS client_externe
        supabase.from('factures')
          .select('id, numero, statut, montant_ttc, montant_restant_ttc, date_echeance, entites_legales(nom)')
          .eq('type', 'facture_client')
          .neq('statut', 'brouillon')
          .order('created_at', { ascending: false })
          .limit(6),
        // Projets via membres_projet
        supabase.from('membres_projet')
          .select('projets(id, titre, avancement, statut, date_fin_prevue)')
          .eq('user_id', user?.id ?? '')
          .eq('statut', 'actif')
          .not('projets', 'is', null)
          .limit(4),
        // Documents partagés (visibilite = collaborateur) via RLS
        supabase.from('ressources')
          .select('id, nom, type, taille, url_stockage, created_at, projet_id, projets(titre)')
          .eq('visibilite', 'collaborateur')
          .not('projet_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6),
        // Événements où je suis invité en tant que participant
        supabase.from('evenements_calendrier')
          .select('id, titre, type, date_debut, lieu, est_en_ligne, couleur')
          .contains('participants', [{ user_id: user?.id ?? '' }])
          .gte('date_debut', new Date().toISOString())
          .order('date_debut')
          .limit(5),
      ])

      setDevis((dData || []).map((d: any) => ({
        id: d.id, numero: d.numero, statut: d.statut,
        montant_ttc: d.montant_ttc, created_at: d.created_at,
        date_validite: d.date_validite,
        entite_nom: d.entites_legales?.nom ?? '',
      })))
      setFactures((fData || []).map((f: any) => ({
        id: f.id, numero: f.numero, statut: f.statut,
        montant_ttc: f.montant_ttc, montant_restant_ttc: f.montant_restant_ttc,
        date_echeance: f.date_echeance,
        entite_nom: f.entites_legales?.nom ?? '',
      })))
      setProjets(((mpData || []).map((m: any) => m.projets).filter(Boolean)) as MonProjet[])
      setDocuments((docData || []).map((d: any) => ({
        id: d.id, nom: d.nom, type: d.type, taille: d.taille,
        url_stockage: d.url_stockage, created_at: d.created_at,
        projet_id: d.projet_id, projet_titre: d.projets?.titre ?? '',
      })))
      setEvenements((evData || []) as MonEvenement[])
    } finally { setLoading(false) }
  }

  // Métriques
  const facturesARegler  = factures.filter(f => ['envoyee', 'signee'].includes(f.statut))
  const facturesEnRetard = factures.filter(f => f.statut === 'retard')
  const montantDu        = facturesARegler.reduce((s, f) => s + (f.montant_restant_ttc ?? f.montant_ttc ?? 0), 0)
  const montantRetard    = facturesEnRetard.reduce((s, f) => s + (f.montant_restant_ttc ?? f.montant_ttc ?? 0), 0)
  const devisEnAttente   = devis.filter(d => ['envoye', 'en_negociation'].includes(d.statut))
  const projetsActifs    = projets.filter(p => p.statut === 'en_cours')

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bonjour, {user?.prenom} 👋</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {new Date().toLocaleDateString('fr-SN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border">
          <Building2 size={13} className="text-blue" />
          <span className="text-xs text-text-secondary">Espace client</span>
        </div>
      </div>

      {downloadError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
          <AlertTriangle size={14} className="text-red flex-shrink-0" />
          <span className="text-xs text-red">{downloadError}</span>
        </div>
      )}

      {/* Alertes */}
      {(facturesEnRetard.length > 0 || devisEnAttente.length > 0) && (
        <div className="flex gap-3 flex-wrap">
          {facturesEnRetard.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
              <AlertTriangle size={14} className="text-red" />
              <span className="text-xs text-red">
                {facturesEnRetard.length} facture{facturesEnRetard.length > 1 ? 's' : ''} en retard — {formatMontant(montantRetard)}
              </span>
            </div>
          )}
          {devisEnAttente.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue/10 border border-blue/20">
              <FileText size={14} className="text-blue" />
              <span className="text-xs text-blue">
                {devisEnAttente.length} devis en attente de réponse
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">Montant à régler</span>
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
              <Receipt size={15} className="text-amber" />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-32 rounded" /> : (
            <>
              <p className="text-xl font-bold text-text-primary">{formatMontant(montantDu)}</p>
              <p className="text-xs text-text-muted mt-0.5">{facturesARegler.length} facture{facturesARegler.length !== 1 ? 's' : ''} en cours</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">Devis reçus</span>
            <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center">
              <FileText size={15} className="text-blue" />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-16 rounded" /> : (
            <>
              <p className="text-xl font-bold text-text-primary">{devis.length}</p>
              <p className="text-xs text-text-muted mt-0.5">{devisEnAttente.length} en attente de réponse</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">Projets actifs</span>
            <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
              <FolderKanban size={15} className="text-violet" />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-16 rounded" /> : (
            <>
              <p className="text-xl font-bold text-text-primary">{projetsActifs.length}</p>
              <p className="text-xs text-text-muted mt-0.5">{projets.length} projet{projets.length !== 1 ? 's' : ''} au total</p>
            </>
          )}
        </div>
      </div>

      {/* Devis + Factures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Mes devis */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Mes devis</h3>
            <span className="text-2xs text-text-muted">{devis.length} devis</span>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            )) : devis.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-xs text-text-muted">Aucun devis reçu</p>
              </div>
            ) : devis.map(d => {
              const st = DEVIS_STATUT[d.statut] ?? { label: d.statut, color: 'default' as const }
              const isActionable = ['envoye', 'en_negociation'].includes(d.statut)
              return (
                <div key={d.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isActionable ? 'border-blue/30 bg-blue/5 hover:bg-blue/10' : 'border-surface-border hover:bg-surface-hover'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActionable ? 'bg-blue/15' : 'bg-surface-elevated'}`}>
                    <FileText size={14} className={isActionable ? 'text-blue' : 'text-text-muted'} />
                  </div>
                  <Link href={`/espace-client/devis/${d.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text-primary hover:text-blue transition-colors">{d.numero}</p>
                      <Badge variant={st.color} size="sm">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-medium text-text-primary">{formatMontant(d.montant_ttc)}</span>
                      {d.date_validite && (
                        <span className="text-2xs text-text-muted flex items-center gap-1">
                          <CalendarDays size={9} />
                          Valide jusqu'au {new Date(d.date_validite).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {d.entite_nom && <p className="text-2xs text-text-muted mt-0.5">{d.entite_nom}</p>}
                  </Link>
                  <button
                    onClick={() => handleDownload('devis', d.id)}
                    disabled={downloadingId === d.id}
                    className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-colors flex-shrink-0 disabled:opacity-50"
                    title="Télécharger le PDF"
                  >
                    {downloadingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Mes factures */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Mes factures</h3>
            <span className="text-2xs text-text-muted">{factures.length} facture{factures.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            )) : factures.length === 0 ? (
              <div className="text-center py-8">
                <Receipt size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-xs text-text-muted">Aucune facture</p>
              </div>
            ) : factures.map(f => {
              const st = FACTURE_STATUT[f.statut] ?? { label: f.statut, color: 'default' as const }
              const isUrgent = f.statut === 'retard'
              const montant = f.montant_restant_ttc ?? f.montant_ttc ?? 0
              return (
                <div key={f.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isUrgent ? 'border-red/30 bg-red/5' : 'border-surface-border hover:bg-surface-hover'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red/15' : 'bg-surface-elevated'}`}>
                    <Receipt size={14} className={isUrgent ? 'text-red' : 'text-text-muted'} />
                  </div>
                  <Link href={`/espace-client/factures/${f.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text-primary hover:text-blue transition-colors">{f.numero}</p>
                      <Badge variant={st.color} size="sm">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs font-medium ${f.statut === 'payee' ? 'text-green' : 'text-text-primary'}`}>
                        {formatMontant(montant)}
                      </span>
                      {f.date_echeance && f.statut !== 'payee' && (
                        <span className={`text-2xs flex items-center gap-1 ${isUrgent ? 'text-red' : 'text-text-muted'}`}>
                          <Clock size={9} />
                          {isUrgent ? 'En retard depuis le ' : 'Échéance : '}
                          {new Date(f.date_echeance).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {f.entite_nom && <p className="text-2xs text-text-muted mt-0.5">{f.entite_nom}</p>}
                  </Link>
                  {f.statut === 'payee' && <CheckCircle2 size={14} className="text-green flex-shrink-0" />}
                  <button
                    onClick={() => handleDownload('facture', f.id)}
                    disabled={downloadingId === f.id}
                    className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-colors flex-shrink-0 disabled:opacity-50"
                    title="Télécharger le PDF"
                  >
                    {downloadingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Mes projets */}
      {(loading || projets.length > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Mes projets</h3>
            <Link href="/espace-client/projets" className="text-xs text-blue flex items-center gap-1">
              Voir tout <ArrowRight size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            )) : projets.map(p => {
              const st = PROJET_STATUT[p.statut] ?? { label: p.statut, color: 'default' as const }
              return (
                <Link key={p.id} href={`/espace-client/projets/${p.id}`}
                  className="flex flex-col gap-2 p-4 rounded-xl border border-surface-border hover:bg-surface-hover transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban size={14} className="text-violet" />
                    </div>
                    <Badge variant={st.color} size="sm">{st.label}</Badge>
                  </div>
                  <p className="text-xs font-semibold text-text-primary line-clamp-2">{p.titre}</p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs text-text-muted">Avancement</span>
                      <span className="text-2xs font-medium text-text-secondary">{p.avancement}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <div className="h-full bg-violet rounded-full transition-all" style={{ width: `${p.avancement}%` }} />
                    </div>
                  </div>
                  {p.date_fin_prevue && (
                    <p className="text-2xs text-text-muted flex items-center gap-1">
                      <CalendarDays size={9} />
                      Fin prévue : {new Date(p.date_fin_prevue).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* Événements à venir */}
      {(loading || evenements.length > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Événements à venir</h3>
            <Link href="/calendrier" className="text-xs text-blue flex items-center gap-1">
              Voir le calendrier <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            )) : evenements.map(e => {
              const color = e.couleur || EVENEMENT_TYPE_COULEURS[e.type] || '#3B82F6'
              return (
                <Link key={e.id} href={`/calendrier?event=${e.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '1A' }}>
                    <Calendar size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{e.titre}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-2xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(e.date_debut).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {e.lieu && <span>{e.lieu}</span>}
                      {e.est_en_ligne && <span className="text-blue">En ligne</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* Documents partagés */}
      {(loading || documents.length > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Documents partagés</h3>
              {documents.length > 0 && (
                <span className="text-2xs bg-blue/10 text-blue px-1.5 py-0.5 rounded-full">{documents.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-2xs text-text-muted">
              <Share2 size={10} />
              <span>Partagés avec vous</span>
            </div>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            )) : documents.map(d => {
              const icon =
                d.type === 'pdf'   ? <FileText size={14} className="text-red" /> :
                d.type === 'image' ? <Image    size={14} className="text-blue" /> :
                d.type === 'xls'   ? <FileText size={14} className="text-green" /> :
                d.type === 'zip'   ? <Archive  size={14} className="text-amber" /> :
                d.type === 'doc'   ? <FileText size={14} className="text-blue" /> :
                                     <File     size={14} className="text-text-muted" />
              const taille = !d.taille ? '' : d.taille < 1024 * 1024
                ? `${(d.taille / 1024).toFixed(0)} KB`
                : `${(d.taille / (1024 * 1024)).toFixed(1)} MB`
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface-hover transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{d.nom}</p>
                    <p className="text-2xs text-text-muted">
                      {d.projet_titre}{taille ? ` · ${taille}` : ''}
                    </p>
                  </div>
                  {d.url_stockage && (
                    <a href={d.url_stockage} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-blue hover:bg-blue/10 transition-colors flex-shrink-0"
                      title="Télécharger">
                      <Download size={13} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* État vide — si aucune donnée */}
      {!loading && devis.length === 0 && factures.length === 0 && projets.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <Building2 size={36} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-sm font-medium text-text-primary mb-1">Votre espace client est prêt</p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Vos devis, factures et projets apparaîtront ici dès qu'ils vous seront assignés.
          </p>
        </Card>
      )}
    </div>
  )
}
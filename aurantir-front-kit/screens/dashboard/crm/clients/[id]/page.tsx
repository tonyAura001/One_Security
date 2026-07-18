// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { ClientFormModal, type ClientRow } from '../ClientFormModal'
import { formatMontant, formatDate, initiales } from '@/aurantir-front-kit/lib/utils'
import {
  Building2, Mail, Phone, MapPin, Globe,
  FileText, FolderKanban, MessageSquare, ChevronRight,
  Calendar, Users, Star, Pencil, Clock, Heart, TrendingUp,
} from 'lucide-react'
import { formatShortTime } from '@/aurantir-front-kit/lib/utils'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

const EV_COULEURS: Record<string, string> = {
  planification: '#6366F1', reunion: '#3B82F6', deadline: '#EF4444',
  presentation: '#8B5CF6', formation: '#10B981', conge: '#F59E0B',
  tache_kanban: '#0EA5E9', jalon: '#F97316', rappel: '#A78BFA', autre: '#6B7280',
}
const EV_LABELS: Record<string, string> = {
  planification: 'Planification', reunion: 'Réunion', deadline: 'Deadline',
  presentation: 'Présentation', formation: 'Formation', conge: 'Congé',
  tache_kanban: 'Tâche', jalon: 'Jalon', rappel: 'Rappel', autre: 'Autre',
}

interface Evenement {
  id: string; titre: string; type: string; date_debut: string
  date_fin?: string; lieu?: string; couleur?: string
}

interface Client {
  id: string
  entite_id: string
  nom_entreprise: string
  secteur?: string
  email_principal?: string
  telephone?: string
  site_web?: string
  adresse?: string
  ville?: string
  pays?: string
  chiffre_affaires_realise?: number
  statut: string
  created_at: string
  entite?: { nom: string; couleur: string }
}

interface Contact {
  id: string
  prenom: string
  nom: string
  poste?: string
  email?: string
  telephone?: string
  est_principal: boolean
}

interface Facture {
  id: string; numero: string; statut: string; montant_ttc: number; devise: string; date_echeance?: string
}
interface Projet {
  id: string; titre: string; statut: string; avancement: number; type_projet?: string
}
interface Contrat {
  id: string; titre: string; statut: string; montant: number
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, entites } = useAppStore()
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [satisfaction, setSatisfaction] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'edit' | 'email' | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: ct }, { data: f }, { data: p }, { data: ps }, { data: co }, { data: ev }] = await Promise.all([
      supabase.from('entreprises_clientes').select('*, entite:entites_legales(nom, couleur)').eq('id', id).single(),
      supabase.from('contacts_clients').select('*').eq('client_id', id).order('est_principal', { ascending: false }),
      supabase.from('factures').select('id, numero, statut, montant_ttc, devise, date_echeance').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('projets').select('id, titre, statut, avancement, type_projet').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('projets_clients').select('projet:projets(id, titre, statut, avancement, type_projet)').eq('client_id', id).limit(10),
      supabase.from('contrats').select('id, titre, statut, montant').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('evenements_calendrier').select('id, titre, type, date_debut, date_fin, lieu, couleur').eq('client_id', id).order('date_debut', { ascending: false }).limit(10),
    ])
    if (c) setClient(c as Client)
    setContacts((ct || []) as Contact[])
    setFactures((f || []) as Facture[])
    setContrats((co || []) as Contrat[])
    setEvenements((ev || []) as Evenement[])
    // Merge projets classiques + projets spéciaux via junction table
    const projetsSpeciaux = ((ps || []) as any[]).map(r => r.projet).filter(Boolean)
    const allProjets = [...(p || []), ...projetsSpeciaux]
    const deduplicated = allProjets.filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx)
    setProjets(deduplicated as Projet[])

    // Satisfaction history
    const { data: sat } = await supabase.rpc('get_client_satisfaction_history', { p_client_id: id })
    setSatisfaction((sat as any[]) ?? [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }
  if (!client) {
    return <div className="text-center py-16"><p className="text-text-muted">Client introuvable</p><Button variant="ghost" onClick={() => router.back()} className="mt-4">Retour</Button></div>
  }

  const caTotal = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0)
  const facturesEnAttente = factures.filter(f => f.statut === 'envoyee' || f.statut === 'en_retard').length
  const entiteColor = (client as any).entite?.couleur || '#3B82F6'

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/crm/clients" className="hover:text-blue transition-colors">Clients</Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">{client.nom_entreprise}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white" style={{ backgroundColor: entiteColor }}>
            {initiales(client.nom_entreprise.split(' ')[0], client.nom_entreprise.split(' ')[1] || '')}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{client.nom_entreprise}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {client.secteur && <span className="text-xs text-text-muted bg-surface border border-surface-border px-2 py-0.5 rounded-full">{client.secteur}</span>}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs border"
                style={{ color: entiteColor, borderColor: entiteColor + '33', background: entiteColor + '15' }}>
                {(client as any).entite?.nom || '—'}
              </span>
              <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${client.statut === 'actif' ? 'bg-green/10 text-green border-green/20' : 'bg-surface text-text-muted border-surface-border'}`}>
                {client.statut}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => setModal('edit')}>Modifier</Button>
          <Button size="sm" icon={<Mail size={13} />} onClick={() => setModal('email')}>Envoyer un e-mail</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">CA total</p>
          <p className="text-xl font-bold text-green">{formatMontant(caTotal)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Factures en attente</p>
          <p className={`text-xl font-bold ${facturesEnAttente > 0 ? 'text-amber' : 'text-text-primary'}`}>{facturesEnAttente}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Projets</p>
          <p className="text-xl font-bold text-blue">{projets.length}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-text-muted">Contrats actifs</p>
          <p className="text-xl font-bold text-text-primary">{contrats.filter(c => c.statut === 'actif').length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos + Contacts */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-text-muted">Coordonnées</h3>
            {client.email_principal && (
              <div className="flex items-center gap-2 text-xs"><Mail size={12} className="text-text-muted" /><a href={`mailto:${client.email_principal}`} className="text-text-secondary hover:text-blue">{client.email_principal}</a></div>
            )}
            {client.telephone && (
              <div className="flex items-center gap-2 text-xs"><Phone size={12} className="text-text-muted" /><span className="text-text-secondary">{client.telephone}</span></div>
            )}
            {client.site_web && (
              <div className="flex items-center gap-2 text-xs"><Globe size={12} className="text-text-muted" /><a href={client.site_web} target="_blank" rel="noreferrer" className="text-blue hover:underline truncate">{client.site_web}</a></div>
            )}
            {(client.ville || client.pays) && (
              <div className="flex items-center gap-2 text-xs"><MapPin size={12} className="text-text-muted" /><span className="text-text-secondary">{[client.ville, client.pays].filter(Boolean).join(', ')}</span></div>
            )}
            <div className="flex items-center gap-2 text-xs"><Calendar size={12} className="text-text-muted" /><span className="text-text-muted">Client depuis {formatDate(client.created_at)}</span></div>
          </Card>

          {contacts.length > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5"><Users size={11} />Contacts ({contacts.length})</h3>
              {contacts.map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue/10 flex items-center justify-center text-2xs font-bold text-blue flex-shrink-0">
                    {initiales(c.prenom, c.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{c.prenom} {c.nom}</p>
                    {c.poste && <p className="text-2xs text-text-muted">{c.poste}</p>}
                  </div>
                  {c.est_principal && <Star size={10} className="text-amber fill-amber flex-shrink-0" />}
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Factures + Projets */}
        <div className="lg:col-span-2 space-y-4">
          {factures.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5"><FileText size={11} />Factures récentes</h3>
                <Link href="/finance/factures" className="text-2xs text-blue hover:underline">Voir tout</Link>
              </div>
              {factures.slice(0, 4).map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-surface border border-surface-border rounded-lg">
                  <span className="text-2xs font-mono text-text-muted">{f.numero}</span>
                  <span className="flex-1 text-2xs text-text-secondary">{formatDate(f.date_echeance || '')}</span>
                  <span className="text-xs font-semibold text-text-primary">{formatMontant(f.montant_ttc, f.devise)}</span>
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${
                    f.statut === 'payee' ? 'bg-green/10 text-green border-green/20'
                    : f.statut === 'en_retard' ? 'bg-red/10 text-red border-red/20'
                    : 'bg-amber/10 text-amber border-amber/20'
                  }`}>{f.statut}</span>
                </div>
              ))}
            </div>
          )}

          {projets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5"><FolderKanban size={11} />Projets</h3>
                <Link href="/projets" className="text-2xs text-blue hover:underline">Voir tout</Link>
              </div>
              {projets.map(p => (
                <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-3 p-3 bg-surface border border-surface-border rounded-lg hover:border-blue/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-text-primary">{p.titre}</p>
                      {p.type_projet === 'special' && (
                        <span className="text-2xs px-1 py-px rounded font-medium bg-violet/10 text-violet border border-violet/20 flex-shrink-0">Spécial</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 bg-surface-border rounded-full flex-1">
                        <div className="h-full bg-blue rounded-full" style={{ width: `${p.avancement}%` }} />
                      </div>
                      <span className="text-2xs text-text-muted">{p.avancement}%</span>
                    </div>
                  </div>
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${
                    p.statut === 'termine' ? 'bg-green/10 text-green border-green/20'
                    : p.statut === 'en_cours' ? 'bg-blue/10 text-blue border-blue/20'
                    : 'bg-surface text-text-muted border-surface-border'
                  }`}>{p.statut}</span>
                  <ChevronRight size={12} className="text-text-muted" />
                </Link>
              ))}
            </div>
          )}

          {contrats.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-text-muted">Contrats</h3>
              {contrats.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-surface border border-surface-border rounded-lg">
                  <span className="flex-1 text-xs text-text-primary truncate">{c.titre}</span>
                  <span className="text-xs font-semibold text-text-primary">{formatMontant(c.montant)}</span>
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${c.statut === 'actif' ? 'bg-green/10 text-green border-green/20' : 'bg-surface text-text-muted border-surface-border'}`}>{c.statut}</span>
                </div>
              ))}
            </div>
          )}

          {evenements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5"><Clock size={11} />Événements ({evenements.length})</h3>
                <Link href="/calendrier" className="text-2xs text-blue hover:underline">Voir calendrier</Link>
              </div>
              {evenements.map(ev => {
                const couleur = ev.couleur || EV_COULEURS[ev.type] || '#6B7280'
                const isPast = new Date(ev.date_debut) < new Date()
                return (
                  <Link key={ev.id} href={`/calendrier?event=${ev.id}`}
                    className="flex items-start gap-3 p-3 bg-surface border border-surface-border rounded-lg hover:border-blue/30 transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: couleur }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate group-hover:text-blue transition-colors ${isPast ? 'text-text-muted' : 'text-text-primary'}`}>{ev.titre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xs text-text-muted">{formatDate(ev.date_debut)}</span>
                        {ev.lieu && <span className="text-2xs text-text-muted truncate">· {ev.lieu}</span>}
                      </div>
                    </div>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0"
                      style={{ color: couleur, borderColor: couleur + '33', background: couleur + '15' }}>
                      {EV_LABELS[ev.type] || ev.type}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Satisfaction & Feedbacks */}
      {satisfaction.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Heart size={15} className="text-pink-400" />
              Fidélisation &amp; Feedbacks
            </h3>
            <Link href="/crm/satisfaction" className="text-2xs text-blue hover:underline flex items-center gap-1">
              <TrendingUp size={11} /> Analytics
            </Link>
          </div>

          {/* Mini trend */}
          {satisfaction.length >= 2 && (
            <Card className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-2xs text-text-muted">Score moyen</p>
                  <p className="text-2xl font-bold text-white">
                    {(satisfaction.reduce((s, r) => s + (r.avg_score ?? 0), 0) / satisfaction.length).toFixed(1)}
                    <span className="text-xs text-text-muted ml-1">/10</span>
                  </p>
                </div>
                <div className="flex-1 h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...satisfaction].reverse()}>
                      <Line type="monotone" dataKey="avg_score" stroke="#22d3ee" strokeWidth={2} dot={false} />
                      <Tooltip
                        contentStyle={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                        labelFormatter={() => ''}
                        formatter={(v: any) => [Number(v).toFixed(1), 'Score']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}

          {/* Response list */}
          <div className="space-y-2">
            {satisfaction.slice(0, 5).map((r: any) => {
              const score = r.avg_score ?? null
              const scoreColor = score === null ? 'text-text-muted'
                : score >= 8 ? 'text-emerald-400'
                : score >= 5 ? 'text-amber-400'
                : 'text-red-400'
              const scoreBg = score === null ? 'bg-surface'
                : score >= 8 ? 'bg-emerald-900/30 border-emerald-800/40'
                : score >= 5 ? 'bg-amber-900/30 border-amber-800/40'
                : 'bg-red-900/30 border-red-800/40'
              return (
                <Card key={r.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${scoreBg} ${scoreColor} flex-shrink-0`}>
                      {score !== null ? score.toFixed(1) : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{r.survey_title}</p>
                      <p className="text-2xs text-text-muted mt-0.5">{formatDate(r.submitted_at)}</p>
                    </div>
                    {r.answers?.filter((a: any) => a.type === 'text_short' || a.type === 'text_long').slice(0, 1).map((a: any, ai: number) => (
                      <p key={ai} className="text-2xs text-text-muted truncate max-w-32 italic">"{String(a.answer ?? '').slice(0, 40)}"</p>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <ClientFormModal
          mode="edit"
          clientData={client as unknown as ClientRow}
          defaultTab={modal === 'email' ? 'email' : 'info'}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load() }}
          userId={user?.id}
          defaultEntiteId={client.entite_id}
          entites={entites}
        />
      )}
    </div>
  )
}
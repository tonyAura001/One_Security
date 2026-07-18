// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'
import Link from 'next/link'
import {
  FileText, FolderOpen, Clock, AlertTriangle, ChevronRight, TrendingUp,
  Search, Bell, Calendar, ArrowRight, CheckCircle2, Sparkles, X, LayoutGrid,
} from 'lucide-react'

interface ProjetDashboard {
  id: string
  titre: string
  statut: string
  avancement: number
  date_debut?: string
  date_fin_prevue?: string
}

interface FactureRecente {
  id: string; numero: string; montant_ttc: number; statut: string; date_echeance: string
}

interface DevisRecent {
  id: string; numero: string; montant_ttc: number; statut: string; created_at: string
}

const STATUT_PROJET_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  planifie: { label: 'Planifié', cls: 'bg-amber/10 text-amber border-amber/20', dot: 'bg-amber' },
  en_cours: { label: 'En cours', cls: 'bg-blue/10 text-blue border-blue/20', dot: 'bg-blue' },
  en_pause: { label: 'En pause', cls: 'bg-white/10 text-white/50 border-white/10', dot: 'bg-white/40' },
  termine: { label: 'Terminé', cls: 'bg-green/10 text-green border-green/20', dot: 'bg-green' },
  annule: { label: 'Annulé', cls: 'bg-red/10 text-red border-red/20', dot: 'bg-red' },
}

const STATUT_DOC_COLORS: Record<string, string> = {
  payee: 'text-green', envoyee: 'text-amber', en_retard: 'text-red', signee: 'text-violet',
  brouillon: 'text-white/40', accepte: 'text-green', envoye: 'text-amber', refuse: 'text-red', converti: 'text-green',
}

const TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'planifie', label: 'Planifiés' },
  { key: 'termine', label: 'Terminés' },
]

function capitalize(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export default function EspaceClientPage() {
  const [prenom, setPrenom] = useState('')
  const [projets, setProjets] = useState<ProjetDashboard[]>([])
  const [factures, setFactures] = useState<FactureRecente[]>([])
  const [devis, setDevis] = useState<DevisRecent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tous')
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') setNotifOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: userData } = await supabase
      .from('users')
      .select('id, prenom, entreprise_cliente_id')
      .eq('auth_user_id', authUser.id)
      .single()
    if (!userData) { setLoading(false); return }
    setPrenom(userData.prenom || '')

    // Projets : passe par membres_projet (mécanisme réellement utilisé pour les client_externe)
    const { data: mpData } = await supabase
      .from('membres_projet')
      .select('projets(id, titre, statut, avancement, date_debut, date_fin_prevue)')
      .eq('user_id', userData.id)
      .eq('statut', 'actif')
      .is('revoque_at', null)
      .not('projets', 'is', null)

    const projetsList = ((mpData || []).map((r: any) => r.projets).filter(Boolean) as ProjetDashboard[])
      .sort((a, b) => a.titre.localeCompare(b.titre))
    setProjets(projetsList)

    // RLS (factures_client_own + factures_client_assignation_individuelle,
    //      devis_client_own   + devis_client_assignation_individuelle)
    // couvre les deux chemins d'accès : entreprise ET assignation individuelle
    const [{ data: facturesData }, { data: devisData }] = await Promise.all([
      supabase.from('factures').select('id, numero, montant_ttc, statut, date_echeance').eq('type', 'facture_client').neq('statut', 'brouillon').order('date_emission', { ascending: false }).limit(6),
      supabase.from('devis').select('id, numero, montant_ttc, statut, created_at').order('created_at', { ascending: false }).limit(6),
    ])
    setFactures((facturesData || []) as FactureRecente[])
    setDevis((devisData || []) as DevisRecent[])

    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const projetsActifs = projets.filter(p => p.statut === 'en_cours')
  const avancementMoyen = projetsActifs.length
    ? Math.round(projetsActifs.reduce((s, p) => s + p.avancement, 0) / projetsActifs.length)
    : 0
  const facturesEnAttente = factures.filter(f => ['envoyee', 'signee', 'en_retard'].includes(f.statut))
  const facturesEnRetard = factures.filter(f => f.statut === 'en_retard' || (['envoyee', 'signee'].includes(f.statut) && f.date_echeance < today))
  const devisASigner = devis.filter(d => d.statut === 'envoye')
  const montantEnAttente = facturesEnAttente.reduce((s, f) => s + f.montant_ttc, 0)

  // Échéances proches (14 jours) — alimente le panneau latéral et le centre de notifications
  const echeancesProches = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() + 14)
    const limiteStr = limite.toISOString().split('T')[0]
    return projets
      .filter(p => p.statut !== 'termine' && p.statut !== 'annule' && p.date_fin_prevue && p.date_fin_prevue <= limiteStr)
      .sort((a, b) => (a.date_fin_prevue || '').localeCompare(b.date_fin_prevue || ''))
      .slice(0, 4)
  }, [projets])

  const notifications = [
    ...echeancesProches.map(p => ({
      id: `ech-${p.id}`, type: 'echeance' as const,
      label: `Échéance proche : ${p.titre}`,
      detail: p.date_fin_prevue ? `Prévue le ${formatDate(p.date_fin_prevue)}` : '',
      href: `/espace-client/projets/${p.id}`,
    })),
    ...facturesEnRetard.map(f => ({
      id: `fact-${f.id}`, type: 'facture' as const,
      label: `Facture en retard : ${f.numero}`,
      detail: formatMontant(f.montant_ttc),
      href: '/espace-client/factures',
    })),
    ...devisASigner.map(d => ({
      id: `devis-${d.id}`, type: 'devis' as const,
      label: `Devis à signer : ${d.numero}`,
      detail: formatMontant(d.montant_ttc),
      href: '/espace-client/devis',
    })),
  ].slice(0, 6)

  const searchLower = search.trim().toLowerCase()
  const filteredProjets = projets
    .filter(p => tab === 'tous' || p.statut === tab)
    .filter(p => !searchLower || p.titre.toLowerCase().includes(searchLower))

  const dateLabel = capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))

  const headerMessage = projetsActifs.length > 0
    ? `${projetsActifs.length} projet${projetsActifs.length > 1 ? 's' : ''} actif${projetsActifs.length > 1 ? 's' : ''} · avancement moyen de ${avancementMoyen}%`
    : projets.length > 0
      ? `${projets.length} projet${projets.length > 1 ? 's' : ''} dans votre espace`
      : 'Votre espace est prêt à accueillir vos premiers projets'

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white/5 rounded-2xl" />
          <div className="h-72 bg-white/5 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Bonjour{prenom ? <>, <span className="gradient-text">{prenom}</span></> : ''}
          </h1>
          <p className="text-sm text-white/40 mt-1">{dateLabel} — {headerMessage}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Recherche (⌘K pour focus, filtre la liste de projets) */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un projet…"
              className="w-56 lg:w-64 bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-14 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-blue/40 focus:bg-white/[0.05] transition-colors"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-white/25 border border-white/10 rounded-md px-1.5 py-0.5">⌘K</kbd>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${notifOpen ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:border-white/20'}`}
            >
              <Bell size={15} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0A0D14]">
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#0D1017] border border-white/10 rounded-2xl shadow-dropdown z-50 overflow-hidden animate-scale-in">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="text-white/30 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <CheckCircle2 size={24} className="mx-auto mb-2 text-green/50" />
                      <p className="text-xs text-white/40">Tout est calme par ici</p>
                      <p className="text-2xs text-white/25 mt-0.5">Aucune échéance ni action en attente</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto no-scrollbar divide-y divide-white/5">
                      {notifications.map(n => (
                        <Link key={n.id} href={n.href} onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            n.type === 'echeance' ? 'bg-amber/10 text-amber' : n.type === 'facture' ? 'bg-red/10 text-red' : 'bg-violet/10 text-violet'
                          }`}>
                            {n.type === 'echeance' ? <Calendar size={12} /> : n.type === 'facture' ? <AlertTriangle size={12} /> : <FileText size={12} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white/80 group-hover:text-white truncate">{n.label}</p>
                            <p className="text-2xs text-white/30 mt-0.5">{n.detail}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          href="/espace-client/projets"
          icon={FolderOpen} label="Projets actifs" value={projetsActifs.length}
          accent={{ text: 'text-blue', bg: 'bg-blue/10', blob: 'bg-blue' }}
          hint={projets.length > 0 ? `${projets.length} au total` : 'Aucun projet pour le moment'}
        />
        <KpiCard
          href="/espace-client/projets"
          icon={TrendingUp} label="Avancement moyen" value={`${avancementMoyen}%`}
          accent={{ text: 'text-green', bg: 'bg-green/10', blob: 'bg-green' }}
          hint={projetsActifs.length > 0 ? 'sur vos projets actifs' : 'Aucun projet actif'}
          progress={avancementMoyen}
        />
        <KpiCard
          href="/espace-client/factures"
          icon={Clock} label="Factures en attente" value={facturesEnAttente.length}
          accent={{ text: 'text-amber', bg: 'bg-amber/10', blob: 'bg-amber' }}
          hint={facturesEnAttente.length > 0 ? `${formatMontant(montantEnAttente)} au total` : 'Vous êtes à jour ✓'}
        />
        <KpiCard
          href="/espace-client/devis"
          icon={FileText} label="Devis à signer" value={devisASigner.length}
          accent={{ text: 'text-violet', bg: 'bg-violet/10', blob: 'bg-violet' }}
          hint={devisASigner.length > 0 ? 'Action requise de votre part' : 'Aucune action requise'}
        />
      </div>

      {/* Contenu principal : projets + panneau latéral */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mes projets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <LayoutGrid size={14} className="text-white/30" /> Mes projets
            </h2>
            <Link href="/espace-client/projets" className="text-xs text-white/30 hover:text-blue flex items-center gap-1 transition-colors">
              Tout voir <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => {
              const count = t.key === 'tous' ? projets.length : projets.filter(p => p.statut === t.key).length
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    tab === t.key ? 'bg-blue/15 text-blue border border-blue/30' : 'bg-white/[0.03] text-white/40 border border-white/5 hover:text-white hover:border-white/15'
                  }`}>
                  {t.label}
                  <span className={tab === t.key ? 'text-blue/70' : 'text-white/25'}>{count}</span>
                </button>
              )
            })}
          </div>

          {filteredProjets.length === 0 ? (
            projets.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Prêt à démarrer votre premier projet ?"
                description="Dès qu'un projet vous sera confié, il apparaîtra ici avec son avancement, ses échéances et son suivi en temps réel."
                actionLabel="Découvrir l'espace projets"
                actionHref="/espace-client/projets"
              />
            ) : (
              <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                <Search size={22} className="mx-auto mb-2 text-white/15" />
                <p className="text-sm text-white/30">Aucun projet ne correspond à cette recherche</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {filteredProjets.slice(0, 6).map(p => {
                const cfg = STATUT_PROJET_CFG[p.statut] || STATUT_PROJET_CFG.planifie
                const enRetard = p.statut === 'en_cours' && !!p.date_fin_prevue && p.date_fin_prevue <= today
                return (
                  <Link key={p.id} href={`/espace-client/projets/${p.id}`}
                    className="group block bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-white/15 hover:bg-white/[0.05] transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs border font-medium ${cfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                          </span>
                          {enRetard && (
                            <span className="text-2xs text-red flex items-center gap-1"><AlertTriangle size={10} /> Échéance dépassée</span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-blue transition-colors truncate">{p.titre}</h3>
                      </div>
                      <p className={`text-lg font-bold flex-shrink-0 ${p.avancement === 100 ? 'text-green' : 'text-blue'}`}>{p.avancement}%</p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all duration-500 ${p.avancement === 100 ? 'bg-green' : 'bg-gradient-to-r from-blue to-violet'}`} style={{ width: `${p.avancement}%` }} />
                    </div>
                    <div className="flex items-center gap-4 text-2xs text-white/30">
                      {p.date_fin_prevue && (
                        <span className="flex items-center gap-1.5"><Clock size={11} /> Échéance : {formatDate(p.date_fin_prevue)}</span>
                      )}
                      <ArrowRight size={12} className="ml-auto text-white/15 group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Panneau latéral */}
        <div className="space-y-6">
          {/* Échéances à venir */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-white/30" /> Échéances à venir
            </h2>
            {echeancesProches.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles size={20} className="mx-auto mb-2 text-white/15" />
                <p className="text-xs text-white/30">Aucune échéance dans les 14 prochains jours</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {echeancesProches.map(p => (
                  <Link key={p.id} href={`/espace-client/projets/${p.id}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center flex-shrink-0">
                      <Clock size={13} className="text-amber" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 group-hover:text-white truncate transition-colors">{p.titre}</p>
                      <p className="text-2xs text-white/30">{p.date_fin_prevue ? formatDate(p.date_fin_prevue) : ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Factures & devis */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText size={14} className="text-white/30" /> Factures &amp; devis
              </h2>
              {(facturesEnAttente.length > 0 || devisASigner.length > 0) && (
                <span className="text-2xs text-white/25">{facturesEnAttente.length + devisASigner.length} en attente</span>
              )}
            </div>

            {factures.length === 0 && devis.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={22} className="mx-auto mb-2 text-green/40" />
                <p className="text-xs text-white/40">Rien à signaler</p>
                <p className="text-2xs text-white/25 mt-0.5">Vos factures et devis apparaîtront ici dès leur émission</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...devis.slice(0, 2).map(d => ({ ...d, _kind: 'devis' as const })), ...factures.slice(0, 3).map(f => ({ ...f, _kind: 'facture' as const }))]
                  .slice(0, 4)
                  .map(item => (
                    <Link key={`${item._kind}-${item.id}`} href={item._kind === 'devis' ? '/espace-client/devis' : '/espace-client/factures'}
                      className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 hover:border-white/15 transition-colors group">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-white/50 truncate">{item.numero}</p>
                        <p className="text-2xs text-white/30 mt-0.5">{formatMontant(item.montant_ttc)}</p>
                      </div>
                      <span className={`text-2xs font-medium capitalize flex-shrink-0 ${STATUT_DOC_COLORS[item.statut] || 'text-white/40'}`}>
                        {item.statut.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              <Link href="/espace-client/factures" className="text-2xs text-white/30 hover:text-blue flex items-center gap-1 transition-colors">Mes factures <ChevronRight size={10} /></Link>
              <Link href="/espace-client/devis" className="text-2xs text-white/30 hover:text-blue flex items-center gap-1 transition-colors">Mes devis <ChevronRight size={10} /></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent, hint, progress, href }: {
  icon: any; label: string; value: string | number
  accent: { text: string; bg: string; blob: string }
  hint?: string
  progress?: number
  href?: string
}) {
  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}
  return (
    <Wrapper {...(wrapperProps as any)} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-5 transition-all hover:border-white/10 hover:-translate-y-0.5 block">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-[0.08] group-hover:opacity-[0.14] transition-opacity ${accent.blob}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-9 h-9 rounded-xl ${accent.bg} flex items-center justify-center`}>
            <Icon size={16} className={accent.text} />
          </div>
          {progress !== undefined && (
            <div className="w-9 h-9">
              <ProgressRing value={progress} colorClass={accent.text} />
            </div>
          )}
        </div>
        <p className={`text-2xl sm:text-3xl font-bold ${accent.text} tracking-tight`}>{value}</p>
        <p className="text-xs text-white/40 mt-1">{label}</p>
        {hint && <p className="text-2xs text-white/25 mt-2 truncate">{hint}</p>}
      </div>
    </Wrapper>
  )
}

function ProgressRing({ value, colorClass }: { value: number; colorClass: string }) {
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <svg viewBox="0 0 40 40" className={`-rotate-90 ${colorClass}`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
    </svg>
  )
}

function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: {
  icon: any; title: string; description: string; actionLabel?: string; actionHref?: string
}) {
  return (
    <div className="relative overflow-hidden text-center py-12 px-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none">
        <Icon size={140} />
      </div>
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-blue/10 flex items-center justify-center mx-auto mb-4">
          <Icon size={20} className="text-blue" />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/35 mt-1.5 max-w-xs mx-auto leading-relaxed">{description}</p>
        {actionLabel && actionHref && (
          <Link href={actionHref} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue/10 text-blue text-xs font-medium rounded-lg border border-blue/20 hover:bg-blue/15 transition-colors">
            {actionLabel} <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
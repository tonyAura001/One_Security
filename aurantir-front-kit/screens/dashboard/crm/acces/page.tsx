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
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Badge, RoleBadge } from '@/aurantir-front-kit/components/ui/Badge'
import { cn, formatDate, initiales } from '@/aurantir-front-kit/lib/utils'
import type { User, Role } from '@/aurantir-front-kit/types/database.types'
import { AssignProjetsModal, AssignDocumentsModal } from '@/aurantir-front-kit/components/shared/AssignResourceModals'
import { ActionsMenu } from '@/aurantir-front-kit/components/shared/ActionsMenu'
import { InviteMemberModal } from '@/aurantir-front-kit/components/shared/InviteMemberModal'
import {
  memberStatusMenuItems, MemberStatusActionModal, DeleteMemberModal,
  type StatusAction,
} from '@/aurantir-front-kit/components/shared/MemberStatusActions'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Search, Users, FolderPlus, FileText, Receipt, Plus, Archive, ChevronLeft, ChevronRight } from 'lucide-react'

const ICON_STROKE = 1.5
const PAGE_SIZE = 10

// Rôles pour lesquels une assignation de ressources (projets / devis / factures) a du sens
const ASSIGNABLE_ROLES: Role[] = ['client_externe', 'employe_interne', 'manager', 'prestataire', 'invite_lecture']

type Filtre = 'tous' | 'clients' | 'equipe'

export default function AccesClientsPage() {
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filtre,  setFiltre]  = useState<Filtre>('tous')
  const [showAssignProjetsModal,  setShowAssignProjetsModal]  = useState<User | null>(null)
  const [showAssignDevisModal,    setShowAssignDevisModal]    = useState<User | null>(null)
  const [showAssignFacturesModal, setShowAssignFacturesModal] = useState<User | null>(null)
  const [showInviteModal,         setShowInviteModal]         = useState(false)
  const [showActionModal,         setShowActionModal]         = useState<StatusAction | null>(null)
  const [showDeleteModal,         setShowDeleteModal]         = useState<User | null>(null)
  const [showArchives,            setShowArchives]            = useState(false)
  const [page,                    setPage]                     = useState(1)
  const { user: currentUser } = useAppStore()
  const supabase = createClient()

  useEffect(() => { loadUsers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, entite_principale:entites_legales(nom, couleur)')
      .in('role', ASSIGNABLE_ROLES)
      .order('role')
      .order('prenom')
    setUsers((data || []) as User[])
    setLoading(false)
  }

  const usersVisibles = users.filter(u => !u.email.endsWith('@deleted.local'))
  const nbClients = usersVisibles.filter(u => u.role === 'client_externe' && u.statut !== 'inactif').length
  const nbEquipe  = usersVisibles.filter(u => u.role !== 'client_externe' && u.statut !== 'inactif').length
  const nbArchives = usersVisibles.filter(u => u.statut === 'inactif').length

  const usersFiltres = usersVisibles
    .filter(u => showArchives ? u.statut === 'inactif' : u.statut !== 'inactif')
    .filter(u => filtre === 'tous' || (filtre === 'clients' ? u.role === 'client_externe' : u.role !== 'client_externe'))
    .filter(u =>
      !search ||
      u.prenom.toLowerCase().includes(search.toLowerCase()) ||
      u.nom?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )

  const FILTRES: { id: Filtre; label: string; count: number }[] = [
    { id: 'tous',    label: 'Tous',    count: nbClients + nbEquipe },
    { id: 'clients', label: 'Clients', count: nbClients },
    { id: 'equipe',  label: 'Équipe',  count: nbEquipe },
  ]

  // Pagination
  const totalPages = Math.max(1, Math.ceil(usersFiltres.length / PAGE_SIZE))
  const pageCourante = Math.min(page, totalPages)
  const usersPage = usersFiltres.slice((pageCourante - 1) * PAGE_SIZE, pageCourante * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, filtre, showArchives])

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center flex-shrink-0">
            <Users size={18} strokeWidth={ICON_STROKE} className="text-blue" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Accès clients</h1>
            <p className="text-sm text-text-muted/80 mt-0.5">
              {usersVisibles.length} compte{usersVisibles.length !== 1 ? 's' : ''} — assignez les projets, devis et factures visibles dans chaque espace
            </p>
          </div>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowInviteModal(true)}>
          Inviter un membre
        </Button>
      </div>

      {/* Filtres + recherche */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {FILTRES.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filtre === f.id
                  ? 'bg-blue/10 text-blue border-blue/30'
                  : 'border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-border-hover'
              )}
            >
              {f.label} <span className="opacity-60">· {f.count}</span>
            </button>
          ))}
          <button
            onClick={() => setShowArchives(v => !v)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
              showArchives
                ? 'bg-violet/10 text-violet border-violet/30'
                : 'border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-border-hover'
            )}
          >
            <Archive size={13} strokeWidth={ICON_STROKE} />
            Archivés <span className="opacity-60">· {nbArchives}</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-surface/40 border border-surface-border/60 text-text-primary placeholder:text-text-disabled transition-all duration-200 focus:outline-none focus:border-blue/40 focus:bg-surface focus:ring-2 focus:ring-blue/10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-surface-border/60 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface/95 backdrop-blur-sm border-b border-surface-border/40">
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider">Membre</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider hidden lg:table-cell">Entité</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-text-disabled uppercase tracking-wider hidden lg:table-cell">Depuis</th>
                <th className="px-4 py-3 text-right text-2xs font-medium text-text-disabled uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-5"><div className="skeleton h-4 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : usersFiltres.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <Users size={32} className="mx-auto mb-3 text-text-disabled opacity-50" />
                      <p className="text-sm text-text-muted">Aucun compte trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usersPage.map((u) => {
                const isClient = u.role === 'client_externe'
                const isSelf       = u.id === currentUser?.id
                const isProtected  = u.role === 'super_admin' && isSelf
                const canActOnUser = currentUser?.role === 'super_admin' && !isProtected
                return (
                  <tr key={u.id} className={cn('transition-colors hover:bg-surface-hover/30', u.statut !== 'actif' && 'opacity-50')}>
                    {/* ── Membre ── */}
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          isClient ? 'bg-amber/15 text-amber' : 'bg-surface text-text-secondary'
                        )}>
                          {initiales(u.prenom, u.nom)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-text-primary">{u.prenom} {u.nom}</p>
                          <p className="text-2xs text-text-muted md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-xs text-text-muted hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-5"><RoleBadge role={u.role} size="sm" /></td>
                    <td className="px-4 py-5 text-xs text-text-muted hidden lg:table-cell">
                      {(u as any).entite_principale?.nom || '—'}
                    </td>

                    {/* ── Statut ── */}
                    <td className="px-4 py-5">
                      <Badge
                        size="sm"
                        variant={
                          u.statut === 'actif'    ? 'green' :
                          u.statut === 'revoque'  ? 'red'   :
                          u.statut === 'bloque'   ? 'amber' : 'gray'
                        }
                        dot
                      >
                        {u.statut === 'actif'   ? 'Actif'    :
                         u.statut === 'revoque' ? 'Révoqué'  :
                         u.statut === 'bloque'  ? 'Suspendu' : 'Inactif'}
                      </Badge>
                    </td>

                    <td className="px-4 py-5 text-xs text-text-muted hidden lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>

                    {/* ── Actions ── */}
                    <td className="px-4 py-5 text-right">
                      <ActionsMenu items={[
                        {
                          label: 'Assigner des projets',
                          icon: <FolderPlus size={13} strokeWidth={ICON_STROKE} />,
                          onClick: () => setShowAssignProjetsModal(u),
                        },
                        ...(isClient ? [{
                          label: 'Assigner des devis',
                          icon: <FileText size={13} strokeWidth={ICON_STROKE} />,
                          onClick: () => setShowAssignDevisModal(u),
                        }, {
                          label: 'Assigner des factures',
                          icon: <Receipt size={13} strokeWidth={ICON_STROKE} />,
                          onClick: () => setShowAssignFacturesModal(u),
                        }] : []),
                        ...memberStatusMenuItems(u, canActOnUser, setShowActionModal, setShowDeleteModal),
                      ]} />
                    </td>
                  </tr>
                )
              })
              )}
            </tbody>
          </table>

          {/* Pagination — sticky en bas du conteneur scrollable */}
          {!loading && usersFiltres.length > 0 && (
            <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface border-t border-surface-border/60">
              <p className="text-2xs text-text-muted order-2 sm:order-1">
                {(pageCourante - 1) * PAGE_SIZE + 1}–{Math.min(pageCourante * PAGE_SIZE, usersFiltres.length)} sur {usersFiltres.length}
              </p>

              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageCourante === 1}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={15} strokeWidth={ICON_STROKE} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const n = i + 1
                    // Sur mobile, n'afficher que la page courante (+ first/last)
                    const isEdge = n === 1 || n === totalPages
                    if (totalPages > 5 && !isEdge && Math.abs(n - pageCourante) > 1) {
                      if (n === pageCourante - 2 || n === pageCourante + 2) {
                        return <span key={n} className="px-1 text-2xs text-text-disabled">···</span>
                      }
                      return null
                    }
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={cn(
                          'min-w-7 h-7 px-1.5 rounded-lg text-2xs font-medium transition-colors',
                          n === pageCourante
                            ? 'bg-blue/10 text-blue border border-blue/30'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                        )}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={pageCourante === totalPages}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={15} strokeWidth={ICON_STROKE} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal assignation projets ────────────────────────── */}
      {showAssignProjetsModal && (
        <AssignProjetsModal
          client={showAssignProjetsModal}
          onClose={() => setShowAssignProjetsModal(null)}
        />
      )}

      {/* ── Modal assignation devis ───────────────────────────── */}
      {showAssignDevisModal && (
        <AssignDocumentsModal
          client={showAssignDevisModal}
          typeDocument="devis"
          onClose={() => setShowAssignDevisModal(null)}
        />
      )}

      {/* ── Modal assignation factures ────────────────────────── */}
      {showAssignFacturesModal && (
        <AssignDocumentsModal
          client={showAssignFacturesModal}
          typeDocument="facture"
          onClose={() => setShowAssignFacturesModal(null)}
        />
      )}

      {/* ── Modal invitation ─────────────────────────────────── */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); loadUsers() }}
        />
      )}

      {/* ── Modal action (suspendre / révoquer / réactiver / archiver) ── */}
      {showActionModal && currentUser && (
        <MemberStatusActionModal
          statusAction={showActionModal}
          currentUserId={currentUser.id}
          onClose={() => setShowActionModal(null)}
          onSuccess={() => { setShowActionModal(null); loadUsers() }}
        />
      )}

      {/* ── Modal suppression définitive ──────────────────────── */}
      {showDeleteModal && (
        <DeleteMemberModal
          membre={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onSuccess={() => { setShowDeleteModal(null); loadUsers() }}
        />
      )}
    </div>
  )
}
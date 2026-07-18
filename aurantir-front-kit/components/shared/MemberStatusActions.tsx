// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Input } from '@/aurantir-front-kit/components/ui/Input'
import type { User } from '@/aurantir-front-kit/types/database.types'
import type { ActionMenuItem } from '@/aurantir-front-kit/components/shared/ActionsMenu'
import {
  AlertTriangle, UserX, UserCheck, PauseCircle, Archive, ArchiveRestore, Trash2,
} from 'lucide-react'

const ICON_STROKE = 1.5

export type StatusActionType = 'revoquer' | 'suspendre' | 'reactiver' | 'archiver'

export interface StatusAction {
  user:   User
  action: StatusActionType
}

// ── Items de menu pour la gestion du statut d'un membre ──────────
export function memberStatusMenuItems(
  membre: User,
  canAct: boolean,
  onAction: (a: StatusAction) => void,
  onDelete: (membre: User) => void,
): ActionMenuItem[] {
  if (!canAct) return []

  const items: ActionMenuItem[] = []

  if (membre.statut === 'actif') {
    items.push({
      label: 'Suspendre',
      icon: <PauseCircle size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onAction({ user: membre, action: 'suspendre' }),
    }, {
      label: 'Révoquer',
      icon: <UserX size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onAction({ user: membre, action: 'revoquer' }),
      danger: true,
    })
  }

  if (membre.statut === 'revoque' || membre.statut === 'bloque') {
    items.push({
      label: 'Réactiver',
      icon: <UserCheck size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onAction({ user: membre, action: 'reactiver' }),
    })
  }

  if (membre.statut !== 'inactif') {
    items.push({
      label: 'Archiver',
      icon: <Archive size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onAction({ user: membre, action: 'archiver' }),
      separatorBefore: true,
    })
  } else {
    items.push({
      label: 'Désarchiver',
      icon: <ArchiveRestore size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onAction({ user: membre, action: 'reactiver' }),
      separatorBefore: true,
    })
  }

  if (membre.statut === 'revoque' || membre.statut === 'inactif') {
    items.push({
      label: 'Supprimer définitivement',
      icon: <Trash2 size={13} strokeWidth={ICON_STROKE} />,
      onClick: () => onDelete(membre),
      danger: true,
      separatorBefore: true,
    })
  }

  return items
}

const ACTION_CONFIG = {
  revoquer: {
    title: 'Révoquer l\'accès',
    desc: 'Révocation définitive. L\'utilisateur peut être réactivé ultérieurement.',
    icon: <UserX size={18} className="text-red" />,
    bgIcon: 'bg-red/10',
    warning: 'Cette action révoque immédiatement toutes les sessions actives.',
    warningColor: 'text-red',
    warningBg: 'bg-red/5 border-red/20',
    btnVariant: 'danger' as const,
    btnLabel: 'Confirmer la révocation',
    requireReason: true,
  },
  suspendre: {
    title: 'Suspendre l\'accès',
    desc: 'Suspension temporaire. L\'utilisateur pourra être réactivé.',
    icon: <PauseCircle size={18} className="text-amber" />,
    bgIcon: 'bg-amber/10',
    warning: 'L\'utilisateur sera déconnecté immédiatement et ne pourra plus se connecter pendant la suspension.',
    warningColor: 'text-amber',
    warningBg: 'bg-amber/5 border-amber/20',
    btnVariant: 'secondary' as const,
    btnLabel: 'Confirmer la suspension',
    requireReason: true,
  },
  reactiver: {
    title: 'Réactiver le compte',
    desc: 'L\'utilisateur retrouvera un accès normal à la plateforme.',
    icon: <UserCheck size={18} className="text-green" />,
    bgIcon: 'bg-green/10',
    warning: 'Le compte sera remis en statut actif et l\'utilisateur pourra se reconnecter.',
    warningColor: 'text-green',
    warningBg: 'bg-green/5 border-green/20',
    btnVariant: 'success' as const,
    btnLabel: 'Réactiver le compte',
    requireReason: false,
  },
  archiver: {
    title: 'Archiver le membre',
    desc: 'Le compte sera marqué comme inactif et masqué des listes actives.',
    icon: <Archive size={18} className="text-text-secondary" />,
    bgIcon: 'bg-surface-hover',
    warning: 'L\'utilisateur ne pourra plus se connecter tant que le compte est archivé. Il pourra être réactivé à tout moment.',
    warningColor: 'text-text-muted',
    warningBg: 'bg-surface/60 border-surface-border',
    btnVariant: 'secondary' as const,
    btnLabel: 'Archiver',
    requireReason: false,
  },
}

// ── Modal de confirmation (suspendre / révoquer / réactiver / archiver) ──
export function MemberStatusActionModal({
  statusAction,
  currentUserId,
  onClose,
  onSuccess,
}: {
  statusAction:  StatusAction
  currentUserId: string
  onClose:       () => void
  onSuccess:     () => void
}) {
  const [raison,    setRaison]    = useState('')
  const [actioning, setActioning] = useState(false)
  const supabase = createClient()
  const { user: targetUser, action } = statusAction
  const cfg = ACTION_CONFIG[action]

  async function handleAction() {
    if ((action === 'revoquer' || action === 'suspendre') && !raison.trim()) return
    setActioning(true)

    if (action === 'revoquer' || action === 'suspendre') {
      const newStatut = action === 'revoquer' ? 'revoque' : 'bloque'
      await supabase.from('users').update({ statut: newStatut }).eq('id', targetUser.id)
      await supabase.from('revocations').insert({
        user_id:     targetUser.id,
        revoque_par: currentUserId,
        raison,
        type: action === 'revoquer' ? 'definitif' : 'temporaire',
      })
      const { data: sessions } = await supabase
        .from('sessions').select('token_hash')
        .eq('user_id', targetUser.id).is('revoque_at', null)
      if (sessions?.length) {
        await supabase.from('token_blacklist').insert(
          sessions.map((s: any) => ({ token_hash: s.token_hash, raison }))
        )
      }
      await supabase.from('journal_admin').insert({
        admin_id: currentUserId,
        action: action === 'revoquer' ? 'REVOCATION_MEMBRE' : 'SUSPENSION_MEMBRE',
        details: { user_id: targetUser.id, email: targetUser.email, raison },
      })
    } else if (action === 'reactiver') {
      await supabase.from('users').update({ statut: 'actif' }).eq('id', targetUser.id)
      await supabase.from('journal_admin').insert({
        admin_id: currentUserId,
        action: 'REACTIVATION_MEMBRE',
        details: { user_id: targetUser.id, email: targetUser.email },
      })
    } else if (action === 'archiver') {
      await supabase.from('users').update({ statut: 'inactif' }).eq('id', targetUser.id)
      await supabase.from('journal_admin').insert({
        admin_id: currentUserId,
        action: 'ARCHIVAGE_MEMBRE',
        details: { user_id: targetUser.id, email: targetUser.email },
      })
    }

    setActioning(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${cfg.bgIcon} flex items-center justify-center`}>
            {cfg.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{cfg.title}</h3>
            <p className="text-xs text-text-muted">{targetUser.prenom} {targetUser.nom}</p>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${cfg.warningBg}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className={`${cfg.warningColor} flex-shrink-0 mt-0.5`} />
            <p className={`text-xs ${cfg.warningColor}`}>{cfg.warning}</p>
          </div>
        </div>

        {cfg.requireReason && (
          <Input
            label="Raison"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            placeholder={
              action === 'revoquer'
                ? 'Ex: Fin de collaboration, violation de politique...'
                : 'Ex: Comportement inapproprié, en attente d\'enquête...'
            }
            required
          />
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            variant={cfg.btnVariant}
            className="flex-1"
            loading={actioning}
            disabled={cfg.requireReason && !raison.trim()}
            onClick={handleAction}
          >
            {cfg.btnLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmation de suppression définitive ───────────────
export function DeleteMemberModal({
  membre,
  onClose,
  onSuccess,
}: {
  membre:    User
  onClose:   () => void
  onSuccess: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState('')

  async function handleDelete() {
    setError('')
    setDeleting(true)
    const res = await fetch('/api/admin/delete-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: membre.id }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Erreur lors de la suppression')
      setDeleting(false)
      return
    }
    onSuccess()
  }

  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center">
            <Trash2 size={18} className="text-red" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Supprimer définitivement</h3>
            <p className="text-xs text-text-muted">{membre.prenom} {membre.nom} · {membre.email}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-red/5 border-red/20">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red">
              Cette action est irréversible. Le compte de connexion sera définitivement supprimé et les informations personnelles seront anonymisées. Le membre sera déplacé dans les archives.
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-red bg-red/5 border border-red/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
            Supprimer définitivement
          </Button>
        </div>
      </div>
    </div>
  )
}
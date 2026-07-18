import React from 'react'
import { cn } from '@/aurantir-front-kit/lib/utils'
import type { FactureStatut, FactureType, DevisStatut, ProjetStatut, TacheStatut, UserStatut, Role } from '@/aurantir-front-kit/types/database.types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'gray' | 'sama' | 'aurantir'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'gray', size = 'md', dot, className }: BadgeProps) {
  const variants = {
    blue: 'bg-blue/10 text-blue border-blue/20',
    green: 'bg-green/10 text-green border-green/20',
    amber: 'bg-amber/10 text-amber border-amber/20',
    red: 'bg-red/10 text-red border-red/20',
    violet: 'bg-violet/10 text-violet border-violet/20',
    gray: 'bg-surface text-text-secondary border-surface-border',
    sama: 'bg-[#AEB8AE]/15 text-[#AEB8AE] border-[#AEB8AE]/25',
    aurantir: 'bg-[#2D6BFF]/15 text-[#2D6BFF] border-[#2D6BFF]/25',
  }

  const sizes = {
    sm: 'text-2xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'blue' && 'bg-blue',
          variant === 'green' && 'bg-green',
          variant === 'amber' && 'bg-amber',
          variant === 'red' && 'bg-red',
          variant === 'violet' && 'bg-violet',
          variant === 'gray' && 'bg-text-muted',
        )} />
      )}
      {children}
    </span>
  )
}

// Badges spécialisés par type de statut
export function StatutFactureBadge({ statut }: { statut: FactureStatut }) {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    brouillon:            { label: 'Brouillon',        variant: 'gray' },
    envoyee:              { label: 'Envoyée',          variant: 'blue' },
    signee:               { label: 'Signée',           variant: 'violet' },
    payee:                { label: 'Payée',            variant: 'green' },
    en_retard:            { label: 'En retard',        variant: 'red' },
    annulee:              { label: 'Annulée',          variant: 'gray' },
    avoir_emis:           { label: 'Avoir émis',       variant: 'amber' },
    recue:                { label: 'Reçue',            variant: 'blue' },
    validee:              { label: 'Validée',          variant: 'violet' },
    partiellement_payee:  { label: 'Part. payée',      variant: 'amber' },
  }
  const { label, variant } = config[statut] || { label: statut, variant: 'gray' as const }
  return <Badge variant={variant} dot>{label}</Badge>
}

export function TypeFactureBadge({ type }: { type: FactureType }) {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    facture_client:      { label: 'Client',       variant: 'blue' },
    facture_fournisseur: { label: 'Fournisseur',  variant: 'violet' },
    avoir_client:        { label: 'Avoir client', variant: 'amber' },
    avoir_fournisseur:   { label: 'Avoir fourn.', variant: 'amber' },
    facture_depense:     { label: 'Dépense',      variant: 'gray' },
    avoir:               { label: 'Avoir',        variant: 'amber' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'gray' as const }
  return <Badge variant={variant}>{label}</Badge>
}

export function StatutDevisBadge({ statut }: { statut: DevisStatut }) {
  const config: Record<DevisStatut, { label: string; variant: BadgeProps['variant'] }> = {
    brouillon: { label: 'Brouillon', variant: 'gray' },
    envoye: { label: 'Envoyé', variant: 'blue' },
    en_negociation: { label: 'Négociation', variant: 'amber' },
    accepte: { label: 'Accepté', variant: 'green' },
    refuse: { label: 'Refusé', variant: 'red' },
    expire: { label: 'Expiré', variant: 'gray' },
    annule: { label: 'Annulé', variant: 'gray' },
    converti: { label: 'Converti', variant: 'violet' },
  }
  const { label, variant } = config[statut] || { label: statut, variant: 'gray' as const }
  return <Badge variant={variant} dot>{label}</Badge>
}

export function StatutProjetBadge({ statut }: { statut: ProjetStatut }) {
  const config: Record<ProjetStatut, { label: string; variant: BadgeProps['variant'] }> = {
    planifie: { label: 'Planifié', variant: 'gray' },
    en_cours: { label: 'En cours', variant: 'blue' },
    en_pause: { label: 'En pause', variant: 'amber' },
    termine: { label: 'Terminé', variant: 'green' },
    annule: { label: 'Annulé', variant: 'red' },
  }
  const { label, variant } = config[statut] || { label: statut, variant: 'gray' as const }
  return <Badge variant={variant} dot>{label}</Badge>
}

export function RoleBadge({ role, size }: { role: Role; size?: BadgeProps['size'] }) {
  const config: Record<Role, { label: string; variant: BadgeProps['variant'] }> = {
    super_admin: { label: 'Super Admin', variant: 'violet' },
    fondateur: { label: 'Fondateur', variant: 'blue' },
    manager: { label: 'Manager', variant: 'green' },
    employe_interne: { label: 'Employé', variant: 'gray' },
    client_externe: { label: 'Client', variant: 'amber' },
    prestataire: { label: 'Prestataire', variant: 'gray' },
    invite_lecture: { label: 'Invité', variant: 'gray' },
  }
  const { label, variant } = config[role] || { label: role, variant: 'gray' as const }
  return <Badge variant={variant} size={size}>{label}</Badge>
}

export function EntiteBadge({ nom }: { nom: string }) {
  const isSama = nom === 'Sama Digital'
  return <Badge variant={isSama ? 'sama' : 'aurantir'}>{nom}</Badge>
}

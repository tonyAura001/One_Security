/**
 * Accès clients — comptes du portail client (espace de suivi). Données démo.
 * La gestion des accès relève de la conformité APDP (traçabilité + révocation).
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type AccessRole = "consultation" | "validation";
export type AccessStatus = "actif" | "invite" | "suspendu";

export interface ClientAccess {
  id: string;
  client: string;
  site: string;
  contact: string;
  email: string;
  role: AccessRole;
  status: AccessStatus;
  /** Dernière connexion (ISO) ou null si jamais connecté. */
  lastLogin: string | null;
  /** Connexions sur le mois en cours. */
  loginsThisMonth: number;
}

const ACCESS: ClientAccess[] = [
  {
    id: "ac1",
    client: "CBAO Plateau",
    site: "Agence Plateau",
    contact: "M. Ba",
    email: "securite@cbao.sn",
    role: "validation",
    status: "actif",
    lastLogin: "2026-07-13",
    loginsThisMonth: 9,
  },
  {
    id: "ac2",
    client: "Radisson Blu",
    site: "Corniche",
    contact: "Mme Gueye",
    email: "duty.manager@radissonblu.sn",
    role: "consultation",
    status: "actif",
    lastLogin: "2026-07-12",
    loginsThisMonth: 6,
  },
  {
    id: "ac3",
    client: "Sonatel (Siège)",
    site: "Médina",
    contact: "M. Sy",
    email: "surete@sonatel.sn",
    role: "validation",
    status: "actif",
    lastLogin: "2026-07-11",
    loginsThisMonth: 12,
  },
  {
    id: "ac4",
    client: "King Fahd Palace",
    site: "Almadies",
    contact: "M. Ndour",
    email: "security@kingfahdpalace.sn",
    role: "consultation",
    status: "actif",
    lastLogin: "2026-07-09",
    loginsThisMonth: 4,
  },
  {
    id: "ac5",
    client: "Résidence Les Almadies",
    site: "Ngor",
    contact: "M. Diagne",
    email: "syndic@lesalmadies.sn",
    role: "consultation",
    status: "invite",
    lastLogin: null,
    loginsThisMonth: 0,
  },
  {
    id: "ac6",
    client: "Auchan Sea Plaza",
    site: "Corniche",
    contact: "Mme Faye",
    email: "surete@auchan.sn",
    role: "validation",
    status: "actif",
    lastLogin: "2026-07-10",
    loginsThisMonth: 7,
  },
  {
    id: "ac7",
    client: "Terrou-Bi",
    site: "Corniche Ouest",
    contact: "M. Mendy",
    email: "security@terroubi.sn",
    role: "consultation",
    status: "suspendu",
    lastLogin: "2026-05-28",
    loginsThisMonth: 0,
  },
  {
    id: "ac8",
    client: "Port Autonome de Dakar",
    site: "Môle 3",
    contact: "M. Ndour",
    email: "pcs@portdakar.sn",
    role: "validation",
    status: "invite",
    lastLogin: null,
    loginsThisMonth: 0,
  },
];

export function getClientAccess(): ClientAccess[] {
  return ACCESS;
}

export interface AccessStats {
  withAccess: number;
  pendingInvites: number;
  loginsThisMonth: number;
}

export function getAccessStats(): AccessStats {
  const withAccess = ACCESS.filter((a) => a.status === "actif").length;
  const pendingInvites = ACCESS.filter((a) => a.status === "invite").length;
  const loginsThisMonth = ACCESS.reduce((s, a) => s + a.loginsThisMonth, 0);
  return { withAccess, pendingInvites, loginsThisMonth };
}

export const ACCESS_STATUS_META: Record<
  AccessStatus,
  { label: string; variant: PillVariant }
> = {
  actif: { label: "Actif", variant: "success" },
  invite: { label: "Invité", variant: "warning" },
  suspendu: { label: "Suspendu", variant: "danger" },
};

export const ACCESS_ROLE_META: Record<AccessRole, string> = {
  consultation: "Consultation rapports",
  validation: "Validation présences",
};

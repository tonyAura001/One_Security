/**
 * Types transverses d'authentification (front).
 *
 * Le domaine métier (agents, sites, finance…) est typé dans
 * `@/lib/api/types`. Ici on ne garde que l'identité + le rôle, partagés par
 * la couche auth Supabase (DAL, Server Actions) et le store de session.
 *
 * ⚠️ Le rôle applicatif EST le `RoleId` du RBAC PilotePME (`@/lib/rbac`) —
 * les 10 profils d'entreprise de sécurité privée. C'est la source unique.
 */

import type { RoleId } from "@/lib/rbac";

/** Rôle applicatif = un des 10 profils RBAC (voir `@/lib/rbac`). */
export type Role = RoleId;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
}

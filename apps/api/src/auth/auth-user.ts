import type { RoleName } from '@prisma/client';

/**
 * Identité authentifiée, dérivée du JWT Supabase et attachée à `req.user`.
 * Le `role` PilotePME provient du claim `app_metadata.role` (positionné à la
 * création de l'utilisateur côté Supabase Auth).
 */
export interface AuthUser {
  /** UID Supabase (= `User.id`). */
  id: string;
  email: string;
  role: RoleName;
}

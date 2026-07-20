/**
 * Client des opérations d'administration des membres (route serveur sécurisée
 * `/api/admin/member`, qui utilise la clé service_role). Le cookie de session
 * est envoyé automatiquement (même origine) pour l'authentification.
 */

async function post(body: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/admin/member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Échec (${res.status})`);
  }
}

export interface InviteMemberInput {
  nom: string;
  email: string;
  password: string;
  roles: string[]; // RoleId (minuscule) ou RoleName — normalisé côté serveur
}
export async function inviteMember(i: InviteMemberInput): Promise<void> {
  await post({ action: "create", ...i });
}

export async function resetMemberPassword(id: string, password: string): Promise<void> {
  await post({ action: "reset_password", id, password });
}

export async function setMemberRoles(id: string, roles: string[]): Promise<void> {
  await post({ action: "set_roles", id, roles });
}

/** Bascule le rôle actif du membre courant (parmi ses rôles attribués). */
export async function switchActiveRole(role: string): Promise<void> {
  await post({ action: "switch_active_role", role });
}

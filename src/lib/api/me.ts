/**
 * Récupération des permissions de l'utilisateur connecté depuis le backend.
 * Utilisé en mode « connecté » (après login Supabase). En démo, les permissions
 * viennent du rôle (voir `useAccessSync`).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface MyPermissionsResponse {
  role: string;
  permissions: string[];
}

export async function fetchMyPermissions(
  accessToken: string,
): Promise<MyPermissionsResponse> {
  const res = await fetch(`${API_URL}/moi/permissions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`GET /moi/permissions → ${res.status}`);
  }
  return (await res.json()) as MyPermissionsResponse;
}

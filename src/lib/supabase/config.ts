/**
 * Configuration Supabase partagée (client navigateur, client serveur, proxy).
 *
 * Seule la clé **anon publique** transite ici : jamais la `service_role`.
 * Les deux variables sont `NEXT_PUBLIC_*` car le client navigateur en a besoin ;
 * elles sont publiques par conception (l'autorisation reste imposée côté
 * Supabase RLS + backend).
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase non configuré : renseigne NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir .env.example).",
    );
  }
  return { url, anonKey };
}

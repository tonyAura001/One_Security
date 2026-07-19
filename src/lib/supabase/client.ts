import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";
import type { Database } from "./database.types";

/**
 * Client Supabase pour les Composants Client.
 *
 * La session (access/refresh tokens) est lue depuis les cookies écrits par le
 * serveur et `proxy.ts` — pas de token en localStorage. Singleton mémoïsé pour
 * éviter de recréer un client à chaque appel (ex : intercepteur Axios).
 */
let browserClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const { url, anonKey } = supabaseEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/**
 * Client Supabase pour le serveur (Server Components, Server Actions, DAL).
 *
 * Lit/écrit la session dans les cookies de la requête via l'API `cookies()`
 * de Next 16 (asynchrone). Le pattern `getAll`/`setAll` est requis par
 * `@supabase/ssr` pour que le rafraîchissement des tokens soit persisté ;
 * l'écriture depuis un Server Component (lecture seule) lève une exception,
 * ignorée ici car `proxy.ts` se charge du refresh sur chaque requête.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component : les cookies sont en lecture
          // seule. Sans effet — le refresh est assuré par proxy.ts.
        }
      },
    },
  });
}

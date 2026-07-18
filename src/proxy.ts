import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase/config";

/**
 * Proxy (ex-« middleware », renommé dans Next.js 16).
 *
 * Rôle double :
 *  1. Rafraîchir la session Supabase à chaque requête (l'appel `getUser()`
 *     déclenche l'écriture des cookies mis à jour via `setAll`).
 *  2. Garde de routes « optimiste » : redirige les non-connectés vers /login
 *     et les connectés hors des écrans d'auth. La véritable autorité reste
 *     le backend (validation du JWT) + le DAL.
 *
 * Ne fait AUCun appel base de données ici (perf : s'exécute sur chaque route).
 */

// Routes accessibles sans session.
const PUBLIC_ROUTES = ["/login"];

function isPublic(path: string): boolean {
  return PUBLIC_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

export async function proxy(request: NextRequest) {
  // Tant que Supabase n'est pas configuré (clés absentes), on laisse passer :
  // le DAL renverra « non connecté » et /login restera accessible.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT : ne pas insérer de logique entre createServerClient et getUser
  // — cet appel rafraîchit le token et réécrit les cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Non connecté sur une route protégée → /login (en mémorisant la cible).
  if (!user && !isPublic(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Déjà connecté sur un écran d'auth → dashboard.
  if (user && isPublic(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Exécuté sur tout sauf les assets statiques et les routes internes Next.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};

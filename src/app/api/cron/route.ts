import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Tâches planifiées (Vercel Cron). Déclenché quotidiennement (voir vercel.json).
 *
 * Sécurité : Vercel envoie `Authorization: Bearer $CRON_SECRET` sur les appels
 * cron ; on le vérifie. Le traitement utilise la clé `service_role` (variable
 * d'env serveur, jamais exposée au navigateur) qui bypasse le RLS ; les RPC
 * `cron_*` ne sont exécutables QUE par service_role.
 *
 * Config requise côté Vercel (Production) :
 *   - CRON_SECRET               (secret partagé, généré par Vercel)
 *   - SUPABASE_SERVICE_ROLE_KEY (clé service_role du projet Supabase)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const secret = process.env.CRON_SECRET;
  if (!secret || h.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "cron non configuré (SUPABASE_SERVICE_ROLE_KEY manquant)" },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [tickets, factures] = await Promise.all([
    admin.rpc("cron_generer_tickets_preventifs"),
    admin.rpc("cron_flag_factures_retard"),
  ]);

  const errors = [tickets.error, factures.error]
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => e.message);

  return Response.json(
    {
      ranAt: new Date().toISOString(),
      ticketsPreventifsGeneres: tickets.data ?? null,
      facturesMarqueesRetard: factures.data ?? null,
      errors,
    },
    { status: errors.length ? 500 : 200 },
  );
}

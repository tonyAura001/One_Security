import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Opérations d'administration des membres (réservées au DG, sauf le changement
 * de son propre rôle actif). Utilise la clé service_role (env serveur) via
 * l'Auth Admin API — impossible depuis le navigateur.
 *
 * Config Vercel requise (Production) : SUPABASE_SERVICE_ROLE_KEY.
 *
 * Modèle multi-rôles : app_metadata.roles = liste des rôles attribués ;
 * app_metadata.role = rôle ACTIF (celui qui pilote le RLS et le menu). Un
 * membre peut basculer son rôle actif parmi ses rôles attribués.
 */
export const dynamic = "force-dynamic";

const ROLES = ["DG", "RP", "RF", "RH", "MANAGER", "CONTROLEUR", "SURVEILLANT", "JURISTE", "COMPTABLE", "AGENT"];

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeRoles(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [input];
  const up = arr.map((r) => String(r).toUpperCase()).filter((r) => ROLES.includes(r));
  return [...new Set(up)];
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "non authentifié" }, { status: 401 });

  const callerRole = String((user.app_metadata as Record<string, unknown>)?.role ?? "").toUpperCase();
  const callerRoles = normalizeRoles(
    (user.app_metadata as Record<string, unknown>)?.roles ?? [callerRole],
  );
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  const db = admin();
  if (!db) {
    return Response.json(
      { error: "Administration indisponible : SUPABASE_SERVICE_ROLE_KEY non configurée sur le serveur." },
      { status: 503 },
    );
  }

  // ── Basculer SON PROPRE rôle actif (parmi ses rôles attribués) ──────────
  if (action === "switch_active_role") {
    const target = String(body.role ?? "").toUpperCase();
    const owned = callerRoles.length ? callerRoles : [callerRole];
    if (!owned.includes(target)) {
      return Response.json({ error: "rôle non attribué" }, { status: 403 });
    }
    const { error } = await db.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, role: target, roles: owned },
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await db.from("User").update({ role: target, updatedAt: new Date().toISOString() } as never).eq("id", user.id);
    return Response.json({ ok: true, role: target });
  }

  // ── Les autres actions sont réservées au DG ─────────────────────────────
  if (callerRole !== "DG") {
    return Response.json({ error: "réservé au Directeur Général" }, { status: 403 });
  }

  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nomComplet = String(body.nom ?? "").trim();
    const roles = normalizeRoles(body.roles);
    if (!email || password.length < 8 || roles.length === 0 || !nomComplet) {
      return Response.json({ error: "champs requis : nom, e-mail, mot de passe (≥8), au moins un rôle" }, { status: 400 });
    }
    const parts = nomComplet.split(/\s+/);
    const prenom = parts[0];
    const nom = parts.slice(1).join(" ") || parts[0];
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: roles[0], roles },
      user_metadata: { name: nomComplet },
    });
    if (created.error) return Response.json({ error: created.error.message }, { status: 400 });
    const uid = created.data.user?.id;
    const { error: insErr } = await db.from("User").insert({
      id: uid,
      nom,
      prenom,
      email,
      role: roles[0],
      actif: true,
      dateEmbauche: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    } as never);
    if (insErr) {
      // Rollback du compte auth si le profil échoue.
      if (uid) await db.auth.admin.deleteUser(uid);
      return Response.json({ error: insErr.message }, { status: 400 });
    }
    return Response.json({ ok: true, id: uid });
  }

  if (action === "reset_password") {
    const id = String(body.id ?? "");
    const password = String(body.password ?? "");
    if (!id || password.length < 8) {
      return Response.json({ error: "mot de passe requis (≥8 caractères)" }, { status: 400 });
    }
    const { error } = await db.auth.admin.updateUserById(id, { password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }

  if (action === "set_roles") {
    const id = String(body.id ?? "");
    const roles = normalizeRoles(body.roles);
    if (!id || roles.length === 0) {
      return Response.json({ error: "au moins un rôle requis" }, { status: 400 });
    }
    const { error } = await db.auth.admin.updateUserById(id, {
      app_metadata: { role: roles[0], roles },
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    await db.from("User").update({ role: roles[0], updatedAt: new Date().toISOString() } as never).eq("id", id);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "action inconnue" }, { status: 400 });
}

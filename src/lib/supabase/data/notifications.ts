/**
 * Fil de notifications dérivé d'événements réels datés (réclamations récentes,
 * annonces, décisions). Chaque source est filtrée par la RLS de sa table.
 */
import { createClient } from "@/lib/supabase/client";

export type NotifTone = "info" | "success" | "warning" | "danger";

export interface Notification {
  id: string;
  title: string;
  detail: string;
  at: string;
  tone: NotifTone;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const [rec, contenu] = await Promise.all([
    supabase.from("Reclamation").select("id,objet,statut,createdAt").order("createdAt", { ascending: false }).limit(15),
    supabase.from("ContenuInterne").select("id,type,titre,createdAt").in("type", ["annonce", "decision"]).order("createdAt", { ascending: false }).limit(15),
  ]);

  const out: Notification[] = [];

  for (const r of (rec.data as { id: string; objet: string; statut: string; createdAt: string }[] | null) ?? []) {
    out.push({
      id: `rec-${r.id}`,
      title: r.statut === "resolue" ? "Réclamation résolue" : "Réclamation client",
      detail: r.objet,
      at: r.createdAt,
      tone: r.statut === "resolue" ? "success" : "warning",
    });
  }

  for (const c of (contenu.data as { id: string; type: string; titre: string; createdAt: string }[] | null) ?? []) {
    out.push({
      id: `ct-${c.id}`,
      title: c.type === "annonce" ? "Nouvelle annonce" : "Décision de direction",
      detail: c.titre,
      at: c.createdAt,
      tone: "info",
    });
  }

  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

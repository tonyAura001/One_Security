/**
 * Communications clients : journal des interactions (appel/email/réunion/visite/
 * note) + timeline UNIFIÉE agrégeant aussi ce qui est rattaché/planifié avec un
 * client (contrats, factures, devis, contacts). Table récente → client non typé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
const raison = (c: unknown): string =>
  (one(c as { raisonSociale?: string } | { raisonSociale?: string }[]) as { raisonSociale?: string } | undefined)?.raisonSociale ?? "—";

export type InteractionType = "appel" | "email" | "reunion" | "visite" | "note";
export type TimelineKind = InteractionType | "contrat" | "facture" | "devis" | "contact";
export const MANUAL_TYPES: InteractionType[] = ["appel", "email", "reunion", "visite", "note"];

export interface TimelineItem {
  id: string;
  clientId: string | null;
  clientName: string;
  kind: TimelineKind;
  date: string;
  title: string;
  detail: string;
}

const fmtFCFA = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\s/g, ".")} FCFA`;

/** Timeline unifiée : interactions saisies + événements liés au client. */
export async function fetchClientTimeline(): Promise<TimelineItem[]> {
  const sb = loose();
  const [inter, contacts, factures, contrats, devis] = await Promise.all([
    sb.from("InteractionClient").select("id,clientId,type,dateHeure,resume,Client(raisonSociale)").order("dateHeure", { ascending: false }).limit(300),
    sb.from("Contact").select("id,clientId,prenom,nom,roleContact,createdAt,Client(raisonSociale)").order("createdAt", { ascending: false }).limit(200),
    sb.from("Facture").select("id,clientId,numero,montantTTC,statut,dateEmission,Client(raisonSociale)").order("dateEmission", { ascending: false }).limit(200),
    sb.from("Contrat").select("id,clientId,numero,type,montantHT,dateDebut,Client(raisonSociale)").order("dateDebut", { ascending: false }).limit(200),
    sb.from("Devis").select("id,clientId,numero,totalTTC,dateEnvoi,createdAt,Client(raisonSociale)").not("clientId", "is", null).order("createdAt", { ascending: false }).limit(200),
  ]);

  const out: TimelineItem[] = [];

  for (const r of (inter.data as Record<string, unknown>[]) ?? []) {
    out.push({
      id: `int-${r.id}`, clientId: (r.clientId as string) ?? null, clientName: raison(r.Client),
      kind: (r.type as InteractionType) ?? "note", date: String(r.dateHeure),
      title: { appel: "Appel", email: "E-mail", reunion: "Réunion", visite: "Visite", note: "Note" }[(r.type as InteractionType) ?? "note"],
      detail: (r.resume as string) || "—",
    });
  }
  for (const r of (contacts.data as Record<string, unknown>[]) ?? []) {
    out.push({
      id: `con-${r.id}`, clientId: (r.clientId as string) ?? null, clientName: raison(r.Client),
      kind: "contact", date: String(r.createdAt),
      title: "Contact ajouté", detail: `${r.prenom ?? ""} ${r.nom ?? ""}`.trim() + (r.roleContact ? ` · ${r.roleContact}` : ""),
    });
  }
  for (const r of (factures.data as Record<string, unknown>[]) ?? []) {
    out.push({
      id: `fac-${r.id}`, clientId: (r.clientId as string) ?? null, clientName: raison(r.Client),
      kind: "facture", date: String(r.dateEmission),
      title: `Facture ${r.numero ?? ""}`.trim(), detail: `${fmtFCFA(Number(r.montantTTC))} · ${r.statut ?? ""}`,
    });
  }
  for (const r of (contrats.data as Record<string, unknown>[]) ?? []) {
    out.push({
      id: `ctr-${r.id}`, clientId: (r.clientId as string) ?? null, clientName: raison(r.Client),
      kind: "contrat", date: String(r.dateDebut ?? ""),
      title: `Contrat ${r.numero ?? ""}`.trim(), detail: `${r.type ?? ""} · ${fmtFCFA(Number(r.montantHT))}/mois`,
    });
  }
  for (const r of (devis.data as Record<string, unknown>[]) ?? []) {
    out.push({
      id: `dev-${r.id}`, clientId: (r.clientId as string) ?? null, clientName: raison(r.Client),
      kind: "devis", date: String(r.dateEnvoi ?? r.createdAt ?? ""),
      title: `Devis ${r.numero ?? ""}`.trim(), detail: fmtFCFA(Number(r.totalTTC)),
    });
  }

  return out
    .filter((x) => x.date && x.date !== "null")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface NewInteractionInput {
  clientId: string;
  type: InteractionType;
  dateHeure: string; // ISO
  resume?: string;
  notes?: string;
}

/** Enregistre une interaction client. RLS commerce. */
export async function createInteraction(i: NewInteractionInput): Promise<void> {
  const sb = loose();
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb
    .from("InteractionClient")
    .insert({
      clientId: i.clientId,
      type: i.type,
      dateHeure: i.dateHeure,
      resume: i.resume?.trim() || null,
      notes: i.notes?.trim() || null,
      auteurId: auth.user?.id ?? null,
    })
    .select("id");
  if (error) throw error;
  if (!data || (data as unknown[]).length === 0)
    throw new Error("row-level security: enregistrement refusé (accès commerce).");
}

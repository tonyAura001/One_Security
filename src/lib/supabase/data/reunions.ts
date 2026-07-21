/**
 * Réunions (table `Reunion` + `ReunionParticipant`). Visibilité RLS : une
 * réunion n'est lue que par son organisateur et ses participants — les autres
 * ne la voient pas. Table récente (hors types générés) → client non typé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}

export interface ReunionParticipantUI {
  id: string;
  name: string;
}
export interface Reunion {
  id: string;
  titre: string;
  dateHeure: string;
  dureeMin: number;
  lieu: string | null;
  mode: string;
  ordreDuJour: string | null;
  compteRendu: string | null;
  organisateur: string;
  participants: ReunionParticipantUI[];
}

interface DbPerson { prenom: string; nom: string | null }
interface DbReunion {
  id: string;
  titre: string;
  dateHeure: string;
  dureeMin: number | string;
  lieu: string | null;
  mode: string;
  ordreDuJour: string | null;
  compteRendu: string | null;
  organisateur: DbPerson | DbPerson[] | null;
  ReunionParticipant: { userId: string; User: DbPerson | DbPerson[] | null }[] | null;
}
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
const fullName = (p?: DbPerson) => (p ? `${p.prenom} ${p.nom ?? ""}`.trim() : "—");

/** Réunions visibles par l'utilisateur (organisateur ou participant). RLS. */
export async function fetchReunions(): Promise<Reunion[]> {
  const sb = loose();
  const { data, error } = await sb
    .from("Reunion")
    .select(
      "id,titre,dateHeure,dureeMin,lieu,mode,ordreDuJour,compteRendu,organisateur:User!organisateurId(prenom,nom),ReunionParticipant(userId,User(prenom,nom))",
    )
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return ((data as DbReunion[]) ?? []).map((r) => ({
    id: r.id,
    titre: r.titre,
    dateHeure: r.dateHeure,
    dureeMin: Number(r.dureeMin) || 60,
    lieu: r.lieu,
    mode: r.mode,
    ordreDuJour: r.ordreDuJour,
    compteRendu: r.compteRendu,
    organisateur: fullName(one(r.organisateur)),
    participants: (r.ReunionParticipant ?? []).map((p) => ({ id: p.userId, name: fullName(one(p.User)) })),
  }));
}

export interface NewReunionInput {
  titre: string;
  dateHeure: string; // ISO
  dureeMin: number;
  lieu?: string;
  mode: string; // presentiel|visio
  ordreDuJour?: string;
  participantIds: string[];
}

/** Crée une réunion + rattache ses participants (seuls eux la verront). */
export async function createReunion(i: NewReunionInput): Promise<void> {
  const sb = loose();
  const { data: auth } = await sb.auth.getUser();
  const organisateurId = auth.user?.id;
  if (!organisateurId) throw new Error("Session expirée.");

  const { data, error } = await sb
    .from("Reunion")
    .insert({
      titre: i.titre.trim(),
      dateHeure: i.dateHeure,
      dureeMin: Math.max(15, Math.round(i.dureeMin)),
      lieu: i.lieu?.trim() || null,
      mode: i.mode,
      ordreDuJour: i.ordreDuJour?.trim() || null,
      organisateurId,
    })
    .select("id");
  if (error) throw error;
  const reunionId = (data as { id: string }[] | null)?.[0]?.id;
  if (!reunionId) throw new Error("row-level security: création refusée.");

  // L'organisateur est aussi participant (il voit toujours sa réunion).
  const ids = Array.from(new Set([organisateurId, ...i.participantIds]));
  const rows = ids.map((userId) => ({ reunionId, userId }));
  const { error: pErr } = await sb.from("ReunionParticipant").insert(rows);
  if (pErr) throw pErr;
}

/** Met à jour une réunion (ex. compte-rendu). RLS : organisateur ou DG. */
export async function updateReunion(
  id: string,
  patch: { compteRendu?: string; ordreDuJour?: string },
): Promise<void> {
  const sb = loose();
  const { error } = await sb
    .from("Reunion")
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Supprime une réunion. RLS : organisateur ou DG. */
export async function deleteReunion(id: string): Promise<void> {
  const sb = loose();
  const { error } = await sb.from("Reunion").delete().eq("id", id);
  if (error) throw error;
}

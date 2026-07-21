/**
 * Tâches partagées via Supabase (RLS : mes tâches assignées/créées + managers
 * voient tout). Mappé sur le type UI Task.
 */
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/api/types";

interface DbUser { prenom: string; nom: string }
interface DbTache {
  id: string; titre: string; priorite: string; echeance: string | null;
  terminee: boolean; statut: string | null; assigneA: DbUser | DbUser[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
function mapTask(t: DbTache): Task {
  const a = one(t.assigneA);
  const status = (t.statut as TaskStatus) ?? (t.terminee ? "termine" : "a_faire");
  return {
    id: t.id,
    title: t.titre,
    owner: a ? `${a.prenom} ${a.nom}` : "—",
    due: t.echeance ?? "",
    priority: t.priorite as Task["priority"],
    done: t.terminee,
    status,
  };
}
export async function fetchTaches(): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Tache")
    .select("id,titre,priorite,echeance,terminee,statut,assigneA:User!assigneAId(prenom,nom)")
    .order("echeance");
  if (error) throw error;
  return (data as unknown as DbTache[]).map(mapTask);
}

/** Change l'étape kanban d'une tâche (et synchronise `terminee`). RLS tache_write. */
export async function updateTacheStatut(id: string, statut: TaskStatus): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Tache")
    .update({ statut, terminee: statut === "termine" } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: modification refusée.");
}
export interface NewTacheInput {
  titre: string;
  description?: string;
  priorite: string; // haute | moyenne | basse
  echeance?: string | null;
  assigneAId?: string | null;
}

/** Crée une tâche (RLS tache_write). Le créateur = utilisateur courant. */
export async function createTache(i: NewTacheInput): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const creeParId = auth.user?.id ?? null;
  const { data, error } = await supabase
    .from("Tache")
    .insert({
      titre: i.titre.trim(),
      description: i.description?.trim() || null,
      priorite: i.priorite,
      echeance: i.echeance || null,
      assigneAId: i.assigneAId || null,
      creeParId,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export async function toggleTacheDone(id: string, done: boolean): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Tache").update({ terminee: done }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

/**
 * Fil de commentaires polymorphe (`Commentaire`, entité + idEntité). Lecture
 * via le RPC SECURITY DEFINER `commentaires_for` (nom d'auteur calculé sans
 * exposer la table User) ; écriture directe (RLS : auteur = auth.uid()).
 */
import { createClient } from "@/lib/supabase/client";

export type EntiteCommentaire =
  | "PROSPECT" | "CLIENT" | "CONTRAT" | "FACTURE" | "DEVIS"
  | "SITE" | "INCIDENT" | "TACHE" | "PROJET";

export interface Commentaire {
  id: string;
  contenu: string;
  date: string; // ISO
  auteur: string;
  auteurId: string;
  mine: boolean;
}

interface RpcRow {
  id: string;
  contenu: string;
  datePublication: string;
  auteurId: string;
  auteur: string;
}
type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchCommentaires(
  entite: EntiteCommentaire,
  idEntite: string,
): Promise<Commentaire[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;
  const { data, error } = await (supabase.rpc as unknown as RpcCaller)("commentaires_for", {
    _entite: entite,
    _id: idEntite,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as RpcRow[]).map((r) => ({
    id: r.id,
    contenu: r.contenu,
    date: r.datePublication,
    auteur: r.auteur,
    auteurId: r.auteurId,
    mine: r.auteurId === meId,
  }));
}

/** Publie un commentaire (RLS Commentaire_insert : auteur = utilisateur courant). */
export async function addCommentaire(
  entite: EntiteCommentaire,
  idEntite: string,
  contenu: string,
): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const { data, error } = await supabase
    .from("Commentaire")
    .insert({ contenu: contenu.trim(), entite, idEntite, auteurId: auth.user.id } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: publication refusée.");
}

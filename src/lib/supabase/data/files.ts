/**
 * Fichiers via Supabase Storage (bucket privé `pilotepme-files`) + métadonnées
 * dans la table `Fichier`. L'accès est gâté par les policies storage.objects
 * (par dossier + rôle) ; la visualisation passe par des URLs signées courtes.
 */
import { createClient } from "@/lib/supabase/client";

const BUCKET = "pilotepme-files";

export interface FichierMeta {
  id: string;
  nom: string;
  chemin: string;
  mimeType: string | null;
  taille: number | null;
  createdAt: string;
}

/** Upload d'un fichier lié à une candidature + enregistrement des métadonnées. */
export async function uploadCandidatureFile(
  candidatureId: string,
  file: File,
): Promise<void> {
  const supabase = createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `candidatures/${candidatureId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  const meta = await supabase.from("Fichier").insert({
    nom: file.name,
    bucket: BUCKET,
    chemin: path,
    mimeType: file.type || null,
    taille: file.size,
    candidatureId,
  });
  if (meta.error) {
    // Rollback du binaire si l'insert des métadonnées échoue (RLS, etc.).
    await supabase.storage.from(BUCKET).remove([path]);
    throw meta.error;
  }
}

/** Métadonnées des fichiers d'une candidature (selon RLS Fichier). */
export async function fetchCandidatureFiles(
  candidatureId: string,
): Promise<FichierMeta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Fichier")
    .select("id,nom,chemin,mimeType,taille,createdAt")
    .eq("candidatureId", candidatureId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as unknown as FichierMeta[];
}

/** Upload/remplacement de la photo d'un agent + enregistrement du chemin. */
export async function uploadAgentPhoto(
  agentId: string,
  file: File,
): Promise<void> {
  const supabase = createClient();
  const path = `agents/${agentId}/photo`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from("AgentSecurite")
    .update({ photoPath: path })
    .eq("id", agentId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("row-level security: accès refusé");
  }
}

// ── Pièces jointes génériques (polymorphes : entite + idEntite) ──────────

export type FichierEntite =
  | "PROJET"
  | "TACHE"
  | "TICKET"
  | "INTERVENTION"
  | "CLIENT"
  | "SITE"
  | "DOCUMENT";

/** Upload d'une pièce jointe liée à n'importe quelle entité métier. */
export async function uploadAttachment(
  entite: FichierEntite,
  idEntite: string,
  file: File,
): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `attachments/${entite}/${idEntite}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  const meta = await supabase.from("Fichier").insert({
    nom: file.name,
    bucket: BUCKET,
    chemin: path,
    mimeType: file.type || null,
    taille: file.size,
    entite,
    idEntite,
    uploadedById: auth.user.id,
  } as never);
  if (meta.error) {
    // Rollback du binaire si l'insert des métadonnées échoue (RLS, etc.).
    await supabase.storage.from(BUCKET).remove([path]);
    throw meta.error;
  }
}

/** Métadonnées des pièces jointes d'une entité (selon RLS Fichier). */
export async function fetchAttachments(
  entite: FichierEntite,
  idEntite: string,
): Promise<FichierMeta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Fichier")
    .select("id,nom,chemin,mimeType,taille,createdAt")
    .eq("entite" as never, entite as never)
    .eq("idEntite" as never, idEntite as never)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as unknown as FichierMeta[];
}

/** Supprime une pièce jointe (binaire storage + métadonnées). */
export async function deleteAttachment(id: string, chemin: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([chemin]);
  const { error } = await supabase.from("Fichier").delete().eq("id", id);
  if (error) throw error;
}

/** URL signée (60 s) pour visualiser/télécharger un fichier privé. */
export async function getSignedUrl(chemin: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(chemin, 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Supprime un fichier (binaire storage + métadonnées). */
export async function deleteCandidatureFile(
  id: string,
  chemin: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([chemin]);
  const { error } = await supabase.from("Fichier").delete().eq("id", id);
  if (error) throw error;
}

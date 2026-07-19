/**
 * Module Documents via Supabase (RLS document_* : DG/RP/RF/RH/COMPTABLE/MANAGER).
 * Le contenu structuré est stocké en JSON (`donnees`).
 */
import { createClient } from "@/lib/supabase/client";
import type {
  DocRecord,
  DocumentData,
  DocumentType,
} from "@/lib/documents/types";

interface DbDoc {
  id: string;
  type: string;
  numero: string | null;
  titre: string;
  statut: string;
  donnees: DocumentData;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
}

function map(d: DbDoc): DocRecord {
  return {
    id: d.id,
    type: d.type as DocumentType,
    numero: d.numero,
    titre: d.titre,
    statut: d.statut,
    donnees: d.donnees ?? {},
    clientId: d.clientId,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function fetchDocuments(): Promise<DocRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Document")
    .select("id,type,numero,titre,statut,donnees,clientId,createdAt,updatedAt")
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbDoc[]).map(map);
}

export async function fetchDocument(id: string): Promise<DocRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Document")
    .select("id,type,numero,titre,statut,donnees,clientId,createdAt,updatedAt")
    .eq("id", id)
    .single();
  if (error) throw error;
  return map(data as unknown as DbDoc);
}

export interface NewDocumentInput {
  type: DocumentType;
  titre: string;
  numero?: string | null;
  donnees: DocumentData;
  clientId?: string | null;
}

export async function createDocument(i: NewDocumentInput): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("Document")
    .insert({
      type: i.type,
      titre: i.titre.trim(),
      numero: i.numero || null,
      donnees: i.donnees,
      clientId: i.clientId || null,
      creeParId: auth.user?.id ?? null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
  return (data as unknown as { id: string }[])[0].id;
}

export async function updateDocument(
  id: string,
  patch: {
    titre?: string;
    numero?: string | null;
    statut?: string;
    donnees?: DocumentData;
  },
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Document")
    .update({ ...patch, updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: mise à jour refusée (accès écriture).");
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("Document").delete().eq("id", id);
  if (error) throw error;
}

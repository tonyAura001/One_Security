/**
 * Module Documents via Supabase (RLS document_* : DG/RP/RF/RH/COMPTABLE/MANAGER).
 * Le contenu structuré est stocké en JSON (`donnees`).
 */
import { createClient } from "@/lib/supabase/client";
import type {
  DocRecord,
  DocVisibility,
  DocumentData,
  DocumentType,
} from "@/lib/documents/types";

const DOC_COLS = "id,type,numero,titre,statut,donnees,clientId,visibility,createdAt,updatedAt";

interface DbDoc {
  id: string;
  type: string;
  numero: string | null;
  titre: string;
  statut: string;
  donnees: DocumentData;
  clientId: string | null;
  visibility: string | null;
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
    visibility: (d.visibility as DocVisibility) ?? "Tous",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * Récupère les données du proforma archivé pour un numéro de facture donné
 * (le plus récent), afin de restaurer les lignes dans l'éditeur. Best-effort :
 * renvoie null si aucun document ou si l'accès est refusé.
 */
export async function fetchFactureProforma(
  numero: string,
): Promise<DocumentData | null> {
  if (!numero) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Document")
    .select("donnees")
    .eq("type", "facture_proforma")
    .eq("numero", numero)
    .order("updatedAt", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return (data[0] as { donnees: DocumentData }).donnees ?? null;
}

export async function fetchDocuments(): Promise<DocRecord[]> {
  const supabase = createClient();
  // Le RLS filtre déjà selon la visibilité : les documents non autorisés
  // n'apparaissent tout simplement pas dans la liste.
  const { data, error } = await supabase
    .from("Document")
    .select(DOC_COLS)
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbDoc[]).map(map);
}

export async function fetchDocument(id: string): Promise<DocRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Document")
    .select(DOC_COLS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return map(data as unknown as DbDoc);
}

// ── Permissions (FGAC) ───────────────────────────────────────────────────

export interface DocumentPermissions {
  visibility: DocVisibility;
  roles: string[]; // RoleName (majuscule)
  users: string[];
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchDocumentPermissions(id: string): Promise<DocumentPermissions> {
  const supabase = createClient();
  const [doc, roles, users] = await Promise.all([
    supabase.from("Document").select("visibility").eq("id", id).maybeSingle(),
    supabase.from("DocumentRole").select("role").eq("documentId", id),
    supabase.from("DocumentUser").select("userId").eq("documentId", id),
  ]);
  return {
    visibility: ((doc.data as { visibility?: string } | null)?.visibility as DocVisibility) ?? "Tous",
    roles: ((roles.data as { role: string }[] | null) ?? []).map((r) => r.role),
    users: ((users.data as { userId: string }[] | null) ?? []).map((u) => u.userId),
  };
}

/** Règle la visibilité + rôles/utilisateurs autorisés (RPC DG-only, atomique + audit). */
export async function setDocumentPermissions(
  id: string,
  visibility: DocVisibility,
  roles: string[],
  users: string[] = [],
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.rpc as unknown as RpcCaller)("set_document_permissions", {
    _doc: id,
    _visibility: visibility,
    _roles: roles,
    _users: users,
  });
  if (error) throw new Error(error.message);
}

/** Journalise une ouverture / un refus d'accès (RPC). Best-effort. */
export async function logDocumentAccess(
  id: string,
  action: "open" | "denied",
  allowed: boolean,
): Promise<void> {
  const supabase = createClient();
  await (supabase.rpc as unknown as RpcCaller)("log_document_access", {
    _doc: id,
    _action: action,
    _allowed: allowed,
  }).catch(() => {});
}

export interface AccessLogRow {
  id: string;
  documentId: string | null;
  action: string;
  allowed: boolean;
  detail: string | null;
  createdAt: string;
}
/** Journal d'accès aux documents (RLS : DG uniquement). */
export async function fetchDocumentAccessLog(limit = 100): Promise<AccessLogRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("DocumentAccessLog")
    .select("id,documentId,action,allowed,detail,createdAt")
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as AccessLogRow[]) ?? [];
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

// ── Versionnage (J4.1) ───────────────────────────────────────────────────

export interface DocVersion {
  id: string;
  version: number;
  titre: string | null;
  statut: string | null;
  donnees: DocumentData;
  createdAt: string;
}

interface DbVersion {
  id: string;
  version: number;
  titre: string | null;
  statut: string | null;
  donnees: DocumentData;
  createdAt: string;
}

/** Instantanés d'un document (du plus récent au plus ancien). */
export async function fetchVersions(documentId: string): Promise<DocVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("DocumentVersion")
    .select("id,version,titre,statut,donnees,createdAt")
    .eq("documentId", documentId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbVersion[]) ?? [];
}

/**
 * Crée un instantané du document courant (numéro de version = max + 1).
 * À appeler après un enregistrement réussi.
 */
export async function snapshotDocument(
  documentId: string,
  snap: { titre: string; statut: string; donnees: DocumentData },
): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: last } = await supabase
    .from("DocumentVersion")
    .select("version")
    .eq("documentId", documentId)
    .order("version", { ascending: false })
    .limit(1);
  const next = ((last as { version: number }[] | null)?.[0]?.version ?? 0) + 1;
  const { error } = await supabase.from("DocumentVersion").insert({
    documentId,
    version: next,
    titre: snap.titre,
    statut: snap.statut,
    donnees: snap.donnees,
    creeParId: auth.user?.id ?? null,
  } as never);
  if (error) throw error;
}

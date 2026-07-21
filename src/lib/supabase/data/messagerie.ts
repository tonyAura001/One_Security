/**
 * Messagerie unifiée (Supabase). Modèle : `Canal` (type = 'canal' groupe |
 * 'direct' DM 1-1) + membres (`_CanalMembres`) + `Message`. RLS scopé aux
 * membres. La liste des conversations passe par le RPC `my_conversations`
 * (SECURITY DEFINER) qui calcule le nom d'affichage sans exposer la table User.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ChatLine, MessagePiece } from "@/lib/api/messagerie";

export { getSignedUrl } from "@/lib/supabase/data/files";

const BUCKET = "pilotepme-files";
/** Limites de taille des pièces jointes. */
export const MAX_IMAGE = 8 * 1024 * 1024; // 8 Mo
export const MAX_VIDEO = 30 * 1024 * 1024; // 30 Mo (vidéo « pas trop lourde »)
export const MAX_FILE = 15 * 1024 * 1024; // 15 Mo

function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

interface RpcConv {
  id: string;
  type: string;
  nom: string | null;
  partner: string | null;
  description: string | null;
}
interface DbMessage {
  canalId: string;
  contenu: string | null;
  auteurId: string;
  createdAt: string;
  pieceChemin: string | null;
  pieceType: string | null;
  pieceNom: string | null;
  pieceTaille: number | null;
}

// Le client typé ne connaît pas les RPC custom : appel via cast.
type RpcCaller = (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;

  const [convRes, msgRes] = await Promise.all([
    (supabase.rpc as unknown as RpcCaller)("my_conversations"),
    loose().from("Message").select("canalId,contenu,auteurId,createdAt,pieceChemin,pieceType,pieceNom,pieceTaille"),
  ]);
  if (convRes.error) throw new Error(convRes.error.message);
  if (msgRes.error) throw msgRes.error;

  const convs = (convRes.data ?? []) as RpcConv[];
  const msgs = (msgRes.data ?? []) as unknown as DbMessage[];

  const byCanal = new Map<string, DbMessage[]>();
  for (const m of msgs) {
    const l = byCanal.get(m.canalId) ?? [];
    l.push(m);
    byCanal.set(m.canalId, l);
  }

  return convs.map((c): Conversation => {
    const messages: ChatLine[] = (byCanal.get(c.id) ?? [])
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => {
        const piece: MessagePiece | undefined = m.pieceChemin
          ? { chemin: m.pieceChemin, type: m.pieceType ?? "", nom: m.pieceNom ?? "fichier", taille: m.pieceTaille ?? 0 }
          : undefined;
        return {
          from: m.auteurId === meId ? "me" : "them",
          text: m.contenu ?? "",
          time: new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          createdAt: m.createdAt,
          piece,
        };
      });
    const name =
      c.type === "direct" ? (c.partner ?? "Conversation") : (c.nom ?? "Canal");
    const subtitle = c.type === "direct" ? "Message direct" : (c.description ?? "");
    return { id: c.id, name, subtitle, initials: initials(name), unread: 0, messages };
  });
}

/** Crée un canal de groupe (RLS canal_insert : DG/RP/RH/MANAGER). */
export async function createCanal(nom: string, description?: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Canal")
    .insert({ nom: nom.trim(), description: description?.trim() || null } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Crée (ou retrouve) une conversation directe avec un autre utilisateur (RPC). */
export async function createDirectConversation(otherUserId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  )("create_direct_conversation", { other_user: otherUserId });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Envoie un message texte et/ou avec pièce jointe. */
export async function sendMessage(
  canalId: string,
  text: string,
  piece?: MessagePiece,
): Promise<void> {
  const supabase = loose();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const { error } = await supabase.from("Message").insert({
    contenu: text || null,
    canalId,
    auteurId: auth.user.id,
    pieceChemin: piece?.chemin ?? null,
    pieceType: piece?.type ?? null,
    pieceNom: piece?.nom ?? null,
    pieceTaille: piece?.taille ?? null,
  });
  if (error) throw error;
}

/** Téléverse une pièce jointe (photo/vidéo/document) dans le bucket, avec limites. */
export async function uploadMessageAttachment(file: File): Promise<MessagePiece> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const max = isImage ? MAX_IMAGE : isVideo ? MAX_VIDEO : MAX_FILE;
  if (file.size > max) {
    const mo = Math.round((max / (1024 * 1024)) * 10) / 10;
    throw new Error(`Fichier trop lourd (max ${mo} Mo pour ${isImage ? "une image" : isVideo ? "une vidéo" : "un document"}).`);
  }
  const supabase = createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const chemin = `messagerie/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(chemin, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  return { chemin, type: file.type || "application/octet-stream", nom: file.name, taille: file.size };
}

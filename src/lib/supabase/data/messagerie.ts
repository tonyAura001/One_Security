/**
 * Messagerie unifiée (Supabase). Modèle : `Canal` (type = 'canal' groupe |
 * 'direct' DM 1-1) + membres (`_CanalMembres`) + `Message`. RLS scopé aux
 * membres. La liste des conversations passe par le RPC `my_conversations`
 * (SECURITY DEFINER) qui calcule le nom d'affichage sans exposer la table User.
 */
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ChatLine } from "@/lib/api/messagerie";

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
  contenu: string;
  auteurId: string;
  createdAt: string;
}

// Le client typé ne connaît pas les RPC custom : appel via cast.
type RpcCaller = (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;

  const [convRes, msgRes] = await Promise.all([
    (supabase.rpc as unknown as RpcCaller)("my_conversations"),
    supabase.from("Message").select("canalId,contenu,auteurId,createdAt"),
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
      .map((m) => ({
        from: m.auteurId === meId ? "me" : "them",
        text: m.contenu,
        time: new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }));
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

export async function sendMessage(canalId: string, text: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const { error } = await supabase
    .from("Message")
    .insert({ contenu: text, canalId, auteurId: auth.user.id } as never);
  if (error) throw error;
}

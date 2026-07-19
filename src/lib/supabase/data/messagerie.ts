/** Messagerie interne (Canal + Message) via Supabase. */
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ChatLine } from "@/lib/api/messagerie";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
interface DbMessage { contenu: string; auteurId: string; createdAt: string }
interface DbCanal { id: string; nom: string; description: string | null; Message: DbMessage[] }

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;
  const { data, error } = await supabase.from("Canal")
    .select("id,nom,description,Message(contenu,auteurId,createdAt)").order("nom");
  if (error) throw error;
  return (data as unknown as DbCanal[]).map((c) => {
    const messages: ChatLine[] = [...c.Message]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({
        from: m.auteurId === meId ? "me" : "them",
        text: m.contenu,
        time: new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }));
    return { id: c.id, name: c.nom, subtitle: c.description ?? "", initials: initials(c.nom), unread: 0, messages };
  });
}
/** Crée un canal de discussion (RLS canal_insert : DG/RP/RH/MANAGER). */
export async function createCanal(
  nom: string,
  description?: string,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Canal")
    .insert({ nom: nom.trim(), description: description?.trim() || null } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export async function sendMessage(canalId: string, text: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const { error } = await supabase.from("Message").insert({ contenu: text, canalId, auteurId: auth.user.id });
  if (error) throw error;
}

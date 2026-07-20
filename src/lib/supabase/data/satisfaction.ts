/** Audits de satisfaction par site. RLS : lecture DG/RP/MANAGER/RF, écriture DG/RP/MANAGER. */
import { createClient } from "@/lib/supabase/client";

export interface SiteAudit {
  id: string;
  site: string;
  auditeur: string | null;
  score: number;
  date: string;
  commentaire: string | null;
}

interface DbAudit {
  id: string;
  auditeur: string | null;
  score: number;
  date: string;
  commentaire: string | null;
  Site: { nom: string } | { nom: string }[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export async function fetchAudits(): Promise<SiteAudit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("SiteAudit")
    .select("id,auditeur,score,date,commentaire,Site(nom)")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbAudit[]).map((a) => ({
    id: a.id,
    site: one(a.Site)?.nom ?? "—",
    auditeur: a.auditeur,
    score: a.score,
    date: a.date,
    commentaire: a.commentaire,
  }));
}

export interface NewAuditInput {
  siteId?: string | null;
  auditeur?: string;
  score: number;
  commentaire?: string;
  date?: string | null;
}
export async function createAudit(i: NewAuditInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("SiteAudit")
    .insert({
      siteId: i.siteId || null,
      auditeur: i.auditeur?.trim() || null,
      score: Math.max(0, Math.min(100, Math.round(i.score))),
      commentaire: i.commentaire?.trim() || null,
      date: i.date || new Date().toISOString().slice(0, 10),
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: création refusée (DG/RP/Manager).");
}

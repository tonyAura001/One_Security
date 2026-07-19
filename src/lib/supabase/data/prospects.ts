/**
 * Accès données « prospects » via Supabase (PostgREST), sécurisé par RLS
 * (`prospects_read_commerce` : DG/RP/MANAGER ; écriture DG/RP). Le pipeline
 * (stage) est persisté : glisser une carte met à jour la colonne `stage`.
 */
import { createClient } from "@/lib/supabase/client";
import type {
  Prospect,
  PipelineStage,
  ProspectStats,
} from "@/lib/api/prospects";

const OPEN: PipelineStage[] = ["nouveau", "qualifie", "devis", "negociation"];

interface DbProspect {
  id: string;
  raisonSociale: string;
  stage: string;
  besoin: string | null;
  owner: string | null;
  ownerInitials: string | null;
  chiffreAffairesPotentiel: number | string | null;
}

function mapProspect(r: DbProspect): Prospect {
  return {
    id: r.id,
    company: r.raisonSociale,
    need: r.besoin ?? "—",
    estimatedMonthly: Number(r.chiffreAffairesPotentiel) || 0,
    owner: r.owner ?? "—",
    ownerInitials: r.ownerInitials ?? "—",
    nextFollowUp: "", // pas encore modélisé en base
    stage: r.stage as PipelineStage,
  };
}

/** KPIs du pipeline dérivés de la liste (remplace getProspectStats mock). */
export function computeProspectStats(prospects: Prospect[]): ProspectStats {
  const open = prospects.filter((p) => OPEN.includes(p.stage));
  const closed = prospects.filter(
    (p) => p.stage === "gagne" || p.stage === "perdu",
  );
  const won = prospects.filter((p) => p.stage === "gagne").length;
  return {
    inPipeline: open.length,
    pipelineValue: open.reduce((s, p) => s + p.estimatedMonthly, 0),
    conversionRate: closed.length ? Math.round((won / closed.length) * 100) : 0,
    toFollowUp: prospects.filter((p) => p.stage === "negociation").length,
  };
}

/** Prospects visibles par l'utilisateur courant (selon RLS). */
export async function fetchProspects(): Promise<Prospect[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Prospect")
    .select(
      "id,raisonSociale,stage,besoin,owner,ownerInitials,chiffreAffairesPotentiel",
    )
    .order("raisonSociale");
  if (error) throw error;
  return (data as unknown as DbProspect[]).map(mapProspect);
}

export interface NewProspectInput {
  raisonSociale: string;
  besoin?: string;
  chiffreAffairesPotentiel?: number;
  owner?: string;
  stage: PipelineStage;
}

/** Crée un prospect (RLS insert : DG/RP/MANAGER). */
export async function createProspect(i: NewProspectInput): Promise<void> {
  const supabase = createClient();
  const ownerInitials = i.owner
    ? i.owner
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : null;
  const { data, error } = await supabase
    .from("Prospect")
    .insert({
      raisonSociale: i.raisonSociale.trim(),
      besoin: i.besoin?.trim() || null,
      chiffreAffairesPotentiel: i.chiffreAffairesPotentiel ?? null,
      owner: i.owner?.trim() || null,
      ownerInitials,
      stage: i.stage,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Persiste le changement de stage (drag & drop du kanban). RLS : DG/RP. */
export async function updateProspectStage(
  id: string,
  stage: PipelineStage,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("Prospect").update({ stage }).eq("id", id);
  if (error) throw error;
}

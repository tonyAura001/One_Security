/**
 * Contrats de travail + onboarding (RH). RLS : DG / RH / MANAGER.
 */
import { createClient } from "@/lib/supabase/client";

export type ContractType = "CDI" | "CDD";
export type ContractStatus = "brouillon" | "attente" | "signe";

export interface ContratTravail {
  id: string;
  ref: string;
  employe: string;
  poste: string | null;
  type: ContractType;
  site: string | null;
  salaire: number;
  dateDebut: string | null;
  dateFin: string | null;
  corps: string | null;
  statut: ContractStatus;
}

export async function fetchContratsTravail(): Promise<ContratTravail[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ContratTravail")
    .select("id,ref,employe,poste,type,site,salaire,dateDebut,dateFin,corps,statut")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as ContratTravail[]) ?? [];
}

export interface NewContratTravailInput {
  candidatureId?: string | null;
  employe: string;
  poste?: string;
  type: ContractType;
  site?: string;
  salaire: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  corps?: string | null;
}
export async function createContratTravail(i: NewContratTravailInput): Promise<string> {
  const supabase = createClient();
  const ref = `CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await supabase
    .from("ContratTravail")
    .insert({
      ref,
      candidatureId: i.candidatureId || null,
      employe: i.employe.trim(),
      poste: i.poste?.trim() || null,
      type: i.type,
      site: i.site?.trim() || null,
      salaire: Math.max(0, Math.round(i.salaire)),
      dateDebut: i.dateDebut || null,
      dateFin: i.dateFin || null,
      corps: i.corps ?? null,
      statut: "brouillon",
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (DG/RH/Manager).");
  return (data as unknown as { id: string }[])[0].id;
}

/** Met à jour un contrat de travail (métadonnées + corps). RLS DG/RH/Manager. */
export async function saveContratTravail(id: string, i: NewContratTravailInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ContratTravail")
    .update({
      employe: i.employe.trim(),
      poste: i.poste?.trim() || null,
      type: i.type,
      site: i.site?.trim() || null,
      salaire: Math.max(0, Math.round(i.salaire)),
      dateDebut: i.dateDebut || null,
      dateFin: i.dateFin || null,
      corps: i.corps ?? null,
      updatedAt: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

export async function updateContratTravailStatut(
  id: string,
  statut: ContractStatus,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ContratTravail")
    .update({ statut, updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

// ── Onboarding (checklist par candidature) ───────────────────────────────

export interface OnboardingEtape {
  libelle: string;
  fait: boolean;
}

export const ONBOARDING_DEFAUT: OnboardingEtape[] = [
  { libelle: "Signature du contrat de travail", fait: false },
  { libelle: "Carte professionnelle CNAPS déposée", fait: false },
  { libelle: "Dotation uniforme & équipement", fait: false },
  { libelle: "Formation sécurité & consignes du poste", fait: false },
  { libelle: "Affiliation IPRES / CSS", fait: false },
  { libelle: "Ouverture compte de paiement salaire", fait: false },
];

interface DbOnboarding {
  candidatureId: string;
  employe: string | null;
  etapes: OnboardingEtape[];
}

export interface OnboardingRow {
  candidatureId: string;
  employe: string;
  etapes: OnboardingEtape[];
  done: number;
  total: number;
  pct: number;
}

/** Tous les onboardings en cours (une ligne par candidature). RLS DG/RH/Manager. */
export async function fetchOnboardings(): Promise<OnboardingRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Onboarding")
    .select("candidatureId,employe,etapes")
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return ((data as unknown as DbOnboarding[]) ?? []).map((r) => {
    const etapes = r.etapes ?? [];
    const done = etapes.filter((e) => e.fait).length;
    const total = etapes.length || 1;
    return {
      candidatureId: r.candidatureId,
      employe: r.employe ?? "—",
      etapes,
      done,
      total: etapes.length,
      pct: Math.round((done / total) * 100),
    };
  });
}

export async function fetchOnboarding(
  candidatureId: string,
): Promise<OnboardingEtape[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Onboarding")
    .select("candidatureId,employe,etapes")
    .eq("candidatureId", candidatureId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (data as unknown as DbOnboarding).etapes ?? [];
}

export async function saveOnboarding(
  candidatureId: string,
  employe: string,
  etapes: OnboardingEtape[],
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Onboarding")
    .upsert(
      { candidatureId, employe, etapes, updatedAt: new Date().toISOString() } as never,
      { onConflict: "candidatureId" },
    )
    .select("candidatureId");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: enregistrement refusé (DG/RH/Manager).");
}

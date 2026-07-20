/**
 * Réglages applicatifs (table `Parametre`, clé/valeur). Lecture staff, écriture
 * DG/RP. L'identité légale de l'entreprise reste dans ONE_SECURITY (code).
 */
import { createClient } from "@/lib/supabase/client";

export type Parametres = Record<string, string>;

export const PARAM_LABELS: { cle: string; label: string; hint?: string }[] = [
  { cle: "format_facture", label: "Format de numérotation — factures" },
  { cle: "format_devis", label: "Format de numérotation — devis" },
  { cle: "devise", label: "Devise" },
  { cle: "delai_relance_jours", label: "Délai de relance (jours)" },
  { cle: "theme_defaut", label: "Thème par défaut" },
];

export async function fetchParametres(): Promise<Parametres> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Parametre").select("cle,valeur");
  if (error) throw error;
  const out: Parametres = {};
  for (const r of (data as { cle: string; valeur: string | null }[]) ?? []) {
    out[r.cle] = r.valeur ?? "";
  }
  return out;
}

/** Enregistre un lot de réglages (upsert par clé). RLS : DG/RP. */
export async function saveParametres(values: Parametres): Promise<void> {
  const supabase = createClient();
  const rows = Object.entries(values).map(([cle, valeur]) => ({
    cle,
    valeur,
    updatedAt: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("Parametre")
    .upsert(rows as never, { onConflict: "cle" })
    .select("cle");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: enregistrement refusé (DG/RP requis).");
}

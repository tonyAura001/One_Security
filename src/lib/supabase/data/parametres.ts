/**
 * Réglages applicatifs (table `Parametre`, clé/valeur). Lecture staff, écriture
 * DG/RP. L'identité légale de l'entreprise reste dans ONE_SECURITY (code).
 */
import { createClient } from "@/lib/supabase/client";
import { ONE_SECURITY } from "@/lib/one-security";

export type Parametres = Record<string, string>;

/** Champs d'identité de l'entreprise éditables (clé Parametre + défaut du code). */
export const COMPANY_FIELDS: { cle: string; label: string; defaut: string; textarea?: boolean }[] = [
  { cle: "entreprise_name", label: "Raison sociale", defaut: ONE_SECURITY.name },
  { cle: "entreprise_slogan", label: "Slogan", defaut: ONE_SECURITY.slogan },
  { cle: "entreprise_activites", label: "Activités", defaut: ONE_SECURITY.activites, textarea: true },
  { cle: "entreprise_adresse", label: "Adresse", defaut: ONE_SECURITY.adresse },
  { cle: "entreprise_tel", label: "Téléphone", defaut: ONE_SECURITY.tel },
  { cle: "entreprise_email", label: "E-mail", defaut: ONE_SECURITY.email },
  { cle: "entreprise_rccm", label: "RCCM", defaut: ONE_SECURITY.rccm },
  { cle: "entreprise_ninea", label: "NINEA", defaut: ONE_SECURITY.ninea },
  { cle: "entreprise_capital", label: "Capital", defaut: ONE_SECURITY.capital },
  { cle: "entreprise_pdg", label: "PDG", defaut: ONE_SECURITY.pdg },
];

/** Identité de l'entreprise (types élargis : les champs éditables sont des string). */
export type CompanyIdentity = {
  -readonly [K in keyof typeof ONE_SECURITY]: (typeof ONE_SECURITY)[K] extends string
    ? string
    : (typeof ONE_SECURITY)[K];
};

/** Fusionne les réglages Parametre par-dessus l'identité par défaut (ONE_SECURITY). */
export function mergeIdentity(p: Parametres): CompanyIdentity {
  const g = (cle: string, d: string) => (p[cle]?.trim() ? p[cle] : d);
  return {
    ...ONE_SECURITY,
    name: g("entreprise_name", ONE_SECURITY.name),
    slogan: g("entreprise_slogan", ONE_SECURITY.slogan),
    activites: g("entreprise_activites", ONE_SECURITY.activites),
    adresse: g("entreprise_adresse", ONE_SECURITY.adresse),
    tel: g("entreprise_tel", ONE_SECURITY.tel),
    email: g("entreprise_email", ONE_SECURITY.email),
    rccm: g("entreprise_rccm", ONE_SECURITY.rccm),
    ninea: g("entreprise_ninea", ONE_SECURITY.ninea),
    capital: g("entreprise_capital", ONE_SECURITY.capital),
    pdg: g("entreprise_pdg", ONE_SECURITY.pdg),
  };
}

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

/**
 * Réglages applicatifs (table `Parametre`, clé/valeur). Lecture staff, écriture
 * DG/RP. L'identité légale de l'entreprise reste dans ONE_SECURITY (code).
 */
import { createClient } from "@/lib/supabase/client";
import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";

export type Parametres = Record<string, string>;

/** Clés Parametre de l'identité visuelle (marque) et des documents. */
export const PARAM_KEYS = {
  rib: "entreprise_rib",
  logo: "entreprise_logo", // data URL PNG/JPEG
  couleurPrincipale: "brand_couleur_principale",
  couleurAccent: "brand_couleur_accent",
  themePredefini: "brand_theme",
  signatureImage: "signature_dg_image", // data URL PNG
  signatureSignataire: "signature_dg_signataire",
  signatureFonction: "signature_dg_fonction",
  conditionsPaiement: "doc_conditions_paiement",
  mentionsLegales: "doc_mentions_legales",
} as const;

/** Thèmes de marque prêts à l'emploi (couleur principale + accent). */
export const BRAND_THEMES: { id: string; label: string; principale: string; accent: string }[] = [
  { id: "aurantir", label: "Aurantir Blue", principale: "#2D6BFF", accent: "#8B5CF6" },
  { id: "corporate", label: "Corporate Blue", principale: "#1B2A4A", accent: "#C9A84C" },
  { id: "one", label: "One Security (marine/or)", principale: OS_COLORS.navy, accent: OS_COLORS.gold },
  { id: "emeraude", label: "Émeraude", principale: "#0F3D2E", accent: "#C9A84C" },
  { id: "graphite", label: "Graphite", principale: "#1F2937", accent: "#2D6BFF" },
];

/** Champs d'identité légale de l'entreprise éditables (clé Parametre + défaut). */
export const COMPANY_FIELDS: { cle: string; label: string; defaut: string; textarea?: boolean }[] = [
  { cle: "entreprise_name", label: "Raison sociale", defaut: ONE_SECURITY.name },
  { cle: "entreprise_slogan", label: "Slogan", defaut: ONE_SECURITY.slogan },
  { cle: "entreprise_activites", label: "Activités", defaut: ONE_SECURITY.activites, textarea: true },
  { cle: "entreprise_adresse", label: "Adresse du siège", defaut: ONE_SECURITY.adresse },
  { cle: "entreprise_tel", label: "Téléphone", defaut: ONE_SECURITY.tel },
  { cle: "entreprise_email", label: "E-mail professionnel", defaut: ONE_SECURITY.email },
  { cle: "entreprise_rccm", label: "RCCM", defaut: ONE_SECURITY.rccm },
  { cle: "entreprise_ninea", label: "NINEA", defaut: ONE_SECURITY.ninea },
  { cle: "entreprise_capital", label: "Capital social", defaut: ONE_SECURITY.capital },
  { cle: "entreprise_pdg", label: "Dirigeant (PDG/DG)", defaut: ONE_SECURITY.pdg },
  { cle: PARAM_KEYS.rib, label: "RIB / Coordonnées bancaires", defaut: "", textarea: true },
];

/** Signature numérique du dirigeant, apposée automatiquement sur les documents. */
export interface DgSignature {
  image: string;
  signataire: string;
  fonction: string;
}

type BaseIdentity = {
  -readonly [K in keyof typeof ONE_SECURITY]: (typeof ONE_SECURITY)[K] extends string
    ? string
    : (typeof ONE_SECURITY)[K];
};

/** Identité de l'entreprise + identité visuelle + textes documents (pour les PDF). */
export type CompanyIdentity = BaseIdentity & {
  rib: string;
  logo: string;
  couleurPrincipale: string;
  couleurAccent: string;
  conditionsPaiement: string;
  mentionsLegales: string;
  signature: DgSignature;
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
    rib: p[PARAM_KEYS.rib] ?? "",
    logo: p[PARAM_KEYS.logo] ?? "",
    couleurPrincipale: g(PARAM_KEYS.couleurPrincipale, OS_COLORS.navy),
    couleurAccent: g(PARAM_KEYS.couleurAccent, OS_COLORS.gold),
    conditionsPaiement: g(PARAM_KEYS.conditionsPaiement, ONE_SECURITY.nbPaiement),
    mentionsLegales: g(PARAM_KEYS.mentionsLegales, ""),
    signature: {
      image: p[PARAM_KEYS.signatureImage] ?? "",
      signataire: g(PARAM_KEYS.signatureSignataire, ONE_SECURITY.pdg),
      fonction: g(PARAM_KEYS.signatureFonction, "Directeur Général"),
    },
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

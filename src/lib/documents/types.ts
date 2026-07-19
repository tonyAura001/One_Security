/** Types du module Documents (éditeur PilotePME). */

export type DocumentType =
  | "devis"
  | "facture_proforma"
  | "rapport"
  | "fiche_engagement"
  | "communique";

export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  devis: "Devis",
  facture_proforma: "Facture proforma",
  rapport: "Rapport de sécurité",
  fiche_engagement: "Fiche d'engagement",
  communique: "Communiqué officiel",
};

/** Ligne d'un devis : montant = nbreAgent × prixUnitaire (calculé). */
export interface DevisLigne {
  detail: string;
  nbreAgent: number;
  duree: string;
  prixUnitaire: number;
}

export interface DevisData {
  client: string;
  date: string; // yyyy-mm-dd
  lieu: string;
  lignes: DevisLigne[];
}

/** Ligne d'une facture proforma : montant saisi directement. */
export interface FactureLigne {
  detail: string;
  nbrePostes: string;
  nbreAPS: string;
  dureeJr: string;
  dureeJrs: string;
  montant: number;
}

export interface FactureData {
  client: string;
  date: string;
  lignes: FactureLigne[];
  tauxTVA: number; // %
  options: string[];
}

/** Rapport de sécurité (corps en HTML rich-text). */
export interface RapportData {
  destinataire: string;
  date: string;
  objet: string;
  corps: string; // HTML
}

/** Communiqué officiel (corps en HTML). */
export interface CommuniqueData {
  objet: string;
  date: string;
  corps: string; // HTML
}

/** Fiche d'engagement individuelle de mission. */
export interface FicheData {
  titreEvent: string;
  date: string;
  effectif: string;
  remuneration: string;
  consignes: string; // HTML (préformaté par défaut)
  nomAgent: string;
  cni: string;
}

export type DocumentData =
  | DevisData
  | FactureData
  | RapportData
  | CommuniqueData
  | FicheData
  | Record<string, unknown>;

export interface DocRecord {
  id: string;
  type: DocumentType;
  numero: string | null;
  titre: string;
  statut: string; // brouillon | finalise | signe
  donnees: DocumentData;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Somme des montants d'un devis (TTC direct). */
export function devisMontantLigne(l: DevisLigne): number {
  return Math.round((Number(l.nbreAgent) || 0) * (Number(l.prixUnitaire) || 0));
}
export function devisTotal(d: DevisData): number {
  return d.lignes.reduce((s, l) => s + devisMontantLigne(l), 0);
}
export function factureTotaux(d: FactureData): {
  ht: number;
  tva: number;
  ttc: number;
} {
  const ht = d.lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const tva = Math.round((ht * (Number(d.tauxTVA) || 0)) / 100);
  return { ht, tva, ttc: ht + tva };
}

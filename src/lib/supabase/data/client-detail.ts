/**
 * Fiche client 360° — agrège tout ce qui est rattaché à un client via des
 * requêtes Supabase parallèles (RLS commerce). Contrats/Factures/Sites/Contacts
 * sont liés par `clientId` ; les Devis étant liés au Prospect, on les rattache
 * en best-effort par correspondance de raison sociale.
 */
import { createClient } from "@/lib/supabase/client";

export interface ClientContrat {
  id: string;
  numero: string;
  type: string;
  montantHT: number;
  frequence: string;
  dateDebut: string;
  dateFin: string | null;
  status: "actif" | "expirant" | "expire";
}
export interface ClientFacture {
  id: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string | null;
  montantTTC: number;
  statut: string;
  impayee: boolean;
}
export interface ClientDevis {
  id: string;
  numero: string;
  totalTTC: number;
  statut: string;
  date: string | null;
}
export interface ClientSite {
  id: string;
  nom: string;
  adresse: string;
  type: string;
}
export interface ClientContact {
  nom: string;
  role: string;
  telephone: string;
}

export interface ClientDetail {
  contrats: ClientContrat[];
  factures: ClientFacture[];
  devis: ClientDevis[];
  sites: ClientSite[];
  contacts: ClientContact[];
  // Totaux calculés
  caFacture: number; // somme TTC de toutes les factures
  encours: number; // somme TTC des factures impayées
  contratsActifs: number;
}

const IMPAYEE = new Set(["EMISE", "ENVOYEE", "EN_RETARD", "LITIGE"]);

function contratStatus(dateFin: string | null): "actif" | "expirant" | "expire" {
  if (!dateFin) return "actif";
  const days = (new Date(dateFin).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expire";
  if (days < 90) return "expirant";
  return "actif";
}

/** Charge la fiche 360° d'un client. `clientName` sert au rattachement des devis. */
export async function fetchClientDetail(
  clientId: string,
  clientName: string,
): Promise<ClientDetail> {
  const s = createClient();

  const [contratsRes, facturesRes, sitesRes, contactsRes, devisRes] =
    await Promise.all([
      s
        .from("Contrat")
        .select("id,numero,type,montantHT,frequenceFacturation,dateDebut,dateFin")
        .eq("clientId", clientId)
        .order("dateDebut", { ascending: false }),
      s
        .from("Facture")
        .select("id,numero,dateEmission,dateEcheance,montantTTC,statut")
        .eq("clientId", clientId)
        .order("dateEmission", { ascending: false }),
      s
        .from("Site")
        .select("id,nom,adresse,type")
        .eq("clientId", clientId)
        .order("nom"),
      s
        .from("Contact")
        .select("prenom,nom,roleContact,telephoneMobile,telephoneFixe")
        .eq("clientId", clientId),
      s
        .from("Devis")
        .select("id,numero,totalTTC,statut,dateEnvoi,createdAt,Prospect(raisonSociale)")
        .order("createdAt", { ascending: false }),
    ]);

  const contrats: ClientContrat[] = (
    (contratsRes.data as Record<string, unknown>[]) ?? []
  ).map((r) => ({
    id: String(r.id),
    numero: String(r.numero ?? "—"),
    type: String(r.type ?? "—"),
    montantHT: Number(r.montantHT) || 0,
    frequence: String(r.frequenceFacturation ?? "—"),
    dateDebut: String(r.dateDebut ?? ""),
    dateFin: (r.dateFin as string | null) ?? null,
    status: contratStatus((r.dateFin as string | null) ?? null),
  }));

  const factures: ClientFacture[] = (
    (facturesRes.data as Record<string, unknown>[]) ?? []
  ).map((r) => {
    const statut = String(r.statut ?? "");
    return {
      id: String(r.id),
      numero: String(r.numero ?? "—"),
      dateEmission: String(r.dateEmission ?? ""),
      dateEcheance: (r.dateEcheance as string | null) ?? null,
      montantTTC: Number(r.montantTTC) || 0,
      statut,
      impayee: IMPAYEE.has(statut),
    };
  });

  const sites: ClientSite[] = ((sitesRes.data as Record<string, unknown>[]) ?? []).map(
    (r) => ({
      id: String(r.id),
      nom: String(r.nom ?? "—"),
      adresse: String(r.adresse ?? "—"),
      type: String(r.type ?? "—"),
    }),
  );

  const contacts: ClientContact[] = (
    (contactsRes.data as Record<string, unknown>[]) ?? []
  ).map((r) => ({
    nom: `${r.prenom ?? ""} ${r.nom ?? ""}`.trim() || "—",
    role: String(r.roleContact ?? "—"),
    telephone:
      (r.telephoneMobile as string | null) ??
      (r.telephoneFixe as string | null) ??
      "—",
  }));

  // Devis : rattachement best-effort par raison sociale du prospect.
  const target = clientName.trim().toLowerCase();
  const devis: ClientDevis[] = (
    (devisRes.data as Record<string, unknown>[]) ?? []
  )
    .filter((r) => {
      const p = r.Prospect as { raisonSociale?: string } | { raisonSociale?: string }[] | null;
      const raison = Array.isArray(p) ? p[0]?.raisonSociale : p?.raisonSociale;
      return raison && raison.trim().toLowerCase() === target;
    })
    .map((r) => ({
      id: String(r.id),
      numero: String(r.numero ?? "—"),
      totalTTC: Number(r.totalTTC) || 0,
      statut: String(r.statut ?? "—"),
      date: (r.dateEnvoi as string | null) ?? (r.createdAt as string | null) ?? null,
    }));

  const caFacture = factures.reduce((sum, f) => sum + f.montantTTC, 0);
  const encours = factures
    .filter((f) => f.impayee)
    .reduce((sum, f) => sum + f.montantTTC, 0);
  const contratsActifs = contrats.filter((c) => c.status !== "expire").length;

  return { contrats, factures, devis, sites, contacts, caFacture, encours, contratsActifs };
}

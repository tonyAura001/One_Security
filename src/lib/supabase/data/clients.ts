/**
 * Accès données « clients » via Supabase (PostgREST), sécurisé par RLS.
 *
 * Migration Supabase-native : le front lit la table `Client` (et ses relations
 * Contact / Site / Contrat) directement avec `supabase-js` — plus l'API NestJS.
 * Les RLS `*_read_commerce` réservent la lecture aux rôles DG/RP/RF/COMPTABLE/
 * MANAGER ; pour les autres, la requête renvoie `[]` (repli démo côté écran).
 */
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Client, ClientStatus } from "@/lib/api/types";

type FormeJuridique = Database["public"]["Enums"]["FormeJuridique"];

interface DbContact {
  prenom: string;
  nom: string;
  telephoneMobile: string | null;
  telephoneFixe: string | null;
  roleContact: string;
}
interface DbContrat {
  montantHT: number | string;
  frequenceFacturation: string;
}
interface DbClient {
  id: string;
  raisonSociale: string;
  secteur: string | null;
  statut: ClientStatus;
  scoreSante: number;
  createdAt: string;
  Contact: DbContact[];
  Site: { count: number }[];
  Contrat: DbContrat[];
}

const SELECT =
  "id,raisonSociale,secteur,statut,scoreSante,createdAt," +
  "Contact(prenom,nom,telephoneMobile,telephoneFixe,roleContact)," +
  "Site(count)," +
  "Contrat(montantHT,frequenceFacturation)";

/** Ramène un montant contractuel à son équivalent mensuel (FCFA). */
function toMonthly(c: DbContrat): number {
  const amount = Number(c.montantHT) || 0;
  switch (c.frequenceFacturation) {
    case "MENSUELLE":
      return amount;
    case "TRIMESTRIELLE":
      return amount / 3;
    case "SEMESTRIELLE":
      return amount / 6;
    case "ANNUELLE":
      return amount / 12;
    default:
      return 0; // PONCTUELLE → non récurrent
  }
}

function mapDbClient(r: DbClient): Client {
  // Contact principal : le décideur en priorité, sinon le premier.
  const primary =
    r.Contact.find((c) => c.roleContact === "DECIDEUR") ?? r.Contact[0];
  const monthly = r.Contrat.reduce((sum, c) => sum + toMonthly(c), 0);

  return {
    id: r.id,
    name: r.raisonSociale,
    sector: r.secteur ?? "—",
    contact: primary ? `${primary.prenom} ${primary.nom}` : "—",
    phone: primary?.telephoneMobile ?? primary?.telephoneFixe ?? "—",
    sites: r.Site[0]?.count ?? 0,
    monthly: Math.round(monthly),
    status: r.statut,
    health: r.scoreSante,
    since: r.createdAt,
  };
}

/** Champs saisis à la création d'un client. */
export interface NewClientInput {
  raisonSociale: string;
  formeJuridique: string;
  secteur: string;
  adresseFacturation: string;
  statut: ClientStatus;
}

/** Crée un client (RLS `clients_insert_commerce` : DG/RP uniquement). */
export async function createClientRow(input: NewClientInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("Client").insert({
    raisonSociale: input.raisonSociale.trim(),
    formeJuridique: input.formeJuridique as FormeJuridique,
    adresseFacturation: input.adresseFacturation.trim(),
    secteur: input.secteur.trim() || null,
    statut: input.statut,
  });
  if (error) throw error;
}

/** Liste des clients visibles par l'utilisateur courant (selon RLS). */
export async function fetchClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Client")
    .select(SELECT)
    .order("raisonSociale");
  if (error) throw error;
  return (data as unknown as DbClient[]).map(mapDbClient);
}

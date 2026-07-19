/**
 * Accès données « clients » via Supabase (PostgREST), sécurisé par RLS.
 *
 * Migration Supabase-native : le front lit la table `Client` directement avec
 * `supabase-js` (plus l'API NestJS). La RLS (`clients_read_commerce`) réserve la
 * lecture aux rôles DG/RP/RF/COMPTABLE/MANAGER — pour les autres, la requête
 * renvoie `[]` (l'appelant retombe alors sur les données de démo).
 *
 * Le schéma DB `Client` ≠ le type UI `Client` : ce mapper comble les champs
 * UI absents de la base (statut, santé, contact, CA…) par des valeurs par
 * défaut, à remplacer par de vraies colonnes/relations au fil de l'enrichissement.
 */
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/lib/api/types";

interface DbClient {
  id: string;
  raisonSociale: string;
  formeJuridique: string;
  nafCode: string | null;
  createdAt: string;
}

function mapDbClient(r: DbClient): Client {
  return {
    id: r.id,
    name: r.raisonSociale,
    // Placeholders (pas encore en base) — à enrichir :
    sector: r.nafCode ?? r.formeJuridique,
    contact: "—",
    phone: "—",
    sites: 0,
    monthly: 0,
    status: "actif",
    health: 75,
    // Réel :
    since: r.createdAt,
  };
}

/** Liste des clients visibles par l'utilisateur courant (selon RLS). */
export async function fetchClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Client")
    .select("id,raisonSociale,formeJuridique,nafCode,createdAt")
    .order("raisonSociale");
  if (error) throw error;
  return (data as DbClient[]).map(mapDbClient);
}

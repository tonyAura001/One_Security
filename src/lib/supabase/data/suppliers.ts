/**
 * Accès données « fournisseurs » via Supabase (PostgREST), sécurisé par RLS
 * (`fournisseurs_read_finance` : DG/RF/COMPTABLE). L'encours et le nombre de
 * factures ouvertes sont dérivés des dépenses non payées (`datePaiement` null),
 * jointes via `depenses_read_finance`.
 */
import { createClient } from "@/lib/supabase/client";
import type {
  Supplier,
  SupplierCategory,
  SupplierStatus,
} from "@/lib/api/suppliers";

interface DbDepense {
  montantHT: number | string;
  montantTVA: number | string;
  datePaiement: string | null;
}
interface DbFournisseur {
  id: string;
  raisonSociale: string;
  telephone: string | null;
  categorie: string | null;
  statut: string;
  contact: string | null;
  delaiMoyenJours: number;
  Depense: DbDepense[];
}

function mapSupplier(r: DbFournisseur): Supplier {
  const unpaid = r.Depense.filter((d) => !d.datePaiement);
  const outstanding = unpaid.reduce(
    (s, d) => s + (Number(d.montantHT) || 0) + (Number(d.montantTVA) || 0),
    0,
  );
  return {
    id: r.id,
    name: r.raisonSociale,
    category: (r.categorie ?? "Équipement") as SupplierCategory,
    contact: r.contact ?? "—",
    phone: r.telephone ?? "—",
    outstanding: Math.round(outstanding),
    openInvoices: unpaid.length,
    avgDelayDays: r.delaiMoyenJours,
    status: r.statut as SupplierStatus,
  };
}

/** Fournisseurs visibles par l'utilisateur courant (selon RLS). */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Fournisseur")
    .select(
      "id,raisonSociale,telephone,categorie,statut,contact,delaiMoyenJours,Depense(montantHT,montantTVA,datePaiement)",
    )
    .order("raisonSociale");
  if (error) throw error;
  return (data as unknown as DbFournisseur[]).map(mapSupplier);
}

export interface SupplierStats {
  activeCount: number;
  outstanding: number;
  toPay: number;
  avgDelay: number;
}

/** KPIs dérivés de la liste (remplace l'ancien getSupplierStats mock). */
export function computeSupplierStats(suppliers: Supplier[]): SupplierStats {
  const outstanding = suppliers.reduce((s, x) => s + x.outstanding, 0);
  const toPay = suppliers.reduce((s, x) => s + x.openInvoices, 0);
  const delays = suppliers.filter((s) => s.avgDelayDays > 0).map((s) => s.avgDelayDays);
  const avgDelay = delays.length
    ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    : 0;
  return {
    activeCount: suppliers.filter((s) => s.status === "actif").length,
    outstanding,
    toPay,
    avgDelay,
  };
}

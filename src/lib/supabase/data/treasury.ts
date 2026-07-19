/**
 * Trésorerie via Supabase — comptes (CompteBancaire), mouvements (union
 * Encaissement + Depense), solde et stats. Sécurisé par RLS
 * (comptes/encaissements/depenses _read_finance : DG/RF/COMPTABLE).
 */
import { createClient } from "@/lib/supabase/client";
import type {
  Account,
  AccountKind,
  Movement,
  MovementCategory,
  BalancePoint,
  TreasuryStats,
} from "@/lib/api/treasury";

interface DbEnc {
  montant: number | string;
  dateEncaissement: string;
}
interface DbDep {
  montantHT: number | string;
  montantTVA: number | string;
  datePaiement: string | null;
}
interface DbCompte {
  id: string;
  nom: string;
  iban: string;
  type: string;
  soldeInitial: number | string;
  Encaissement: DbEnc[];
  Depense: DbDep[];
}

const CAT: Record<string, MovementCategory> = {
  CARBURANT: "Carburant",
  EQUIPEMENT: "Achat équipement",
  FOURNITURES: "Achat équipement",
  LOYER: "Loyer",
  MAINTENANCE: "Divers",
  ASSURANCES: "Divers",
  AUTRE: "Divers",
};

function mask(iban: string): string {
  return iban.length > 8 ? `•••• ${iban.slice(-4)}` : iban;
}
const n = (v: number | string | null): number => Number(v) || 0;

/** Comptes avec solde calculé (soldeInitial + encaissements − dépenses payées). */
export async function fetchAccounts(): Promise<Account[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("CompteBancaire")
    .select(
      "id,nom,iban,type,soldeInitial,Encaissement(montant,dateEncaissement),Depense(montantHT,montantTVA,datePaiement)",
    )
    .order("nom");
  if (error) throw error;
  return (data as unknown as DbCompte[]).map((a) => {
    const credits = a.Encaissement.reduce((s, e) => s + n(e.montant), 0);
    const debits = a.Depense.filter((d) => d.datePaiement).reduce(
      (s, d) => s + n(d.montantHT) + n(d.montantTVA),
      0,
    );
    return {
      id: a.id,
      name: a.nom,
      kind: a.type as AccountKind,
      reference: mask(a.iban),
      balance: Math.round(n(a.soldeInitial) + credits - debits),
    };
  });
}

/** Mouvements = encaissements (crédit) + dépenses payées (débit), signés. */
export async function fetchMovements(): Promise<Movement[]> {
  const supabase = createClient();
  const [enc, dep] = await Promise.all([
    supabase.from("Encaissement").select("id,dateEncaissement,montant"),
    supabase
      .from("Depense")
      .select("id,datePaiement,objet,montantHT,montantTVA,categorie")
      .not("datePaiement", "is", null),
  ]);
  if (enc.error) throw enc.error;
  if (dep.error) throw dep.error;

  const movs: Movement[] = [];
  for (const e of enc.data as { id: string; dateEncaissement: string; montant: number | string }[]) {
    movs.push({
      id: `e-${e.id}`,
      date: e.dateEncaissement,
      label: "Encaissement facture",
      category: "Encaissement contrat",
      method: "Virement",
      amount: n(e.montant),
    });
  }
  for (const d of dep.data as {
    id: string;
    datePaiement: string;
    objet: string;
    montantHT: number | string;
    montantTVA: number | string;
    categorie: string;
  }[]) {
    movs.push({
      id: `d-${d.id}`,
      date: d.datePaiement,
      label: d.objet,
      category: CAT[d.categorie] ?? "Divers",
      method: "Virement",
      amount: -(n(d.montantHT) + n(d.montantTVA)),
    });
  }
  return movs.sort((a, b) => b.date.localeCompare(a.date));
}

export interface NewCompteInput {
  nom: string;
  iban: string;
  type: AccountKind; // bank | wave | om | cash
  soldeInitial: number;
  bicSwift?: string;
}

/** Crée un compte bancaire (RLS insert : DG/RF). */
export async function createCompte(i: NewCompteInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("CompteBancaire")
    .insert({
      nom: i.nom.trim(),
      iban: i.iban.trim(),
      type: i.type,
      soldeInitial: Math.round(i.soldeInitial),
      bicSwift: i.bicSwift?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export interface NewEncaissementInput {
  factureId: string;
  compteBancaireId: string;
  montant: number;
  dateEncaissement: string; // yyyy-mm-dd
  reference?: string;
}

/** Crée un encaissement (RLS insert : DG/RF/COMPTABLE). */
export async function createEncaissement(
  i: NewEncaissementInput,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Encaissement")
    .insert({
      factureId: i.factureId,
      compteBancaireId: i.compteBancaireId,
      montant: Math.round(i.montant),
      dateEncaissement: i.dateEncaissement,
      reference: i.reference?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export interface NewDepenseInput {
  objet: string;
  montantHT: number;
  montantTVA: number;
  categorie: string; // enum CategorieDepense
  dateEngagement: string; // yyyy-mm-dd
  datePaiement?: string | null;
  compteBancaireId?: string | null;
}

/** Crée une dépense (RLS insert : DG/RF/COMPTABLE). */
export async function createDepense(i: NewDepenseInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Depense")
    .insert({
      objet: i.objet.trim(),
      montantHT: Math.round(i.montantHT),
      montantTVA: Math.round(i.montantTVA),
      categorie: i.categorie,
      dateEngagement: i.dateEngagement,
      datePaiement: i.datePaiement || null,
      compteBancaireId: i.compteBancaireId || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export function computeTreasuryStats(
  accounts: Account[],
  movements: Movement[],
): TreasuryStats {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const encaissements = movements
    .filter((m) => m.amount > 0)
    .reduce((s, m) => s + m.amount, 0);
  const decaissements = movements
    .filter((m) => m.amount < 0)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  return {
    total,
    encaissements,
    decaissements,
    forecast30: Math.round(total + encaissements * 0.3 - decaissements * 0.3),
  };
}

/** Solde cumulé par mois, reconstruit à partir des mouvements. */
export function computeBalanceSeries(
  accounts: Account[],
  movements: Movement[],
): BalancePoint[] {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const byMonth = new Map<string, number>();
  for (const m of movements) {
    const k = m.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + m.amount);
  }
  const months = [...byMonth.keys()].sort();
  if (!months.length) {
    return [{ month: new Date().toISOString().slice(0, 7), solde: total }];
  }
  let running = total - movements.reduce((s, m) => s + m.amount, 0);
  return months.map((month) => {
    running += byMonth.get(month)!;
    return { month, solde: Math.round(running) };
  });
}

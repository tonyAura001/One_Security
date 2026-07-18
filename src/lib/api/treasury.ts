/**
 * Trésorerie — comptes, mouvements et évolution du solde (données démo).
 * Rattaché au tenant « Dakar Sécurité ». Réutilise les libellés clients de
 * `data.ts` pour rester cohérent d'un écran à l'autre.
 */

export type AccountKind = "bank" | "wave" | "om" | "cash";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** IBAN / numéro masqué ou libellé court. */
  reference: string;
  balance: number;
}

export type MovementKind = "credit" | "debit";
export type PaymentMethod = "Wave" | "Orange Money" | "Virement" | "Espèces";
export type MovementCategory =
  | "Encaissement contrat"
  | "Paie agents"
  | "Achat équipement"
  | "Carburant"
  | "Télécom"
  | "Charges sociales"
  | "Formation"
  | "Loyer"
  | "Divers";

export interface Movement {
  id: string;
  date: string; // ISO
  label: string;
  category: MovementCategory;
  method: PaymentMethod;
  /** Montant signé : positif = encaissement, négatif = décaissement. */
  amount: number;
}

export interface BalancePoint {
  month: string;
  solde: number;
}

const ACCOUNTS: Account[] = [
  {
    id: "acc-cbao",
    name: "Compte bancaire CBAO",
    kind: "bank",
    reference: "SN012 •••• 4471",
    balance: 18_420_000,
  },
  {
    id: "acc-wave",
    name: "Wave Business",
    kind: "wave",
    reference: "+221 78 •• 45",
    balance: 3_180_000,
  },
  {
    id: "acc-om",
    name: "Orange Money Pro",
    kind: "om",
    reference: "+221 77 •• 12",
    balance: 2_240_000,
  },
  {
    id: "acc-cash",
    name: "Caisse espèces",
    kind: "cash",
    reference: "Coffre siège · Plateau",
    balance: 1_150_000,
  },
];

const MOVEMENTS: Movement[] = [
  {
    id: "mv1",
    date: "2026-07-13",
    label: "Encaissement contrat Radisson Blu",
    category: "Encaissement contrat",
    method: "Virement",
    amount: 2_400_000,
  },
  {
    id: "mv2",
    date: "2026-07-12",
    label: "Encaissement contrat CBAO Plateau",
    category: "Encaissement contrat",
    method: "Virement",
    amount: 1_800_000,
  },
  {
    id: "mv3",
    date: "2026-07-11",
    label: "Achat talkies-walkies (Talkie Pro Dakar)",
    category: "Achat équipement",
    method: "Wave",
    amount: -420_000,
  },
  {
    id: "mv4",
    date: "2026-07-10",
    label: "Carburant véhicules de ronde (Total Énergies)",
    category: "Carburant",
    method: "Orange Money",
    amount: -285_000,
  },
  {
    id: "mv5",
    date: "2026-07-08",
    label: "Encaissement acompte Terrou-Bi",
    category: "Encaissement contrat",
    method: "Wave",
    amount: 950_000,
  },
  {
    id: "mv6",
    date: "2026-07-05",
    label: "Paie agents — juin",
    category: "Paie agents",
    method: "Virement",
    amount: -8_750_000,
  },
  {
    id: "mv7",
    date: "2026-07-05",
    label: "Cotisations IPRES / CSS — juin",
    category: "Charges sociales",
    method: "Virement",
    amount: -1_640_000,
  },
  {
    id: "mv8",
    date: "2026-07-04",
    label: "Encaissement contrat Sonatel",
    category: "Encaissement contrat",
    method: "Virement",
    amount: 2_100_000,
  },
  {
    id: "mv9",
    date: "2026-07-03",
    label: "Abonnement télécom (Sonatel)",
    category: "Télécom",
    method: "Orange Money",
    amount: -180_000,
  },
  {
    id: "mv10",
    date: "2026-07-02",
    label: "Uniformes & badges (Équip-Sécurité SARL)",
    category: "Achat équipement",
    method: "Wave",
    amount: -640_000,
  },
  {
    id: "mv11",
    date: "2026-07-01",
    label: "Loyer siège — Plateau",
    category: "Loyer",
    method: "Virement",
    amount: -750_000,
  },
  {
    id: "mv12",
    date: "2026-06-30",
    label: "Encaissement contrat King Fahd Palace",
    category: "Encaissement contrat",
    method: "Virement",
    amount: 1_650_000,
  },
  {
    id: "mv13",
    date: "2026-06-29",
    label: "Formation cynophile (Centre Formation Sécurité)",
    category: "Formation",
    method: "Virement",
    amount: -320_000,
  },
  {
    id: "mv14",
    date: "2026-06-27",
    label: "Encaissement contrat Auchan Sea Plaza",
    category: "Encaissement contrat",
    method: "Wave",
    amount: 1_350_000,
  },
];

const BALANCE_SERIES: BalancePoint[] = [
  { month: "Fév", solde: 16_900_000 },
  { month: "Mar", solde: 19_200_000 },
  { month: "Avr", solde: 21_100_000 },
  { month: "Mai", solde: 20_400_000 },
  { month: "Juin", solde: 23_800_000 },
  { month: "Juil", solde: 24_990_000 },
];

export function getAccounts(): Account[] {
  return ACCOUNTS;
}

export function getMovements(): Movement[] {
  return [...MOVEMENTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getBalanceSeries(): BalancePoint[] {
  return BALANCE_SERIES;
}

export interface TreasuryStats {
  total: number;
  encaissements: number;
  decaissements: number;
  forecast30: number;
}

/** KPIs dérivés des comptes et des mouvements du mois en cours. */
export function getTreasuryStats(): TreasuryStats {
  const total = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const july = MOVEMENTS.filter((m) => m.date >= "2026-07-01");
  const encaissements = july
    .filter((m) => m.amount > 0)
    .reduce((s, m) => s + m.amount, 0);
  const decaissements = july
    .filter((m) => m.amount < 0)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  // Prévisionnel J+30 : solde + encaissements contractuels attendus - paie estimée.
  const forecast30 = total + 9_300_000 - 10_400_000;
  return { total, encaissements, decaissements, forecast30 };
}

export const ACCOUNT_KIND_META: Record<
  AccountKind,
  { label: string; tone: "accent" | "success" | "warning" | "violet" }
> = {
  bank: { label: "Banque", tone: "accent" },
  wave: { label: "Wave", tone: "success" },
  om: { label: "Orange Money", tone: "warning" },
  cash: { label: "Espèces", tone: "violet" },
};

export const METHOD_META: Record<
  PaymentMethod,
  "success" | "warning" | "info" | "neutral"
> = {
  Wave: "success",
  "Orange Money": "warning",
  Virement: "info",
  Espèces: "neutral",
};

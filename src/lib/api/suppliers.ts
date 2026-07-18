/**
 * Fournisseurs — encours et suivi des factures à payer (données démo).
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type SupplierCategory =
  | "Équipement"
  | "Uniformes"
  | "Carburant"
  | "Télécom"
  | "Formation";

export type SupplierStatus = "actif" | "en_attente" | "bloque";

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  contact: string;
  phone: string;
  /** Encours (montant dû) en FCFA. */
  outstanding: number;
  /** Nombre de factures ouvertes. */
  openInvoices: number;
  /** Délai de paiement moyen constaté (jours). */
  avgDelayDays: number;
  status: SupplierStatus;
}

const SUPPLIERS: Supplier[] = [
  {
    id: "sup1",
    name: "Équip-Sécurité SARL",
    category: "Uniformes",
    contact: "Amadou Ndiaye",
    phone: "+221 33 823 45 10",
    outstanding: 1_240_000,
    openInvoices: 3,
    avgDelayDays: 28,
    status: "actif",
  },
  {
    id: "sup2",
    name: "Talkie Pro Dakar",
    category: "Équipement",
    contact: "Ousmane Ba",
    phone: "+221 77 512 88 04",
    outstanding: 420_000,
    openInvoices: 1,
    avgDelayDays: 15,
    status: "en_attente",
  },
  {
    id: "sup3",
    name: "Total Énergies",
    category: "Carburant",
    contact: "Fatou Sarr",
    phone: "+221 33 839 70 00",
    outstanding: 685_000,
    openInvoices: 2,
    avgDelayDays: 21,
    status: "actif",
  },
  {
    id: "sup4",
    name: "Sonatel",
    category: "Télécom",
    contact: "Cheikh Sy",
    phone: "+221 33 839 90 00",
    outstanding: 180_000,
    openInvoices: 1,
    avgDelayDays: 30,
    status: "actif",
  },
  {
    id: "sup5",
    name: "Centre Formation Sécurité",
    category: "Formation",
    contact: "Aïssatou Diop",
    phone: "+221 33 860 12 34",
    outstanding: 0,
    openInvoices: 0,
    avgDelayDays: 18,
    status: "actif",
  },
  {
    id: "sup6",
    name: "Ndeye Faye Textiles",
    category: "Uniformes",
    contact: "Ndeye Faye",
    phone: "+221 78 445 90 22",
    outstanding: 910_000,
    openInvoices: 2,
    avgDelayDays: 42,
    status: "bloque",
  },
  {
    id: "sup7",
    name: "Dakar Auto Ronde",
    category: "Carburant",
    contact: "Mamadou Fall",
    phone: "+221 76 330 71 15",
    outstanding: 355_000,
    openInvoices: 1,
    avgDelayDays: 24,
    status: "en_attente",
  },
  {
    id: "sup8",
    name: "Cynotech Sénégal",
    category: "Équipement",
    contact: "Ibrahima Sow",
    phone: "+221 77 908 33 41",
    outstanding: 540_000,
    openInvoices: 1,
    avgDelayDays: 20,
    status: "actif",
  },
];

export function getSuppliers(): Supplier[] {
  return SUPPLIERS;
}

export interface SupplierStats {
  activeCount: number;
  outstanding: number;
  toPay: number;
  avgDelay: number;
}

export function getSupplierStats(): SupplierStats {
  const active = SUPPLIERS.filter((s) => s.status !== "bloque");
  const outstanding = SUPPLIERS.reduce((s, x) => s + x.outstanding, 0);
  const toPay = SUPPLIERS.reduce((s, x) => s + x.openInvoices, 0);
  const avgDelay = Math.round(
    SUPPLIERS.reduce((s, x) => s + x.avgDelayDays, 0) / SUPPLIERS.length,
  );
  return { activeCount: active.length, outstanding, toPay, avgDelay };
}

export const SUPPLIER_STATUS_META: Record<
  SupplierStatus,
  { label: string; variant: PillVariant }
> = {
  actif: { label: "Actif", variant: "success" },
  en_attente: { label: "À payer", variant: "warning" },
  bloque: { label: "Bloqué", variant: "danger" },
};

export const SUPPLIER_CATEGORY_META: Record<
  SupplierCategory,
  { tone: "accent" | "violet" | "warning" | "success" | "danger" }
> = {
  Équipement: { tone: "accent" },
  Uniformes: { tone: "violet" },
  Carburant: { tone: "warning" },
  Télécom: { tone: "success" },
  Formation: { tone: "danger" },
};

/**
 * Catalogue équipements — références de la boutique interne (matériel de
 * sécurité). Données démo « Dakar Sécurité ».
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type EquipmentCategory =
  | "Uniformes"
  | "Communication"
  | "Éclairage"
  | "Protection"
  | "Accès"
  | "Détection"
  | "Chaussures"
  | "Cynophile";

export type StockStatus = "en_stock" | "faible" | "rupture";

export interface CatalogueItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  /** Prix unitaire (FCFA). */
  price: number;
  stock: number;
  threshold: number;
  reference: string;
}

const CATALOGUE: CatalogueItem[] = [
  {
    id: "eq1",
    name: "Talkie-walkie Motorola T82",
    category: "Communication",
    price: 45_000,
    stock: 12,
    threshold: 10,
    reference: "COM-T82",
  },
  {
    id: "eq2",
    name: "Uniforme complet (veste + pantalon)",
    category: "Uniformes",
    price: 28_000,
    stock: 60,
    threshold: 20,
    reference: "UNI-CPL",
  },
  {
    id: "eq3",
    name: "Chaussures de sécurité S3",
    category: "Chaussures",
    price: 22_000,
    stock: 8,
    threshold: 15,
    reference: "CHA-S3",
  },
  {
    id: "eq4",
    name: "Lampe torche tactique LED",
    category: "Éclairage",
    price: 12_000,
    stock: 40,
    threshold: 12,
    reference: "ECL-LED",
  },
  {
    id: "eq5",
    name: "Détecteur de métaux portable",
    category: "Détection",
    price: 85_000,
    stock: 6,
    threshold: 5,
    reference: "DET-PORT",
  },
  {
    id: "eq6",
    name: "Gilet tactique renforcé",
    category: "Protection",
    price: 65_000,
    stock: 0,
    threshold: 4,
    reference: "PRO-TAC",
  },
  {
    id: "eq7",
    name: "Badge / carte magnétique",
    category: "Accès",
    price: 3_500,
    stock: 150,
    threshold: 40,
    reference: "ACC-BDG",
  },
  {
    id: "eq8",
    name: "Casquette Dakar Sécurité",
    category: "Uniformes",
    price: 6_000,
    stock: 90,
    threshold: 25,
    reference: "UNI-CAP",
  },
  {
    id: "eq9",
    name: "Laisse & harnais cynophile K9",
    category: "Cynophile",
    price: 38_000,
    stock: 3,
    threshold: 4,
    reference: "CYN-K9",
  },
  {
    id: "eq10",
    name: "Portique détecteur de métaux",
    category: "Détection",
    price: 420_000,
    stock: 2,
    threshold: 2,
    reference: "DET-PORTIQUE",
  },
  {
    id: "eq11",
    name: "Projecteur LED de périmètre",
    category: "Éclairage",
    price: 35_000,
    stock: 14,
    threshold: 6,
    reference: "ECL-PERI",
  },
  {
    id: "eq12",
    name: "Gants anti-coupure",
    category: "Protection",
    price: 8_500,
    stock: 45,
    threshold: 20,
    reference: "PRO-GANT",
  },
];

export function stockStatus(item: CatalogueItem): StockStatus {
  if (item.stock === 0) return "rupture";
  if (item.stock <= item.threshold) return "faible";
  return "en_stock";
}

export function getCatalogue(): CatalogueItem[] {
  return CATALOGUE;
}

export interface CatalogueStats {
  references: number;
  stockValue: number;
  ruptures: number;
  toReorder: number;
}

export function getCatalogueStats(): CatalogueStats {
  const stockValue = CATALOGUE.reduce((s, i) => s + i.price * i.stock, 0);
  const ruptures = CATALOGUE.filter((i) => stockStatus(i) === "rupture").length;
  const toReorder = CATALOGUE.filter(
    (i) => stockStatus(i) !== "en_stock",
  ).length;
  return {
    references: CATALOGUE.length,
    stockValue,
    ruptures,
    toReorder,
  };
}

export const STOCK_STATUS_META: Record<
  StockStatus,
  { label: string; variant: PillVariant }
> = {
  en_stock: { label: "En stock", variant: "success" },
  faible: { label: "Stock faible", variant: "warning" },
  rupture: { label: "Rupture", variant: "danger" },
};

export const CATEGORY_TONE: Record<
  EquipmentCategory,
  "accent" | "violet" | "warning" | "success" | "danger" | "muted"
> = {
  Uniformes: "violet",
  Communication: "accent",
  Éclairage: "warning",
  Protection: "danger",
  Accès: "success",
  Détection: "accent",
  Chaussures: "muted",
  Cynophile: "violet",
};

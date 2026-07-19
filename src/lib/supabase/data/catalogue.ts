/**
 * Catalogue équipements = la table `Materiel` via Supabase (RLS materiel_read :
 * DG/RP/MANAGER/RF/COMPTABLE). Mapping MaterielType → EquipmentCategory (UI).
 */
import { createClient } from "@/lib/supabase/client";
import type {
  CatalogueItem,
  EquipmentCategory,
  CatalogueStats,
} from "@/lib/api/catalogue";

const CAT: Record<string, EquipmentCategory> = {
  UNIFORME: "Uniformes",
  RADIO: "Communication",
  ARME: "Protection",
  EQUIPEMENT: "Détection",
  VEHICULE: "Accès",
  AUTRE: "Protection",
};

const SEUIL = 5; // seuil de réappro par défaut (non modélisé)

interface DbMateriel {
  id: string;
  type: string;
  marque: string | null;
  modele: string | null;
  numeroSerie: string | null;
  quantite: number;
  coutAcquisition: number | string | null;
}

function mapItem(m: DbMateriel): CatalogueItem {
  return {
    id: m.id,
    name: [m.marque, m.modele].filter(Boolean).join(" ") || m.type,
    category: CAT[m.type] ?? "Protection",
    price: Number(m.coutAcquisition) || 0,
    stock: m.quantite,
    threshold: SEUIL,
    reference: m.numeroSerie ?? "—",
  };
}

export async function fetchCatalogue(): Promise<CatalogueItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Materiel")
    .select("id,type,marque,modele,numeroSerie,quantite,coutAcquisition")
    .order("type");
  if (error) throw error;
  return (data as unknown as DbMateriel[]).map(mapItem);
}

export function computeCatalogueStats(items: CatalogueItem[]): CatalogueStats {
  return {
    references: items.length,
    stockValue: items.reduce((s, i) => s + i.price * i.stock, 0),
    ruptures: items.filter((i) => i.stock === 0).length,
    toReorder: items.filter((i) => i.stock > 0 && i.stock <= i.threshold).length,
  };
}

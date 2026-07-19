/** Caisse/POS via Supabase (RLS : DG/RF/COMPTABLE). */
import { createClient } from "@/lib/supabase/client";
import type { Product, Receipt } from "@/lib/api/types";

interface DbProduit { id: string; nom: string; categorie: string; prix: number; stock: number; seuilAlerte: number }
export async function fetchProduits(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Produit")
    .select("id,nom,categorie,prix,stock,seuilAlerte").order("nom");
  if (error) throw error;
  return (data as unknown as DbProduit[]).map((p) => ({
    id: p.id, name: p.nom, category: p.categorie, price: p.prix,
    stock: p.stock, threshold: p.seuilAlerte,
  }));
}

export interface NewProduitInput {
  nom: string;
  categorie: string;
  prix: number;
  stock: number;
  seuilAlerte: number;
}

/** Crée un produit boutique (RLS Produit_caisse_write : DG/RF/COMPTABLE). */
export async function createProduit(i: NewProduitInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Produit")
    .insert({
      nom: i.nom.trim(),
      categorie: i.categorie.trim() || "Divers",
      prix: Math.max(0, Math.round(i.prix)),
      stock: Math.max(0, Math.round(i.stock)),
      seuilAlerte: Math.max(0, Math.round(i.seuilAlerte)),
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Ajuste le stock d'un produit (delta positif = entrée, négatif = sortie). */
export async function adjustStock(
  produitId: string,
  delta: number,
): Promise<void> {
  const supabase = createClient();
  const { data: cur, error } = await supabase
    .from("Produit")
    .select("stock")
    .eq("id", produitId)
    .single();
  if (error) throw error;
  const next = Math.max(0, ((cur as { stock: number } | null)?.stock ?? 0) + delta);
  const { data, error: e2 } = await supabase
    .from("Produit")
    .update({ stock: next } as never)
    .eq("id", produitId)
    .select("id");
  if (e2) throw e2;
  if (!data || data.length === 0)
    throw new Error("row-level security: mise à jour refusée (accès écriture).");
}

export interface NewSaleInput {
  produitId: string;
  qty: number;
  prix: number;
  moyenPaiement: string;
}

/** Enregistre une vente (TicketCaisse) et décrémente le stock du produit. */
export async function createSale(i: NewSaleInput): Promise<void> {
  const supabase = createClient();
  const total = Math.round(i.prix) * Math.max(1, Math.round(i.qty));
  const ref = `RC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from("TicketCaisse")
    .insert({
      ref,
      nbArticles: Math.max(1, Math.round(i.qty)),
      total,
      moyenPaiement: i.moyenPaiement,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: vente refusée (accès écriture).");
  await adjustStock(i.produitId, -Math.max(1, Math.round(i.qty)));
}

interface DbTicket { id: string; ref: string; dateHeure: string; nbArticles: number; total: number; moyenPaiement: string }
export async function fetchReceipts(): Promise<Receipt[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("TicketCaisse")
    .select("id,ref,dateHeure,nbArticles,total,moyenPaiement")
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbTicket[]).map((t) => ({
    id: t.id, ref: t.ref,
    time: new Date(t.dateHeure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    items: t.nbArticles, total: t.total,
    method: t.moyenPaiement as Receipt["method"],
  }));
}

/**
 * Caisse / POS via Supabase. Modèle : `Vente` (en-tête) + `LigneVente`
 * (N articles) + `Paiement` (1..N règlements). La création passe par le RPC
 * atomique `create_vente` (en-tête + lignes + paiements + décrément de stock
 * en une transaction, avec garde de stock). RLS : DG / RF / COMPTABLE.
 */
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

// ── Vente (panier multi-lignes + paiements) ──────────────────────────────

export interface VenteLineInput {
  produitId: string;
  quantite: number;
}
export interface VentePaymentInput {
  moyen: string;
  montant: number;
  reference?: string | null;
}
export interface NewVenteInput {
  lines: VenteLineInput[];
  payments?: VentePaymentInput[];
  clientId?: string | null;
}

// Le client typé ne connaît pas ce RPC custom : appel via cast.
type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Enregistre une vente complète (en-tête + lignes + paiements) et décrémente
 * le stock, de façon atomique côté serveur. Retourne l'id de la vente.
 */
export async function createVente(i: NewVenteInput): Promise<string> {
  const supabase = createClient();
  const lines = i.lines
    .filter((l) => l.produitId && l.quantite > 0)
    .map((l) => ({ produitId: l.produitId, quantite: Math.max(1, Math.round(l.quantite)) }));
  if (lines.length === 0) throw new Error("Panier vide.");
  const payments = (i.payments ?? [])
    .filter((p) => p.montant > 0)
    .map((p) => ({ moyen: p.moyen, montant: Math.round(p.montant), reference: p.reference ?? null }));
  const { data, error } = await (supabase.rpc as unknown as RpcCaller)("create_vente", {
    _lines: lines,
    _payments: payments.length ? payments : null,
    _client: i.clientId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// Compat : ancien dialogue « vente rapide » mono-produit → une vente 1 ligne.
export interface NewSaleInput {
  produitId: string;
  qty: number;
  prix: number;
  moyenPaiement: string;
}
export async function createSale(i: NewSaleInput): Promise<void> {
  const qty = Math.max(1, Math.round(i.qty));
  await createVente({
    lines: [{ produitId: i.produitId, quantite: qty }],
    payments: [{ moyen: i.moyenPaiement, montant: Math.round(i.prix) * qty }],
  });
}

interface DbVente {
  id: string;
  ref: string;
  dateHeure: string;
  total: number;
  LigneVente: { count: number }[] | null;
  Paiement: { moyen: string }[] | null;
}
export async function fetchReceipts(): Promise<Receipt[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Vente")
    .select("id,ref,dateHeure,total,LigneVente(count),Paiement(moyen)")
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbVente[]).map((v) => ({
    id: v.id,
    ref: v.ref,
    time: new Date(v.dateHeure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    items: v.LigneVente?.[0]?.count ?? 0,
    total: v.total,
    method: (v.Paiement?.[0]?.moyen ?? "—") as Receipt["method"],
  }));
}

export interface DaySummary {
  total: number;
  count: number;
}
/** Total + nombre de ventes de la journée en cours (fuseau local). */
export async function fetchDaySummary(): Promise<DaySummary> {
  const supabase = createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("Vente")
    .select("total")
    .gte("dateHeure", start.toISOString());
  if (error) throw error;
  const rows = (data as unknown as { total: number }[]) ?? [];
  return { total: rows.reduce((s, r) => s + (r.total ?? 0), 0), count: rows.length };
}

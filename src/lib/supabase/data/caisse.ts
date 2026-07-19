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

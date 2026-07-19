/**
 * Listes d'options (id + libellé) pour les <select> des formulaires finance.
 * Chaque requête est soumise à la RLS de lecture de la table concernée.
 */
import { createClient } from "@/lib/supabase/client";

export interface Opt {
  id: string;
  label: string;
}
export interface InvoiceOpt extends Opt {
  amount: number;
}

export async function fetchClientOptions(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s
    .from("Client")
    .select("id,raisonSociale")
    .order("raisonSociale");
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, label: c.raisonSociale }));
}

export async function fetchSiteOptions(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s.from("Site").select("id,nom").order("nom");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, label: r.nom }));
}

export async function fetchCompteOptions(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s
    .from("CompteBancaire")
    .select("id,nom")
    .order("nom");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, label: r.nom }));
}

export async function fetchProspectOptions(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s
    .from("Prospect")
    .select("id,raisonSociale")
    .order("raisonSociale");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, label: r.raisonSociale }));
}

/** Factures (pour rattacher un encaissement). */
export async function fetchInvoiceOptions(): Promise<InvoiceOpt[]> {
  const s = createClient();
  const { data, error } = await s
    .from("Facture")
    .select("id,numero,montantTTC")
    .order("dateEmission", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    label: r.numero,
    amount: Number(r.montantTTC) || 0,
  }));
}

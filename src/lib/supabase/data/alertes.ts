/**
 * Alertes dérivées des données réelles (aucune table dédiée) : factures en
 * retard, contrats bientôt expirés, stock bas. Ce que l'utilisateur voit dépend
 * de la RLS des tables sous-jacentes.
 */
import { createClient } from "@/lib/supabase/client";

export type AlertSeverity = "critique" | "attention" | "info";

export interface Alerte {
  id: string;
  severity: AlertSeverity;
  kind: "facture" | "contrat" | "stock";
  title: string;
  description: string;
  entity: string;
  action: string;
}

const num = (v: unknown) => Number(v) || 0;

export async function fetchAlertes(): Promise<Alerte[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [fac, ctr, prod] = await Promise.all([
    supabase.from("Facture").select("id,numero,montantTTC,statut,dateEcheance").eq("statut", "EN_RETARD"),
    supabase.from("Contrat").select("id,numero,dateFin,Client(raisonSociale)").not("dateFin", "is", null).lte("dateFin", in30).gte("dateFin", today),
    supabase.from("Produit").select("id,nom,stock,seuilAlerte"),
  ]);

  const out: Alerte[] = [];

  for (const f of (fac.data as { id: string; numero: string; montantTTC: number }[] | null) ?? []) {
    out.push({
      id: `fac-${f.id}`,
      severity: "critique",
      kind: "facture",
      title: "Facture en retard",
      description: `${f.numero} · ${num(f.montantTTC).toLocaleString("fr-FR")} FCFA`,
      entity: f.numero,
      action: "Relancer",
    });
  }

  for (const c of (ctr.data as { id: string; numero: string; dateFin: string; Client: { raisonSociale: string } | { raisonSociale: string }[] | null }[] | null) ?? []) {
    const client = Array.isArray(c.Client) ? c.Client[0] : c.Client;
    out.push({
      id: `ctr-${c.id}`,
      severity: "attention",
      kind: "contrat",
      title: "Contrat bientôt expiré",
      description: `${c.numero}${client ? ` · ${client.raisonSociale}` : ""} · échéance ${new Date(c.dateFin).toLocaleDateString("fr-FR")}`,
      entity: c.numero,
      action: "Renouveler",
    });
  }

  for (const p of (prod.data as { id: string; nom: string; stock: number; seuilAlerte: number }[] | null) ?? []) {
    if (num(p.stock) <= num(p.seuilAlerte)) {
      out.push({
        id: `stk-${p.id}`,
        severity: p.stock === 0 ? "critique" : "attention",
        kind: "stock",
        title: p.stock === 0 ? "Rupture de stock" : "Stock bas",
        description: `${p.nom} · ${p.stock} en stock (seuil ${p.seuilAlerte})`,
        entity: p.nom,
        action: "Réapprovisionner",
      });
    }
  }

  const rank: Record<AlertSeverity, number> = { critique: 0, attention: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

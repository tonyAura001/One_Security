"use client";

import { useMutation } from "@tanstack/react-query";
import { Database, Download } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { downloadCsv } from "@/lib/csv";
import { fetchMembers } from "@/lib/supabase/data/members";
import { fetchReceipts } from "@/lib/supabase/data/caisse";
import { fetchInvoices } from "@/lib/supabase/data/invoices";

type Row = (string | number)[];

const DATASETS: {
  key: string;
  label: string;
  detail: string;
  file: string;
  load: () => Promise<Row[]>;
}[] = [
  {
    key: "membres",
    label: "Utilisateurs",
    detail: "Comptes membres, rôles et statuts",
    file: "membres",
    load: async () => {
      const m = await fetchMembers();
      return [["Nom", "E-mail", "Téléphone", "Rôle", "Statut"], ...m.map((x) => [x.name, x.email, x.phone, x.roleLabel, x.statut])];
    },
  },
  {
    key: "factures",
    label: "Factures",
    detail: "Facturation clients (montants, statuts)",
    file: "factures",
    load: async () => {
      const f = await fetchInvoices();
      return [["Référence", "Client", "Montant", "Statut", "Échéance"], ...f.map((x) => [x.ref, x.client, x.amount, x.status, x.due])];
    },
  },
  {
    key: "recus",
    label: "Ventes boutique",
    detail: "Reçus de caisse (montants, moyens)",
    file: "ventes-boutique",
    load: async () => {
      const r = await fetchReceipts();
      return [["Référence", "Heure", "Articles", "Total", "Moyen"], ...r.map((x) => [x.ref, x.time, x.items, x.total, x.method])];
    },
  },
];

export function DonneesScreen() {
  const exporter = useMutation({
    mutationFn: async (d: (typeof DATASETS)[number]) => {
      const rows = await d.load();
      downloadCsv(d.file, rows);
      return d.label;
    },
    onSuccess: (label) => toast.success(`Export « ${label} » téléchargé`),
    onError: () => toast.error("Export refusé (accès requis pour ce jeu de données)."),
  });

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Données &amp; conformité</h1>
          <p className="page-subtitle">Export et gouvernance des données</p>
        </div>
      </div>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-3.5 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
          <Database className="size-4" /> Exports de données (Excel/CSV)
        </div>
        <div className="flex flex-col gap-2.5">
          {DATASETS.map((d) => (
            <div key={d.key} className="border-border bg-surface2 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <div className="min-w-0">
                <div className="text-foreground text-[13px] font-bold">{d.label}</div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{d.detail}</div>
              </div>
              <Button size="sm" disabled={exporter.isPending} onClick={() => exporter.mutate(d)}>
                <Download className="size-4" /> Exporter
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-2 text-[14px] font-extrabold">Sauvegardes & conformité</div>
        <div className="text-muted text-[12px] font-semibold leading-[1.6]">
          Sauvegardes automatiques quotidiennes gérées par Supabase (Point-in-Time Recovery
          selon l&apos;abonnement). Les données sont protégées par isolation par rôle (RLS) sur
          l&apos;ensemble des tables. Registre de traitement APDP (Sénégal) à tenir par la Direction.
        </div>
      </Card>
    </ScreenContainer>
  );
}

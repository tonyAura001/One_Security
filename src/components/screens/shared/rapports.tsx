"use client";

import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, ShoppingCart, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import type { Tone } from "@/lib/colors";
import { toast } from "@/lib/toast";
import { downloadCsv } from "@/lib/csv";
import { fetchInvoices } from "@/lib/supabase/data/invoices";
import { fetchMembers } from "@/lib/supabase/data/members";
import { fetchReceipts } from "@/lib/supabase/data/caisse";

type Row = (string | number)[];

const REPORTS: {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  file: string;
  load: () => Promise<Row[]>;
}[] = [
  {
    key: "financier",
    title: "Rapport financier — factures",
    description: "Toutes les factures (montants, statuts, échéances)",
    icon: FileText,
    tone: "danger",
    file: "rapport-factures",
    load: async () => {
      const f = await fetchInvoices();
      return [["Référence", "Client", "Montant", "Statut", "Échéance"], ...f.map((x) => [x.ref, x.client, x.amount, x.status, x.due])];
    },
  },
  {
    key: "recouvrement",
    title: "État de recouvrement",
    description: "Factures en retard à relancer",
    icon: FileSpreadsheet,
    tone: "warning",
    file: "recouvrement",
    load: async () => {
      const f = (await fetchInvoices()).filter((x) => x.status === "retard");
      return [["Référence", "Client", "Montant", "Échéance"], ...f.map((x) => [x.ref, x.client, x.amount, x.due])];
    },
  },
  {
    key: "rh",
    title: "Rapport RH & effectifs",
    description: "Membres, rôles et statuts",
    icon: Users,
    tone: "accent",
    file: "rapport-rh",
    load: async () => {
      const m = await fetchMembers();
      return [["Nom", "E-mail", "Téléphone", "Rôle", "Statut"], ...m.map((x) => [x.name, x.email, x.phone, x.roleLabel, x.statut])];
    },
  },
  {
    key: "caisse",
    title: "Rapport de caisse (boutique)",
    description: "Reçus de ventes",
    icon: ShoppingCart,
    tone: "success",
    file: "rapport-caisse",
    load: async () => {
      const r = await fetchReceipts();
      return [["Référence", "Heure", "Articles", "Total", "Moyen"], ...r.map((x) => [x.ref, x.time, x.items, x.total, x.method])];
    },
  },
];

export function SharedRapports() {
  const gen = useMutation({
    mutationFn: async (r: (typeof REPORTS)[number]) => {
      const rows = await r.load();
      downloadCsv(r.file, rows);
      return r.title;
    },
    onSuccess: (t) => toast.success(`« ${t} » exporté`),
    onError: () => toast.error("Export refusé (accès requis pour ce rapport)."),
  });

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">Génération et export des rapports à partir des données réelles</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.key} className="flex items-center gap-3.5 p-[16px_18px]">
            <IconTile icon={r.icon} tone={r.tone} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-[13.5px] font-bold">{r.title}</div>
              <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{r.description}</div>
            </div>
            <Button size="sm" variant="outline" disabled={gen.isPending} onClick={() => gen.mutate(r)}>
              <FileSpreadsheet className="size-4" /> Exporter
            </Button>
          </Card>
        ))}
      </div>
    </ScreenContainer>
  );
}

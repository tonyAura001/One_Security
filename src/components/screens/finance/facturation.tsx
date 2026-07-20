"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Banknote, Clock, Plus, Target } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Segmented } from "@/components/ui/segmented";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { DataTable } from "@/components/ui/data-table";
import { formatDateFR, formatFCFA, formatNumberFR } from "@/lib/format";
import { fetchInvoices } from "@/lib/supabase/data/invoices";
import { fetchContracts } from "@/lib/supabase/data/contracts";
import { fetchQuotes } from "@/lib/supabase/data/quotes";
import { FactureEditor } from "./facture-editor";
import { DevisEditor } from "./devis-editor";
import { ContratEditor } from "./contrat-editor";
import type {
  Contract,
  ContractStatus,
  Invoice,
  InvoiceStatus,
  Quote,
  QuoteStatus,
} from "@/lib/api/types";

type FinanceTab = "factures" | "devis" | "contrats";

const INVOICE_STATUS: Record<
  InvoiceStatus,
  { variant: PillVariant; label: string }
> = {
  payee: { variant: "success", label: "Payée" },
  envoyee: { variant: "info", label: "Envoyée" },
  retard: { variant: "danger", label: "En retard" },
  brouillon: { variant: "neutral", label: "Brouillon" },
};

const QUOTE_STATUS: Record<
  QuoteStatus,
  { variant: PillVariant; label: string }
> = {
  signe: { variant: "success", label: "Signé" },
  negociation: { variant: "warning", label: "Négociation" },
  envoye: { variant: "info", label: "Envoyé" },
  brouillon: { variant: "neutral", label: "Brouillon" },
};

const CONTRACT_STATUS: Record<
  ContractStatus,
  { variant: PillVariant; label: string }
> = {
  actif: { variant: "success", label: "Actif" },
  expirant: { variant: "warning", label: "Expirant" },
  expire: { variant: "danger", label: "Expiré" },
};

const makeInvoiceColumns = (
  onEdit: (id: string) => void,
): ColumnDef<Invoice>[] => [
  {
    accessorKey: "ref",
    header: "N° Facture",
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onEdit(row.original.id)}
        className="tnum text-foreground hover:text-accent text-[12px] font-extrabold transition-colors hover:underline"
      >
        {row.original.ref}
      </button>
    ),
  },
  { accessorKey: "client", header: "Client" },
  {
    accessorKey: "amount",
    header: "Montant",
    cell: ({ row }) => (
      <span className="tnum font-extrabold">
        {formatFCFA(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: "due",
    header: "Échéance",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {formatDateFR(row.original.due)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = INVOICE_STATUS[row.original.status];
      return (
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <Button
          size="xs"
          variant="outline"
          onClick={() => onEdit(row.original.id)}
        >
          Ouvrir
        </Button>
      </div>
    ),
  },
];

const quoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "ref",
    header: "N° Devis",
    cell: ({ row }) => (
      <span className="tnum text-foreground text-[12px] font-extrabold">
        {row.original.ref}
      </span>
    ),
  },
  { accessorKey: "client", header: "Client" },
  {
    accessorKey: "amount",
    header: "Montant",
    cell: ({ row }) => (
      <span className="tnum font-extrabold">
        {formatFCFA(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: "created",
    header: "Créé le",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {formatDateFR(row.original.created)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = QUOTE_STATUS[row.original.status];
      return (
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      );
    },
  },
];

const contractColumns: ColumnDef<Contract>[] = [
  {
    accessorKey: "ref",
    header: "N° Contrat",
    cell: ({ row }) => (
      <span className="tnum text-foreground text-[12px] font-extrabold">
        {row.original.ref}
      </span>
    ),
  },
  { accessorKey: "client", header: "Client" },
  {
    accessorKey: "monthly",
    header: "Valeur mensuelle",
    cell: ({ row }) => (
      <span className="tnum font-extrabold">
        {formatFCFA(row.original.monthly)}
      </span>
    ),
  },
  {
    accessorKey: "end",
    header: "Échéance",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {formatDateFR(row.original.end)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = CONTRACT_STATUS[row.original.status];
      return (
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      );
    },
  },
];

const sum = (rows: { amount: number }[]): number =>
  rows.reduce((total, r) => total + r.amount, 0);

const TAB_LABELS: Record<FinanceTab, { cta: string; placeholder: string }> = {
  factures: { cta: "Nouvelle facture", placeholder: "Rechercher une facture…" },
  devis: { cta: "Nouveau devis", placeholder: "Rechercher un devis…" },
  contrats: { cta: "Nouveau contrat", placeholder: "Rechercher un contrat…" },
};

export function FinanceFacturation() {
  const [tab, setTab] = useState<FinanceTab>("factures");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);

  // Factures réelles via Supabase (RLS finance).
  const { data } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });
  const invoices = data ?? [];

  // Contrats réels via Supabase (RLS).
  const contractsQuery = useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });
  const contracts = contractsQuery.data ?? [];

  // Devis réels via Supabase (RLS).
  const quotesQuery = useQuery({ queryKey: ["quotes"], queryFn: fetchQuotes });
  const quotes = quotesQuery.data ?? [];

  const paid = invoices.filter((i) => i.status === "payee");
  const sent = invoices.filter((i) => i.status === "envoyee");
  const late = invoices.filter((i) => i.status === "retard");
  const encaisse = sum(paid);
  const attente = sum(sent);
  const retard = sum(late);
  const totalFacture = encaisse + attente + retard;
  const recouvrement =
    totalFacture > 0 ? Math.round((encaisse / totalFacture) * 100) : 0;

  const meta = TAB_LABELS[tab];

  if (creatingInvoice || editingInvoiceId) {
    return (
      <FactureEditor
        invoiceId={editingInvoiceId ?? undefined}
        onClose={() => {
          setCreatingInvoice(false);
          setEditingInvoiceId(null);
        }}
      />
    );
  }

  if (creatingQuote) {
    return <DevisEditor onClose={() => setCreatingQuote(false)} />;
  }

  if (creatingContract) {
    return <ContratEditor onClose={() => setCreatingContract(false)} />;
  }

  const invoiceColumns = makeInvoiceColumns(setEditingInvoiceId);

  return (
    <ScreenContainer>
      {/* KPI summary row */}
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          tone="success"
          value={formatNumberFR(encaisse)}
          unit="FCFA"
          label="CA encaissé"
          hint="Ce mois"
        />
        <KpiCard
          icon={Clock}
          tone="accent"
          value={formatNumberFR(attente)}
          unit="FCFA"
          label="En attente"
          hint={`${sent.length} factures envoyées`}
        />
        <KpiCard
          icon={AlertTriangle}
          tone="danger"
          value={formatNumberFR(retard)}
          unit="FCFA"
          label="En retard"
          hint={`${late.length} factures`}
          valueTone="danger"
        />
        <KpiCard
          icon={Target}
          tone="warning"
          value={String(recouvrement)}
          unit="%"
          label="Taux de recouvrement"
          progress={{ value: recouvrement, tone: "warning" }}
        />
      </div>

      {/* Tabbed tables */}
      <Card className="p-[18px_20px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented<FinanceTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "factures", label: "Factures" },
              { value: "devis", label: "Devis" },
              { value: "contrats", label: "Contrats" },
            ]}
          />
          {tab === "factures" && (
            <Button size="sm" onClick={() => setCreatingInvoice(true)}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              Nouvelle facture
            </Button>
          )}
          {tab === "devis" && (
            <Button size="sm" onClick={() => setCreatingQuote(true)}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              Nouveau devis
            </Button>
          )}
          {tab === "contrats" && (
            <Button size="sm" onClick={() => setCreatingContract(true)}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              Nouveau contrat
            </Button>
          )}
        </div>

        {tab === "factures" && (
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            searchable
            searchPlaceholder={meta.placeholder}
            emptyTitle="Aucune facture"
          />
        )}
        {tab === "devis" && (
          <DataTable
            columns={quoteColumns}
            data={quotes}
            searchable
            searchPlaceholder={meta.placeholder}
            emptyTitle="Aucun devis"
          />
        )}
        {tab === "contrats" && (
          <DataTable
            columns={contractColumns}
            data={contracts}
            searchable
            searchPlaceholder={meta.placeholder}
            emptyTitle="Aucun contrat"
          />
        )}
      </Card>
    </ScreenContainer>
  );
}

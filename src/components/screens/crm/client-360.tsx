"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  ScrollText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateFR, formatFCFA, formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/colors";
import { fetchClientDetail } from "@/lib/supabase/data/client-detail";
import type { Client } from "@/lib/api/types";

function initials(name: string): string {
  return name
    .replace(/[()]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
function healthTone(h: number): Tone {
  if (h >= 80) return "success";
  if (h >= 65) return "warning";
  return "danger";
}

const CONTRAT_META: Record<string, { v: PillVariant; l: string }> = {
  actif: { v: "success", l: "Actif" },
  expirant: { v: "warning", l: "Expirant" },
  expire: { v: "danger", l: "Expiré" },
};
function factureMeta(statut: string): { v: PillVariant; l: string } {
  switch (statut) {
    case "PAYEE":
      return { v: "success", l: "Payée" };
    case "EN_RETARD":
      return { v: "danger", l: "En retard" };
    case "LITIGE":
      return { v: "danger", l: "Litige" };
    case "ANNULEE":
      return { v: "neutral", l: "Annulée" };
    case "ENVOYEE":
      return { v: "info", l: "Envoyée" };
    default:
      return { v: "warning", l: "Émise" };
  }
}

type Tab = "contrats" | "factures" | "devis" | "sites" | "contacts";

/** Fiche client 360° plein écran — tout ce qui est rattaché au client. */
export function Client360({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("contrats");
  const { data, isLoading } = useQuery({
    queryKey: ["client-detail", client.id],
    queryFn: () => fetchClientDetail(client.id, client.name),
  });

  const tone = healthTone(client.health);
  const tel = client.phone && client.phone !== "—" ? client.phone : "";

  const TABS: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "contrats", label: "Contrats", icon: ScrollText, count: data?.contrats.length },
    { id: "factures", label: "Factures", icon: ReceiptText, count: data?.factures.length },
    { id: "devis", label: "Devis", icon: FileText, count: data?.devis.length },
    { id: "sites", label: "Sites", icon: MapPin, count: data?.sites.length },
    { id: "contacts", label: "Contacts", icon: Users, count: data?.contacts.length },
  ];

  return (
    <ScreenContainer>
      {/* En-tête */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <span className="bg-accent/14 text-accent flex size-11 flex-none items-center justify-center rounded-[13px] text-[15px] font-extrabold">
          {initials(client.name)}
        </span>
        <div className="min-w-0">
          <div className="text-foreground text-[17px] font-extrabold tracking-[-0.3px]">
            {client.name}
          </div>
          <div className="text-muted text-[12px] font-semibold">
            {client.sector} · Client depuis {formatDateFR(client.since)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tel && (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${tel.replace(/\s/g, "")}`}>
                <Phone className="size-4" /> Appeler
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="CA mensuel récurrent" value={formatFCFACompact(client.monthly)} unit="FCFA" />
        <Kpi label="CA facturé (total)" value={formatFCFACompact(data?.caFacture ?? 0)} unit="FCFA" />
        <Kpi
          label="Encours impayé"
          value={formatFCFACompact(data?.encours ?? 0)}
          unit="FCFA"
          tone={data && data.encours > 0 ? "danger" : undefined}
        />
        <Kpi label="Contrats actifs" value={String(data?.contratsActifs ?? 0)} />
        <div className="border-border bg-surface2 rounded-xl border p-3.5">
          <div className="mb-1 flex justify-between">
            <span className="text-muted text-[10.5px] font-bold">Santé</span>
            <span className={cn("text-[12px] font-extrabold", toneText[tone])}>
              {client.health}/100
            </span>
          </div>
          <ProgressBar value={client.health} tone={tone} height={6} />
        </div>
      </div>

      {/* Onglets */}
      <Card className="p-1.5">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-none items-center gap-2 rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap transition-colors",
                  active ? "bg-accent/14 text-accent" : "text-muted hover:bg-hover hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                {t.label}
                {typeof t.count === "number" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-extrabold",
                      active ? "bg-accent/20" : "bg-hover",
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mt-[15px]">
        {isLoading ? (
          <div className="text-muted flex items-center justify-center gap-2 py-16 text-[13px] font-semibold">
            <Loader2 className="size-4 animate-spin" /> Chargement de la fiche client…
          </div>
        ) : !data ? (
          <EmptyState title="Aucune donnée accessible (droits requis)." />
        ) : (
          <Card className="p-[18px_20px]">
            {tab === "contrats" && (
              <Table
                head={["N°", "Type", "Montant HT/mois", "Période", "Statut"]}
                rows={data.contrats.map((c) => [
                  c.numero,
                  c.type,
                  <span key="m" className="tnum font-bold">{formatFCFA(c.montantHT)}</span>,
                  `${c.dateDebut ? formatDateFR(c.dateDebut, "dd/MM/yy") : "—"} → ${c.dateFin ? formatDateFR(c.dateFin, "dd/MM/yy") : "—"}`,
                  <StatusPill key="s" variant={CONTRAT_META[c.status].v} uppercase>
                    {CONTRAT_META[c.status].l}
                  </StatusPill>,
                ])}
                empty="Aucun contrat pour ce client."
              />
            )}
            {tab === "factures" && (
              <Table
                head={["N°", "Émise le", "Échéance", "Montant TTC", "Statut"]}
                rows={data.factures.map((f) => [
                  f.numero,
                  f.dateEmission ? formatDateFR(f.dateEmission, "dd/MM/yy") : "—",
                  f.dateEcheance ? formatDateFR(f.dateEcheance, "dd/MM/yy") : "—",
                  <span key="m" className="tnum font-bold">{formatFCFA(f.montantTTC)}</span>,
                  <StatusPill key="s" variant={factureMeta(f.statut).v} uppercase>
                    {factureMeta(f.statut).l}
                  </StatusPill>,
                ])}
                empty="Aucune facture pour ce client."
                footer={
                  data.factures.length > 0
                    ? ["", "", "Encours impayé", <span key="e" className="tnum text-danger font-extrabold">{formatFCFA(data.encours)}</span>, ""]
                    : undefined
                }
              />
            )}
            {tab === "devis" && (
              <>
                <Table
                  head={["N°", "Date", "Montant TTC", "Statut"]}
                  rows={data.devis.map((d) => [
                    d.numero,
                    d.date ? formatDateFR(d.date, "dd/MM/yy") : "—",
                    <span key="m" className="tnum font-bold">{formatFCFA(d.totalTTC)}</span>,
                    <StatusPill key="s" variant="info" uppercase>{d.statut}</StatusPill>,
                  ])}
                  empty="Aucun devis rattaché (les devis sont liés aux prospects du Pipeline)."
                />
                <p className="text-muted mt-3 text-[10.5px] font-medium">
                  Rattachement par correspondance de raison sociale (prospect ↔ client).
                </p>
              </>
            )}
            {tab === "sites" && (
              <Table
                head={["Nom du site", "Adresse", "Type"]}
                rows={data.sites.map((s) => [s.nom, s.adresse, s.type])}
                empty="Aucun site protégé enregistré."
              />
            )}
            {tab === "contacts" && (
              <Table
                head={["Nom", "Rôle", "Téléphone"]}
                rows={data.contacts.map((c) => [c.nom, c.role, c.telephone])}
                empty="Aucun contact renseigné."
              />
            )}
          </Card>
        )}
      </div>
    </ScreenContainer>
  );
}

function Kpi({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: Tone;
}) {
  return (
    <div className="border-border bg-surface2 rounded-xl border p-3.5">
      <div className="text-muted text-[10.5px] font-semibold">{label}</div>
      <div
        className={cn(
          "tnum mt-1 text-[16px] font-extrabold",
          tone ? toneText[tone] : "text-foreground",
        )}
      >
        {value}
        {unit && <span className="text-muted ml-1 text-[10px] font-bold">{unit}</span>}
      </div>
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
  footer,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
  footer?: React.ReactNode[];
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="border-border border-b">
            {head.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "text-muted px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.4px] uppercase",
                  i >= 2 && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-border border-b last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "text-foreground px-2 py-3 text-[12.5px] font-semibold",
                    ci >= 2 && "text-right",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-border border-t-2">
              {footer.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "text-foreground px-2 py-2.5 text-[12px] font-bold",
                    ci >= 2 && "text-right",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

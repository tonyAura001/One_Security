"use client";

import { useQuery } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  IdCard,
  Phone,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Segmented } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  cardNeedsRenewal,
  daysUntilCardExpiry,
  AGENT_STATUS_META,
  POSTE_META,
  type Agent,
  type AgentStatus,
} from "@/lib/api/agents";
import { fetchAgents, computeAgentStats } from "@/lib/supabase/data/agents";
import { AgentEditDialog } from "./agent-edit-dialog";
import { NewAgentDialog } from "./new-agent-dialog";
import { toneText } from "@/lib/colors";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "tous", label: "Tous" },
  { value: "en_poste", label: "En poste" },
  { value: "repos", label: "Repos" },
  { value: "conge", label: "Congé" },
  { value: "suspendu", label: "Suspendu" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

function useColumns(onSelect: (a: Agent) => void): ColumnDef<Agent>[] {
  return [
    {
      accessorKey: "name",
      header: "Agent",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <span className="bg-accent/14 text-accent flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-extrabold">
            {row.original.initials}
          </span>
          <div className="min-w-0">
            <div className="text-foreground font-bold">{row.original.name}</div>
            <div className="text-muted text-[11px] font-semibold">
              {row.original.matricule}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "poste",
      header: "Poste",
      cell: ({ row }) => {
        const meta = POSTE_META[row.original.poste];
        return (
          <span className={cn("font-bold", toneText[meta.tone])}>
            {meta.label}
          </span>
        );
      },
    },
    {
      accessorKey: "site",
      header: "Site affecté",
      cell: ({ row }) => (
        <span className="text-muted font-semibold">{row.original.site}</span>
      ),
    },
    {
      id: "card",
      accessorFn: (r) => r.cardExpiry,
      header: "Carte pro",
      cell: ({ row }) => {
        const renew = cardNeedsRenewal(row.original);
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted tnum font-semibold whitespace-nowrap">
              {formatDateFR(row.original.cardExpiry, "d MMM yyyy")}
            </span>
            {renew && (
              <StatusPill variant="warning" uppercase>
                À renouveler
              </StatusPill>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const meta = AGENT_STATUS_META[row.original.status];
        return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="xs" onClick={() => onSelect(row.original)}>
            Détail
          </Button>
        </div>
      ),
    },
  ];
}

export function AgentsScreen() {
  // Agents réels via Supabase (RLS).
  const agentsQ = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const allAgents = agentsQ.data ?? [];
  const stats = useMemo(() => computeAgentStats(allAgents), [allAgents]);
  const [status, setStatus] = useState<StatusFilter>("tous");
  const [site, setSite] = useState<string>("tous");
  const [selected, setSelected] = useState<Agent | null>(null);

  const sites = useMemo(
    () => Array.from(new Set(allAgents.map((a) => a.site))).sort(),
    [allAgents],
  );

  const agents = useMemo(
    () =>
      allAgents.filter(
        (a) =>
          (status === "tous" || a.status === (status as AgentStatus)) &&
          (site === "tous" || a.site === site),
      ),
    [allAgents, status, site],
  );

  const columns = useColumns(setSelected);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">
            Annuaire opérationnel · cartes pro Décret 2018-671
          </p>
        </div>
        <NewAgentDialog />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="accent"
          value={String(stats.active)}
          label="Agents actifs"
        />
        <KpiCard
          icon={UserCheck}
          tone="success"
          value={String(stats.onDuty)}
          label="En poste maintenant"
        />
        <KpiCard
          icon={IdCard}
          tone="warning"
          value={String(stats.cardsToRenew)}
          label="Cartes pro à renouveler"
          hint="Échéance < 90 jours"
          hintTone="warning"
        />
        <KpiCard
          icon={BadgeCheck}
          tone="violet"
          value={`${stats.attendanceRate} %`}
          label="Taux de présence"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={agents}
          searchable
          searchPlaceholder="Rechercher un agent, un matricule…"
          exportFilename="agents-securite"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
                size="sm"
              />
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                aria-label="Filtrer par site"
                className="border-border bg-surface2 text-foreground rounded-[10px] border px-3 py-2 text-[12px] font-semibold outline-none"
              >
                <option value="tous">Tous les sites</option>
                {sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          }
          emptyTitle="Aucun agent"
          emptyDescription="Aucun agent ne correspond à ces filtres."
        />
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected && <AgentDetail agent={selected} />}
        </SheetContent>
      </Sheet>
    </ScreenContainer>
  );
}

function AgentDetail({ agent }: { agent: Agent }) {
  const posteMeta = POSTE_META[agent.poste];
  const statusMeta = AGENT_STATUS_META[agent.status];
  const days = daysUntilCardExpiry(agent);
  const renew = cardNeedsRenewal(agent);

  return (
    <>
      <SheetHeader className="border-border border-b">
        <div className="flex items-center gap-3">
          <span className="bg-accent/14 text-accent flex size-11 flex-none items-center justify-center rounded-[13px] text-[15px] font-extrabold">
            {agent.initials}
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-foreground text-base font-extrabold">
              {agent.name}
            </SheetTitle>
            <SheetDescription className="text-muted font-semibold">
              {agent.matricule} · {posteMeta.label}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <StatusPill variant={statusMeta.variant} dot>
            {statusMeta.label}
          </StatusPill>
          <span className="text-muted text-[12px] font-semibold">
            Présence {agent.attendanceRate} %
          </span>
          <span className="ml-auto">
            <AgentEditDialog agentId={agent.id} />
          </span>
        </div>

        {/* Carte pro */}
        <div
          className={cn(
            "rounded-xl border p-3.5",
            renew
              ? "border-warning/40 bg-warning/[0.07]"
              : "border-border bg-surface2",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-2 text-[12px] font-bold">
              <IdCard className="size-4" /> Carte pro · Décret 2018-671
            </span>
            {renew ? (
              <StatusPill variant="warning" uppercase>
                <ShieldAlert className="size-3" /> À renouveler
              </StatusPill>
            ) : (
              <StatusPill variant="success" uppercase>
                Valide
              </StatusPill>
            )}
          </div>
          <div className="text-foreground mt-2 text-[13px] font-bold">
            Expire le {formatDateFR(agent.cardExpiry)}
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            {days >= 0 ? `${days} jours restants` : `Expirée depuis ${-days} jours`}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <DetailRow icon={Phone} label="Téléphone" value={agent.phone} />
          <DetailRow icon={Users} label="Site actuel" value={agent.site} />
        </div>

        <section>
          <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.5px] uppercase">
            Certifications
          </div>
          <div className="flex flex-wrap gap-1.5">
            {agent.certifications.map((c) => (
              <span
                key={c}
                className="bg-surface2 text-foreground border-border rounded-full border px-2.5 py-1 text-[11px] font-bold"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        <div className="flex gap-2 pt-1">
          {agent.phone && agent.phone !== "—" ? (
            <Button size="sm" className="flex-1" asChild>
              <a href={`tel:${agent.phone.replace(/\s/g, "")}`}>
                Appeler {agent.name}
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1" disabled>
              Aucun numéro renseigné
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex items-center gap-2 text-[12px] font-semibold">
        <Icon className="size-4" strokeWidth={1.8} />
        {label}
      </span>
      <span className="text-foreground text-[12.5px] font-bold">{value}</span>
    </div>
  );
}

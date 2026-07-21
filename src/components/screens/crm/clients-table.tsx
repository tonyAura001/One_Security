"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/colors";
import type { Client, ClientStatus } from "@/lib/api/types";

const STATUS_META: Record<ClientStatus, { variant: PillVariant; label: string }> = {
  actif: { variant: "success", label: "Actif" },
  prospect: { variant: "info", label: "Prospect" },
  risque: { variant: "danger", label: "À risque" },
};

export function healthTone(h: number): Tone {
  if (h >= 80) return "success";
  if (h >= 65) return "warning";
  return "danger";
}

export function clientInitials(name: string): string {
  return name
    .replace(/[()]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Tableau clients searchable et responsive — colonnes façon fiche portefeuille
 * (raison sociale, secteur, téléphone, score, CA mensuel, contrats) + action
 * « Détails » ouvrant la fiche 360°. Partagé par /crm et /acces.
 */
export function ClientsTable({
  clients,
  onDetails,
}: {
  clients: Client[];
  onDetails: (client: Client) => void;
}) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) =>
      [c.name, c.sector, c.phone, c.contact].some((v) =>
        (v ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [clients, q]);

  return (
    <Card className="p-[18px_20px]">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un client…"
            className="border-border bg-surface2 text-foreground focus:border-accent/50 w-full rounded-[10px] border py-2 pr-3 pl-9 text-[13px] font-semibold outline-none"
          />
        </div>
        <span className="text-muted flex-none text-[12px] font-bold">
          {rows.length} résultat{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-border border-b">
              {["Raison sociale", "Secteur", "Téléphone", "Score", "CA mensuel", "Contrats", "Statut", ""].map(
                (h, i) => (
                  <th
                    key={h || i}
                    className={cn(
                      "text-muted px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.4px] uppercase",
                      (i === 3 || i === 4 || i === 5) && "text-right",
                    )}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const meta = STATUS_META[c.status];
              const tone = healthTone(c.health);
              return (
                <tr
                  key={c.id}
                  className="border-border hover:bg-hover/50 border-b transition-colors last:border-0"
                >
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-accent/14 text-accent flex size-8 flex-none items-center justify-center rounded-[10px] text-[11px] font-extrabold">
                        {clientInitials(c.name)}
                      </span>
                      <span className="text-foreground text-[12.5px] font-bold">{c.name}</span>
                    </div>
                  </td>
                  <td className="text-muted px-2 py-3 text-[12px] font-semibold">{c.sector}</td>
                  <td className="text-muted px-2 py-3 text-[12px] font-semibold">{c.phone}</td>
                  <td className={cn("px-2 py-3 text-right text-[12.5px] font-extrabold", toneText[tone])}>
                    {c.health}/100
                  </td>
                  <td className="text-foreground tnum px-2 py-3 text-right text-[12.5px] font-bold">
                    {formatFCFA(c.monthly)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="border-border bg-surface2 text-foreground inline-block min-w-[28px] rounded-[8px] border px-2 py-0.5 text-center text-[11.5px] font-bold">
                      {c.contracts ?? 0}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <StatusPill variant={meta.variant} uppercase>{meta.label}</StatusPill>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button size="xs" variant="outline" onClick={() => onDetails(c)}>
                      Détails <ArrowRight className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

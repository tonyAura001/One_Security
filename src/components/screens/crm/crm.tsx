"use client";

import { useState } from "react";
import { Building2, MapPin, Phone, Plus, User } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatDateFR, formatFCFA, formatFCFACompact } from "@/lib/format";
import { CLIENTS } from "@/lib/api/data";
import type { Client, ClientStatus } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText } from "@/lib/colors";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  ClientStatus,
  { variant: PillVariant; label: string }
> = {
  actif: { variant: "success", label: "Actif" },
  prospect: { variant: "info", label: "Prospect" },
  risque: { variant: "danger", label: "À risque" },
};

function healthTone(health: number): Tone {
  if (health >= 80) return "success";
  if (health >= 65) return "warning";
  return "danger";
}

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

export function CrmClients() {
  const [selectedId, setSelectedId] = useState<string>(CLIENTS[0].id);
  const selected = CLIENTS.find((c) => c.id === selectedId) ?? CLIENTS[0];
  const activeCount = CLIENTS.filter((c) => c.status === "actif").length;

  return (
    <ScreenContainer>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">
          Portefeuille clients · {activeCount} comptes actifs
        </div>
        <Button
          size="sm"
          onClick={() =>
            toast.success("« Nouveau client » — formulaire ouvert")
          }
        >
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouveau client
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[1.5fr_1fr]">
        {/* Client list */}
        <Card className="flex flex-col gap-2 p-3">
          {CLIENTS.map((client) => {
            const active = client.id === selectedId;
            const meta = STATUS_META[client.status];
            const tone = healthTone(client.health);
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedId(client.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-colors",
                  active
                    ? "border-accent/40 bg-accent/[0.06]"
                    : "border-border bg-surface2 hover:bg-hover",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-[38px] flex-none items-center justify-center rounded-[11px] text-[13px] font-extrabold",
                      "bg-accent/14 text-accent",
                    )}
                  >
                    {initials(client.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-[13px] font-extrabold">
                      {client.name}
                    </div>
                    <div className="text-muted text-[11px] font-semibold">
                      {client.sector} · {client.sites} site
                      {client.sites > 1 ? "s" : ""}
                    </div>
                  </div>
                  <StatusPill variant={meta.variant} uppercase>
                    {meta.label}
                  </StatusPill>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between">
                      <span className="text-muted text-[10px] font-bold">
                        Santé
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-extrabold",
                          toneText[tone],
                        )}
                      >
                        {client.health}
                      </span>
                    </div>
                    <ProgressBar value={client.health} tone={tone} height={5} />
                  </div>
                  <div className="text-right">
                    <div className="text-muted text-[10px] font-semibold">
                      CA mensuel
                    </div>
                    <div className="tnum text-foreground text-[12.5px] font-extrabold">
                      {formatFCFACompact(client.monthly)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        {/* 360° detail panel */}
        <ClientDetail client={selected} />
      </div>
    </ScreenContainer>
  );
}

function ClientDetail({ client }: { client: Client }) {
  const meta = STATUS_META[client.status];
  const tone = healthTone(client.health);

  return (
    <Card className="flex flex-col gap-4 p-[18px_20px]">
      <div className="flex items-center gap-3">
        <span className="bg-accent/14 text-accent flex size-[46px] flex-none items-center justify-center rounded-[13px] text-[15px] font-extrabold">
          {initials(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            {client.name}
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            {client.sector}
          </div>
        </div>
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      </div>

      <div className="border-border bg-surface2 rounded-xl border p-3.5">
        <div className="mb-1.5 flex justify-between">
          <span className="text-muted text-[11px] font-bold">
            Score de santé
          </span>
          <span className={cn("text-[13px] font-extrabold", toneText[tone])}>
            {client.health} / 100
          </span>
        </div>
        <ProgressBar value={client.health} tone={tone} height={7} />
      </div>

      <div className="flex flex-col gap-3">
        <DetailRow icon={User} label="Contact" value={client.contact} />
        <DetailRow icon={Phone} label="Téléphone" value={client.phone} />
        <DetailRow
          icon={MapPin}
          label="Sites protégés"
          value={`${client.sites} site${client.sites > 1 ? "s" : ""}`}
        />
        <DetailRow icon={Building2} label="Secteur" value={client.sector} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-border bg-surface2 rounded-xl border p-3.5">
          <div className="text-muted text-[10.5px] font-semibold">
            CA mensuel
          </div>
          <div className="tnum text-foreground mt-1 text-[16px] font-extrabold">
            {formatFCFA(client.monthly)}
          </div>
        </div>
        <div className="border-border bg-surface2 rounded-xl border p-3.5">
          <div className="text-muted text-[10.5px] font-semibold">
            Client depuis
          </div>
          <div className="text-foreground mt-1 text-[13px] font-extrabold">
            {formatDateFR(client.since)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => toast.success(`Appel de ${client.contact} lancé`)}
        >
          Contacter
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => toast.info(`Fiche 360° de ${client.name} ouverte`)}
        >
          Voir la fiche
        </Button>
      </div>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex items-center gap-2 text-[12px] font-semibold">
        <Icon className="text-muted size-4" strokeWidth={1.8} />
        {label}
      </span>
      <span className="text-foreground text-[12.5px] font-bold">{value}</span>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { SHIFTS, SITES } from "@/lib/api/data";
import { fetchShifts } from "@/lib/supabase/data/planning";
import type { Shift } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText, toneTint } from "@/lib/colors";
import { cn } from "@/lib/utils";

type ShiftType = Shift["type"];

const SHIFT_META: Record<ShiftType, { tone: Tone; label: string }> = {
  jour: { tone: "warning", label: "Jour" },
  nuit: { tone: "violet", label: "Nuit" },
  renfort: { tone: "accent", label: "Renfort" },
};

const DAYS = [
  { index: 0, label: "Lun" },
  { index: 1, label: "Mar" },
  { index: 2, label: "Mer" },
  { index: 3, label: "Jeu" },
  { index: 4, label: "Ven" },
] as const;

const AVATAR_TONES: Tone[] = [
  "accent",
  "success",
  "violet",
  "warning",
  "danger",
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const shiftKey = (agent: string, day: number): string => `${agent}|${day}`;

export function OpsPlanning() {
  const [site, setSite] = useState<string>("all");
  const { data, isSuccess } = useQuery({ queryKey: ["shifts"], queryFn: fetchShifts });
  const shifts = isSuccess && data.length > 0 ? data : SHIFTS;
  const AGENTS = Array.from(new Set(shifts.map((s) => s.agent)));
  const SHIFT_INDEX = new Map<string, Shift>(
    shifts.map((s) => [shiftKey(s.agent, s.day), s]),
  );

  return (
    <ScreenContainer>
      {/* Coverage alert */}
      <div className="border-warning/30 bg-warning/10 mb-4 flex items-center gap-3 rounded-2xl border px-[18px] py-3.5">
        <span className="bg-warning/20 text-warning flex size-8 flex-none items-center justify-center rounded-[9px]">
          <AlertTriangle className="size-[18px]" strokeWidth={1.9} />
        </span>
        <div>
          <div className="text-foreground text-[13.5px] font-extrabold">
            3 sites non couverts cette semaine
          </div>
          <div className="text-muted text-[12px] font-semibold">
            Résidence Almadies (nuit), CBAO Indépendance (week-end), Eiffage
            chantier (dimanche) — réaffectation requise
          </div>
        </div>
      </div>

      {/* Filter + legend */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <label className="text-muted flex items-center gap-2 text-[12px] font-bold">
          Site
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            aria-label="Filtrer par site"
            className="border-border bg-surface text-foreground focus-visible:border-accent rounded-[10px] border px-3 py-2 text-[12px] font-bold outline-none"
          >
            <option value="all">Tous les sites</option>
            {SITES.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3.5">
          {(["jour", "nuit", "renfort"] as ShiftType[]).map((t) => (
            <LegendItem
              key={t}
              tone={SHIFT_META[t].tone}
              label={SHIFT_META[t].label}
            />
          ))}
          <span className="text-muted inline-flex items-center gap-1.5 text-[11px] font-bold">
            <span className="border-border bg-surface2 size-[11px] rounded-[3px] border" />
            Repos
          </span>
        </div>
      </div>

      {/* Weekly grid */}
      <Card className="overflow-x-auto p-4">
        <div className="grid min-w-[720px] [grid-template-columns:180px_repeat(5,minmax(74px,1fr))] gap-2">
          <div className="text-muted flex items-end pb-1.5 text-[10.5px] font-bold tracking-[0.4px]">
            AGENT
          </div>
          {DAYS.map((d) => (
            <div
              key={d.index}
              className="text-muted pb-1.5 text-center text-[11px] font-bold"
            >
              {d.label}
            </div>
          ))}

          {AGENTS.map((agent, i) => (
            <PlanningRow
              key={agent}
              agent={agent}
              tone={AVATAR_TONES[i % AVATAR_TONES.length]}
              site={site}
              shiftIndex={SHIFT_INDEX}
            />
          ))}
        </div>
      </Card>
    </ScreenContainer>
  );
}

function PlanningRow({
  agent,
  tone,
  site,
  shiftIndex,
}: {
  agent: string;
  tone: Tone;
  site: string;
  shiftIndex: Map<string, Shift>;
}) {
  return (
    <>
      <div className="text-foreground flex items-center gap-2.5 text-[12.5px] font-bold">
        <span
          className={cn(
            "flex size-7 flex-none items-center justify-center rounded-lg text-[10px] font-extrabold",
            toneTint[tone],
            toneText[tone],
          )}
        >
          {initials(agent)}
        </span>
        <span className="truncate">{agent}</span>
      </div>
      {DAYS.map((d) => {
        const shift = shiftIndex.get(shiftKey(agent, d.index));
        if (!shift || (site !== "all" && shift.site !== site)) {
          return (
            <div
              key={d.index}
              className="bg-surface2 text-muted rounded-lg py-2.5 text-center text-[11px] font-bold"
            >
              Repos
            </div>
          );
        }
        const meta = SHIFT_META[shift.type];
        return (
          <div
            key={d.index}
            title={`${meta.label} · ${shift.site} · ${shift.start}–${shift.end}`}
            className={cn(
              "rounded-lg py-2.5 text-center text-[11px] font-bold",
              toneTint[meta.tone],
              toneText[meta.tone],
            )}
          >
            {meta.label}
          </div>
        );
      })}
    </>
  );
}

function LegendItem({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="text-muted inline-flex items-center gap-1.5 text-[11px] font-bold">
      <span className={cn("size-[11px] rounded-[3px]", toneTint[tone])} />
      {label}
    </span>
  );
}

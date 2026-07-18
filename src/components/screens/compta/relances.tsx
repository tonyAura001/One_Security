"use client";

import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatNumberFR, formatFCFA } from "@/lib/format";
import { RELANCES } from "@/lib/api/data";
import type { Relance } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText } from "@/lib/colors";

type Stage = Relance["stage"];

const STAGE_META: Record<
  Stage,
  { variant: PillVariant; tone: Tone; label: string }
> = {
  "J+1": { variant: "info", tone: "accent", label: "Relance 1 · J+1" },
  "J+7": { variant: "warning", tone: "warning", label: "Relance 2 · J+7" },
  "J+15": { variant: "danger", tone: "danger", label: "Relance 3 · J+15" },
  "J+30": { variant: "danger", tone: "danger", label: "Relance 3 · J+30" },
  "J+45": { variant: "danger", tone: "danger", label: "Mise en demeure" },
};

const SUMMARY_TAGS: { label: string; variant: PillVariant }[] = [
  { label: "J+1 · Rappel", variant: "neutral" },
  { label: "J+15 · Relance 2", variant: "neutral" },
  { label: "J+30 · Relance 3", variant: "neutral" },
  { label: "J+45 · Mise en demeure", variant: "danger" },
];

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
}

export function ComptaRelances() {
  const totalLate = RELANCES.reduce((sum, r) => sum + r.amount, 0);
  const noticeCount = RELANCES.filter((r) => r.stage === "J+45").length;

  const stats: StatCard[] = [
    {
      label: "Total en retard",
      value: formatNumberFR(totalLate),
      unit: "FCFA",
      tone: "danger",
    },
    { label: "Relances envoyées", value: "3", tone: "foreground" },
    {
      label: "Mises en demeure",
      value: String(noticeCount),
      tone: "warning",
    },
    {
      label: "Recouvré ce mois",
      value: formatNumberFR(2340000),
      unit: "FCFA",
      tone: "success",
    },
  ];

  const rows = [...RELANCES].sort((a, b) => b.daysLate - a.daysLate);

  return (
    <ScreenContainer>
      {/* Summary KPI cards */}
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">
              {s.label}
            </div>
            <div
              className={`tnum mt-[5px] text-[20px] font-extrabold whitespace-nowrap ${toneText[s.tone]}`}
            >
              {s.value}
              {s.unit && (
                <span className="text-muted ml-1 text-[11px] font-bold">
                  {s.unit}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Timeline table */}
      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-1.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Échéancier de relance automatique
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {SUMMARY_TAGS.map((t) => (
            <StatusPill key={t.label} variant={t.variant} uppercase={false}>
              {t.label}
            </StatusPill>
          ))}
        </div>

        {/* Table — scroll horizontal interne sur mobile (pas de débordement body) */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="min-w-[620px]">
            {/* Header */}
            <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
              <div className="w-[120px]">Facture</div>
              <div className="flex-1">Client</div>
              <div className="w-[120px] text-right">Montant</div>
              <div className="w-[90px] text-center">Retard</div>
              <div className="w-[150px] text-center">Niveau</div>
              <div className="w-[100px]" />
            </div>

            {/* Rows */}
            {rows.map((r, i) => {
              const meta = STAGE_META[r.stage];
              const lateTone: Tone =
                r.daysLate >= 30
                  ? "danger"
                  : r.daysLate >= 15
                    ? "warning"
                    : "muted";
              const isNotice = r.stage === "J+45";
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3.5 px-1 py-[13px] ${
                    i < rows.length - 1 ? "border-border border-b" : ""
                  }`}
                >
                  <div className="tnum text-foreground w-[120px] text-[12px] font-extrabold">
                    {r.ref}
                  </div>
                  <div className="text-foreground flex-1 truncate text-[12.5px] font-bold">
                    {r.client}
                  </div>
                  <div className="tnum text-foreground w-[120px] text-right text-[12.5px] font-extrabold">
                    {formatNumberFR(r.amount)}
                  </div>
                  <div
                    className={`tnum w-[90px] text-center text-[12px] font-bold ${toneText[lateTone]}`}
                  >
                    {r.daysLate} j
                  </div>
                  <div className="flex w-[150px] justify-center">
                    <StatusPill variant={meta.variant} uppercase>
                      {meta.label}
                    </StatusPill>
                  </div>
                  <div className="flex w-[100px] justify-end">
                    <Button
                      variant={isNotice ? "default" : "outline"}
                      size="sm"
                      className={
                        isNotice
                          ? "bg-danger text-white hover:brightness-110"
                          : undefined
                      }
                      onClick={() =>
                        toast.success(
                          `Relance envoyée à ${r.client} — ${formatFCFA(r.amount)}`,
                        )
                      }
                    >
                      Relancer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </ScreenContainer>
  );
}

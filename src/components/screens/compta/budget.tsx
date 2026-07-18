"use client";

import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatNumberFR } from "@/lib/format";
import type { Tone } from "@/lib/colors";
import { toneText } from "@/lib/colors";

interface BudgetLine {
  poste: string;
  prevu: number;
  realise: number;
}

const LINES: BudgetLine[] = [
  { poste: "Salaires & charges", prevu: 9000000, realise: 8920000 },
  { poste: "Équipements & uniformes", prevu: 450000, realise: 610000 },
  { poste: "Carburant & transport", prevu: 320000, realise: 298000 },
  { poste: "Formation agents", prevu: 150000, realise: 150000 },
  { poste: "Charges fixes (loyer, énergie)", prevu: 640000, realise: 632000 },
];

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
}

const STATS: StatCard[] = [
  {
    label: "Solde de trésorerie",
    value: formatNumberFR(6240000),
    unit: "FCFA",
    tone: "success",
  },
  {
    label: "Budget réalisé (juin)",
    value: formatNumberFR(10110000),
    unit: "FCFA",
    tone: "foreground",
  },
  {
    label: "Écart global",
    value: "−2,3 %",
    unit: "sous budget",
    tone: "success",
  },
];

function ecartTone(delta: number): Tone {
  if (delta > 0) return "danger";
  if (delta < 0) return "success";
  return "muted";
}

function ecartLabel(delta: number): string {
  if (delta === 0) return "0";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatNumberFR(Math.abs(delta))}`;
}

export function ComptaBudget() {
  return (
    <ScreenContainer>
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">
              {s.label}
            </div>
            <div
              className={`tnum mt-[5px] text-[21px] font-extrabold whitespace-nowrap ${toneText[s.tone]}`}
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

      {/* Prévu vs réalisé */}
      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Budget prévu vs réalisé — Juin 2026
        </div>

        {/* Header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <div className="flex-1">Poste</div>
          <div className="w-[130px] text-right">Prévu</div>
          <div className="w-[130px] text-right">Réalisé</div>
          <div className="w-[110px] text-right">Écart</div>
        </div>

        {/* Rows */}
        {LINES.map((l, i) => {
          const delta = l.realise - l.prevu;
          const tone = ecartTone(delta);
          const ratio = l.prevu === 0 ? 0 : (l.realise / l.prevu) * 100;
          return (
            <div
              key={l.poste}
              className={i < LINES.length - 1 ? "border-border border-b" : ""}
            >
              <div className="flex items-center gap-3.5 px-1 pt-[13px]">
                <div className="text-foreground flex-1 text-[12.5px] font-bold">
                  {l.poste}
                </div>
                <div className="tnum text-muted w-[130px] text-right text-[12.5px] font-bold">
                  {formatNumberFR(l.prevu)}
                </div>
                <div className="tnum text-foreground w-[130px] text-right text-[12.5px] font-extrabold">
                  {formatNumberFR(l.realise)}
                </div>
                <div
                  className={`tnum w-[110px] text-right text-[12px] font-extrabold ${toneText[tone]}`}
                >
                  {ecartLabel(delta)}
                </div>
              </div>
              <div className="px-1 pt-2 pb-[13px]">
                <ProgressBar
                  value={ratio}
                  tone={delta > 0 ? "danger" : "success"}
                  height={5}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </ScreenContainer>
  );
}

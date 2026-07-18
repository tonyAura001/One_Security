"use client";

import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/lib/colors";
import { RECEIPTS } from "@/lib/api/data";
import type { Receipt } from "@/lib/api/types";
import { formatDateFR, formatFCFA, formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";

const CASH_FLOAT = 50_000; // fond de caisse initial
const COUNTED_CASH = 231_500; // comptage physique en fin de journée

const METHOD_TONE: Record<Receipt["method"], Tone> = {
  Espèces: "success",
  Wave: "accent",
  "Orange Money": "warning",
};

const METHOD_ORDER: Receipt["method"][] = ["Espèces", "Wave", "Orange Money"];

export function CaissierCloture() {
  const [closed, setClosed] = useState(false);

  const total = RECEIPTS.reduce((sum, r) => sum + r.total, 0);
  const byMethod = METHOD_ORDER.map((method) => ({
    method,
    tone: METHOD_TONE[method],
    amount: RECEIPTS.filter((r) => r.method === method).reduce(
      (sum, r) => sum + r.total,
      0,
    ),
  }));

  const cashSales = byMethod.find((m) => m.method === "Espèces")?.amount ?? 0;
  const expectedCash = CASH_FLOAT + cashSales;
  const ecart = COUNTED_CASH - expectedCash;

  return (
    <ScreenContainer>
      <Card className="mx-auto max-w-[760px] p-[22px]">
        <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">
          Clôture journalière — {formatDateFR("2026-07-03")}
        </div>
        <div className="text-muted mt-1 mb-[18px] text-[12px] font-semibold">
          Caissière : Awa N&apos;Diaye · {formatNumberFR(RECEIPTS.length)}{" "}
          transactions
        </div>

        <div className="border-border bg-surface2 mb-4 rounded-xl border p-4">
          <div className="text-muted text-[11px] font-semibold">
            Total des ventes
          </div>
          <div className="text-foreground mt-1.5 text-[26px] font-extrabold tracking-[-0.6px]">
            {formatNumberFR(total)}{" "}
            <span className="text-muted text-[12px] font-bold">FCFA</span>
          </div>
        </div>

        <div className="text-muted mb-2.5 text-[11px] font-bold tracking-[0.4px] uppercase">
          Répartition par mode
        </div>
        <div className="mb-[18px] flex flex-col gap-3">
          {byMethod.map((m) => (
            <div key={m.method} className="flex items-center gap-2.5">
              <span className="text-foreground w-[92px] text-[12px] font-bold">
                {m.method}
              </span>
              <div className="flex-1">
                <ProgressBar
                  value={total > 0 ? (m.amount / total) * 100 : 0}
                  tone={m.tone}
                  height={8}
                />
              </div>
              <span className="text-foreground w-[90px] text-right text-[12px] font-extrabold">
                {formatNumberFR(m.amount)}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="border-border bg-surface2 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">
              Espèces attendues
            </div>
            <div className="text-foreground mt-1 text-[15px] font-extrabold">
              {formatNumberFR(expectedCash)}
            </div>
          </div>
          <div className="border-border bg-surface2 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">
              Comptage espèces
            </div>
            <div className="text-foreground mt-1 text-[15px] font-extrabold">
              {formatNumberFR(COUNTED_CASH)}
            </div>
          </div>
          <div className="border-warning/30 bg-warning/10 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">Écart</div>
            <div className="text-warning mt-1 text-[15px] font-extrabold">
              {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
              {formatNumberFR(Math.abs(ecart))}
            </div>
          </div>
        </div>

        {closed ? (
          <div className="border-success/35 bg-success/12 flex items-center gap-3 rounded-xl border px-4 py-3.5">
            <CheckCircle2
              className="text-success size-5 flex-none"
              strokeWidth={2.2}
            />
            <div>
              <div className="text-foreground text-[13px] font-extrabold">
                Caisse clôturée
              </div>
              <div className="text-muted text-[11.5px] font-semibold">
                Rapport de caisse transmis à la comptabilité · écart{" "}
                {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
                {formatFCFA(Math.abs(ecart))} consigné
              </div>
            </div>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setClosed(true);
              toast.success("Caisse clôturée · rapport généré");
            }}
          >
            <Lock strokeWidth={2} />
            Clôturer la caisse &amp; générer le rapport
          </Button>
        )}
      </Card>
    </ScreenContainer>
  );
}

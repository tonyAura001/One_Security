"use client";

import { RefreshCw } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";

const CALC_ROWS = [
  {
    agent: "Abdou Sarr",
    brut: 165000,
    ipres: 9240,
    css: 5940,
    ir: 7020,
    net: 142800,
  },
  {
    agent: "Fatou Ndiaye",
    brut: 210000,
    ipres: 11760,
    css: 7560,
    ir: 9180,
    net: 181500,
  },
  {
    agent: "Moussa Ba",
    brut: 185000,
    ipres: 10360,
    css: 6660,
    ir: 7980,
    net: 160000,
  },
  {
    agent: "Awa Diop",
    brut: 160000,
    ipres: 8960,
    css: 5760,
    ir: 6880,
    net: 138400,
  },
  {
    agent: "Mariama Sow",
    brut: 225000,
    ipres: 12600,
    css: 8100,
    ir: 9700,
    net: 194600,
  },
];

export function PayrollPrepaie() {
  return (
    <ScreenContainer>
      <PageHeader
        title="Calcul de la paie — Juin 2026"
        description="Cotisations : IPRES 5,6 % · CSS 3,6 % · IR barème progressif (part salariale)"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast.success("Paie recalculée", "52 bulletins mis à jour")
            }
          >
            <RefreshCw className="size-3.5" />
            Recalculer
          </Button>
        }
        className="mb-4"
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border border-b">
                {["Agent", "Brut", "IPRES", "CSS", "IR", "Net"].map((h, i) => (
                  <th
                    key={h}
                    className={`text-muted px-4 py-3 text-[11px] font-bold tracking-[0.4px] uppercase ${i > 0 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALC_ROWS.map((r) => (
                <tr
                  key={r.agent}
                  className="border-border border-b last:border-0"
                >
                  <td className="text-foreground px-4 py-3 text-[13px] font-bold">
                    {r.agent}
                  </td>
                  <td className="tnum text-foreground px-4 py-3 text-right text-[13px] font-semibold">
                    {formatNumberFR(r.brut)}
                  </td>
                  <td className="tnum text-danger px-4 py-3 text-right text-[13px] font-semibold">
                    −{formatNumberFR(r.ipres)}
                  </td>
                  <td className="tnum text-danger px-4 py-3 text-right text-[13px] font-semibold">
                    −{formatNumberFR(r.css)}
                  </td>
                  <td className="tnum text-danger px-4 py-3 text-right text-[13px] font-semibold">
                    −{formatNumberFR(r.ir)}
                  </td>
                  <td className="tnum text-success px-4 py-3 text-right text-[13px] font-extrabold">
                    {formatNumberFR(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface2">
                <td
                  className="text-muted px-4 py-3 text-[12px] font-bold"
                  colSpan={2}
                >
                  + 47 agents · Masse brute 8 920 000
                </td>
                <td
                  className="text-foreground px-4 py-3 text-right text-[13px] font-extrabold"
                  colSpan={4}
                >
                  Net total : 7 682 000 FCFA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </ScreenContainer>
  );
}

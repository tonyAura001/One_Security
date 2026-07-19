"use client";

import { useQuery } from "@tanstack/react-query";

import { Download, FileSpreadsheet } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatNumberFR, formatFCFA } from "@/lib/format";
import { PAYSLIPS } from "@/lib/api/data";
import { fetchPayslips } from "@/lib/supabase/data/payroll";

const BANKS = ["CBAO", "BICIS", "SGBS", "Ecobank", "Bank of Africa"] as const;
const BANK_CODES = ["CB01", "BI03", "SG05", "EC07", "BA09"] as const;

/** Deterministic masked IBAN placeholder (SICA-UEMOA / BCEAO format). */
function ibanFor(index: number): string {
  const code = BANK_CODES[index % BANK_CODES.length];
  const last4 = String(1000 + ((index * 137) % 9000));
  return `SN08 ${code} 0100 •••• ${last4}`;
}

export function ComptaExportPaie() {
  const { data, isSuccess } = useQuery({
    queryKey: ["payslips"],
    queryFn: () => fetchPayslips(),
  });
  const payslips = isSuccess && data.length > 0 ? data : PAYSLIPS;
  const total = payslips.reduce((sum, p) => sum + p.net, 0);
  const count = payslips.length;

  return (
    <ScreenContainer className="max-w-[1040px]">
      <Card className="p-[18px_20px]">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Ordre de virement — Salaires Juin 2026
          </div>
          <StatusPill variant="warning" uppercase>
            Prêt à générer
          </StatusPill>
        </div>
        <div className="text-muted mb-4 text-[12px] font-semibold">
          {count} virements · format SICA-UEMOA · total net {formatFCFA(total)}
        </div>

        {/* Header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <div className="flex-[1.2]">Bénéficiaire</div>
          <div className="w-[110px]">Banque</div>
          <div className="flex-[1.3]">IBAN</div>
          <div className="w-[120px] text-right">Montant net</div>
        </div>

        {/* Rows */}
        {payslips.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 px-1 py-3 ${
              i < payslips.length - 1 ? "border-border border-b" : ""
            }`}
          >
            <div className="text-foreground flex-[1.2] truncate text-[12.5px] font-bold">
              {p.agent}
            </div>
            <div className="text-muted w-[110px] truncate text-[11.5px] font-semibold">
              {BANKS[i % BANKS.length]}
            </div>
            <div className="text-muted flex-[1.3] truncate font-mono text-[11.5px] font-semibold">
              {ibanFor(i)}
            </div>
            <div className="tnum text-foreground w-[120px] text-right text-[12.5px] font-extrabold">
              {formatNumberFR(p.net)}
            </div>
          </div>
        ))}

        {/* Footer / total + actions */}
        <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 pt-4">
          <div className="text-muted text-[12px] font-semibold">
            {count} bénéficiaires ·{" "}
            <span className="text-foreground font-extrabold">
              Total {formatFCFA(total)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => toast.info("Export du récapitulatif en cours…")}
            >
              <FileSpreadsheet strokeWidth={1.8} />
              Exporter
            </Button>
            <Button
              onClick={() =>
                toast.success(
                  `Fichier SICA-UEMOA généré · ${count} virements · ${formatFCFA(total)}`,
                )
              }
            >
              <Download strokeWidth={1.8} />
              Générer le fichier SICA-UEMOA
            </Button>
          </div>
        </div>
      </Card>
    </ScreenContainer>
  );
}

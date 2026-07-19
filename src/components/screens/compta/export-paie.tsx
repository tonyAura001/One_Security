"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FileSpreadsheet, Wand2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatNumberFR, formatFCFA, formatDateFR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/lib/csv";
import { fetchPayslips, generatePaie } from "@/lib/supabase/data/payroll";

/** Période courante des bulletins (source unique pour la requête + le titre). */
const PERIODE = "2026-06";
const periodeLabel = formatDateFR(`${PERIODE}-01`, "MMMM yyyy");

export function ComptaExportPaie() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["payslips", PERIODE],
    queryFn: () => fetchPayslips(PERIODE),
  });
  const payslips = data ?? [];
  const total = payslips.reduce((sum, p) => sum + p.net, 0);
  const count = payslips.length;

  const generateMut = useMutation({
    mutationFn: () => generatePaie(PERIODE),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["payslips", PERIODE] });
      toast.success(
        r.created > 0
          ? `${r.created} bulletin${r.created > 1 ? "s" : ""} généré${r.created > 1 ? "s" : ""}`
          : "Bulletins déjà à jour pour cette période",
      );
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé : seuls DG/RF/RH peuvent générer la paie."
          : `Échec : ${msg}`,
      );
    },
  });

  function handleExport() {
    if (count === 0) {
      toast.info("Aucun bulletin à exporter pour cette période.");
      return;
    }
    const rows: (string | number)[][] = [
      ["Bénéficiaire", "Rôle", "Jours", "Brut", "IPRES", "CSS", "IR", "Net"],
      ...payslips.map((p) => [
        p.agent,
        p.role,
        p.days,
        p.gross,
        p.ipres,
        p.css,
        p.ir,
        p.net,
      ]),
      ["Total", "", "", "", "", "", "", total],
    ];
    downloadCsv(`paie-${PERIODE}.csv`, rows);
    toast.success(`Export CSV généré · ${count} bénéficiaires`);
  }

  return (
    <ScreenContainer className="max-w-[1040px]">
      <Card className="p-[18px_20px]">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px] capitalize">
            Récapitulatif de paie — {periodeLabel}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill variant={count > 0 ? "success" : "neutral"} uppercase>
              {count > 0 ? "Prêt à exporter" : "Aucun bulletin"}
            </StatusPill>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
            >
              <Wand2 className="size-4" />
              {generateMut.isPending ? "Génération…" : "Générer la paie"}
            </Button>
          </div>
        </div>
        <div className="text-muted mb-4 text-[12px] font-semibold">
          {count} bulletins · total net {formatFCFA(total)}
        </div>

        {/* Header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <div className="flex-[1.4]">Bénéficiaire</div>
          <div className="w-[150px]">Rôle</div>
          <div className="w-[70px] text-center">Jours</div>
          <div className="w-[120px] text-right">Brut</div>
          <div className="w-[120px] text-right">Net</div>
        </div>

        {/* Rows */}
        {payslips.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 px-1 py-3 ${
              i < payslips.length - 1 ? "border-border border-b" : ""
            }`}
          >
            <div className="text-foreground flex-[1.4] truncate text-[12.5px] font-bold">
              {p.agent}
            </div>
            <div className="text-muted w-[150px] truncate text-[11.5px] font-semibold">
              {p.role}
            </div>
            <div className="tnum text-muted w-[70px] text-center text-[12px] font-semibold">
              {p.days}
            </div>
            <div className="tnum text-muted w-[120px] text-right text-[12px] font-semibold">
              {formatNumberFR(p.gross)}
            </div>
            <div className="tnum text-foreground w-[120px] text-right text-[12.5px] font-extrabold">
              {formatNumberFR(p.net)}
            </div>
          </div>
        ))}

        {count === 0 && (
          <EmptyState
            title="Aucun bulletin pour cette période"
            description={`Aucun bulletin de paie pour ${periodeLabel}.`}
          />
        )}

        {/* Footer / total + action */}
        <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 pt-4">
          <div className="text-muted text-[12px] font-semibold">
            {count} bénéficiaires ·{" "}
            <span className="text-foreground font-extrabold">
              Total net {formatFCFA(total)}
            </span>
          </div>
          <Button onClick={handleExport} disabled={count === 0}>
            <FileSpreadsheet strokeWidth={1.8} />
            Exporter (CSV)
          </Button>
        </div>
      </Card>
    </ScreenContainer>
  );
}

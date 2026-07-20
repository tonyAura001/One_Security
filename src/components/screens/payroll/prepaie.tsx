"use client";

import { RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { fetchPayslips, generatePaie } from "@/lib/supabase/data/payroll";
import { currentPeriode } from "@/lib/supabase/data/cycle-paie";

export function PayrollPrepaie() {
  const qc = useQueryClient();
  const periode = currentPeriode();
  const { data: rows = [] } = useQuery({
    queryKey: ["payslips", periode],
    queryFn: () => fetchPayslips(periode),
  });
  const totalBrut = rows.reduce((s, r) => s + r.gross, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  const gen = useMutation({
    mutationFn: () => generatePaie(periode),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["payslips", periode] });
      toast.success(
        "Paie calculée",
        res.created > 0
          ? `${res.created} bulletin(s) généré(s)`
          : "Tous les bulletins étaient déjà générés",
      );
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|policy|refus/i.test(msg) ? "Accès refusé (DG/RF/RH)." : `Échec : ${msg}`,
      );
    },
  });

  return (
    <ScreenContainer>
      <PageHeader
        title={`Calcul de la paie — ${periode}`}
        description="Cotisations : IPRES 5,6 % · CSS 3,6 % · IR barème progressif (part salariale)"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={gen.isPending}
            onClick={() => gen.mutate()}
          >
            <RefreshCw className="size-3.5" />
            {gen.isPending ? "Calcul…" : "Générer / recalculer"}
          </Button>
        }
        className="mb-4"
      />

      {rows.length === 0 && (
        <EmptyState
          title="Aucun bulletin calculé"
          description="Cliquez sur « Générer / recalculer » pour calculer la paie des agents actifs."
        />
      )}

      {rows.length > 0 && (
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
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-border border-b last:border-0"
                >
                  <td className="text-foreground px-4 py-3 text-[13px] font-bold">
                    {r.agent}
                  </td>
                  <td className="tnum text-foreground px-4 py-3 text-right text-[13px] font-semibold">
                    {formatNumberFR(r.gross)}
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
                  {rows.length} agent{rows.length !== 1 ? "s" : ""} · Masse brute{" "}
                  {formatNumberFR(totalBrut)}
                </td>
                <td
                  className="text-foreground px-4 py-3 text-right text-[13px] font-extrabold"
                  colSpan={4}
                >
                  Net total : {formatNumberFR(totalNet)} FCFA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      )}
    </ScreenContainer>
  );
}

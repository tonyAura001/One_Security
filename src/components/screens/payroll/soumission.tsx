"use client";

import { CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePayrollCycle } from "@/lib/hooks/use-payroll-cycle";
import { fetchPayslips } from "@/lib/supabase/data/payroll";
import { currentPeriode } from "@/lib/supabase/data/cycle-paie";
import { formatNumberFR } from "@/lib/format";
import { CircuitStepper } from "./circuit-stepper";

export function PayrollSoumission() {
  const { stage, advance, isPending } = usePayrollCycle();
  const submitted = stage !== "brouillon";
  const periode = currentPeriode();
  const { data: payslips = [] } = useQuery({
    queryKey: ["payslips", periode],
    queryFn: () => fetchPayslips(periode),
  });
  const masseNette = payslips.reduce((s, p) => s + p.net, 0);

  return (
    <ScreenContainer>
      <PageHeader
        title={`Soumission de la paie — ${periode}`}
        description="Circuit de validation à 3 niveaux (RBAC)"
        className="mb-4"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <CircuitStepper />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-[12px] font-semibold">
                Masse salariale nette
              </span>
              <span className="text-foreground text-[17px] font-extrabold">
                {formatNumberFR(masseNette)} FCFA
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-muted text-[12px] font-semibold">
                Effectif
              </span>
              <span className="text-foreground text-[15px] font-extrabold">
                {payslips.length} agent{payslips.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              className="mt-4 w-full"
              disabled={submitted || isPending}
              onClick={() => advance.mutate()}
            >
              {submitted ? "Paie soumise ✓" : "Soumettre la paie (Niveau 1)"}
            </Button>
          </Card>

          {submitted && (
            <Card className="border-success/40 bg-success/8 flex items-start gap-3 p-4">
              <CheckCircle2 className="text-success mt-0.5 size-5 flex-none" />
              <div>
                <div className="text-foreground text-[13px] font-bold">
                  Paie soumise au circuit de validation
                </div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                  Transmise au Chef de contrôle pour validation des présences
                  (Niveau 2).
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}

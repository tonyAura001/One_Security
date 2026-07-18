"use client";

import { CheckCircle2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePayrollStore } from "@/lib/store/payroll";
import { toast } from "@/lib/toast";
import { CircuitStepper } from "./circuit-stepper";

export function PayrollSoumission() {
  const stage = usePayrollStore((s) => s.stage);
  const submit = usePayrollStore((s) => s.submit);
  const reset = usePayrollStore((s) => s.reset);
  const submitted = stage !== "brouillon";

  return (
    <ScreenContainer>
      <PageHeader
        title="Soumission de la paie — Juin 2026"
        description="Circuit de validation à 3 niveaux (RBAC)"
        className="mb-4"
        actions={
          submitted ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              Réinitialiser la démo
            </Button>
          ) : undefined
        }
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
                7 682 000 FCFA
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-muted text-[12px] font-semibold">
                Effectif
              </span>
              <span className="text-foreground text-[15px] font-extrabold">
                52 agents
              </span>
            </div>
            <Button
              className="mt-4 w-full"
              disabled={submitted}
              onClick={() => {
                submit();
                toast.success(
                  "Paie soumise au circuit de validation",
                  "Transmise au Chef de contrôle (Niveau 2)",
                );
              }}
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

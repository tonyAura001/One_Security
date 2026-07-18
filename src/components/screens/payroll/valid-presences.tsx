"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { usePayrollStore } from "@/lib/store/payroll";
import { toast } from "@/lib/toast";

const STATS = [
  { label: "Jours pointés", value: "1 248" },
  { label: "Heures sup. validées", value: "214 h" },
  { label: "Anomalies", value: "2", tone: "text-danger" },
];

export function PayrollValidPresences() {
  const stage = usePayrollStore((s) => s.stage);
  const validate = usePayrollStore((s) => s.validate);

  const notSubmitted = stage === "brouillon";
  const validated = stage === "valide" || stage === "approuve";
  const canValidate = stage === "soumis";

  return (
    <ScreenContainer>
      {/* Warning banner */}
      <Card className="border-l-warning bg-warning/8 mb-4 flex items-center gap-3 border-l-[3px] p-4">
        <AlertTriangle
          className="text-warning size-5 flex-none"
          strokeWidth={1.8}
        />
        <div>
          <div className="text-foreground text-[13px] font-bold">
            3 sites non couverts à régulariser avant validation
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            Résidence Almadies, CBAO Indépendance, Eiffage chantier
          </div>
        </div>
      </Card>

      <PageHeader
        title="Validation des présences — Juin 2026 (Niveau 2)"
        description="Paie soumise par Ndèye Fall · vérifier les présences avant transmission au DG"
        className="mb-4"
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11.5px] font-semibold">
              {s.label}
            </div>
            <div
              className={`mt-1 text-[22px] font-extrabold ${s.tone ?? "text-foreground"}`}
            >
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      {notSubmitted ? (
        <Card className="flex items-center gap-3 p-4">
          <Clock className="text-muted size-5 flex-none" />
          <div className="text-muted text-[13px] font-semibold">
            En attente de soumission de la paie par le Responsable Paie (Niveau
            1).
          </div>
        </Card>
      ) : validated ? (
        <Card className="border-success/40 bg-success/8 flex items-start gap-3 p-4">
          <CheckCircle2 className="text-success mt-0.5 size-5 flex-none" />
          <div>
            <div className="text-foreground flex items-center gap-2 text-[13px] font-bold">
              Présences validées
              <StatusPill variant="success" uppercase>
                Niveau 2
              </StatusPill>
            </div>
            <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
              Paie transmise au Directeur Général pour approbation finale.
            </div>
          </div>
        </Card>
      ) : (
        <Button
          className="w-full sm:w-auto"
          disabled={!canValidate}
          onClick={() => {
            validate();
            toast.success(
              "Présences validées (Niveau 2)",
              "Paie transmise au Directeur Général",
            );
          }}
        >
          Valider les présences &amp; transmettre au DG
        </Button>
      )}
    </ScreenContainer>
  );
}

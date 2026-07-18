"use client";

import { Check } from "lucide-react";
import { usePayrollStore, type PayrollStage } from "@/lib/store/payroll";
import { cn } from "@/lib/utils";

const STEPS: {
  n: number;
  title: string;
  detail: string;
  reachedAt: PayrollStage;
}[] = [
  {
    n: 1,
    title: "Niveau 1 — Responsable Paie (Ndèye Fall)",
    detail: "Préparation & soumission",
    reachedAt: "soumis",
  },
  {
    n: 2,
    title: "Niveau 2 — Chef de contrôle (Cheikh Guèye)",
    detail: "Validation des présences",
    reachedAt: "valide",
  },
  {
    n: 3,
    title: "Niveau 3 — Directeur Général (M. Diallo)",
    detail: "Approbation finale & paiement",
    reachedAt: "approuve",
  },
];

const RANK: Record<PayrollStage, number> = {
  brouillon: 0,
  soumis: 1,
  valide: 2,
  approuve: 3,
};

/** Visual state machine for the 3-level payroll circuit. */
export function CircuitStepper() {
  const stage = usePayrollStore((s) => s.stage);
  const rank = RANK[stage];

  return (
    <div className="flex flex-col gap-2.5">
      {STEPS.map((step) => {
        const done = rank >= RANK[step.reachedAt];
        const active = rank === RANK[step.reachedAt] - 1;
        return (
          <div
            key={step.n}
            className={cn(
              "bg-surface2 flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors",
              done
                ? "border-success/40"
                : active
                  ? "border-accent/50"
                  : "border-border",
            )}
          >
            <div
              className={cn(
                "flex size-8 flex-none items-center justify-center rounded-full text-[13px] font-extrabold",
                done
                  ? "bg-success text-white"
                  : active
                    ? "bg-accent text-white"
                    : "bg-surface text-muted",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : step.n}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-[13px] font-bold">
                {step.title}
              </div>
              <div className="text-muted text-[11.5px] font-semibold">
                {step.detail}
              </div>
            </div>
            {done && (
              <span className="bg-success/12 text-success rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase">
                Validé
              </span>
            )}
            {active && (
              <span className="bg-accent/14 text-accent rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase">
                En cours
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

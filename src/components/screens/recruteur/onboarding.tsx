"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  /** Shown when the step is not yet done. */
  pending: "attente" | "afaire";
}

const INITIAL_STEPS: OnboardingStep[] = [
  {
    id: "contrat",
    label: "Contrat de travail signé",
    done: true,
    pending: "afaire",
  },
  {
    id: "pieces",
    label: "Pièces justificatives & casier judiciaire",
    done: true,
    pending: "afaire",
  },
  {
    id: "carte",
    label: "Carte professionnelle établie",
    done: true,
    pending: "afaire",
  },
  {
    id: "formation",
    label: "Formation initiale (sécurité incendie & gestes)",
    done: true,
    pending: "afaire",
  },
  {
    id: "uniforme",
    label: "Remise de l'uniforme & équipement",
    done: false,
    pending: "attente",
  },
  {
    id: "affectation",
    label: "Affectation au site & présentation chef de poste",
    done: false,
    pending: "afaire",
  },
  {
    id: "compte",
    label: "Création du compte PilotePME",
    done: false,
    pending: "afaire",
  },
];

export function RecruteurOnboarding() {
  const [steps, setSteps] = useState<OnboardingStep[]>(INITIAL_STEPS);

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  function toggle(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    );
  }

  return (
    <ScreenContainer>
      <div className="mx-auto max-w-[820px]">
        <Card className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-center gap-3.5">
            <div className="from-success to-accent flex size-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-[14px] font-extrabold text-white">
              MG
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-[15px] font-extrabold">
                Onboarding — Modou Gaye
              </div>
              <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                Agent de sécurité · CBAO Indépendance · début 14/07/2026
              </div>
            </div>
            <div className="text-right">
              <div className="text-success text-[18px] font-extrabold">
                {doneCount}
                <span className="text-muted text-[12px] font-bold">
                  /{steps.length}
                </span>
              </div>
              <div className="text-muted text-[10px] font-semibold">étapes</div>
            </div>
          </div>

          <ProgressBar value={pct} tone="success" height={7} className="mb-5" />

          {/* Checklist */}
          <div className="flex flex-col gap-2.5">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={s.done}
                className="border-border bg-surface2 hover:bg-active flex items-center gap-3.5 rounded-[11px] border px-3.5 py-3 text-left transition-colors"
              >
                <span
                  className={
                    s.done
                      ? "bg-success flex size-6 flex-none items-center justify-center rounded-[7px] text-white"
                      : "border-border bg-surface flex size-6 flex-none items-center justify-center rounded-[7px] border-[1.5px]"
                  }
                >
                  {s.done && <Check size={14} strokeWidth={2.6} />}
                </span>
                <span className="text-foreground flex-1 text-[12.5px] font-bold">
                  {s.label}
                </span>
                {s.done ? (
                  <span className="text-success text-[10.5px] font-semibold">
                    Terminé
                  </span>
                ) : s.pending === "attente" ? (
                  <span className="text-warning text-[10.5px] font-semibold">
                    En attente
                  </span>
                ) : (
                  <span className="text-muted text-[10.5px] font-semibold">
                    À faire
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}

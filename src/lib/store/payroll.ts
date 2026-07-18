"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The 3-level payroll approval circuit — a shared state machine spanning
 * three roles/screens:
 *   Niveau 1  Responsable Paie  → soumet la paie          (submitted)
 *   Niveau 2  Chef de contrôle  → valide les présences    (validated)
 *   Niveau 3  Directeur Général → approbation finale      (approved)
 */
export type PayrollStage = "brouillon" | "soumis" | "valide" | "approuve";

interface PayrollState {
  stage: PayrollStage;
  submit: () => void; // Niveau 1
  validate: () => void; // Niveau 2
  approve: () => void; // Niveau 3
  reset: () => void;
}

const NEXT: Record<PayrollStage, PayrollStage> = {
  brouillon: "soumis",
  soumis: "valide",
  valide: "approuve",
  approuve: "approuve",
};

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set) => ({
      stage: "brouillon",
      submit: () =>
        set((s) => (s.stage === "brouillon" ? { stage: NEXT.brouillon } : s)),
      validate: () =>
        set((s) => (s.stage === "soumis" ? { stage: NEXT.soumis } : s)),
      approve: () =>
        set((s) => (s.stage === "valide" ? { stage: NEXT.valide } : s)),
      reset: () => set({ stage: "brouillon" }),
    }),
    { name: "pilotepme-payroll", skipHydration: true },
  ),
);

export const STAGE_META: Record<
  PayrollStage,
  {
    label: string;
    level: string;
    variant: "neutral" | "info" | "warning" | "success";
  }
> = {
  brouillon: { label: "Brouillon", level: "Préparation", variant: "neutral" },
  soumis: {
    label: "Soumise — Niveau 1",
    level: "En attente validation présences",
    variant: "info",
  },
  valide: {
    label: "Présences validées — Niveau 2",
    level: "En attente approbation DG",
    variant: "warning",
  },
  approuve: {
    label: "Approuvée — Niveau 3",
    level: "Prête pour virement",
    variant: "success",
  },
};

export const STAGE_ORDER: PayrollStage[] = [
  "brouillon",
  "soumis",
  "valide",
  "approuve",
];

"use client";

import { Fragment, useState } from "react";
import { AlignLeft, Bold, Italic, List, Underline } from "lucide-react";
import type { ReactNode } from "react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/** Template variables in declaration order. */
const VARIABLE_KEYS = [
  "client",
  "site",
  "nb_agents",
  "date_debut",
  "duree",
  "montant",
] as const;
type VariableKey = (typeof VARIABLE_KEYS)[number];

const INITIAL_VARIABLES: Record<VariableKey, string> = {
  client: "Port Autonome de Dakar",
  site: "Môle 8, Port de Dakar",
  nb_agents: "8",
  date_debut: "1er août 2026",
  duree: "12 mois",
  montant: "3 200 000",
};

/** Highlighted substituted value inside the paper contract. */
function Var({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[5px] bg-[#2D6BFF]/16 px-1.5 py-px font-extrabold text-[#1E5AE6]">
      {children}
    </span>
  );
}

const TOOLBAR = [
  { key: "bold", label: "Gras", icon: Bold },
  { key: "italic", label: "Italique", icon: Italic },
  { key: "underline", label: "Souligné", icon: Underline },
] as const;

export function SecretaireContratEditor() {
  const [variables, setVariables] =
    useState<Record<VariableKey, string>>(INITIAL_VARIABLES);

  const set = (key: VariableKey, value: string) =>
    setVariables((prev) => ({ ...prev, [key]: value }));

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_260px]">
        {/* ---------- Left: editor + paper preview ---------- */}
        <Card className="overflow-hidden rounded-2xl">
          {/* Formatting toolbar */}
          <div className="border-border bg-surface2 flex items-center gap-1 border-b px-3.5 py-2.5">
            {TOOLBAR.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                className="text-foreground hover:bg-hover flex size-8 items-center justify-center rounded-[7px]"
              >
                <Icon className="size-4" strokeWidth={2} />
              </button>
            ))}
            <div className="bg-border mx-1.5 h-5 w-px" />
            <button
              type="button"
              aria-label="Liste à puces"
              className="text-muted hover:bg-hover flex size-8 items-center justify-center rounded-[7px]"
            >
              <List className="size-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Alignement"
              className="text-muted hover:bg-hover flex size-8 items-center justify-center rounded-[7px]"
            >
              <AlignLeft className="size-4" strokeWidth={1.8} />
            </button>
            <div className="text-muted ml-auto text-[11px] font-bold">
              Contrat de prestation · modèle standard
            </div>
          </div>

          {/* Paper (theme-independent) */}
          <div className="m-4 rounded-lg bg-white px-[30px] py-[26px] text-[#0F1626] shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
            <div className="mb-4 text-center text-[15px] font-extrabold">
              CONTRAT DE PRESTATION DE GARDIENNAGE
            </div>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              Entre <Var>Dakar Sécurité SARL</Var>, ci-après « le Prestataire »,
              et <Var>{variables.client}</Var>, ci-après « le Client ».
            </p>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 1 — Objet.</b> Le Prestataire assure la surveillance et
              le gardiennage du site situé à <Var>{variables.site}</Var>, par{" "}
              <Var>{variables.nb_agents}</Var> agents.
            </p>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 2 — Durée.</b> Le présent contrat prend effet le{" "}
              <Var>{variables.date_debut}</Var> pour une durée de{" "}
              <Var>{variables.duree}</Var>.
            </p>
            <p className="text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 3 — Rémunération.</b> En contrepartie, le Client verse
              la somme mensuelle de <Var>{variables.montant}</Var> FCFA HT.
            </p>
          </div>
        </Card>

        {/* ---------- Right: variables panel ---------- */}
        <Card className="rounded-2xl px-[18px] py-4">
          <div className="text-muted mb-3.5 text-[11px] font-bold tracking-[0.5px]">
            VARIABLES DU MODÈLE
          </div>
          <div className="flex flex-col gap-3">
            {VARIABLE_KEYS.map((key) => (
              <Fragment key={key}>
                <label className="block">
                  <span className="text-muted text-[10.5px] font-semibold">
                    {key}
                  </span>
                  <input
                    type="text"
                    value={variables[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="border-border bg-surface2 text-foreground focus-visible:border-accent mt-1 w-full rounded-lg border px-2.5 py-2 text-[12px] font-bold outline-none"
                  />
                </label>
              </Fragment>
            ))}
          </div>
          <Button
            className="mt-4 h-auto w-full rounded-[10px] py-[11px] text-[12.5px] font-extrabold"
            onClick={() => toast.success("Contrat généré à partir du modèle")}
          >
            Générer le contrat
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}

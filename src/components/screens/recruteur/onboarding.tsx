"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/lib/toast";
import { fetchAllCandidatures } from "@/lib/supabase/data/recrutement";
import {
  fetchOnboarding,
  saveOnboarding,
  ONBOARDING_DEFAUT,
  type OnboardingEtape,
} from "@/lib/supabase/data/rh-emploi";

const field =
  "rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function RecruteurOnboarding() {
  const qc = useQueryClient();
  const { data: candidatures = [] } = useQuery({
    queryKey: ["all-candidatures"],
    queryFn: fetchAllCandidatures,
  });
  const [candidatureId, setCandidatureId] = useState("");
  const employe = candidatures.find((c) => c.id === candidatureId)?.label.split(" — ")[0] ?? "";

  const { data: loaded } = useQuery({
    queryKey: ["onboarding", candidatureId],
    queryFn: () => fetchOnboarding(candidatureId),
    enabled: candidatureId !== "",
  });

  const [steps, setSteps] = useState<OnboardingEtape[]>([]);
  useEffect(() => {
    if (candidatureId) setSteps(loaded ?? ONBOARDING_DEFAUT);
  }, [loaded, candidatureId]);

  const save = useMutation({
    mutationFn: (next: OnboardingEtape[]) => saveOnboarding(candidatureId, employe, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding", candidatureId] }),
    onError: () => toast.error("Enregistrement refusé (accès requis)."),
  });

  function toggle(i: number) {
    const next = steps.map((s, idx) => (idx === i ? { ...s, fait: !s.fait } : s));
    setSteps(next);
    if (candidatureId) save.mutate(next);
  }

  const doneCount = steps.filter((s) => s.fait).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <ScreenContainer>
      <div className="mx-auto max-w-[820px]">
        <div className="mb-4">
          <label className="text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase">
            Nouvel embauché
          </label>
          <select
            className={`${field} w-full max-w-[420px]`}
            value={candidatureId}
            onChange={(e) => setCandidatureId(e.target.value)}
          >
            <option value="">— Sélectionner un candidat —</option>
            {candidatures.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {candidatureId === "" ? (
          <Card className="text-muted p-8 text-center text-[13px] font-semibold">
            Sélectionnez un candidat pour suivre son intégration.
          </Card>
        ) : (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3.5">
              <div className="from-success to-accent flex size-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-[14px] font-extrabold text-white">
                {initials(employe) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-[15px] font-extrabold">
                  Onboarding — {employe || "—"}
                </div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                  Suivi d&apos;intégration du nouvel agent
                </div>
              </div>
              <div className="text-right">
                <div className="text-success text-[18px] font-extrabold">
                  {doneCount}
                  <span className="text-muted text-[12px] font-bold">/{steps.length}</span>
                </div>
                <div className="text-muted text-[10px] font-semibold">étapes</div>
              </div>
            </div>

            <ProgressBar value={pct} tone="success" height={7} className="mb-5" />

            <div className="flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={s.fait}
                  className="border-border bg-surface2 hover:bg-active flex items-center gap-3.5 rounded-[11px] border px-3.5 py-3 text-left transition-colors"
                >
                  <span
                    className={
                      s.fait
                        ? "bg-success flex size-6 flex-none items-center justify-center rounded-[7px] text-white"
                        : "border-border bg-surface flex size-6 flex-none items-center justify-center rounded-[7px] border-[1.5px]"
                    }
                  >
                    {s.fait && <Check size={14} strokeWidth={2.6} />}
                  </span>
                  <span className="text-foreground flex-1 text-[12.5px] font-bold">
                    {s.libelle}
                  </span>
                  <span className={s.fait ? "text-success text-[10.5px] font-semibold" : "text-muted text-[10.5px] font-semibold"}>
                    {s.fait ? "Terminé" : "À faire"}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ScreenContainer>
  );
}

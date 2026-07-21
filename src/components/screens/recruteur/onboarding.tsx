"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2, UserPlus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchAllCandidatures } from "@/lib/supabase/data/recrutement";
import {
  fetchOnboardings,
  saveOnboarding,
  ONBOARDING_DEFAUT,
  type OnboardingEtape,
} from "@/lib/supabase/data/rh-emploi";

const field =
  "rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
const pctOf = (e: OnboardingEtape[]) => (e.length ? Math.round((e.filter((s) => s.fait).length / e.length) * 100) : 0);

export function RecruteurOnboarding() {
  const qc = useQueryClient();
  const { data: onboardings = [] } = useQuery({ queryKey: ["onboardings"], queryFn: fetchOnboardings });
  const { data: candidatures = [] } = useQuery({ queryKey: ["all-candidatures"], queryFn: fetchAllCandidatures });

  const [sel, setSel] = useState<{ candidatureId: string; employe: string } | null>(null);
  const [steps, setSteps] = useState<OnboardingEtape[]>([]);
  const [newStep, setNewStep] = useState("");

  const enCours = onboardings.filter((o) => o.pct < 100).length;
  const complets = onboardings.filter((o) => o.pct === 100 && o.total > 0).length;

  const persist = useMutation({
    mutationFn: (next: OnboardingEtape[]) => saveOnboarding(sel!.candidatureId, sel!.employe, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboardings"] }),
    onError: () => toast.error("Enregistrement refusé (accès requis)."),
  });
  const apply = (next: OnboardingEtape[]) => { setSteps(next); if (sel) persist.mutate(next); };

  function open(candidatureId: string, employe: string, etapes: OnboardingEtape[]) {
    setSel({ candidatureId, employe });
    setSteps(etapes);
  }
  function start(id: string) {
    const c = candidatures.find((x) => x.id === id);
    if (!c) return;
    const employe = c.label.split(" — ")[0] ?? c.label;
    const etapes = ONBOARDING_DEFAUT.map((e) => ({ ...e }));
    setSel({ candidatureId: id, employe });
    setSteps(etapes);
    saveOnboarding(id, employe, etapes)
      .then(() => qc.invalidateQueries({ queryKey: ["onboardings"] }))
      .catch(() => toast.error("Accès refusé."));
    toast.success(`Onboarding démarré — ${employe}`);
  }

  const doneCount = steps.filter((s) => s.fait).length;
  const pct = pctOf(steps);
  const started = new Set(onboardings.map((o) => o.candidatureId));

  return (
    <ScreenContainer>
      <div className="mb-4 grid grid-cols-3 gap-[15px]">
        <Kpi tone="accent" value={onboardings.length} label="En intégration" />
        <Kpi tone="warning" value={enCours} label="En cours" />
        <Kpi tone="success" value={complets} label="Complétés" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.3fr]">
        {/* Liste + démarrage */}
        <Card className="p-[18px_20px]">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="text-accent size-4" />
            <select className={cn(field, "flex-1")} value="" onChange={(e) => e.target.value && start(e.target.value)}>
              <option value="">Démarrer un onboarding…</option>
              {candidatures.filter((c) => !started.has(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {onboardings.length === 0 ? (
            <EmptyState title="Aucune intégration en cours" description="Démarrez l'onboarding d'un nouvel embauché." />
          ) : (
            <div className="flex flex-col gap-2">
              {onboardings.map((o) => {
                const active = sel?.candidatureId === o.candidatureId;
                return (
                  <button key={o.candidatureId} type="button" onClick={() => open(o.candidatureId, o.employe, o.etapes)}
                    className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors", active ? "border-accent bg-active" : "border-border bg-surface2 hover:bg-active")}>
                    <div className="from-success to-accent flex size-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-extrabold text-white">{initials(o.employe) || "?"}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[12.5px] font-bold">{o.employe}</div>
                      <ProgressBar value={o.pct} tone={o.pct === 100 ? "success" : "accent"} height={5} className="mt-1.5" />
                    </div>
                    <span className={cn("text-[11px] font-extrabold", o.pct === 100 ? "text-success" : "text-muted")}>{o.pct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Checklist */}
        {sel ? (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3.5">
              <div className="from-success to-accent flex size-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-[14px] font-extrabold text-white">{initials(sel.employe) || "?"}</div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-[15px] font-extrabold">Onboarding — {sel.employe}</div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">Suivi d&apos;intégration du nouvel agent</div>
              </div>
              <div className="text-right">
                <div className="text-success text-[18px] font-extrabold">{doneCount}<span className="text-muted text-[12px] font-bold">/{steps.length}</span></div>
                <div className="text-muted text-[10px] font-semibold">étapes</div>
              </div>
            </div>

            <ProgressBar value={pct} tone="success" height={7} className="mb-5" />

            <div className="flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <div key={i} className="border-border bg-surface2 group flex items-center gap-3.5 rounded-[11px] border px-3.5 py-3">
                  <button type="button" onClick={() => apply(steps.map((x, idx) => (idx === i ? { ...x, fait: !x.fait } : x)))} aria-pressed={s.fait}
                    className={s.fait ? "bg-success flex size-6 flex-none items-center justify-center rounded-[7px] text-white" : "border-border bg-surface flex size-6 flex-none items-center justify-center rounded-[7px] border-[1.5px]"}>
                    {s.fait && <Check size={14} strokeWidth={2.6} />}
                  </button>
                  <span className={cn("flex-1 text-[12.5px] font-bold", s.fait ? "text-muted line-through" : "text-foreground")}>{s.libelle}</span>
                  <button type="button" aria-label="Retirer l'étape" onClick={() => apply(steps.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-danger opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>

            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { apply([...steps, { libelle: newStep.trim(), fait: false }]); setNewStep(""); } }}>
              <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Ajouter une étape…" className={cn(field, "flex-1")} />
              <Button size="sm" type="submit" variant="outline" disabled={!newStep.trim()}><Plus className="size-3.5" /> Ajouter</Button>
            </form>
          </Card>
        ) : (
          <Card className="text-muted p-8 text-center text-[13px] font-semibold">Sélectionnez une intégration ou démarrez-en une.</Card>
        )}
      </div>
    </ScreenContainer>
  );
}

function Kpi({ tone, value, label }: { tone: "accent" | "warning" | "success"; value: number; label: string }) {
  const cls = { accent: "text-accent", warning: "text-warning", success: "text-success" }[tone];
  return (
    <Card className="p-4">
      <div className={cn("text-[22px] font-extrabold", cls)}>{value}</div>
      <div className="text-muted mt-0.5 text-[11px] font-semibold">{label}</div>
    </Card>
  );
}

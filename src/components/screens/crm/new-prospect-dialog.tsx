"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  createProspect,
  type NewProspectInput,
} from "@/lib/supabase/data/prospects";
import type { PipelineStage } from "@/lib/api/prospects";

const STAGES: { v: PipelineStage; l: string }[] = [
  { v: "nouveau", l: "Nouveau" },
  { v: "qualifie", l: "Qualifié" },
  { v: "devis", l: "Devis envoyé" },
  { v: "negociation", l: "Négociation" },
];

const EMPTY: NewProspectInput = {
  raisonSociale: "",
  besoin: "",
  chiffreAffairesPotentiel: 0,
  owner: "",
  stage: "nouveau",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewProspectDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewProspectInput>(EMPTY);

  function update<K extends keyof NewProspectInput>(
    k: K,
    v: NewProspectInput[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createProspect(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(`Prospect « ${form.raisonSociale.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RP et Manager peuvent créer un prospect."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.raisonSociale.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouveau prospect
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau prospect</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Raison sociale *</label>
            <input
              className={field}
              value={form.raisonSociale}
              onChange={(e) => update("raisonSociale", e.target.value)}
              placeholder="Ex. Résidence Les Almadies"
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Besoin</label>
            <input
              className={field}
              value={form.besoin ?? ""}
              onChange={(e) => update("besoin", e.target.value)}
              placeholder="Ex. Gardiennage 24/7 · 4 agents"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>CA mensuel estimé</label>
              <input
                type="number"
                className={field}
                value={form.chiffreAffairesPotentiel ?? 0}
                onChange={(e) =>
                  update("chiffreAffairesPotentiel", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className={label}>Étape</label>
              <select
                className={field}
                value={form.stage}
                onChange={(e) =>
                  update("stage", e.target.value as PipelineStage)
                }
              >
                {STAGES.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Commercial en charge</label>
            <input
              className={field}
              value={form.owner ?? ""}
              onChange={(e) => update("owner", e.target.value)}
              placeholder="Nom du commercial"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? "Création…" : "Créer le prospect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

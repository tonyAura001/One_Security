"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  createIntervention,
  type NewInterventionInput,
} from "@/lib/supabase/data/maintenance";
import { fetchSiteOptions } from "@/lib/supabase/data/options";

const STATUTS: { v: string; l: string }[] = [
  { v: "planifiee", l: "Planifiée" },
  { v: "terminee", l: "Terminée" },
];

interface FormState {
  resume: string;
  dureeMin: number | null;
  siteId: string;
  statut: string;
}

const EMPTY: FormState = {
  resume: "",
  dureeMin: null,
  siteId: "",
  statut: "planifiee",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewInterventionDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const { data: sites } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });
  const siteOpts = sites ?? [];

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: NewInterventionInput = {
        resume: form.resume,
        dureeMin: form.dureeMin,
        siteId: form.siteId || null,
        statut: form.statut,
      };
      return createIntervention(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      toast.success("Intervention créée");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé pour créer une intervention."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nouvelle intervention
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle intervention</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Résumé</label>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              value={form.resume}
              onChange={(e) => update("resume", e.target.value)}
              placeholder="Nature de l'intervention…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Durée (min)</label>
              <input
                className={field}
                type="number"
                value={form.dureeMin ?? ""}
                onChange={(e) =>
                  update("dureeMin", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className={label}>Statut</label>
              <select
                className={field}
                value={form.statut}
                onChange={(e) => update("statut", e.target.value)}
              >
                {STATUTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Site (optionnel)</label>
            <select
              className={field}
              value={form.siteId}
              onChange={(e) => update("siteId", e.target.value)}
            >
              <option value="">— Aucun —</option>
              {siteOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

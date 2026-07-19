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
  createIncident,
  type NewIncidentInput,
  type IncidentCriticite,
} from "@/lib/supabase/data/incidents";

const TYPES: { v: string; l: string }[] = [
  { v: "INTRUSION", l: "Intrusion" },
  { v: "VOL", l: "Vol" },
  { v: "AGRESSION", l: "Agression" },
  { v: "RIXE", l: "Rixe" },
  { v: "MALVEILLANCE", l: "Malveillance" },
  { v: "INCENDIE", l: "Incendie" },
  { v: "ACCIDENT", l: "Accident" },
  { v: "AUTRE", l: "Autre" },
];
const CRITICITES: { v: IncidentCriticite; l: string }[] = [
  { v: "FAIBLE", l: "Faible" },
  { v: "MODEREE", l: "Modérée" },
  { v: "ELEVEE", l: "Élevée" },
  { v: "CRITIQUE", l: "Critique" },
];

const EMPTY: NewIncidentInput = {
  type: "INTRUSION",
  description: "",
  criticite: "MODEREE",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewIncidentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewIncidentInput>(EMPTY);

  function update<K extends keyof NewIncidentInput>(k: K, v: NewIncidentInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createIncident(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident enregistré");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : vous n'avez pas le droit d'enregistrer un incident."
          : `Échec de l'enregistrement : ${msg}`,
      );
    },
  });

  const valid = form.description.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" strokeWidth={2.4} />
          Nouvel incident
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvel incident / main courante</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type *</label>
              <select
                className={field}
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Criticité</label>
              <select
                className={field}
                value={form.criticite}
                onChange={(e) =>
                  update("criticite", e.target.value as IncidentCriticite)
                }
              >
                {CRITICITES.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Description *</label>
            <textarea
              className={`${field} min-h-[90px] resize-y`}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Décrivez l'événement, le lieu, l'heure, les personnes impliquées…"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

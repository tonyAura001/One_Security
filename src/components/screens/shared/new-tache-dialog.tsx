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
import { createTache, type NewTacheInput } from "@/lib/supabase/data/taches";
import { fetchUserOptions } from "@/lib/supabase/data/options";

const PRIORITES: { v: string; l: string }[] = [
  { v: "haute", l: "Haute" },
  { v: "moyenne", l: "Moyenne" },
  { v: "basse", l: "Basse" },
];

const EMPTY: NewTacheInput = {
  titre: "",
  description: "",
  priorite: "moyenne",
  echeance: "",
  assigneAId: "",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewTacheDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewTacheInput>(EMPTY);

  const { data: users } = useQuery({
    queryKey: ["user-options"],
    queryFn: fetchUserOptions,
  });
  const userOpts = users ?? [];

  function update<K extends keyof NewTacheInput>(k: K, v: NewTacheInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createTache(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taches"] });
      toast.success("Tâche créée");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé pour créer une tâche."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.titre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouvelle tâche
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Titre *</label>
            <input
              className={field}
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              placeholder="Ex. Renouveler les cartes CNAPS"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Priorité</label>
              <select
                className={field}
                value={form.priorite}
                onChange={(e) => update("priorite", e.target.value)}
              >
                {PRIORITES.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Échéance</label>
              <input
                type="date"
                className={field}
                value={form.echeance ?? ""}
                onChange={(e) => update("echeance", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label}>Assignée à</label>
            <select
              className={field}
              value={form.assigneAId ?? ""}
              onChange={(e) => update("assigneAId", e.target.value)}
            >
              <option value="">— Non assignée —</option>
              {userOpts.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Détails…"
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
              {mutation.isPending ? "Création…" : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

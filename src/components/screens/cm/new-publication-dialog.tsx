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
  createPublication,
  type NewPublicationInput,
} from "@/lib/supabase/data/publications";

const CANAUX = ["LinkedIn", "Facebook", "Instagram", "Site web"];
const STATUTS: { v: string; l: string }[] = [
  { v: "brouillon", l: "Brouillon" },
  { v: "planifie", l: "Planifié" },
  { v: "publie", l: "Publié" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: NewPublicationInput = {
  titre: "",
  canal: "LinkedIn",
  contenu: "",
  datePublication: today(),
  statut: "brouillon",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewPublicationDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewPublicationInput>(EMPTY);

  function update<K extends keyof NewPublicationInput>(
    k: K,
    v: NewPublicationInput[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createPublication(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      toast.success("Publication créée");
      setForm({ ...EMPTY, datePublication: today() });
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé pour créer une publication."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.titre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouvelle publication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouvelle publication</DialogTitle>
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
              placeholder="Ex. Recrutement agents — campagne juillet"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Canal</label>
              <select
                className={field}
                value={form.canal}
                onChange={(e) => update("canal", e.target.value)}
              >
                {CANAUX.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
            <label className={label}>Date de publication</label>
            <input
              type="date"
              className={field}
              value={form.datePublication}
              onChange={(e) => update("datePublication", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Contenu</label>
            <textarea
              className={`${field} min-h-[90px] resize-y`}
              value={form.contenu ?? ""}
              onChange={(e) => update("contenu", e.target.value)}
              placeholder="Texte du post…"
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
              {mutation.isPending ? "Création…" : "Créer la publication"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { createMateriel, type NewMaterielInput } from "@/lib/supabase/data/catalogue";

const TYPES: { v: string; l: string }[] = [
  { v: "VEHICULE", l: "Véhicule" },
  { v: "ARME", l: "Arme" },
  { v: "EQUIPEMENT", l: "Équipement" },
  { v: "UNIFORME", l: "Uniforme" },
  { v: "RADIO", l: "Radio" },
  { v: "AUTRE", l: "Autre" },
];

const EMPTY: NewMaterielInput = {
  type: "EQUIPEMENT",
  marque: "",
  modele: "",
  numeroSerie: "",
  quantite: 1,
  coutAcquisition: null,
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewMaterielDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewMaterielInput>(EMPTY);

  function update<K extends keyof NewMaterielInput>(k: K, v: NewMaterielInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createMateriel(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogue"] });
      toast.success("Référence créée");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé pour créer une référence."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.quantite >= 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nouvelle référence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle référence</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Type</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Marque</label>
              <input
                className={field}
                value={form.marque ?? ""}
                onChange={(e) => update("marque", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Modèle</label>
              <input
                className={field}
                value={form.modele ?? ""}
                onChange={(e) => update("modele", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>N° de série</label>
              <input
                className={field}
                value={form.numeroSerie ?? ""}
                onChange={(e) => update("numeroSerie", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Quantité</label>
              <input
                type="number"
                className={field}
                value={form.quantite}
                onChange={(e) => update("quantite", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className={label}>Coût d&apos;acquisition (FCFA)</label>
            <input
              type="number"
              className={field}
              value={form.coutAcquisition ?? ""}
              onChange={(e) =>
                update(
                  "coutAcquisition",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { createAgent, type NewAgentInput } from "@/lib/supabase/data/agents";

const STATUTS: { v: string; l: string }[] = [
  { v: "actif", l: "Actif" },
  { v: "inactif", l: "Inactif" },
  { v: "suspendu", l: "Suspendu" },
];

const EMPTY: NewAgentInput = {
  prenom: "",
  nom: "",
  matricule: "",
  telephone: "",
  poste: "",
  salaire: null,
  statut: "actif",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewAgentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewAgentInput>(EMPTY);

  function update<K extends keyof NewAgentInput>(k: K, v: NewAgentInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createAgent(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`Agent « ${form.prenom.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG/RP/RH/Manager peuvent créer un agent."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.prenom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" strokeWidth={2.4} />
          Nouvel agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvel agent</DialogTitle>
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
              <label className={label}>Prénom *</label>
              <input
                className={field}
                value={form.prenom}
                onChange={(e) => update("prenom", e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className={label}>Nom</label>
              <input
                className={field}
                value={form.nom ?? ""}
                onChange={(e) => update("nom", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Matricule</label>
              <input
                className={field}
                value={form.matricule ?? ""}
                onChange={(e) => update("matricule", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input
                className={field}
                value={form.telephone ?? ""}
                onChange={(e) => update("telephone", e.target.value)}
                placeholder="+221 …"
              />
            </div>
          </div>
          <div>
            <label className={label}>Poste / Affectation</label>
            <input
              className={field}
              value={form.poste ?? ""}
              onChange={(e) => update("poste", e.target.value)}
              placeholder="Ex. Almadies"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Salaire (FCFA)</label>
              <input
                type="number"
                className={field}
                value={form.salaire ?? ""}
                onChange={(e) =>
                  update("salaire", e.target.value === "" ? null : Number(e.target.value))
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
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer l'agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

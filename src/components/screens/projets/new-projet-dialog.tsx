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
  createProjet,
  type NewProjetInput,
  type ProjectStatut,
} from "@/lib/supabase/data/projets";
import { fetchUserOptions } from "@/lib/supabase/data/options";

const STATUTS: { v: ProjectStatut; l: string }[] = [
  { v: "planifie", l: "Planifié" },
  { v: "en_cours", l: "En cours" },
  { v: "en_avance", l: "En avance" },
  { v: "a_risque", l: "À risque" },
  { v: "termine", l: "Terminé" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

interface Form {
  nom: string;
  siteClient: string;
  responsableId: string;
  statut: ProjectStatut;
  budgetTotal: string;
  echeance: string;
  description: string;
}
const EMPTY: Form = {
  nom: "",
  siteClient: "",
  responsableId: "",
  statut: "planifie",
  budgetTotal: "",
  echeance: "",
  description: "",
};

export function NewProjetDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data: users } = useQuery({
    queryKey: ["user-options"],
    queryFn: fetchUserOptions,
  });
  const userOpts = users ?? [];

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewProjetInput = {
        nom: form.nom,
        siteClient: form.siteClient,
        description: form.description,
        responsableId: form.responsableId || null,
        statut: form.statut,
        budgetTotal: Number(form.budgetTotal.replace(/\s/g, "")) || 0,
        echeance: form.echeance || null,
      };
      return createProjet(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projets"] });
      toast.success("Déploiement créé");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission|refusé/i.test(msg)
          ? "Accès refusé pour créer un déploiement."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.nom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nouveau déploiement</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Nom du déploiement *</label>
            <input
              className={field}
              value={form.nom}
              onChange={(e) => update("nom", e.target.value)}
              placeholder="Ex. Dispositif Résidence Les Almadies"
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Site / client</label>
            <input
              className={field}
              value={form.siteClient}
              onChange={(e) => update("siteClient", e.target.value)}
              placeholder="Ex. Résidence Les Almadies — Dakar"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Responsable</label>
              <select
                className={field}
                value={form.responsableId}
                onChange={(e) => update("responsableId", e.target.value)}
              >
                <option value="">— À définir —</option>
                {userOpts.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Statut</label>
              <select
                className={field}
                value={form.statut}
                onChange={(e) => update("statut", e.target.value as ProjectStatut)}
              >
                {STATUTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Budget (FCFA)</label>
              <input
                inputMode="numeric"
                className={field}
                value={form.budgetTotal}
                onChange={(e) => update("budgetTotal", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
              />
            </div>
            <div>
              <label className={label}>Échéance</label>
              <input
                type="date"
                className={field}
                value={form.echeance}
                onChange={(e) => update("echeance", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Périmètre, objectifs…"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le déploiement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

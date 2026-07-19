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
import { createClientRow, type NewClientInput } from "@/lib/supabase/data/clients";
import type { ClientStatus } from "@/lib/api/types";

const FORMES = ["SA", "SARL", "SAS", "SASU", "EURL", "EI", "ASSOCIATION", "AUTRE"];
const STATUTS: { v: ClientStatus; l: string }[] = [
  { v: "prospect", l: "Prospect" },
  { v: "actif", l: "Actif" },
  { v: "risque", l: "À risque" },
];

const EMPTY: NewClientInput = {
  raisonSociale: "",
  formeJuridique: "SARL",
  secteur: "",
  adresseFacturation: "",
  statut: "prospect",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewClientDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewClientInput>(EMPTY);

  function update<K extends keyof NewClientInput>(k: K, v: NewClientInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createClientRow(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`Client « ${form.raisonSociale.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls les rôles DG et RP peuvent créer un client."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid =
    form.raisonSociale.trim().length > 0 &&
    form.adresseFacturation.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouveau client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
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
              placeholder="Ex. Dakar Sécurité Plus"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Forme juridique</label>
              <select
                className={field}
                value={form.formeJuridique}
                onChange={(e) => update("formeJuridique", e.target.value)}
              >
                {FORMES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Statut</label>
              <select
                className={field}
                value={form.statut}
                onChange={(e) => update("statut", e.target.value as ClientStatus)}
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
            <label className={label}>Secteur</label>
            <input
              className={field}
              value={form.secteur}
              onChange={(e) => update("secteur", e.target.value)}
              placeholder="Ex. Portuaire"
            />
          </div>
          <div>
            <label className={label}>Adresse de facturation *</label>
            <input
              className={field}
              value={form.adresseFacturation}
              onChange={(e) => update("adresseFacturation", e.target.value)}
              placeholder="Dakar, Sénégal"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

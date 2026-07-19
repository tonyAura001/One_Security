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
import { createCompte, type NewCompteInput } from "@/lib/supabase/data/treasury";
import type { AccountKind } from "@/lib/api/treasury";

const TYPES: { v: AccountKind; l: string }[] = [
  { v: "bank", l: "Compte bancaire" },
  { v: "wave", l: "Wave" },
  { v: "om", l: "Orange Money" },
  { v: "cash", l: "Caisse espèces" },
];

const EMPTY: NewCompteInput = {
  nom: "",
  iban: "",
  type: "bank",
  soldeInitial: 0,
  bicSwift: "",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewAccountDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewCompteInput>(EMPTY);

  function update<K extends keyof NewCompteInput>(k: K, v: NewCompteInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createCompte(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasury-accounts"] });
      toast.success(`Compte « ${form.nom.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG et RF peuvent créer un compte."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.nom.trim().length > 0 && form.iban.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Compte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau compte</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Nom du compte *</label>
            <input
              className={field}
              value={form.nom}
              onChange={(e) => update("nom", e.target.value)}
              placeholder="Ex. Compte principal CBAO"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type</label>
              <select
                className={field}
                value={form.type}
                onChange={(e) => update("type", e.target.value as AccountKind)}
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Solde initial (FCFA)</label>
              <input
                type="number"
                className={field}
                value={form.soldeInitial}
                onChange={(e) => update("soldeInitial", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className={label}>IBAN / n° de compte *</label>
            <input
              className={field}
              value={form.iban}
              onChange={(e) => update("iban", e.target.value)}
              placeholder="SN08 XXXX 0100 …"
            />
          </div>
          <div>
            <label className={label}>BIC / SWIFT</label>
            <input
              className={field}
              value={form.bicSwift ?? ""}
              onChange={(e) => update("bicSwift", e.target.value)}
              placeholder="Optionnel"
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
              {mutation.isPending ? "Création…" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  createSupplier,
  type NewSupplierInput,
} from "@/lib/supabase/data/suppliers";
import type { SupplierCategory, SupplierStatus } from "@/lib/api/suppliers";

const CATEGORIES: SupplierCategory[] = [
  "Équipement",
  "Uniformes",
  "Carburant",
  "Télécom",
  "Formation",
];
const STATUTS: { v: SupplierStatus; l: string }[] = [
  { v: "actif", l: "Actif" },
  { v: "en_attente", l: "À payer" },
  { v: "bloque", l: "Bloqué" },
];

const EMPTY: NewSupplierInput = {
  raisonSociale: "",
  categorie: "Équipement",
  contact: "",
  telephone: "",
  statut: "actif",
  delaiMoyenJours: 30,
  email: "",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewSupplierDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewSupplierInput>(EMPTY);

  function update<K extends keyof NewSupplierInput>(
    k: K,
    v: NewSupplierInput[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createSupplier(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Fournisseur « ${form.raisonSociale.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RF et Comptable peuvent créer un fournisseur."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.raisonSociale.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouveau fournisseur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
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
              placeholder="Ex. Équip-Sécurité SARL"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Catégorie</label>
              <select
                className={field}
                value={form.categorie}
                onChange={(e) =>
                  update("categorie", e.target.value as SupplierCategory)
                }
              >
                {CATEGORIES.map((c) => (
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
                onChange={(e) =>
                  update("statut", e.target.value as SupplierStatus)
                }
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
              <label className={label}>Contact</label>
              <input
                className={field}
                value={form.contact}
                onChange={(e) => update("contact", e.target.value)}
                placeholder="Nom du contact"
              />
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input
                className={field}
                value={form.telephone}
                onChange={(e) => update("telephone", e.target.value)}
                placeholder="+221 …"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Délai moyen (jours)</label>
              <input
                type="number"
                className={field}
                value={form.delaiMoyenJours}
                onChange={(e) =>
                  update("delaiMoyenJours", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className={label}>Email</label>
              <input
                className={field}
                value={form.email ?? ""}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Optionnel"
              />
            </div>
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
              {mutation.isPending ? "Création…" : "Créer le fournisseur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

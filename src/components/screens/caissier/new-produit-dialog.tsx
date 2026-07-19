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
import { createProduit, type NewProduitInput } from "@/lib/supabase/data/caisse";

const EMPTY: NewProduitInput = {
  nom: "",
  categorie: "",
  prix: 0,
  stock: 0,
  seuilAlerte: 5,
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewProduitDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewProduitInput>(EMPTY);

  function update<K extends keyof NewProduitInput>(k: K, v: NewProduitInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createProduit(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits"] });
      toast.success(`Produit « ${form.nom.trim()} » créé`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG/RF/Comptable peuvent créer un produit."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.nom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Nouveau produit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Nom *</label>
            <input
              className={field}
              value={form.nom}
              onChange={(e) => update("nom", e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Catégorie</label>
            <input
              className={field}
              value={form.categorie}
              onChange={(e) => update("categorie", e.target.value)}
              placeholder="Ex. Uniformes"
            />
          </div>
          <div>
            <label className={label}>Prix (FCFA)</label>
            <input
              type="number"
              className={field}
              value={form.prix}
              onChange={(e) => update("prix", Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Stock initial</label>
              <input
                type="number"
                className={field}
                value={form.stock}
                onChange={(e) => update("stock", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={label}>Seuil d&apos;alerte</label>
              <input
                type="number"
                className={field}
                value={form.seuilAlerte}
                onChange={(e) => update("seuilAlerte", Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le produit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

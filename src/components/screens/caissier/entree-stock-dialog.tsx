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
import { adjustStock, fetchProduits } from "@/lib/supabase/data/caisse";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function EntreeStockDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [produitId, setProduitId] = useState("");
  const [quantite, setQuantite] = useState(1);

  const { data: produits } = useQuery({ queryKey: ["produits"], queryFn: fetchProduits });
  const prods = produits ?? [];

  const mutation = useMutation({
    mutationFn: () => adjustStock(produitId, quantite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits"] });
      toast.success("Stock mis à jour");
      setProduitId("");
      setQuantite(1);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé pour modifier le stock."
          : `Échec de la mise à jour : ${msg}`,
      );
    },
  });

  const valid = produitId !== "" && quantite > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus strokeWidth={2.4} />
          Entrée de stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Entrée de stock</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Produit *</label>
            <select
              className={field}
              value={produitId}
              onChange={(e) => setProduitId(e.target.value)}
            >
              <option value="" disabled>
                Sélectionner un produit
              </option>
              {prods.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.name} (stock ${p.stock})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Quantité à ajouter *</label>
            <input
              className={field}
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
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

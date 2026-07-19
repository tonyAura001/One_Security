"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
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
import { createSale, type NewSaleInput, fetchProduits } from "@/lib/supabase/data/caisse";
import { formatFCFA } from "@/lib/format";

const MOYENS = ["Espèces", "Wave", "Orange Money", "Carte"];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewVenteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [produitId, setProduitId] = useState("");
  const [qty, setQty] = useState(1);
  const [moyenPaiement, setMoyenPaiement] = useState("Espèces");

  const { data: produits } = useQuery({ queryKey: ["produits"], queryFn: fetchProduits });
  const prods = produits ?? [];

  const selected = prods.find((p) => p.id === produitId);
  const prix = selected?.price ?? 0;

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewSaleInput = { produitId, qty, prix, moyenPaiement };
      return createSale(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["produits"] });
      toast.success("Vente enregistrée");
      setProduitId("");
      setQty(1);
      setMoyenPaiement("Espèces");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé pour enregistrer une vente."
          : `Échec de l'enregistrement : ${msg}`,
      );
    },
  });

  const valid = produitId !== "" && qty > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ShoppingCart className="size-4" />
          Nouvelle vente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle vente</DialogTitle>
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
                  {`${p.name} — ${p.price} FCFA (stock ${p.stock})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Quantité *</label>
            <input
              className={field}
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Moyen de paiement</label>
            <select
              className={field}
              value={moyenPaiement}
              onChange={(e) => setMoyenPaiement(e.target.value)}
            >
              {MOYENS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[13px] font-semibold text-foreground">
            Total : {formatFCFA(prix * qty)}
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer la vente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

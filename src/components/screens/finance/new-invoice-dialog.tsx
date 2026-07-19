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
import { formatFCFA } from "@/lib/format";
import { createInvoice, type NewInvoiceInput } from "@/lib/supabase/data/invoices";
import { fetchClientOptions, type Opt } from "@/lib/supabase/data/options";

const STATUTS: { v: string; l: string }[] = [
  { v: "EMISE", l: "Émise" },
  { v: "ENVOYEE", l: "Envoyée" },
];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const EMPTY: NewInvoiceInput = {
  clientId: "",
  montantHT: 0,
  tauxTVA: 18,
  dateEmission: today(),
  dateEcheance: inDays(30),
  statut: "EMISE",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewInvoiceDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewInvoiceInput>(EMPTY);

  const { data: clients } = useQuery({
    queryKey: ["client-options"],
    queryFn: fetchClientOptions,
  });
  const clientOpts: Opt[] = clients ?? [];

  function update<K extends keyof NewInvoiceInput>(k: K, v: NewInvoiceInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => createInvoice(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Facture créée`);
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls les rôles DG, RF et COMPTABLE peuvent créer une facture."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const ttc =
    form.montantHT + Math.round((form.montantHT * form.tauxTVA) / 100);
  const valid = form.clientId !== "" && form.montantHT > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouvelle facture
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Client *</label>
            <select
              className={field}
              value={form.clientId}
              onChange={(e) => update("clientId", e.target.value)}
            >
              <option value="" disabled>
                — Choisir un client —
              </option>
              {clientOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Montant HT *</label>
              <input
                className={field}
                type="number"
                value={form.montantHT}
                onChange={(e) => update("montantHT", Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div>
              <label className={label}>Taux TVA (%)</label>
              <select
                className={field}
                value={form.tauxTVA}
                onChange={(e) => update("tauxTVA", Number(e.target.value))}
              >
                <option value={18}>18</option>
                <option value={0}>0</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date d&apos;émission</label>
              <input
                className={field}
                type="date"
                value={form.dateEmission}
                onChange={(e) => update("dateEmission", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Date d&apos;échéance</label>
              <input
                className={field}
                type="date"
                value={form.dateEcheance}
                onChange={(e) => update("dateEcheance", e.target.value)}
              />
            </div>
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
          <div className="text-[13px] font-semibold text-foreground">
            TTC : {formatFCFA(ttc)}
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer la facture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

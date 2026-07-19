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
import { createQuote, type NewQuoteInput } from "@/lib/supabase/data/quotes";
import { fetchProspectOptions, type Opt } from "@/lib/supabase/data/options";
import { formatFCFA } from "@/lib/format";

const STATUTS: { v: string; l: string }[] = [
  { v: "BROUILLON", l: "Brouillon" },
  { v: "ENVOYE", l: "Envoyé" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewQuoteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [prospectId, setProspectId] = useState("");
  const [totalHT, setTotalHT] = useState(0);
  const [tauxTVA, setTauxTVA] = useState(18);
  const [statut, setStatut] = useState("BROUILLON");
  const [dateEnvoi, setDateEnvoi] = useState("");

  const { data: prospects = [] } = useQuery<Opt[]>({
    queryKey: ["prospect-options"],
    queryFn: fetchProspectOptions,
  });

  function reset() {
    setProspectId("");
    setTotalHT(0);
    setTauxTVA(18);
    setStatut("BROUILLON");
    setDateEnvoi("");
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewQuoteInput = {
        prospectId: prospectId || null,
        totalHT,
        tauxTVA,
        statut,
        dateEnvoi: dateEnvoi || null,
      };
      return createQuote(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis créé");
      reset();
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG/RP/Manager peuvent créer un devis."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const ttc = totalHT + Math.round((totalHT * tauxTVA) / 100);
  const valid = totalHT > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouveau devis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau devis</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Prospect</label>
            <select
              className={field}
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Total HT *</label>
            <input
              className={field}
              type="number"
              value={totalHT}
              onChange={(e) => setTotalHT(Number(e.target.value))}
              placeholder="0"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Taux TVA (%)</label>
              <select
                className={field}
                value={tauxTVA}
                onChange={(e) => setTauxTVA(Number(e.target.value))}
              >
                <option value={18}>18</option>
                <option value={0}>0</option>
              </select>
            </div>
            <div>
              <label className={label}>Statut</label>
              <select
                className={field}
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
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
            <label className={label}>Date d&apos;envoi</label>
            <input
              className={field}
              type="date"
              value={dateEnvoi}
              onChange={(e) => setDateEnvoi(e.target.value)}
            />
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
              {mutation.isPending ? "Création…" : "Créer le devis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

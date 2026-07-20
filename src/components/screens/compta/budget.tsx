"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { formatNumberFR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchBudget, createBudgetLigne } from "@/lib/supabase/data/budget";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function ComptaBudget() {
  const { data: lines = [] } = useQuery({ queryKey: ["budget"], queryFn: fetchBudget });
  const totPrevu = lines.reduce((s, l) => s + l.prevu, 0);
  const totRealise = lines.reduce((s, l) => s + l.realise, 0);
  const ecart = totPrevu - totRealise;

  return (
    <ScreenContainer>
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <Stat label="Budget prévu" value={formatNumberFR(totPrevu)} />
        <Stat label="Réalisé" value={formatNumberFR(totRealise)} />
        <Stat
          label={ecart >= 0 ? "Marge restante" : "Dépassement"}
          value={formatNumberFR(Math.abs(ecart))}
          tone={ecart >= 0 ? "text-success" : "text-danger"}
        />
      </div>

      <Card className="p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Postes budgétaires
          </div>
          <NewBudgetDialog />
        </div>

        {lines.length === 0 ? (
          <EmptyState title="Aucun poste budgétaire" description="Ajoutez un poste (prévu vs réalisé)." />
        ) : (
          <div className="flex flex-col gap-4">
            {lines.map((l) => {
              const pct = l.prevu > 0 ? Math.round((l.realise / l.prevu) * 100) : 0;
              const over = l.realise > l.prevu;
              return (
                <div key={l.id}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px] font-bold">
                    <span className="text-foreground">{l.poste}</span>
                    <span className={cn(over ? "text-danger" : "text-muted")}>
                      {formatNumberFR(l.realise)} / {formatNumberFR(l.prevu)} · {pct}%
                    </span>
                  </div>
                  <ProgressBar value={Math.min(100, pct)} tone={over ? "danger" : "accent"} height={7} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </ScreenContainer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-muted text-[11px] font-semibold">{label}</div>
      <div className={cn("mt-1 text-[19px] font-extrabold tracking-[-0.4px]", tone ?? "text-foreground")}>
        {value} <span className="text-muted text-[11px] font-bold">FCFA</span>
      </div>
    </Card>
  );
}

function NewBudgetDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [poste, setPoste] = useState("");
  const [prevu, setPrevu] = useState("");
  const [realise, setRealise] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createBudgetLigne({
        poste,
        prevu: Number(prevu.replace(/\s/g, "")) || 0,
        realise: Number(realise.replace(/\s/g, "")) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget"] });
      toast.success("Poste ajouté");
      setPoste("");
      setPrevu("");
      setRealise("");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RF/Comptable)." : `Échec : ${e instanceof Error ? e.message : e}`),
  });
  const valid = poste.trim() && Number(prevu.replace(/\s/g, "")) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouveau poste</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px]">
        <DialogHeader><DialogTitle>Nouveau poste budgétaire</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Poste *</label>
            <input className={field} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Équipements & uniformes" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Prévu (FCFA) *</label>
              <input inputMode="numeric" className={field} value={prevu} onChange={(e) => setPrevu(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
            <div>
              <label className={label}>Réalisé (FCFA)</label>
              <input inputMode="numeric" className={field} value={realise} onChange={(e) => setRealise(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>{mutation.isPending ? "…" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

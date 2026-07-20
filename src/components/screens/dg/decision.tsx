"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
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
import { formatDateFR } from "@/lib/format";
import { fetchContenus, createContenu, updateContenu } from "@/lib/supabase/data/contenu";

const CATEGORIES: { v: string; l: string; variant: PillVariant }[] = [
  { v: "strategie", l: "Stratégie", variant: "info" },
  { v: "finance", l: "Finance", variant: "violet" },
  { v: "rh", l: "RH", variant: "warning" },
  { v: "operations", l: "Opérations", variant: "success" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function DecisionScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("toutes");
  const { data: decisions = [] } = useQuery({
    queryKey: ["contenu", "decision"],
    queryFn: () => fetchContenus("decision"),
  });
  const filtered = tab === "toutes" ? decisions : decisions.filter((d) => d.categorie === tab);

  const validate = useMutation({
    mutationFn: (id: string) => updateContenu(id, { statut: "validee" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "decision"] });
      toast.success("Décision validée");
    },
    onError: () => toast.error("Action refusée (accès requis)."),
  });

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[{ v: "toutes", l: "Toutes" }, ...CATEGORIES].map((c) => (
            <button
              key={c.v}
              onClick={() => setTab(c.v)}
              className={`rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition-colors ${
                tab === c.v ? "bg-accent/14 text-accent" : "text-muted hover:bg-hover"
              }`}
            >
              {c.l}
            </button>
          ))}
        </div>
        <NewDecisionDialog />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gavel} title="Aucune décision" description="Consignez une décision de direction." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((d) => {
            const cat = CATEGORIES.find((c) => c.v === d.categorie);
            const validated = d.statut === "validee";
            return (
              <Card key={d.id} className="p-[16px_18px]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-[14px] font-extrabold tracking-[-0.2px]">
                        {d.titre}
                      </span>
                      {cat && <StatusPill variant={cat.variant} uppercase>{cat.l}</StatusPill>}
                      <StatusPill variant={validated ? "success" : "warning"} uppercase>
                        {validated ? "Validée" : "En attente"}
                      </StatusPill>
                    </div>
                    {d.corps && <p className="text-muted mt-1.5 text-[12.5px] leading-[1.5]">{d.corps}</p>}
                    <div className="text-muted mt-2 text-[10.5px] font-semibold">
                      {d.auteur} · {formatDateFR(d.createdAt, "d MMM yyyy")}
                    </div>
                  </div>
                  {!validated && (
                    <Button size="xs" variant="outline" disabled={validate.isPending} onClick={() => validate.mutate(d.id)}>
                      Valider
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ScreenContainer>
  );
}

function NewDecisionDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("strategie");
  const [corps, setCorps] = useState("");

  const mutation = useMutation({
    mutationFn: () => createContenu({ type: "decision", titre, categorie, corps }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "decision"] });
      toast.success("Décision consignée");
      setTitre("");
      setCorps("");
      setCategorie("strategie");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(`Échec : ${e instanceof Error ? e.message : String(e)}`),
  });

  const valid = titre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvelle décision</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader><DialogTitle>Nouvelle décision</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Objet *</label>
            <input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={label}>Catégorie</label>
            <select className={field} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Détail</label>
            <textarea className={`${field} min-h-[90px] resize-y`} value={corps} onChange={(e) => setCorps(e.target.value)} />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "…" : "Consigner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

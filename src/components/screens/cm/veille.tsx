"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { fetchVeille, createVeille, type Sentiment } from "@/lib/supabase/data/veille";

const sentimentMeta: Record<Sentiment, { variant: PillVariant; border: string; label: string }> = {
  négatif: { variant: "danger", border: "border-l-danger", label: "Négatif" },
  neutre: { variant: "neutral", border: "border-l-muted", label: "Neutre" },
  positif: { variant: "success", border: "border-l-success", label: "Positif" },
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function CmVeille() {
  const { data: items = [] } = useQuery({ queryKey: ["veille"], queryFn: fetchVeille });
  const thisMonth = items.filter((i) => i.date.slice(0, 7) === new Date().toISOString().slice(0, 7));
  const positifs = items.filter((i) => i.sentiment === "positif").length;
  const aTraiter = items.filter((i) => i.sentiment === "négatif").length;
  const pctPositif = items.length ? Math.round((positifs / items.length) * 100) : 0;

  const STATS = [
    { label: "Mentions ce mois", value: String(thisMonth.length), tone: "text-foreground" },
    { label: "Sentiment positif", value: `${pctPositif} %`, tone: "text-success" },
    { label: "Alertes à traiter", value: String(aTraiter), tone: aTraiter > 0 ? "text-danger" : "text-foreground" },
  ];

  return (
    <ScreenContainer>
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">{s.label}</div>
            <div className={cn("mt-[5px] text-[20px] font-extrabold", s.tone)}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Veille réputation
          </div>
          <NewVeilleDialog />
        </div>
        {items.length === 0 ? (
          <EmptyState title="Aucune mention" description="Ajoutez une mention presse, un avis ou un post surveillé." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((alert) => {
              const meta = sentimentMeta[alert.sentiment];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "border-border bg-surface2 flex flex-wrap items-center gap-3.5 rounded-xl border border-l-[3px] px-3.5 py-3",
                    meta.border,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-[12.5px] font-bold">{alert.extrait}</div>
                    <div className="text-muted mt-0.5 text-[11px] font-semibold">
                      {alert.source ?? "—"} · {formatDateFR(alert.date)}
                    </div>
                  </div>
                  <StatusPill variant={meta.variant} uppercase>{meta.label}</StatusPill>
                  {alert.url && (
                    <a href={alert.url} target="_blank" rel="noopener" className="text-accent hover:bg-accent/10 rounded p-1" title="Ouvrir">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </ScreenContainer>
  );
}

function NewVeilleDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [extrait, setExtrait] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("neutre");

  const mutation = useMutation({
    mutationFn: () => createVeille({ extrait, source, url, sentiment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veille"] });
      toast.success("Mention ajoutée");
      setExtrait("");
      setSource("");
      setUrl("");
      setSentiment("neutre");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (CM)." : `Échec : ${e instanceof Error ? e.message : e}`),
  });
  const valid = extrait.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvelle mention</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Nouvelle mention</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Extrait / citation *</label>
            <textarea className={`${field} min-h-[70px] resize-y`} value={extrait} onChange={(e) => setExtrait(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Source</label>
              <input className={field} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex. Le Soleil, Facebook…" />
            </div>
            <div>
              <label className={label}>Sentiment</label>
              <select className={field} value={sentiment} onChange={(e) => setSentiment(e.target.value as Sentiment)}>
                <option value="positif">Positif</option>
                <option value="neutre">Neutre</option>
                <option value="négatif">Négatif</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Lien</label>
            <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
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
